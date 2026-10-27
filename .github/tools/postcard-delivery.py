#!/usr/bin/env python3
"""Owner-requested marketing campaigns. Never log content, contacts or secrets.

An immutable job is claimed with CAS before provider mutations. Ambiguous
create/dispatch attempts are held for review, never replayed automatically.
Only the production main-branch worker can send, after explicit activation.
"""
import argparse
from datetime import datetime, timezone, timedelta
from html import escape
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import urllib.request
import urllib.error
from urllib.parse import urlsplit

spec = importlib.util.spec_from_file_location('question_mail_helpers', Path(__file__).with_name('question-notifications.py'))
helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)
ROOT = helpers.ROOT
BASE = ROOT + '/cmsSpaces/production'
FIELDS = ('subject', 'previewText', 'headline', 'body', 'ctaText', 'ctaUrl', 'imageUrl')
SENDER = 'postcards@dainyelonthemove.com'
SEGMENT = 1
SEGMENT_NAME = 'Postcards — active subscribers'
AUDIENCE = {'segmentIds':[SEGMENT], 'listIds':[], 'exclusionListIds':[], 'exclusionSegmentIds':[]}

def brevo(path, method='GET', body=None):
    key = os.environ.get('BREVO_API_KEY', '').strip()
    if not key:
        raise RuntimeError('Existing provider credential unavailable')
    request = urllib.request.Request('https://api.brevo.com/v3/' + path, method=method,
        headers={'api-key': key, 'Content-Type': 'application/json',
            'Accept': 'application/json', 'User-Agent': 'DainyelOnTheMovePostcards/1.0'},
        data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.build_opener(helpers.NoRedirect()).open(request, timeout=40) as response:
            raw = response.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        route=path.split('?')[0].split('/')[0]
        description=''
        if error.code in {401,403}:
            raw=error.read(65536)
            try:
                detail=json.loads(raw)
                message=str(detail.get('message','')).lower()
                code=str(detail.get('code',''))
                if code in {'unauthorized','permission_denied','account_under_validation','account_not_found','not_enough_credits'}:
                    description='; provider code '+code
                if any(word in message for word in ['unrecognised ip','unrecognized ip','authorised ip','authorized ip','whitelist']): description='; provider server-IP protection refused this runner'
                elif any(word in message for word in ['permission','scope','access rights']): description='; provider credential permissions require owner review'
                elif not description: description='; JSON access rejection requires provider review'
            except Exception:
                message=raw.decode('utf-8',errors='replace').lower()
                if 'cloudflare' in message or error.headers.get('cf-ray'):
                    description='; provider edge protection refused the request'
                elif '<html' in message or '<!doctype html' in message:
                    description='; HTML access rejection requires provider review'
                else: description='; non-JSON access rejection requires provider review'
        raise RuntimeError('Provider '+route+' returned HTTP '+str(error.code)+description+'; request not confirmed') from None
    except Exception:
        raise RuntimeError('Provider request not confirmed; review required') from None

def unpack(value):
    if 'stringValue' in value: return value['stringValue']
    if 'integerValue' in value: return int(value['integerValue'])
    if 'booleanValue' in value: return value['booleanValue']
    if 'timestampValue' in value: return value['timestampValue']
    if 'mapValue' in value: return {key: unpack(item) for key, item in value['mapValue'].get('fields', {}).items()}
    if 'arrayValue' in value: return [unpack(item) for item in value['arrayValue'].get('values',[])]
    return None

def pack(value):
    if isinstance(value, bool): return {'booleanValue': value}
    if isinstance(value, int): return {'integerValue': str(value)}
    if isinstance(value, dict): return {'mapValue': {'fields': {key: pack(item) for key, item in value.items()}}}
    if isinstance(value, list): return {'arrayValue': {'values': [pack(item) for item in value]}}
    return {'stringValue': str(value)}

def date(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(timezone.utc)

def withhold_owner_cancelled(store, document, variable, prefix):
    """Honor exact owner cancellations even when the database cannot save them.

    The private repository variable contains IDs only, never wildcards/content.
    Other jobs and existing provider-native schedules remain unaffected.
    """
    raw=os.environ.get(variable,'').strip()
    if len(raw)>800:raise RuntimeError('Invalid owner cancellation configuration')
    identifiers=set(re.split(r'[\s,]+',raw)) if raw else set()
    if len(identifiers)>20 or any(not re.fullmatch(prefix+r'-[a-f0-9]{32}',item) for item in identifiers):
        raise RuntimeError('Invalid owner cancellation configuration')
    if document['name'].split('/')[-1] not in identifiers:return False
    fields=document.get('fields',{})
    # A provider handoff, if one ever occurred, needs separate reconciliation;
    # never claim that marking a database row can recall a sent campaign.
    if unpack(fields.get('status',{}))=='queued' and not fields.get('campaignId') and not fields.get('phase'):
        try:store.update(document,{'status':'cancelled'})
        except Exception:
            print('One exact owner cancellation is withheld; storage confirmation is pending.')
    print('One owner-cancelled request was skipped. No provider operation was performed for it.')
    return True

class Store(helpers.Firestore):
    def optional(self, path):
        try: return self.call(path)
        except helpers.RemoteError as error:
            if error.status == 404: return None
            raise

    def update(self, document, changes):
        fields = dict(document['fields'])
        fields.update({key: pack(value) for key, value in changes.items()})
        response = self.call(ROOT + ':commit', 'POST', {'writes': [{
            'update': {'name': document['name'], 'fields': fields},
            'updateTransforms': [{'fieldPath': 'updatedAt', 'setToServerValue': 'REQUEST_TIME'}],
            'currentDocument': {'updateTime': document['updateTime']}}]})
        return {'name': document['name'], 'fields': fields, 'updateTime': response['writeResults'][0]['updateTime']}

    def settings(self, space, enabled, segment):
        self.call(ROOT + ':commit', 'POST', {'writes': [{
            'update': {'name': ROOT + '/cmsSpaces/' + space + '/mailSettings/delivery', 'fields': {
                'enabled': pack(enabled), 'segmentId': pack(SEGMENT),
                'segmentVersion': pack(segment.get('updatedAt', '')), 'version': pack(1)}},
            'updateTransforms': [{'fieldPath': 'checkedAt', 'setToServerValue': 'REQUEST_TIME'}]}]})

    def pending(self):
        # A bounded equality query on the same live owner outbox, no joins or
        # contacts. Server-side filtering avoids downloading historic mail.
        rows = self.call(BASE + ':runQuery', 'POST', {'structuredQuery': {
            'from': [{'collectionId': 'mailJobs'}],
            'where': {'fieldFilter': {'field': {'fieldPath': 'status'}, 'op': 'IN',
                'value': {'arrayValue': {'values': [pack('queued'), pack('processing')]}}}},
            'orderBy':[{'field':{'fieldPath':'scheduledAt'},'direction':'ASCENDING'}],
            'limit': 50}})
        return [row['document'] for row in rows if 'document' in row]

def provider_configuration():
    account = brevo('account')
    plans = [plan for plan in account.get('plan', []) if plan.get('type') == 'free']
    if not plans: raise RuntimeError('Expected free provider plan changed; owner review required')
    senders = brevo('senders').get('senders', [])
    if not any(sender.get('email') == SENDER and sender.get('active') is True for sender in senders):
        raise RuntimeError('Expected verified sender unavailable')
    segments = brevo('contacts/segments?limit=50&offset=0').get('segments', [])
    matching = [segment for segment in segments if segment.get('id') == SEGMENT and segment.get('segmentName') == SEGMENT_NAME]
    if len(matching) != 1 or not matching[0].get('updatedAt'):
        raise RuntimeError('Expected saved subscriber segment unavailable')
    return plans, matching[0]

def content(payload):
    if set(payload) != set(FIELDS): raise RuntimeError('Unexpected email fields')
    for key, low, high in [('subject',1,140),('previewText',0,200),('headline',1,160),('body',10,12000),('ctaText',1,80),('ctaUrl',1,250),('imageUrl',0,500)]:
        if not isinstance(payload[key], str) or not low <= len(payload[key].strip()) <= high:
            raise RuntimeError('Invalid email content')
    url = urlsplit(payload['ctaUrl'])
    if url.scheme != 'https' or url.netloc != 'dainyelonthemove.com' or url.query or url.fragment or not re.fullmatch(r'/(entry/entry-[a-f0-9]{32}|[a-z0-9-]*)', url.path) or url.path in {'/admin','/studio','/search','/postcards-form'}:
        raise RuntimeError('Only public canonical website links are allowed')
    if payload['imageUrl'] and not re.fullmatch(r'https://dainyelonthemove[.]com/assets/[a-zA-Z0-9/_-]+[.](webp|jpg|jpeg|png)',payload['imageUrl']):
        raise RuntimeError('Unexpected email image URL')
    return payload

def template(payload):
    source = (Path(__file__).parents[2] / 'assets/postcard-email-template.html').read_text()
    values = {'SUBJECT': escape(payload['subject']), 'PREVIEW': escape(payload['previewText']),
        'HEADLINE': escape(payload['headline']), 'URL': escape(payload['ctaUrl']), 'CTA': escape(payload['ctaText']),
        'BODY': ''.join('<p style="margin:0 0 18px">' + escape(part).replace('\n','<br>') + '</p>' for part in re.split(r'\n\s*\n',payload['body'])),
        'IMAGE': '<tr><td><img src="' + escape(payload['imageUrl'],quote=True) + '" alt="" width="600" style="width:100%;max-width:600px;height:auto;display:block"></td></tr>' if payload['imageUrl'] else ''}
    return re.sub(r'%%(SUBJECT|PREVIEW|HEADLINE|BODY|URL|CTA|IMAGE)%%',lambda match: values[match[1]],source)

def public_link(store, payload):
    path = urlsplit(payload['ctaUrl']).path
    if path.startswith('/entry/'):
        if not store.optional(BASE + '/published/' + path.split('/')[-1]):
            raise RuntimeError('Linked entry is not published in production')
    request = urllib.request.Request(payload['ctaUrl'],method='HEAD')
    with urllib.request.build_opener(helpers.NoRedirect()).open(request,timeout=20) as response:
        if response.status != 200: raise RuntimeError('Linked page is unavailable')

def managed_campaign(name):
    for offset in range(0,500,100):
        rows = brevo('emailCampaigns?limit=100&offset='+str(offset)+'&sort=desc&excludeHtmlContent=true').get('campaigns',[])
        found = [row for row in rows if row.get('name') == name]
        if len(found) > 1: raise RuntimeError('Duplicate campaign names require review')
        if found: return found[0]['id']
        if len(rows) < 100: return None
    raise RuntimeError('Campaign reconciliation limit reached')

def observed(store, document, campaign):
    state = campaign.get('status')
    if state in {'scheduled','queued','sent'}:
        return store.update(document, {'status': 'sent' if state == 'sent' else 'scheduled' if state == 'scheduled' else 'accepted',
            'providerStatus': state, 'phase': 'complete'})
    return None

def process(store, document, plans):
    job = {key: unpack(value) for key,value in document['fields'].items()}
    identifier = document['name'].split('/')[-1]
    if not re.fullmatch(r'mail-[a-f0-9]{32}',identifier) or job.get('draftId') != identifier or job.get('version') != 1 or job.get('action') not in {'send','schedule','after-publication'}:
        raise RuntimeError('Unexpected delivery request')
    if withhold_owner_cancelled(store,document,'POSTCARDS_CANCELLED_JOB_IDS','mail'):return
    payload = content(job['payload'])
    now = datetime.now(timezone.utc)
    if job['action']=='after-publication':
        due=date(job['scheduledAt'])
        if due>now:return  # No provider operation before the chosen time.
        if now-due>timedelta(hours=24):raise RuntimeError('Missed linked delivery needs review')
        entry_id=job.get('entryId','')
        if not re.fullmatch(r'entry-[a-f0-9]{32}',entry_id) or payload['ctaUrl']!='https://dainyelonthemove.com/entry/'+entry_id:raise RuntimeError('Invalid publication link')
        plan=store.optional(BASE+'/entrySchedules/'+entry_id)
        if not plan:raise RuntimeError('Linked publication removed')
        plan={key:unpack(value) for key,value in plan['fields'].items()}
        if plan.get('draftRevision')!=job.get('publicationRevision') or date(plan['scheduledAt'])>due or plan.get('status') in {'cancelled','review'}:raise RuntimeError('Linked publication changed or cancelled')
        if plan.get('status')!='published':return  # Publish first, then send in a later check.
    elif now-date(job['createdAt']) > timedelta(hours=24): raise RuntimeError('Stale request requires review')
    public_link(store,payload)
    if not any(isinstance(plan.get('credits'),(int,float)) and plan['credits'] > 0 for plan in plans):
        raise RuntimeError('Free quota is unavailable; no automatic retry')
    if job['status'] == 'queued':
        document = store.update(document, {'status':'processing','phase':'ready'})
        job['phase'] = 'ready'
    name = 'Website Postcard '+identifier
    campaign_id = job.get('campaignId') or managed_campaign(name)
    if not campaign_id:
        if job.get('phase') != 'ready': raise RuntimeError('Uncertain campaign creation; no duplicate created')
        document = store.update(document, {'phase':'create-attempted'})
        result = brevo('emailCampaigns','POST',{'name':name,'type':'classic','sender':{'name':'Dainyel on the Move','email':SENDER},
            'replyTo':'support@dainyelonthemove.com','subject':payload['subject'],'previewText':payload['previewText'],
            'htmlContent':template(payload),'recipients':AUDIENCE,'tag':'website-postcards'})
        campaign_id = result.get('id')
        if not isinstance(campaign_id,int) or campaign_id < 1: raise RuntimeError('Campaign creation not confirmed')
        document = store.update(document, {'campaignId':campaign_id,'phase':'created'})
        job['phase'] = 'created'
    campaign = brevo('emailCampaigns/'+str(campaign_id)+'?excludeHtmlContent=true')
    if campaign.get('name') != name or campaign.get('sender',{}).get('email') != SENDER:
        raise RuntimeError('Campaign identity changed; no unrelated campaign modified')
    document = store.update(document, {'campaignId':campaign_id})
    if observed(store,document,campaign): return
    if job.get('phase') == 'dispatch-attempted': raise RuntimeError('Uncertain dispatch; no automatic resend')
    if campaign.get('status') != 'draft': raise RuntimeError('Campaign must be a draft before dispatch')
    if job['action'] == 'schedule' and date(job['scheduledAt']) < now + timedelta(minutes=15):
        raise RuntimeError('Schedule too close or missed; choose a new request after review')
    # Reapply the reviewed immutable snapshot and exact saved segment. Never
    # address individual contacts, import a list or widen a provider segment.
    brevo('emailCampaigns/'+str(campaign_id),'PUT',{'subject':payload['subject'],'previewText':payload['previewText'],
        'htmlContent':template(payload),'recipients':AUDIENCE})
    document = store.update(document, {'phase':'dispatch-attempted'})
    if job['action'] == 'schedule': brevo('emailCampaigns/'+str(campaign_id),'PUT',{'scheduledAt':job['scheduledAt']})
    else: brevo('emailCampaigns/'+str(campaign_id)+'/sendNow','POST')
    campaign = brevo('emailCampaigns/'+str(campaign_id)+'?excludeHtmlContent=true')
    if not observed(store,document,campaign): store.update(document, {'status':'accepted','providerStatus':str(campaign.get('status','unknown'))[:40],'phase':'complete'})

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--mode',choices=['check','activate','process'],default='check');mode=parser.parse_args().mode
    store=Store();plans,segment=provider_configuration()
    allowed=(os.environ.get('POSTCARDS_DELIVERY_ENABLED')=='true' and os.environ.get('GITHUB_REF')=='refs/heads/main'
        and os.environ.get('REPOSITORY_VISIBILITY')=='public')
    if mode=='check':
        store.pending()  # Read-only validation of the bounded outbox query.
        store.settings('staging',False,segment)
        print('Existing free provider plan, sender and saved subscriber segment are available. Staging delivery is disabled. No campaign created, changed, scheduled or sent.')
        return
    if not allowed: raise RuntimeError('Production delivery is not explicitly activated on main')
    metadata=store.call(f'projects/{helpers.PROJECT}/databases/{helpers.DATABASE}')
    if metadata.get('databaseEdition')!='ENTERPRISE' or not metadata.get('freeTier'):
        raise RuntimeError('Expected database free tier changed; owner review required')
    if mode=='activate':
        store.settings('production',True,segment)
        print('Production delivery enabled for future explicit owner requests. No campaign created or sent.')
        return
    config=store.optional(BASE+'/mailSettings/delivery')
    if not config or unpack(config['fields'].get('enabled',{})) is not True or unpack(config['fields'].get('segmentVersion',{}))!=segment['updatedAt']:
        raise RuntimeError('Delivery disabled or saved segment changed; owner review required')
    jobs=store.pending()
    for document in jobs:
        try: process(store,document,plans)
        except Exception:
            latest=store.optional(document['name'])
            if latest and unpack(latest['fields'].get('status',{})) in {'queued','processing'}:
                store.update(latest,{'status':'review'})
            print('One request held for private review. No uncertain action is automatically replayed.')
    print('Bounded owner request processing complete. Provider acceptance does not establish inbox delivery.')

if __name__=='__main__':
    try: main()
    except Exception as error:
        # RuntimeError messages here are fixed internal descriptions only;
        # provider bodies, URLs, job text and arbitrary exceptions stay hidden.
        reason=str(error) if type(error) is RuntimeError else 'Configuration or connection unavailable'
        print('Postcard delivery stopped safely: '+reason+'. No content, contact data or credentials logged.',file=sys.stderr)
        sys.exit(1)
