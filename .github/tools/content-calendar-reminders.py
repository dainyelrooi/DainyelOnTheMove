#!/usr/bin/env python3
"""Private day-before owner reminders. No plan text, links or keys in job logs."""
import argparse
from datetime import datetime, timezone, timedelta
from html import escape
import importlib.util
import json
from pathlib import Path
import sys
import uuid
from zoneinfo import ZoneInfo

spec = importlib.util.spec_from_file_location('question_mail_helpers', Path(__file__).with_name('question-notifications.py'))
helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)
ROOT = helpers.ROOT
STATE = ROOT + '/_automation/contentCalendarEmail'
SETTINGS = ROOT + '/contentCalendarSettings/reminders'
DELIVERY = ROOT + '/contentCalendarSettings/delivery'
ADMIN = 'https://dainyelonthemove.com/admin#admin-content'
ZONE = ZoneInfo('Europe/Amsterdam')
LIMIT = 200
notify_requested = False


class CalendarStore(helpers.Firestore):
    def optional(self, path):
        try:
            return self.call(path)
        except helpers.RemoteError as error:
            if error.status == 404:
                return None
            raise

    def state(self):
        document = self.optional(STATE)
        if document is None:
            return None
        data = json.loads(document['fields']['stateJson']['stringValue'])
        if data.get('version') != 1:
            raise RuntimeError('Unsupported calendar reminder state; owner review required')
        return {'data': data, 'updateTime': document['updateTime'],
                'clock': document['fields']['clockAt']['timestampValue']}

    def save_state(self, data, previous):
        condition = {'exists': False} if previous is None else {'updateTime': previous['updateTime']}
        response = self.call(ROOT + ':commit', 'POST', {'writes': [{
            'update': {'name': STATE, 'fields': {'stateJson': {'stringValue': json.dumps(data, ensure_ascii=False, separators=(',', ':'))}}},
            'updateTransforms': [{'fieldPath': 'clockAt', 'setToServerValue': 'REQUEST_TIME'}],
            'currentDocument': condition}]})
        result = response['writeResults'][0]
        return {'data': data, 'updateTime': result['updateTime'], 'clock': result['transformResults'][0]['timestampValue']}

    def enabled(self):
        document = self.optional(SETTINGS)
        fields = document.get('fields', {}) if document else {}
        return (fields.get('enabled', {}).get('booleanValue') is True
                and fields.get('timezone', {}).get('stringValue') == 'Europe/Amsterdam'
                and fields.get('localHour', {}).get('integerValue') == '9')

    def posts(self):
        projection = '&'.join('mask.fieldPaths=' + name for name in
            ['version', 'title', 'publishAt', 'timezone', 'scheduled', 'published', 'remindersEnabled'])
        result = self.call(ROOT + f'/contentCalendar?pageSize={LIMIT + 1}&' + projection)
        rows = result.get('documents', [])
        if len(rows) > LIMIT or result.get('nextPageToken'):
            raise RuntimeError('Calendar exceeds the bounded reminder limit; owner review required')
        return rows

    def delivery(self, state):
        self.call(ROOT + ':commit', 'POST', {'writes': [{
            'update': {'name': DELIVERY, 'fields': {'state': {'stringValue': state}}},
            'updateTransforms': [{'fieldPath': 'checkedAt', 'setToServerValue': 'REQUEST_TIME'}]}]})


def due_item(document, day):
    fields = document['fields']
    if fields.get('version', {}).get('integerValue') != '1' or fields.get('timezone', {}).get('stringValue') != 'Europe/Amsterdam':
        raise RuntimeError('Unexpected calendar format; no reminder sent')
    if any(type(fields.get(name, {}).get('booleanValue')) is not bool for name in ['scheduled', 'published', 'remindersEnabled']):
        raise RuntimeError('Unexpected calendar checklist; no reminder sent')
    if fields['scheduled']['booleanValue'] or fields['published']['booleanValue'] or not fields['remindersEnabled']['booleanValue']:
        return None
    when = fields.get('publishAt', {}).get('timestampValue')
    title = fields.get('title', {}).get('stringValue')
    if not isinstance(title, str) or not 1 <= len(title) <= 160 or not isinstance(when, str):
        raise RuntimeError('Unexpected calendar post; no reminder sent')
    date = datetime.fromisoformat(when.replace('Z', '+00:00')).astimezone(ZONE)
    if date.date() != day + timedelta(days=1):
        return None
    return {'name': document['name'], 'title': title, 'publishAt': when}


def message(batch, recipient):
    text_rows, html_rows = [], []
    for item in batch['items']:
        when = datetime.fromisoformat(item['publishAt'].replace('Z', '+00:00')).astimezone(ZONE)
        label = when.strftime('%d-%m-%Y %H:%M') + ' (Nederlandse tijd)'
        text_rows.append(item['title'] + '\n' + label)
        html_rows.append('<li><strong>' + escape(item['title']) + '</strong><br>' + escape(label) + '</li>')
    intro = 'Deze posts staan voor morgen in je contentkalender, maar zijn nog niet als ingepland of gepubliceerd afgevinkt. Controleer eerst je bestaande planning in Instagram of Metricool om dubbel plaatsen te voorkomen.'
    return {
        'sender': {'name': 'Dainyel on the Move', 'email': 'postcards@dainyelonthemove.com'},
        'to': [{'email': recipient}],
        'subject': 'Je content voor morgen — nog even inplannen',
        'textContent': intro + '\n\n' + '\n\n'.join(text_rows) + '\n\nOpen je privékalender: ' + ADMIN + '\nVink je posts af of pas je herinneringen daar aan.',
        'htmlContent': '<html lang="nl"><body style="font-family:Arial,sans-serif;color:#0c1b25"><h1>Klaar voor morgen?</h1><p>' + escape(intro) + '</p><ul>' + ''.join(html_rows) + '</ul><p><a href="' + ADMIN + '">Open je privékalender</a></p><p>Vink je posts af of pas je herinneringen daar aan.</p></body></html>',
        'headers': {'idempotencyKey': batch['id']}, 'tags': ['owner-content-reminder']}


