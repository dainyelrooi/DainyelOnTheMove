#!/usr/bin/env python3
"""Disposable real Firestore staging check with a forbidden Brevo transport.

Only clearly labelled synthetic records are created and cleaned up. Provider
responses are fixtures; this never tests subscriber delivery or inbox receipt.
"""
from datetime import datetime, timezone, timedelta
import importlib.util
import os
from pathlib import Path
import uuid

spec = importlib.util.spec_from_file_location('staging_fixture', Path(__file__).parents[1] / 'tests/test_postcard_controller.py')
fixture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture)
c = fixture.c


def forbidden(*args, **kwargs):
    raise AssertionError('No real Brevo request allowed in the staging fixture')


def main():
    if os.environ.get('GITHUB_REF') != 'refs/heads/staging':
        raise RuntimeError('Staging branch required')
    c.d.brevo = forbidden
    store = c.Store()
    c.d.require_free_database(store)
    now = datetime.now(timezone.utc)
    identifier = 'mail-' + uuid.uuid4().hex
    base = c.ROOT + '/cmsSpaces/staging'
    draft_path, job_path = base + '/mailDrafts/' + identifier, base + '/mailJobs/' + identifier
    provider_id = 2026111201
    mapping_path = base + '/mailCampaigns/' + str(provider_id)
    if any(store.optional(path) for path in [draft_path, job_path, mapping_path]):
        raise RuntimeError('Fixture paths already exist; no overwrite')
    due = (now + timedelta(days=1)).isoformat()
    payload = {**fixture.PAYLOAD, 'subject': 'ISOLATED STAGING CONTROLLER CHECK — NOT A REAL CAMPAIGN'}
    data = {'version': 1, **payload, 'revision': 1}
    draft_fields = {key: c.d.pack(value) for key, value in data.items()}
    draft_fields.update({key: {'timestampValue': now.isoformat()} for key in ['createdAt', 'updatedAt']})
    request = {'version': 1, 'draftId': identifier, 'draftRevision': 1, 'payload': payload,
        'action': 'schedule', 'status': 'queued', 'providerOnly': True, 'campaignId': provider_id,
        'scheduledAt': due, 'createdAt': now.isoformat()}
    try:
        store.call(c.ROOT + ':commit', 'POST', {'writes': [
            {'update': {'name': draft_path, 'fields': draft_fields}, 'currentDocument': {'exists': False}},
            {'update': {'name': draft_path + '/history/r1', 'fields': {'version': c.d.pack(1), 'content': {'mapValue': {'fields': draft_fields}}, 'savedAt': {'timestampValue': now.isoformat()}}}, 'currentDocument': {'exists': False}},
            {'update': {'name': job_path, 'fields': {key: c.d.pack(value) for key, value in request.items()}}, 'currentDocument': {'exists': False}}]})
        draft, row = store.optional(draft_path), store.optional(job_path)
        assert c.values(draft)['subject'] == payload['subject']
        provider = fixture.Provider([{**fixture.campaign(), 'id': provider_id, 'name': 'Website Postcard ' + identifier,
            'subject': payload['subject'], 'scheduledAt': due}])
        c.reconcile(store, provider, row, 'staging', now)
        first = c.values(store.optional(job_path))
        assert first['provider']['state'] == 'scheduled' and not first['provider'].get('sentAt')
        assert c.instant(first['provider']['calendarAt']) == c.instant(due)
        c.reconcile(store, provider, store.optional(job_path), 'staging', now + timedelta(minutes=31))
        second = c.values(store.optional(job_path))
        assert second['campaignId'] == provider_id and second['draftId'] == identifier
        provider.rows[0].update(status='sent', sentDate=due)
        c.reconcile(store, provider, store.optional(job_path), 'staging', c.instant(due) + timedelta(minutes=1))
        sent = c.values(store.optional(job_path))
        assert sent['provider']['state'] == 'sent' and sent['provider']['sentAt'] == sent['provider']['calendarAt']
        provider.failure = c.d.ProviderError('Synthetic unavailable response', True, 'provider-http-503')
        c.reconcile(store, provider, store.optional(job_path), 'staging', c.instant(due) + timedelta(days=2))
        held = c.values(store.optional(job_path))
        assert held['provider']['state'] == 'review' and held['provider']['sentAt'] == sent['provider']['sentAt']
        assert c.values(store.optional(draft_path))['body'] == payload['body']
        assert c.values(store.optional(mapping_path))['draftId'] == identifier
        print('Real isolated staging storage: save/request, exact future confirmation, stable calendar receipt, repeat, sent date, safe outage and retained draft passed. Provider transport was forbidden.')
    finally:
        # Only this new labelled synthetic fixture is removable. No general
        # cleanup query or production path is accepted here.
        paths = [draft_path + '/history/r1', draft_path, job_path, mapping_path]
        rows = store.call(job_path + '/providerHistory?pageSize=100').get('documents', [])
        paths += [row['name'] for row in rows if row['name'].startswith(job_path + '/providerHistory/')]
        writes = []
        for path in paths:
            if not path.startswith(base + '/'):
                raise RuntimeError('Cleanup namespace mismatch')
            row = store.optional(path)
            if row:
                writes.append({'delete': path, 'currentDocument': {'updateTime': row['updateTime']}})
        if writes:
            store.call(c.ROOT + ':commit', 'POST', {'writes': writes})
        assert not any(store.optional(path) for path in paths)
        print('All disposable staging records removed with exact version checks. Existing content/history and all production records preserved.')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        raise SystemExit('Isolated staging check unavailable: ' + c.d.safe_failure_code(error)) from None
