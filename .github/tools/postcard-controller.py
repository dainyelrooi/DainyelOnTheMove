#!/usr/bin/env python3
"""Reconcile private Postcards using GET-only Brevo observations.

The mailJob is also the calendar receipt: one immutable draft ID, one event.
No send, create, update, cancel or schedule endpoint is reachable here.
"""
import argparse
from datetime import datetime, timezone, timedelta
import hashlib
from html.parser import HTMLParser
import importlib.util
import json
import os
from pathlib import Path
import re
import time
import unicodedata

spec = importlib.util.spec_from_file_location('controller_delivery', Path(__file__).with_name('postcard-delivery.py'))
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
ROOT = d.ROOT
MAIL_ID = re.compile(r'mail-[a-f0-9]{32}')


class Review(ValueError):
    pass


def values(document):
    return {key: d.unpack(value) for key, value in (document or {}).get('fields', {}).items()}


def normal(value):
    if not isinstance(value, str):
        return ''
    return ' '.join(unicodedata.normalize('NFKC', value or '').casefold().split())


def subject_hash(value):
    return hashlib.sha256(normal(value).encode()).hexdigest()


def instant(value):
    if not isinstance(value, str):
        raise Review('provider-date-missing')
    try:
        result = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if result.tzinfo is None or not 2020 <= result.year <= 2100:
            raise ValueError()
        return result.astimezone(timezone.utc)
    except ValueError:
        raise Review('provider-date-invalid') from None


class Provider:
    """Only reads; retry bounded transient failures, never provider mutations."""
    def __init__(self):
        self.calls = 0
        self.listed = None

    def get(self, path):
        if not re.fullmatch(r'emailCampaigns(?:/[1-9][0-9]*)?(?:\?[A-Za-z0-9=&]+)?', path):
            raise Review('provider-read-route-invalid')
        for attempt in range(3):
            if self.calls >= 90:
                raise Review('provider-read-budget')
            self.calls += 1
            try:
                return d.brevo(path)  # default GET; there is no method argument.
            except d.ProviderError as error:
                wait = max(2 ** attempt, getattr(error, 'retry_after', 0))
                if not error.retryable or attempt == 2 or wait > 20:
                    raise
                time.sleep(wait)

    def campaign(self, identifier):
        if type(identifier) is not int or identifier < 1:
            raise Review('campaign-id-missing')
        result = self.get('emailCampaigns/' + str(identifier))
        if not isinstance(result, dict):
            raise Review('provider-campaign-invalid')
        return result

    def campaigns(self):
        if self.listed is not None:
            return self.listed
        result = []
        for offset in range(0, 500, 100):
            response = self.get('emailCampaigns?limit=100&offset=' + str(offset) + '&sort=desc&excludeHtmlContent=true')
            rows = response.get('campaigns') if isinstance(response, dict) else None
            if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
                raise Review('provider-list-invalid')
            result.extend(rows)
            if len(rows) < 100:
                self.listed = result
                return result
        raise Review('provider-discovery-bound')