def finish(store, snapshot, message_id):
    data = snapshot['data']
    batch = data['pending']
    data['lastAcceptedDate'] = batch['day']
    # Keep only delivery metadata, not captions/titles, after acceptance.
    data['lastAccepted'] = {'id': batch['id'], 'messageId': message_id, 'count': len(batch['items'])}
    data['pending'] = None
    store.save_state(data, snapshot)
    store.delivery('accepted')
    print('One private owner reminder accepted by the provider; inbox delivery is not verified.')


def deliver(store, snapshot):
    data = snapshot['data']
    batch = data['pending']
    clock = datetime.fromisoformat(snapshot['clock'].replace('Z', '+00:00'))
    if batch['status'] == 'attempted':
        first = datetime.fromisoformat(batch['firstAttemptAt'].replace('Z', '+00:00'))
        age = (datetime.now(timezone.utc) - first).total_seconds()
        if age < 0 or age > 25 * 60:
            raise RuntimeError('Uncertain calendar mail attempt: reconcile the private outbox with the provider; no resend attempted')
    else:
        # Re-read current checkmarks just before attempting. Prepared reminders
        # are cancelled after their day or after the owner completes the posts.
        day = clock.astimezone(ZONE).date()
        current = []
        if str(day) == batch['day']:
            for item in batch['items']:
                latest = store.optional(item['name'])
                if latest:
                    candidate = due_item(latest, day)
                    if candidate:
                        current.append(candidate)
        if not current:
            data['pending'] = None
            store.save_state(data, snapshot)
            store.delivery('idle')
            print('Prepared reminder no longer needed; no email sent.')
            return
        batch['items'] = current
        batch['status'] = 'attempted'
        batch['firstAttemptAt'] = snapshot['clock']
        snapshot = store.save_state(data, snapshot)
    api_key, recipient = helpers.mail_configuration()
    try:
        response = helpers.request('Brevo', 'https://api.brevo.com/v3/smtp/email',
            {'api-key': api_key, 'Content-Type': 'application/json'}, 'POST', message(batch, recipient))
        message_id = response.get('messageId')
        if not isinstance(message_id, str) or not message_id:
            raise RuntimeError('Ambiguous provider acceptance; reminder held for review')
    except helpers.RemoteError as error:
        if error.code == 'duplicate_parameter':
            finish(store, snapshot, 'provider-idempotency-confirmed')
            return
        if error.status in {400, 401, 402, 403, 404, 405, 413, 415, 422, 429}:
            batch['status'] = 'prepared'
            batch.pop('firstAttemptAt', None)
            store.save_state(data, snapshot)
        raise
    finish(store, snapshot, message_id[:500])


def main():
    global notify_requested
    parser = argparse.ArgumentParser()
    parser.add_argument('--mode', choices=['check', 'notify'], default='check')
    mode = parser.parse_args().mode
    notify_requested = mode == 'notify'
    store = CalendarStore()
    if mode == 'check':
        metadata = store.call(f'projects/{helpers.PROJECT}/databases/{helpers.DATABASE}')
        if metadata.get('databaseEdition') != 'ENTERPRISE' or not metadata.get('freeTier'):
            raise RuntimeError('Existing database edition/free tier changed; review before activation')
        rows = store.posts()
        print(f'Existing private calendar is readable ({len(rows)} posts); email preference is ' + ('on.' if store.enabled() else 'off.'))
        print('No state written and no email sent.')
        return
    if not store.enabled():
        print('Calendar emails disabled; no state written and no email sent.')
        return
    helpers.mail_configuration()
    snapshot = store.state()
    data = snapshot['data'] if snapshot else {'version': 1, 'pending': None, 'lastAcceptedDate': ''}
    # Refresh server time and use CAS for all outbox transitions.
    snapshot = store.save_state(data, snapshot)
    if data.get('pending'):
        deliver(store, snapshot)
        return
    now = datetime.fromisoformat(snapshot['clock'].replace('Z', '+00:00')).astimezone(ZONE)
    day = now.date()
    if now.hour < 9 or data.get('lastAcceptedDate') == str(day):
        store.delivery('idle')
        print('Outside the reminder window or already reminded today; no email sent.')
        return
    items = [item for row in store.posts() if (item := due_item(row, day))]
    if not items:
        store.delivery('idle')
        print('No unfinished posts for tomorrow; no email sent.')
        return
    data['pending'] = {'id': str(uuid.uuid4()), 'day': str(day), 'status': 'prepared', 'items': items}
    snapshot = store.save_state(data, snapshot)
    if not store.enabled():
        print('Calendar emails turned off; prepared outbox retained without sending.')
        return
    deliver(store, snapshot)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        # Never print provider bodies, tracebacks, titles, credentials or routes.
        if notify_requested:
            try:
                CalendarStore().delivery('needs-review')
            except Exception:
                pass
        print('Calendar reminders stopped safely. Review the private delivery state; no uncertain email will be resent automatically.', file=sys.stderr)
        sys.exit(1)
