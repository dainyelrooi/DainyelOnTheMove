"""One exact owner-approved release, never a general resend facility.

Recover at most once, only after an explicit HTTP400 rejection and fresh
confirmation that the same managed campaign is still an unsent draft.
No new campaign, recipients, content, dates or other jobs may be changed.
"""
import argparse
from datetime import datetime, timezone
import importlib.util
import json
import os
from pathlib import Path

spec = importlib.util.spec_from_file_location('exact_controller', Path(__file__).with_name('postcard-controller.py'))
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
d = c.d
IDENTIFIER = 'mail-9f7bf4527a54cfe4c5959f309e223c70'
CAMPAIGN = 27
ENTRY = 'entry-b888e1dc935cf1b9e72a620d87e41a00'


def segment_ids(campaign):
    recipients = campaign.get('recipients', {})
    found = []
    for key in ['segments', 'segmentIds']:
        for value in recipients.get(key, []) or []:
            found.append(value.get('id') if isinstance(value, dict) else value)
    return sorted(set(found))


def recoverable(job, campaign, operation, credits):
    rejected = any(event.get('code') == 'provider-http-400' for event in operation.get('events', []))
    recipients = campaign.get('recipients', {})
    lists = recipients.get('listIds', []) or recipients.get('lists', [])
    return campaign.get('status') == 'draft' and not campaign.get('sentDate') and rejected and job.get('phase') == 'dispatch-attempted' and segment_ids(campaign) == [1] and not lists and credits


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mode', choices=['check', 'recover'], default='check')
    args = parser.parse_args()
    if os.environ.get('GITHUB_REF') != 'refs/heads/ops/cusco-inca-live-20261114' or os.environ.get('GITHUB_EVENT_NAME') != 'workflow_dispatch' or os.environ.get('REPOSITORY_VISIBILITY') != 'public' or os.environ.get('POSTCARDS_DELIVERY_ENABLED') != 'true':
        raise RuntimeError('Exact recovery context unavailable')
    store = c.Store()
    d.require_free_database(store)
    plans = d.confirmed_plans(store)
    path = d.BASE + '/mailJobs/' + IDENTIFIER
    document = store.optional(path)
    job = c.values(document)
    if job.get('campaignId') != CAMPAIGN or job.get('draftId') != IDENTIFIER or job.get('action') != 'send' or job.get('dispatchMode') != 'send' or job.get('phase') not in {'dispatch-attempted', 'observe-only', 'complete'} or job.get('payload', {}).get('ctaUrl') != 'https://dainyelonthemove.com/entry/' + ENTRY:
        raise RuntimeError('Exact approved request differs')
    provider = c.Provider()
    campaign = provider.campaign(CAMPAIGN)
    c.identity(job, IDENTIFIER, campaign)
    if not c.content_matches(job['payload'], campaign) or job['payload']['imageUrl'] not in campaign.get('htmlContent', ''):
        raise RuntimeError('Actual provider message differs')
    ids = segment_ids(campaign)
    lists = campaign.get('recipients', {}).get('listIds', []) or campaign.get('recipients', {}).get('lists', [])
    report = {'campaignId': CAMPAIGN, 'status': campaign.get('status'), 'hasActualSentTime': bool(campaign.get('sentDate')), 'sameMessage': True, 'segmentIds': ids, 'hasListSelection': bool(lists), 'positiveFreeCredits': any(isinstance(plan.get('credits'), (int, float)) and plan['credits'] > 0 for plan in plans)}
    print(json.dumps(report))
    if args.mode == 'check':
        print('Read-only exact-campaign check. No provider or database mutation.')
        return
    now = datetime.now(timezone.utc)
    lease = d.operations.claim(d, store, 'production', 'mail', IDENTIFIER, now)
    if not lease:
        raise RuntimeError('Normal owner-request lease is busy; do not replay')
    try:
        document = store.optional(path)
        job = c.values(document)
        campaign = provider.campaign(CAMPAIGN)
        c.identity(job, IDENTIFIER, campaign)
        if campaign.get('status') in {'queued', 'scheduled', 'sent'} or campaign.get('sentDate'):
            c.reconcile(store, provider, document, 'production', now)
            print('Existing provider handoff observed only. No send repeated.')
            return
        operation = c.values(lease)
        if not recoverable(job, campaign, operation, report['positiveFreeCredits']):
            raise RuntimeError('No safe exact rejected-draft recovery is available')
        if not c.content_matches(job['payload'], campaign) or job['payload']['imageUrl'] not in campaign.get('htmlContent', ''):
            raise RuntimeError('Provider message changed before recovery')
        d.public_link(store, job['payload'])
        marker_path = d.ROOT + '/adminOperations/production/postcardRepairJobs/' + IDENTIFIER
        if store.optional(marker_path):
            raise RuntimeError('Exact recovery was already attempted; observation only')
        # A permanent create-only marker precedes the single external retry.
        marker = d.operations.write(d, store, marker_path, {'version': 1, 'campaignId': CAMPAIGN, 'state': 'attempted', 'transport': 'bodyless-post', 'at': now.isoformat()})
        try:
            d.brevo('emailCampaigns/' + str(CAMPAIGN) + '/sendNow', 'POST')
        except d.ProviderError as error:
            d.operations.write(d, store, marker_path, {'state': 'rejected-or-unconfirmed', 'reason': error.reason}, marker)
            raise
        d.operations.write(d, store, marker_path, {'state': 'accepted'}, marker)
        campaign = provider.campaign(CAMPAIGN)
        current = store.optional(path)
        d.observed(store, current, campaign)
        c.reconcile(store, provider, store.optional(path), 'production', datetime.now(timezone.utc))
        print(json.dumps({'campaignId': CAMPAIGN, 'bodylessRequestAccepted': True, 'status': campaign.get('status'), 'hasActualSentTime': bool(campaign.get('sentDate'))}))
    finally:
        d.operations.finish(d, store, lease, datetime.now(timezone.utc), 'observed')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        raise SystemExit('Exact recovery stopped safely: ' + d.safe_failure_code(error)) from None