class Text(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.words, self.links, self.skip = [], [], 0

    def handle_starttag(self, tag, attrs):
        if tag in {'script', 'style'}:
            self.skip += 1
        if not self.skip and tag == 'a':
            self.links.extend(value for key, value in attrs if key == 'href' and value)
        if not self.skip and tag in {'br', 'p', 'div', 'td'}:
            self.words.append(' ')

    def handle_endtag(self, tag):
        if tag in {'script', 'style'} and self.skip:
            self.skip -= 1
        if not self.skip:
            self.words.append(' ')

    def handle_data(self, data):
        if not self.skip:
            self.words.append(data)


def content_matches(payload, campaign):
    if not isinstance(campaign.get('htmlContent'), str) or not isinstance(payload.get('body'), str):
        return False
    parser = Text()
    parser.feed(campaign.get('htmlContent') or '')
    # Match the actual message and CTA, never a subject alone. Formatting is
    # rendered by the exact existing email renderer before normalization.
    expected = Text()
    expected.feed(d.format_paragraph(payload.get('body', '')))
    body = normal(''.join(expected.words))
    return len(body) >= 40 and body in normal(''.join(parser.words)) and payload.get('ctaUrl') in parser.links


def identity(job, identifier, campaign):
    campaign_id = campaign.get('id')
    if type(campaign_id) is not int or campaign_id < 1 or job.get('campaignId') != campaign_id:
        raise Review('campaign-receipt-mismatch')
    sender = campaign.get('sender')
    if not isinstance(sender, dict) or normal(sender.get('email')) != d.SENDER:
        raise Review('campaign-sender-mismatch')
    if subject_hash(campaign.get('subject')) != subject_hash(job.get('payload', {}).get('subject')):
        raise Review('campaign-subject-mismatch')
    if campaign.get('name') == 'Website Postcard ' + identifier:
        return 'managed-id'
    binding = job.get('binding', {})
    if binding.get('campaignId') == campaign_id and binding.get('subjectHash') == subject_hash(campaign.get('subject')) and binding.get('kind') in {'owner-link', 'content-match'}:
        return binding['kind']
    raise Review('campaign-identity-unconfirmed')


def evaluate(job, identifier, campaign, now):
    kind = identity(job, identifier, campaign)
    prior = job.get('provider', {})
    status = campaign.get('status') if isinstance(campaign.get('status'), str) else 'unknown'
    result = {**prior, 'version': 1, 'state': 'pending', 'status': status if status in {
        'draft', 'queued', 'scheduled', 'sent', 'suspended', 'archive', 'inProcess', 'processing', 'accepted', 'failed'} else 'unknown',
        'identity': kind, 'checkedAt': now.isoformat(), 'lastSuccessAt': now.isoformat(), 'error': ''}
    if status == 'sent':
        sent = instant(campaign.get('sentDate'))
        if sent > now + timedelta(minutes=5):
            raise Review('provider-sent-date-future')
        if prior.get('sentAt') and instant(prior['sentAt']) != sent:
            raise Review('provider-sent-date-changed')
        result.update(state='sent', sentAt=sent.isoformat(), calendarAt=sent.isoformat())
        if campaign.get('scheduledAt'):
            result['scheduledAt'] = instant(campaign['scheduledAt']).isoformat()
        result['nextCheckAt'] = (now + timedelta(days=1 if now - sent < timedelta(days=7) else 7)).isoformat()
    elif status == 'queued' and job.get('action') == 'send' and not job.get('approvedScheduledAt') and not prior.get('sentAt'):
        # Send-now requests have no owner-approved future schedule. A normal
        # provider queue waits for actual Sent, without inventing a calendar
        # time or reporting an ordinary processing delay as a date mismatch.
        result['nextCheckAt'] = (now + timedelta(minutes=5)).isoformat()
    elif status in {'queued', 'scheduled'}:
        scheduled = instant(campaign.get('scheduledAt'))
        expected = instant(job.get('approvedScheduledAt') or job.get('scheduledAt'))
        if scheduled != expected:
            raise Review('provider-schedule-mismatch')
        if scheduled <= now:
            result.update(error='provider-send-not-confirmed', nextCheckAt=(now + timedelta(minutes=5)).isoformat())
        else:
            # Brevo represents native future schedules as queued. Both the
            # provider-owned future date and its exact approval must match.
            result.update(state='scheduled', scheduledAt=scheduled.isoformat(), calendarAt=scheduled.isoformat(),
                nextCheckAt=min(now + timedelta(minutes=30), scheduled + timedelta(minutes=1)).isoformat())
    elif status in {'failed', 'suspended', 'archive'}:
        result.update(state='failed', error='provider-' + status, nextCheckAt=(now + timedelta(minutes=30)).isoformat())
    else:
        result.update(error='provider-status-unconfirmed', nextCheckAt=(now + timedelta(minutes=5)).isoformat())
    # A historical sent receipt is never rewritten as Draft/Queued, and the
    # immutable actual send date survives provider regressions and outages.
    if prior.get('sentAt') and result['state'] != 'sent':
        result.update(state='review', error='provider-sent-status-changed', calendarAt=prior['sentAt'])
    return result


class Store(d.Store):
    def page(self, space, kind, after='', count=25, due=None):
        field = 'provider.nextCheckAt' if due else '__name__'
        query = {'from': [{'collectionId': kind}], 'orderBy': [{'field': {'fieldPath': field}, 'direction': 'ASCENDING'}], 'limit': count}
        if due:
            query['where'] = {'fieldFilter': {'field': {'fieldPath': field}, 'op': 'LESS_THAN_OR_EQUAL', 'value': d.pack(due.isoformat())}}
        elif after:
            query['startAt'] = {'values': [{'referenceValue': ROOT + '/cmsSpaces/' + space + '/' + kind + '/' + after}], 'before': False}
        rows = self.call(ROOT + '/cmsSpaces/' + space + ':runQuery', 'POST', {'structuredQuery': query})
        return [row['document'] for row in rows if 'document' in row]

    def persist(self, document, job, provider, space, now, draft=None):
        identifier = document['name'].split('/')[-1]
        prior = values(document)
        fields = dict(document.get('fields', {}))
        if not prior.get('provider') and document.get('updateTime'):
            baseline_path = document['name'] + '/providerHistory/baseline'
            baseline = self.optional(baseline_path)
        else:
            baseline_path, baseline = '', None
        job['provider'] = provider
        if provider['state'] in {'sent', 'scheduled'} and not provider.get('error'):
            job.update(status=provider['state'], phase='complete', providerOnly=True)
        elif job.get('campaignId') or job.get('binding'):
            # A verified creation receipt before the first dispatch is still
            # the same approved request. Let the separate sender re-read it
            # and complete that first dispatch safely; never create again.
            # Any attempted dispatch or external/manual binding is read-only.
            before_dispatch = (provider['state'] == 'pending'
                and job.get('status') in {'queued', 'processing'}
                and job.get('phase') in {'ready', 'created', 'create-attempted'}
                and job.get('action') in {'send', 'schedule', 'after-publication'}
                and not job.get('providerOnly') and not job.get('binding'))
            if not before_dispatch:
                job.update(status='accepted' if provider['state']=='pending' and not provider.get('error') else 'review', providerOnly=True)
        # Preserve REST timestamp types and every unchanged original field.
        # unpack() deliberately returns date strings; repacking the entire
        # job would turn its indexed scheduledAt/createdAt into strings.
        fields.update({key: d.pack(value) for key, value in job.items() if key not in fields or value != prior.get(key)})
        writes = [{'update': {'name': document['name'], 'fields': fields},
            'updateTransforms': [{'fieldPath': 'updatedAt', 'setToServerValue': 'REQUEST_TIME'}],
            'currentDocument': {'updateTime': document['updateTime']} if document.get('updateTime') else {'exists': False}}]
        if baseline_path and not baseline:
            writes.append({'update': {'name': baseline_path, 'fields': {'before': d.pack(prior), 'beforeDocumentJson': d.pack(json.dumps(document, ensure_ascii=False)), 'at': d.pack(now.isoformat())}}, 'currentDocument': {'exists': False}})
        if draft:
            writes.append({'update': {'name': draft['name'], 'fields': draft['fields']}, 'currentDocument': {'updateTime': draft['updateTime']}})
        campaign_id = job.get('campaignId')
        if campaign_id and provider.get('identity'):
            mapping_path = ROOT + '/cmsSpaces/' + space + '/mailCampaigns/' + str(campaign_id)
            mapping = self.optional(mapping_path)
            if mapping and values(mapping).get('draftId') != identifier:
                provider.update(state='review', error='campaign-already-linked', identity='')
                for key in ['calendarAt', 'scheduledAt', 'sentAt']:
                    if key in prior.get('provider', {}):
                        provider[key] = prior['provider'][key]
                    else:
                        provider.pop(key, None)
                writes[0]['update']['fields'].update(status=d.pack('review'), provider=d.pack(provider), providerOnly=d.pack(True))
            if not mapping:
                writes.append({'update': {'name': mapping_path, 'fields': {key: d.pack(value) for key, value in {
                    'version': 1, 'campaignId': campaign_id, 'draftId': identifier, 'linkedAt': now.isoformat()}.items()}}, 'currentDocument': {'exists': False}})
        # Keep complete immutable state transitions privately. Unchanged polls
        # update the current receipt but do not create duplicate history rows.
        material = {key: provider.get(key, '') for key in ['state', 'status', 'scheduledAt', 'sentAt', 'calendarAt', 'error', 'identity']}
        material['campaignId'] = campaign_id or 0
        old = prior.get('provider', {})
        if any(material.get(key, '') != (prior.get('campaignId', 0) if key == 'campaignId' else old.get(key, '')) for key in material):
            digest = hashlib.sha256((old.get('eventId', '') + json.dumps(material, sort_keys=True)).encode()).hexdigest()
            provider['eventId'] = digest
            writes[0]['update']['fields']['provider'] = d.pack(provider)
            event_path = document['name'] + '/providerHistory/' + digest
            if not self.optional(event_path):
                writes.append({'update': {'name': event_path, 'fields': {key: d.pack(value) for key, value in {**material, 'at': now.isoformat()}.items()}}, 'currentDocument': {'exists': False}})
        self.call(ROOT + ':commit', 'POST', {'writes': writes})
        self.last_result = provider


def discover(provider, job, identifier):
    rows = provider.campaigns()
    names = [row for row in rows if row.get('name') == 'Website Postcard ' + identifier]
    if len(names) > 1:
        raise Review('campaign-identity-ambiguous')
    if len(names) == 1:
        return provider.campaign(names[0]['id']), None
    candidates = [row for row in rows if isinstance(row.get('sender'), dict) and normal(row['sender'].get('email')) == d.SENDER and subject_hash(row.get('subject')) == subject_hash(job.get('payload', {}).get('subject'))]
    if not candidates:
        return None, None
    if len(candidates) != 1:
        raise Review('manual-link-required')
    campaign = provider.campaign(candidates[0]['id'])
    if not content_matches(job['payload'], campaign):
        raise Review('manual-link-required')
    return campaign, {'version': 1, 'kind': 'content-match', 'campaignId': campaign['id'], 'subjectHash': subject_hash(campaign.get('subject'))}


def reconcile(store, provider, document, space, now, draft=None, link=None):
    identifier = document['name'].split('/')[-1]
    job = values(document)
    if not MAIL_ID.fullmatch(identifier) or job.get('draftId') != identifier:
        raise Review('postcard-id-invalid')
    if job.get('status') == 'cancelled':
        return False
    prior = job.get('provider', {})
    original_job = dict(job)
    if not link and prior.get('nextCheckAt') and instant(prior['nextCheckAt']) > now:
        return False
    try:
        if link:
            if not draft or link.get('draftId') != identifier or link.get('draftRevision') != values(draft).get('revision'):
                raise Review('manual-link-draft-changed')
            campaign = provider.campaign(link['campaignId'])
            expected_hash = link.get('subjectHash') or subject_hash(values(draft).get('subject'))
            if expected_hash != subject_hash(campaign.get('subject')) or expected_hash != subject_hash(job['payload']['subject']):
                raise Review('manual-link-subject-mismatch')
            if prior.get('sentAt') and job.get('campaignId') != campaign['id']:
                raise Review('sent-campaign-link-immutable')
            job.update(campaignId=campaign['id'], binding={'version': 1, 'kind': 'owner-link', 'campaignId': campaign['id'], 'subjectHash': expected_hash},
                linkRevision=link.get('revision', 1), linkedDraftRevision=link['draftRevision'])
            if link.get('approvedScheduledAt'):
                job['approvedScheduledAt'] = instant(link['approvedScheduledAt']).isoformat()
        elif job.get('campaignId'):
            campaign = provider.campaign(job['campaignId'])
        else:
            campaign, binding = discover(provider, job, identifier)
            if not campaign:
                return False
            job['campaignId'] = campaign['id']
            if binding:
                job['binding'] = binding
            if job.get('action') == 'external' and campaign.get('scheduledAt'):
                job['approvedScheduledAt'] = instant(campaign['scheduledAt']).isoformat()
        result = evaluate(job, identifier, campaign, now)
    except (Review, d.ProviderError) as error:
        job = original_job
        code = str(error) if isinstance(error, Review) else d.safe_failure_code(error)
        result = {**prior, 'version': 1, 'state': 'review' if isinstance(error, Review) else 'pending',
            'checkedAt': now.isoformat(), 'error': code, 'nextCheckAt': (now + timedelta(minutes=10)).isoformat()}
        # Preserve the evidence/date of an already confirmed send on failures.
        if prior.get('sentAt'):
            result.update(state='review', calendarAt=prior['sentAt'])
    store.persist(document, job, result, space, now, draft)
    return True


def repair_existing(store, provider, repairs, now):
    """Explicit owner-requested metadata repairs; no deployment/provider action.

    Exact IDs + subject hashes + explicit schedule for a future manual link.
    Existing job and full baseline remain private. No deletion or dispatch.
    """
    if not isinstance(repairs, list) or not 1 <= len(repairs) <= 3:
        raise Review('repair-selection-invalid')
    seen = set()
    prepared = []
    for item in repairs:
        if set(item) - {'draftId', 'campaignId', 'subjectHash', 'approvedScheduledAt'} or not MAIL_ID.fullmatch(item.get('draftId', '')) or item['draftId'] in seen:
            raise Review('repair-selection-invalid')
        seen.add(item['draftId'])
        path = ROOT + '/cmsSpaces/production/mailJobs/' + item['draftId']
        row = store.optional(path)
        draft = store.optional(path.replace('/mailJobs/', '/mailDrafts/'))
        if not row or not draft or subject_hash(values(draft).get('subject')) != item.get('subjectHash'):
            raise Review('repair-identity-unconfirmed')
        campaign = provider.campaign(item['campaignId'])
        candidate = {**values(row), 'campaignId': item['campaignId'], 'binding': {'kind': 'owner-link', 'campaignId': item['campaignId'], 'subjectHash': item['subjectHash']}}
        if item.get('approvedScheduledAt'):
            candidate['approvedScheduledAt'] = item['approvedScheduledAt']
        result = evaluate(candidate, item['draftId'], campaign, now)
        if result['state'] not in {'sent', 'scheduled'} or result.get('error'):
            raise Review('repair-provider-not-confirmed')
        link = {**item, 'draftRevision': values(draft)['revision'], 'revision': values(row).get('linkRevision', 0) + 1}
        prepared.append((row, draft, link))
    for row, draft, link in prepared:
        reconcile(store, provider, row, 'production', now, draft=draft, link=link)
        saved = values(store.optional(row['name']))
        if saved.get('provider', {}).get('state') not in {'sent', 'scheduled'} or saved['provider'].get('error'):
            raise Review('repair-readback-unconfirmed')
    print('Exact owner-selected existing records reconciled. No provider mutation or deletion.')


def draft_job(draft, space, now):
    data = values(draft)
    identifier = draft['name'].split('/')[-1]
    fields = {key: d.pack(value) for key, value in {
        'version': 1, 'draftId': identifier, 'draftRevision': data['revision'], 'payload': {key: data[key] for key in d.FIELDS},
        'status': 'review', 'action': 'external', 'providerOnly': True}.items()}
    fields.update({key: {'timestampValue': now.isoformat()} for key in ['scheduledAt', 'createdAt']})
    return {'name': ROOT + '/cmsSpaces/' + space + '/mailJobs/' + identifier, 'fields': fields}


def sweep(store, provider, space, now):
    api = d.SimpleNamespace(ROOT=ROOT, pack=d.pack, unpack=d.unpack, date=d.date)
    receipt = d.operations.claim(api, store, space, 'postcardSweep', 'current', now)
    if not receipt:
        return
    status_path = ROOT + '/adminOperations/' + space + '/status/postcards'
    previous = store.optional(status_path)
    progress = values(previous)
    checked = 0
    review_count = 0
    pending_count = 0
    outage_count = 0
    def check(document, **kwargs):
        nonlocal checked, review_count, pending_count, outage_count
        # Share the mutation worker's per-mail lease. A controller must not
        # classify a just-created draft while its approved dispatch is in
        # flight, or replace that worker's current CAS snapshot.
        lease = d.operations.claim(api, store, space, 'mail', document['name'].split('/')[-1], now)
        if not lease:
            return
        try:
            current = store.optional(document['name']) or document
            if reconcile(store, provider, current, space, now, **kwargs):
                checked += 1
                result = store.last_result
                review_count += bool(result.get('error'))
                pending_count += result['state'] == 'pending'
                outage_count += result.get('error', '').startswith(('provider-http-', 'provider-unavailable'))
            d.operations.finish(api, store, lease, now, 'observed')
        except Exception:
            d.operations.finish(api, store, lease, now, 'retrying', 'provider-or-storage-unavailable')
            raise
    try:
        jobs = store.page(space, 'mailJobs', progress.get('jobCursor', ''))
        drafts = store.page(space, 'mailDrafts', progress.get('draftCursor', ''), count=10)
        due = store.page(space, 'mailJobs', due=now)
        pending_links = store.page(space, 'mailLinks', progress.get('linkCursor', ''))
        selected = {row['name']: row for row in jobs + due}
        for request in pending_links:
            link = values(request)
            path = ROOT + '/cmsSpaces/' + space + '/mailJobs/' + request['name'].split('/')[-1]
            row = store.optional(path)
            if row and values(row).get('linkRevision', 0) >= link.get('revision', 0):
                continue
            draft = store.optional(path.replace('/mailJobs/', '/mailDrafts/'))
            if draft:
                check(row or draft_job(draft, space, now), draft=draft, link=link)
                selected.pop(path, None)
        for row in selected.values():
            check(row)
        for draft in drafts:
            path = draft['name'].replace('/mailDrafts/', '/mailJobs/')
            if store.optional(path):
                continue
            check(draft_job(draft, space, now), draft=draft)
        outage_runs = progress.get('outageRuns', 0)
        if checked:
            outage_runs = outage_runs + 1 if outage_count == checked else 0
        state = ('needs-review' if review_count else 'healthy') if checked else progress.get('state', 'healthy')
        changes = {'version': 1, 'state': state, 'lastRunAt': now.isoformat(), 'outageRuns': outage_runs,
            'checkedCount': checked, 'reviewCount': review_count if checked else progress.get('reviewCount', 0),
            'pendingCount': pending_count if checked else progress.get('pendingCount', 0),
            'lastError': 'provider-unavailable' if outage_count else '', 'jobCursor': jobs[-1]['name'].split('/')[-1] if len(jobs) == 25 else '',
            'draftCursor': drafts[-1]['name'].split('/')[-1] if len(drafts) == 10 else '',
            'linkCursor': pending_links[-1]['name'].split('/')[-1] if len(pending_links) == 25 else ''}
        if checked and not outage_count:
            changes['lastSuccessAt'] = now.isoformat()
        d.operations.write(api, store, status_path, changes, previous)
        if outage_count:
            print('::warning::Provider status is temporarily unavailable. Private receipts remain visible for a later read-only check.')
        if outage_runs >= 3:
            raise Review('provider-outage-persistent')
        d.operations.finish(api, store, receipt, now, 'checked', wait_seconds=300)
    except Exception as error:
        code = d.safe_failure_code(error)
        d.operations.finish(api, store, receipt, now, 'retrying', code)
        raise
    print('Bounded GET-only Postcard reconciliation complete. No provider mutation.')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--space', choices=['staging', 'production'], default='staging')
    args = parser.parse_args()
    expected = 'refs/heads/main' if args.space == 'production' else 'refs/heads/staging'
    if os.environ.get('GITHUB_REF') != expected or os.environ.get('REPOSITORY_VISIBILITY') != 'public':
        raise Review('controller-environment-mismatch')
    # Production execution starts only with the owner-approved main release.
    # Read-only reconciliation remains independent of the sender's enable flag.
    store = Store()
    d.require_free_database(store)
    sweep(store, Provider(), args.space, datetime.now(timezone.utc))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        raise SystemExit('Postcard reconciliation unavailable: ' + (str(error) if isinstance(error, Review) else d.safe_failure_code(error))) from None
