#!/usr/bin/env python3
"""Private, bounded question alerts. Never log visitor data or credentials.

Uses existing Firestore indexes and an IAM-only cursor/outbox, not browser mail
credentials. API acceptance means queued, not delivered. An ambiguous send is
retried only inside Brevo's documented idempotency window, then held for review.
"""
import argparse
from datetime import datetime, timezone
from html import escape
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
import uuid

PROJECT = 'dainyelonthemove'
DATABASE = 'dainyel-content'
ROOT = f'projects/{PROJECT}/databases/{DATABASE}/documents'
STATE = ROOT + '/_automation/questionEmail'
SOURCES = ('questions', 'communityThreads')
STATUSES = ('pending', 'published', 'rejected')
LIMIT = 100
MAIL_LIMIT_PER_SOURCE = 10
ADMIN = 'https://dainyelonthemove.com/admin.html'
SOURCE_LABELS = {'questions': 'Ask Dainyel', 'communityThreads': 'Ask the Community'}


class RemoteError(Exception):
    def __init__(self, service, status, code=''):
        self.service, self.status, self.code = service, status, code
        super().__init__(f'{service}: HTTP {status}' + (f' ({code})' if code else ''))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request(service, url, headers, method='GET', body=None):
    req = urllib.request.Request(url, method=method, headers=headers,
        data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.build_opener(NoRedirect()).open(req, timeout=40) as res:
            return json.load(res)
    except urllib.error.HTTPError as error:
        code = ''
        if service == 'Brevo':
            try:
                candidate = json.load(error).get('code', '')
                if candidate in {'duplicate_parameter', 'invalid_parameter', 'unauthorized',
                                 'permission_denied', 'not_enough_credits', 'too_many_requests'}:
                    code = candidate
            except (ValueError, OSError):
                pass
        raise RemoteError(service, error.code, code) from None
    except (OSError, ValueError):
        raise RuntimeError(service + ': response unavailable; no response body logged') from None


class Firestore:
    def __init__(self):
        result = subprocess.run(['gcloud', 'auth', 'print-access-token'],
                                capture_output=True, text=True, timeout=45)
        if result.returncode or not result.stdout.strip():
            raise RuntimeError('Existing Google service identity is unavailable')
        self.headers = {'Authorization': 'Bearer ' + result.stdout.strip(),
                        'Content-Type': 'application/json'}

    def call(self, path, method='GET', body=None):
        return request('Firestore', 'https://firestore.googleapis.com/v1/' + path,
                       self.headers, method, body)

    def read(self):
        try:
            doc = self.call(STATE)
        except RemoteError as error:
            if error.status == 404:
                return None
            raise
        state = json.loads(doc['fields']['stateJson']['stringValue'])
        if state.get('version') != 1:
            raise RuntimeError('Unsupported notification state; owner review required')
        return {'data': state, 'updateTime': doc['updateTime'],
                'clock': doc['fields']['clockAt']['timestampValue']}

    def save(self, data, prior):
        # CAS prevents overlapping/manual jobs from claiming the same outbox.
        precondition = {'exists': False} if prior is None else {'updateTime': prior['updateTime']}
        result = self.call(f'projects/{PROJECT}/databases/{DATABASE}/documents:commit', 'POST', {
            'writes': [{'update': {'name': STATE, 'fields': {
                'stateJson': {'stringValue': json.dumps(data, ensure_ascii=False, separators=(',', ':'))}}},
                'updateTransforms': [{'fieldPath': 'clockAt', 'setToServerValue': 'REQUEST_TIME'}],
                'currentDocument': precondition}]})
        # No extra read/race: response carries the version and server time.
        write = result['writeResults'][0]
        return {'data': data, 'updateTime': write['updateTime'],
                'clock': write['transformResults'][0]['timestampValue']}

    def query(self, source, status, cursor=None, read_time=None, limit=LIMIT):
        query = {'select': {'fields': [{'fieldPath': field} for field in
                    ('createdAt', 'topic', 'question', 'displayName')]},
            'from': [{'collectionId': source}],
            'where': {'fieldFilter': {'field': {'fieldPath': 'status'},
                                     'op': 'EQUAL', 'value': {'stringValue': status}}},
            'orderBy': [{'field': {'fieldPath': 'createdAt'}, 'direction': 'ASCENDING'},
                        {'field': {'fieldPath': '__name__'}, 'direction': 'ASCENDING'}],
            'limit': limit}
        if cursor:
            values = [{'timestampValue': cursor['time']}]
            if cursor.get('name'):
                values.append({'referenceValue': cursor['name']})
            # Include the initial server-time boundary; later cursors start strictly after a document.
            query['startAt'] = {'values': values, 'before': not bool(cursor.get('name'))}
        body = {'structuredQuery': query}
        if read_time:
            body['readTime'] = read_time
        rows = self.call(ROOT + ':runQuery', 'POST', body)
        return [row['document'] for row in rows if 'document' in row]


def order_key(cursor):
    timestamp = cursor['time']
    match = re.fullmatch(r'(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,9}))?Z', timestamp)
    if not match:
        raise RuntimeError('Unexpected timestamp; cursor was not advanced')
    return (match[1] + '.' + (match[2] or '').ljust(9, '0') + 'Z', cursor.get('name') or '')


def document_cursor(doc):
    return {'time': doc['fields']['createdAt']['timestampValue'], 'name': doc['name']}


def question_item(doc, source):
    fields = doc['fields']
    item = {'source': source, 'createdAt': document_cursor(doc)['time']}
    for field, maximum in (('topic', 80), ('question', 1000), ('displayName', 40)):
        value = fields.get(field, {}).get('stringValue', '')
        if not isinstance(value, str) or len(value) > maximum or (field != 'displayName' and not value):
            raise RuntimeError('Unexpected question fields; cursor was not advanced')
        item[field] = value
    return item


def scan(db, source, cursor, read_time):
    documents, full_boundaries = {}, []
    # Existing status/createdAt indexes cover these queries. Read at one snapshot
    # so a moderation transition cannot hide or double-count a new document.
    for status in STATUSES:
        rows = db.query(source, status, cursor, read_time)
        for doc in rows:
            documents[doc['name']] = doc
        if len(rows) == LIMIT:
            full_boundaries.append(order_key(document_cursor(rows[-1])))
    if not documents:
        return [], cursor
    boundary = min(full_boundaries) if full_boundaries else max(
        order_key(document_cursor(doc)) for doc in documents.values())
    included = sorted((doc for doc in documents.values() if order_key(document_cursor(doc)) <= boundary),
                      key=lambda doc: order_key(document_cursor(doc)))[:MAIL_LIMIT_PER_SOURCE]
    if not included:
        raise RuntimeError('No safe query progress; cursor was not advanced')
    # Bound the private outbox/email. Advance only through the included records;
    # a backlog remains eligible for the next run, including equal timestamps.
    return [question_item(doc, source) for doc in included], document_cursor(included[-1])


def mail_configuration():
    api_key = os.environ.get('BREVO_API_KEY', '').strip()
    recipient = os.environ.get('QUESTION_NOTIFY_TO', '').strip()
    if not api_key or not re.fullmatch(r'[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+', recipient):
        raise RuntimeError('Set BREVO_API_KEY and QUESTION_NOTIFY_TO in GitHub Actions secrets')
    return api_key, recipient


def mail_body(batch, recipient):
    verification = batch['kind'] == 'verification'
    counts = batch.get('counts', {})
    subject = ('DainyelOnTheMove — Vraagmeldingen zijn gekoppeld' if verification else
               'DainyelOnTheMove — Nieuwe vragen op je website')
    text = ('Dit is de eenmalige verbindingscontrole voor je vraagmeldingen. '
            'Er zijn geen bezoekersvragen aangemaakt.' if verification else
            f"Er zijn nieuwe vragen binnengekomen: {counts.get('questions', 0)} aan jou en "
            f"{counts.get('communityThreads', 0)} voor de community. "
            'Open je admin om ze te lezen en te beoordelen. Vraaginhoud blijft privé.')
    sections, html_sections = [], []
    # Legacy prepared outboxes retain their original count-only payload and key.
    # New outboxes freeze complete text before the first provider attempt.
    for item in batch.get('items', []):
        title = SOURCE_LABELS[item['source']]
        nickname = item['displayName'] or 'Geen bijnaam opgegeven'
        detail = f"Onderwerp: {item['topic']}\nBijnaam: {nickname}\nOntvangen (UTC): {item['createdAt']}"
        sections.append(title + '\n' + detail + '\n\n' + item['question'])
        html_sections.append('<section><h2>' + escape(title) + '</h2><p>' +
            escape(detail).replace('\n', '<br>') + '</p><p style="white-space:pre-wrap">' +
            escape(item['question']) + '</p></section>')
    if sections:
        text = text.replace('Open je admin om ze te lezen en te beoordelen.',
                            'Hieronder staan de volledige vragen. Open je admin om ze te beoordelen.')
    return {'sender': {'name': 'Dainyel on the Move', 'email': 'postcards@dainyelonthemove.com'},
            'to': [{'email': recipient}], 'subject': subject,
            'textContent': '\n\n'.join([text, *sections, 'Open je admin: ' + ADMIN]),
            'htmlContent': '<html lang="nl"><body style="font-family:Arial,sans-serif;color:#0c1b25">'
                '<h1>Je website desk</h1><p>' + escape(text) + '</p>' + ''.join(html_sections) + '<p><a href="' + ADMIN + '">'
                'Open je admin</a></p></body></html>',
            'headers': {'idempotencyKey': batch['id']}, 'tags': ['website-question-alert']}


def send(batch):
    api_key, recipient = mail_configuration()
    result = request('Brevo', 'https://api.brevo.com/v3/smtp/email',
                     {'api-key': api_key, 'Content-Type': 'application/json'}, 'POST', mail_body(batch, recipient))
    message_id = result.get('messageId')
    if not isinstance(message_id, str) or not message_id:
        raise RuntimeError('Brevo acceptance was ambiguous; outbox held for review')
    return message_id[:500]


def complete(db, snapshot, message_id):
    state = snapshot['data']
    batch = state['pending']
    if batch['kind'] == 'questions':
        state['cursors'] = batch['nextCursors']
    else:
        state['verificationAccepted'] = True
    state['lastAccepted'] = {'batchId': batch['id'], 'messageId': message_id,
                             'kind': batch['kind'], 'counts': batch.get('counts', {})}
    state['pending'] = None
    db.save(state, snapshot)
    print('Notification accepted by Brevo (queued); inbox delivery is not yet verified.')


def deliver(db, snapshot):
    state = snapshot['data']
    batch = state['pending']
    if batch['status'] == 'attempted':
        attempted = datetime.fromisoformat(batch['firstAttemptAt'].replace('Z', '+00:00'))
        age = (datetime.now(timezone.utc) - attempted).total_seconds()
        # Provider TTL is 30 minutes. Stop well before it expires; do not silently
        # retry an uncertain delivery after the provider might forget its key.
        if age < 0 or age > 25 * 60:
            raise RuntimeError('Uncertain previous send: reconcile the private outbox with Brevo logs; no resend attempted')
    else:
        batch['status'] = 'attempted'
        batch['firstAttemptAt'] = snapshot['clock']
        snapshot = db.save(state, snapshot)
    try:
        message_id = send(batch)
    except RemoteError as error:
        if error.code == 'duplicate_parameter':
            # This unique outbox key was already accepted during the TTL.
            complete(db, snapshot, 'provider-idempotency-confirmed')
            return
        if 400 <= error.status < 500:
            # A definite rejection is safe to retry on a later run/quota reset.
            batch['status'] = 'prepared'
            batch.pop('firstAttemptAt', None)
            db.save(state, snapshot)
        raise
    complete(db, snapshot, message_id)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mode', choices=['check', 'initialize', 'notify', 'verification'], default='check')
    mode = parser.parse_args().mode
    db = Firestore()
    if mode == 'check':
        metadata = db.call(f'projects/{PROJECT}/databases/{DATABASE}')
        if metadata.get('databaseEdition') != 'ENTERPRISE' or not metadata.get('freeTier'):
            raise RuntimeError('Database edition/free-tier changed; review before activation')
        for source in SOURCES:
            for status in STATUSES:
                db.query(source, status, limit=1)
        print('Existing database, IAM read access and six indexed query shapes are accessible; no state written or mail sent.')
        print('Mail credentials: ' + ('configured' if all(os.environ.get(k) for k in ['BREVO_API_KEY', 'QUESTION_NOTIFY_TO']) else 'not configured'))
        return
    mail_configuration()  # Fail before creating/updating state if mail is unconfigured.
    snapshot = db.read()
    if mode == 'initialize':
        if snapshot and snapshot['data'].get('initialized'):
            print('Already initialized. Existing cursors preserved; no historic questions replayed.')
            return
        if snapshot is None:
            snapshot = db.save({'version': 1, 'initialized': False, 'pending': None}, None)
        state = snapshot['data']
        state['cursors'] = {source: {'time': snapshot['clock']} for source in SOURCES}
        state['initialized'] = True
        db.save(state, snapshot)
        print('Initialized from server time. Earlier questions are not emailed.')
        return
    if not snapshot or not snapshot['data'].get('initialized'):
        raise RuntimeError('Run initialize once before enabling scheduled notifications')
    state = snapshot['data']
    if state.get('pending'):
        if mode == 'verification' and state['pending']['kind'] != 'verification':
            raise RuntimeError('A real question outbox is pending; use notify to resume it first')
        deliver(db, snapshot)
        return
    if mode == 'verification':
        if state.get('verificationAccepted'):
            print('Verification mail was already accepted; no duplicate sent.')
            return
        state['pending'] = {'id': str(uuid.uuid4()), 'kind': 'verification', 'status': 'prepared'}
    else:
        # Obtain a single server snapshot for all status queries.
        snapshot = db.save(state, snapshot)
        counts, next_cursors, items = {}, {}, []
        for source in SOURCES:
            source_items, next_cursors[source] = scan(db, source, state['cursors'][source], snapshot['clock'])
            counts[source] = len(source_items)
            items.extend(source_items)
        if not sum(counts.values()):
            print('No new questions; no email sent.')
            return
        state['pending'] = {'id': str(uuid.uuid4()), 'kind': 'questions', 'status': 'prepared',
                            'counts': counts, 'nextCursors': next_cursors, 'items': items}
    snapshot = db.save(state, snapshot)
    deliver(db, snapshot)


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, RemoteError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception:
        # No traceback: response objects, private cursors and environment must
        # never leak into logs of this public repository.
        print('Notification worker stopped safely; inspect configuration and private outbox without publishing its contents.', file=sys.stderr)
        sys.exit(1)
