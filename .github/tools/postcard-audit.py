#!/usr/bin/env python3
"""Read-only provider/storage audit. Output contains opaque metadata only.

No campaign mutations, subscriber reads, draft text or credentials in output.
Subject hashes allow the owner to identify receipts without publishing copy.
"""
import hashlib
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import unicodedata
from zoneinfo import ZoneInfo

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
                        'draftId', 'draftRevision', 'revision', 'status', 'phase', 'campaignId', 'scheduledAt', 'sentAt', 'provider', 'binding', 'approvedScheduledAt']]}}})
            documents = [row['document'] for row in rows if 'document' in row]
            if len(documents) == 100:
                raise RuntimeError('Audit bound reached; no truncated result accepted')
            for document in documents:
                data = {key: delivery.unpack(value) for key, value in document['fields'].items()}
                subject = data.pop('subject', '') or data.pop('payload', {}).get('subject', '')
                data.pop('payload', None)
                if kind == 'mailJobs' and data.get('provider'):
                    baseline = store.optional(document['name'] + '/providerHistory/baseline')
                    raw = delivery.unpack((baseline or {}).get('fields', {}).get('beforeDocumentJson', {}))
                    if raw:
                        before = json.loads(raw)['fields']
                        # Projection below does not include payload.body; compare
                        # the full private record in memory, never in output.
                        current = store.optional(document['name'])['fields']
                        data['originalPayloadAndDatesPreserved'] = all(before.get(key) == current.get(key) for key in ['payload', 'scheduledAt', 'createdAt'])
                print(json.dumps({'space': space, 'kind': kind, 'id': document['name'].split('/')[-1],
                    'subjectHash': subject_hash(subject), **data}))
        now=datetime.now(ZoneInfo('Europe/Amsterdam'))
        start=now.replace(day=1,hour=0,minute=0,second=0,microsecond=0)
        end=start.replace(year=start.year+(start.month==12),month=start.month%12+1)
        start,end=[value.astimezone(timezone.utc).isoformat() for value in [start,end]]
        rows=store.call(delivery.ROOT+'/cmsSpaces/'+space+':runQuery','POST',{'structuredQuery':{
            'from':[{'collectionId':'mailJobs'}],
            'where':{'compositeFilter':{'op':'AND','filters':[
                {'fieldFilter':{'field':{'fieldPath':'provider.calendarAt'},'op':'GREATER_THAN_OR_EQUAL','value':delivery.pack(start)}},
                {'fieldFilter':{'field':{'fieldPath':'provider.calendarAt'},'op':'LESS_THAN','value':delivery.pack(end)}}]}},
            'orderBy':[{'field':{'fieldPath':'provider.calendarAt'},'direction':'DESCENDING'}],
            'select':{'fields':[{'fieldPath':'draftId'}]},'limit':100}})
        print(json.dumps({'space':space,'confirmedCalendarReceiptIds':[row['document']['name'].split('/')[-1] for row in rows if 'document' in row]}))
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
