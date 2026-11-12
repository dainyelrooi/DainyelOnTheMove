#!/usr/bin/env python3
"""Read-only provider/storage audit. Output contains opaque metadata only.

No campaign mutations, subscriber reads, draft text or credentials in output.
Subject hashes allow the owner to identify receipts without publishing copy.
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import unicodedata

spec = importlib.util.spec_from_file_location('audit_delivery', Path(__file__).with_name('postcard-delivery.py'))
delivery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(delivery)


def subject_hash(value):
    normalized = ' '.join(unicodedata.normalize('NFKC', value or '').casefold().split())
    return hashlib.sha256(normalized.encode()).hexdigest()


def main():
    store = delivery.Store()
    metadata = store.call(f'projects/{delivery.helpers.PROJECT}/databases/{delivery.helpers.DATABASE}')
    print(json.dumps({'databaseEdition': metadata.get('databaseEdition'), 'freeTier': metadata.get('freeTier')}))
    for space in ['production', 'staging']:
        for kind in ['mailDrafts', 'mailJobs']:
            rows = store.call(delivery.ROOT + '/cmsSpaces/' + space + ':runQuery', 'POST', {
                'structuredQuery': {'from': [{'collectionId': kind}], 'limit': 100,
                    'select': {'fields': [{'fieldPath': key} for key in ['subject', 'payload.subject',
                        'draftId', 'draftRevision', 'revision', 'status', 'phase', 'campaignId', 'scheduledAt', 'sentAt']]}}})
            documents = [row['document'] for row in rows if 'document' in row]
            if len(documents) == 100:
                raise RuntimeError('Audit bound reached; no truncated result accepted')
            for document in documents:
                data = {key: delivery.unpack(value) for key, value in document['fields'].items()}
                subject = data.pop('subject', '') or data.pop('payload', {}).get('subject', '')
                data.pop('payload', None)
                print(json.dumps({'space': space, 'kind': kind, 'id': document['name'].split('/')[-1],
                    'subjectHash': subject_hash(subject), **data}))
    for offset in range(0, 500, 100):
        campaigns = delivery.brevo('emailCampaigns?limit=100&offset=' + str(offset) + '&sort=desc&excludeHtmlContent=true').get('campaigns', [])
        for row in campaigns:
            print(json.dumps({'provider': 'brevo', 'campaignId': row.get('id'), 'subjectHash': subject_hash(row.get('subject')),
                'status': row.get('status'), 'scheduledAt': row.get('scheduledAt'), 'sentDate': row.get('sentDate'),
                'senderMatches': row.get('sender', {}).get('email') == delivery.SENDER,
                'websiteJobId': row.get('name', '').removeprefix('Website Postcard ') if row.get('name', '').startswith('Website Postcard mail-') else None}))
        if len(campaigns) < 100:
            break
    else:
        raise RuntimeError('Provider audit bound reached')
    print('Read-only audit complete. No provider or database mutation.')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        raise SystemExit('Read-only audit unavailable: ' + delivery.safe_failure_code(error)) from None
