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
import shutil
import subprocess
from types import SimpleNamespace
import urllib.request
import urllib.error
import unicodedata
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
AUDIENCE = {'segmentIds':[SEGMENT]}
YOUTUBE_VIDEO_URL = re.compile(r'https://www[.]youtube[.]com/watch[?]v=[A-Za-z0-9_-]{11}(&t=[0-9hms]{1,24})?')
UPLOADED_POSTCARD_IMAGE = re.compile(r'https://dotm-inbox-production[.]dainyelr[.]workers[.]dev/postcard-images/[a-f0-9]{64}[.]jpg')
spec_ops=importlib.util.spec_from_file_location('delivery_operations',Path(__file__).with_name('publication-operations.py'))
operations=importlib.util.module_from_spec(spec_ops);spec_ops.loader.exec_module(operations)

class ProviderError(RuntimeError):
    def __init__(self,message,retryable=False,reason='provider-unavailable',retry_after=0):
        super().__init__(message);self.retryable=retryable;self.reason=reason;self.retry_after=retry_after

def provider_reason(status,raw):
    # Never persist arbitrary provider messages: they may echo owner content.
    # These fixed categories identify a rejected feature without leaking it.
    reason='provider-http-'+str(status)
    try:
        detail=json.loads(raw);message=str(detail.get('message','')).lower()
        for phrase,label in [('segment','segment'),('abtesting','ab-testing'),('a/b','ab-testing'),('best time','best-time'),('sendatbesttime','best-time'),('permission','permission'),('not activated','account-inactive'),('suspended','account-suspended'),('premium','premium'),('plan','plan')]:
            if phrase in message:return reason+'-'+label
        code=detail.get('code','')
        if code in {'method_not_allowed','unauthorized','permission_denied','invalid_parameter','missing_parameter','account_under_validation','not_enough_credits'}:return reason+'-'+code.replace('_','-')
    except (ValueError,AttributeError):
        if re.search(r'<html|<!doctype html',raw,re.I):return reason+'-html'
    return reason

def brevo(path, method='GET', body=None):
    key = os.environ.get('BREVO_API_KEY', '').strip()
    if not key:
        raise RuntimeError('Existing provider credential unavailable')
    if method in {'POST','PUT'}:
        # Use the runner's existing curl transport for the documented Brevo
        # API. Secrets/body go through stdin, never argv, files or logs.
        executable=shutil.which('curl')
        if not executable:raise ProviderError('Existing HTTPS transport unavailable',True)
        config='\n'.join(['url = '+json.dumps('https://api.brevo.com/v3/'+path),
            'request = '+json.dumps(method),'header = '+json.dumps('api-key: '+key),
            'header = "Content-Type: application/json"','header = "Accept: application/json"',
            'data-binary = '+json.dumps(json.dumps(body))])+'\n'
        result=subprocess.run([executable,'--config','-','--silent','--show-error','--max-time','40',
            '--connect-timeout','15','--proto','=https','--max-redirs','0','--write-out','\nDOTM_HTTP_CODE:%{http_code}'],
            input=config,capture_output=True,text=True,timeout=45)
        if result.returncode:raise ProviderError('Provider transport not confirmed; reconcile before retry',True)
        raw,separator,status=result.stdout.rpartition('\nDOTM_HTTP_CODE:')
        if not separator or not re.fullmatch(r'\d{3}',status):raise ProviderError('Provider response not confirmed',True)
        status=int(status)
        if not 200<=status<300:raise ProviderError('Provider mutation returned HTTP '+str(status),status in {408,429,500,502,503,504},provider_reason(status,raw))
        try:return json.loads(raw) if raw.strip() else {}
        except ValueError:raise ProviderError('Provider response not confirmed; reconciliation required',True) from None
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
        retry_after=error.headers.get('Retry-After','0') if error.headers else '0'
        raise ProviderError('Provider '+route+' returned HTTP '+str(error.code)+description+'; request not confirmed',error.code in {408,429,500,502,503,504},'provider-http-'+str(error.code),int(retry_after) if retry_after.isdigit() else 60) from None
    except Exception:
        raise ProviderError('Provider request not confirmed; reconciliation required',True) from None

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

def owner_cancelled_ids(variable, prefix):
    raw=os.environ.get(variable,'').strip()
    if len(raw)>800:raise RuntimeError('Invalid owner cancellation configuration')
    identifiers=set(re.split(r'[\s,]+',raw)) if raw else set()
    if len(identifiers)>20 or any(not re.fullmatch(prefix+r'-[a-f0-9]{32}',item) for item in identifiers):
        raise RuntimeError('Invalid owner cancellation configuration')
    return identifiers

def withhold_owner_cancelled(store, document, variable, prefix):
    """Honor exact owner cancellations even when the database cannot save them."""
    if document['name'].split('/')[-1] not in owner_cancelled_ids(variable, prefix):return False
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
        result=[row['document'] for row in rows if 'document' in row]
        # Accepted/native schedules belong to the independent GET-only
        # controller. The provider mutation worker sees only new requests.
        return result

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
    if not YOUTUBE_VIDEO_URL.fullmatch(payload['ctaUrl']):
        url = urlsplit(payload['ctaUrl'])
        if url.scheme != 'https' or url.netloc != 'dainyelonthemove.com' or url.query or url.fragment or not re.fullmatch(r'/(entry/entry-[a-f0-9]{32}|[a-z0-9-]*)', url.path) or url.path in {'/admin','/studio','/search','/postcards-form'}:
            raise RuntimeError('Expected a canonical public website or YouTube video link')
    if payload['imageUrl'] and not (UPLOADED_POSTCARD_IMAGE.fullmatch(payload['imageUrl']) or re.fullmatch(r'https://dainyelonthemove[.]com/assets/[a-zA-Z0-9/_-]+[.](webp|jpg|jpeg|png)',payload['imageUrl'])):
        raise RuntimeError('Unexpected email image URL')
    return payload

# Keep the supported syntax in sync with postcard-model.js.
INLINE_FORMAT = re.compile(
    r'(?<!\*)\*\*([^*\r\n]+)\*\*(?!\*)'
    r'''|\[([^\[\]\r\n]+)\]\((https://[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+(?:[/?#][^\s<>"'()[\]\\{}]*)?)\)'''
)

def format_paragraph(text):
    output, offset = [], 0
    for match in INLINE_FORMAT.finditer(text):
        bold, label, url = match.groups()
        output.append(escape(text[offset:match.start()]).replace('\n', '<br>'))
        if bold and bold.strip():
            output.append('<strong>' + escape(bold.strip()) + '</strong>')
        elif url and label.strip():
            output.append('<a href="' + escape(url) + '" style="color:#133c43;text-decoration:underline">' + escape(label) + '</a>')
        else:
            output.append(escape(match[0]))
        offset = match.end()
    output.append(escape(text[offset:]).replace('\n', '<br>'))
    return ''.join(output)

def template(payload):
    source = (Path(__file__).parents[2] / 'assets/postcard-email-template.html').read_text(encoding='utf-8')
    values = {'SUBJECT': escape(payload['subject']), 'PREVIEW': escape(payload['previewText']),
        'HEADLINE': escape(payload['headline']), 'URL': escape(payload['ctaUrl']), 'CTA': escape(payload['ctaText']),
        'BODY': ''.join('<p style="margin:0 0 18px">' + format_paragraph(part) + '</p>' for part in re.split(r'\n\s*\n',payload['body'])),
        'IMAGE': '<tr><td><img src="' + escape(payload['imageUrl'],quote=True) + '" alt="" width="600" style="width:100%;max-width:600px;height:auto;display:block"></td></tr>' if payload['imageUrl'] else ''}
    return re.sub(r'%%(SUBJECT|PREVIEW|HEADLINE|BODY|URL|CTA|IMAGE)%%',lambda match: values[match[1]],source)

def public_link(store, payload):
    # Only first-party website links need a publication check. Do not call
    # YouTube or make a request to an arbitrary host from the delivery worker.
    if YOUTUBE_VIDEO_URL.fullmatch(payload['ctaUrl']):return
    path = urlsplit(payload['ctaUrl']).path
    if path.startswith('/entry/'):
        if not store.optional(BASE + '/published/' + path.split('/')[-1]):
            raise RuntimeError('Linked entry is not published in production')
    request = urllib.request.Request(payload['ctaUrl'],method='HEAD')
    with urllib.request.build_opener(helpers.NoRedirect()).open(request,timeout=20) as response:
        if response.status != 200: raise RuntimeError('Linked page is unavailable')

def check_uploaded_photo(url):
    if not UPLOADED_POSTCARD_IMAGE.fullmatch(url):return
    request = urllib.request.Request(url,method='HEAD')
    try:
        with urllib.request.build_opener(helpers.NoRedirect()).open(request,timeout=12) as response:
            if response.status != 200 or response.headers.get_content_type() != 'image/jpeg':
                raise RuntimeError('Uploaded Postcard photo was not found')
    except urllib.error.HTTPError as error:
        if error.code < 500 and error.code not in (408,429):
            raise RuntimeError('Uploaded Postcard photo was not found') from None
        raise ProviderError('Uploaded Postcard photo temporarily unavailable',True,'photo-unavailable') from None
    except (urllib.error.URLError, TimeoutError):
        raise ProviderError('Uploaded Postcard photo temporarily unavailable',True,'photo-unavailable') from None

def normalized_subject(value):
    return ' '.join(unicodedata.normalize('NFKC',value if isinstance(value,str) else '').casefold().split())

def campaign_page(offset):
    response=brevo('emailCampaigns?limit=100&offset='+str(offset)+'&sort=desc&excludeHtmlContent=true')
    rows=response.get('campaigns') if isinstance(response,dict) else None
    if not isinstance(rows,list) or len(rows)>100 or any(not isinstance(row,dict) or type(row.get('id')) is not int or row['id']<1 for row in rows):
        raise RuntimeError('Campaign discovery response is incomplete; no duplicate created')
    return rows

def managed_campaign(name):
    found=[]
    for offset in range(0,500,100):
        rows = campaign_page(offset)
        found += [row for row in rows if row.get('name') == name]
        if len(found)>1:raise RuntimeError('Duplicate campaign names require review')
        if len(rows)<100:return found[0]['id'] if found else None
    raise RuntimeError('Campaign reconciliation limit reached; no duplicate created')

def observed(store, document, campaign):
    state = campaign.get('status')
    if state in {'scheduled','queued','sent'}:
        job={key:unpack(value) for key,value in document['fields'].items()}
        if (state=='scheduled' or state=='queued' and job.get('dispatchMode')=='schedule') and (job.get('action') in {'schedule','after-publication'}):
            if not campaign.get('scheduledAt') or date(campaign['scheduledAt'])!=date(job['scheduledAt']):
                raise RuntimeError('Provider schedule differs from the approved date; review required')
        # The independent GET-only controller confirms the identity, actual
        # date and calendar receipt. A request workflow never declares Sent.
        return store.update(document, {'status': 'accepted',
            'providerStatus': state, 'phase': 'observe-only', 'providerOnly': True})
    return None

def process(store, document, plans):
    job = {key: unpack(value) for key,value in document['fields'].items()}
    identifier = document['name'].split('/')[-1]
    if not re.fullmatch(r'mail-[a-f0-9]{32}',identifier) or job.get('draftId') != identifier or job.get('version') != 1 or job.get('action') not in {'send','schedule','after-publication'}:
        raise RuntimeError('Unexpected delivery request')
    if withhold_owner_cancelled(store,document,'POSTCARDS_CANCELLED_JOB_IDS','mail'):return
    if job.get('providerOnly') or job.get('status') in {'scheduled','accepted'} or job.get('phase')=='dispatch-attempted':
        campaign_id=job.get('campaignId')
        if not isinstance(campaign_id,int):raise RuntimeError('Missing provider receipt')
        campaign=brevo('emailCampaigns/'+str(campaign_id)+'?excludeHtmlContent=true')
        if campaign.get('name')!='Website Postcard '+identifier or campaign.get('sender',{}).get('email')!=SENDER:raise RuntimeError('Campaign identity changed')
        # Observation only: never change/re-dispatch an accepted campaign.
        observed(store,document,campaign);return
    payload = content(job['payload'])
    now = datetime.now(timezone.utc)
    if job['action']=='after-publication':
        due=date(job['scheduledAt'])
        if now-due>timedelta(hours=24):raise RuntimeError('Missed linked delivery needs review')
        entry_id=job.get('entryId','')
        if not re.fullmatch(r'entry-[a-f0-9]{32}',entry_id) or payload['ctaUrl']!='https://dainyelonthemove.com/entry/'+entry_id:raise RuntimeError('Invalid publication link')
        plan=store.optional(BASE+'/entrySchedules/'+entry_id)
        if not plan:raise RuntimeError('Linked publication removed')
        plan={key:unpack(value) for key,value in plan['fields'].items()}
        if plan.get('draftRevision')!=job.get('publicationRevision') or date(plan['scheduledAt'])>due or plan.get('status') in {'cancelled','review'}:raise RuntimeError('Linked publication changed or cancelled')
        if plan.get('status')!='published':return  # Publish first, then send in a later check.
        # Prepare at Brevo only after actual website publication. Brevo owns
        # the unchanged future sending time, independent of scheduler delays.
        if now<due<now+timedelta(minutes=15):return
    elif now-date(job['createdAt']) > timedelta(hours=24): raise RuntimeError('Stale request requires review')
    public_link(store,payload)
    check_uploaded_photo(payload['imageUrl'])
    if not any(isinstance(plan.get('credits'),(int,float)) and plan['credits'] > 0 for plan in plans):
        raise ProviderError('Free quota is temporarily unavailable',True)
    if job['status'] == 'queued':
        document = store.update(document, {'status':'processing','phase':'ready'})
        job['phase'] = 'ready'
    name = 'Website Postcard '+identifier
    campaign_id = job.get('campaignId') or managed_campaign(name)
    if not campaign_id:
        # Manually created campaigns may have another name. A matching subject
        # is enough to STOP creation, never enough to link or send it. The
        # read-only controller/owner must establish its identity separately.
        for offset in range(0,500,100):
            candidates=campaign_page(offset)
            if any(isinstance(row.get('sender'),dict) and row['sender'].get('email')==SENDER and normalized_subject(row.get('subject'))==normalized_subject(payload['subject']) for row in candidates):
                raise RuntimeError('Existing subject requires read-only campaign reconciliation; no duplicate created')
            if len(candidates)<100:break
        else:raise RuntimeError('Campaign discovery bound reached; no duplicate created')
        if job.get('phase') != 'ready': raise RuntimeError('Uncertain campaign creation; no duplicate created')
        document = store.update(document, {'phase':'create-attempted'})
        result = brevo('emailCampaigns','POST',{'name':name,'type':'classic','abTesting':False,'sendAtBestTime':False,'sender':{'name':'Dainyel on the Move','email':SENDER},
            'replyTo':'support@dainyelonthemove.com','subject':payload['subject'],'previewText':payload['previewText'],
            # The current provider rejects campaign tags (HTTP 405), even
            # though all actual campaign fields are accepted. Identity and
            # reconciliation use the immutable name/job ID, never a tag.
            'htmlContent':template(payload),'recipients':AUDIENCE})
        campaign_id = result.get('id')
        if not isinstance(campaign_id,int) or campaign_id < 1: raise RuntimeError('Campaign creation not confirmed')
        document = store.update(document, {'campaignId':campaign_id,'phase':'created'})
        job['phase'] = 'created'
    campaign = brevo('emailCampaigns/'+str(campaign_id)+'?excludeHtmlContent=true')
    if campaign.get('name') != name or campaign.get('sender',{}).get('email') != SENDER:
        raise RuntimeError('Campaign identity changed; no unrelated campaign modified')
    document = store.update(document, {'campaignId':campaign_id})
    if observed(store,document,campaign): return
    if job.get('phase') == 'dispatch-attempted':
        if job.get('updatedAt') and now-date(job['updatedAt'])<timedelta(minutes=10):raise ProviderError('Awaiting provider confirmation; observation only',True)
        raise RuntimeError('Uncertain dispatch; no automatic resend')
    if campaign.get('status') != 'draft': raise RuntimeError('Campaign must be a draft before dispatch')
    if job['action'] == 'schedule' and date(job['scheduledAt']) < now + timedelta(minutes=15):
        raise RuntimeError('Schedule too close or missed; choose a new request after review')
    # Reapply the reviewed immutable snapshot and exact saved segment. Never
    # address individual contacts, import a list or widen a provider segment.
    brevo('emailCampaigns/'+str(campaign_id),'PUT',{'subject':payload['subject'],'previewText':payload['previewText'],
        'htmlContent':template(payload),'recipients':AUDIENCE})
    native_schedule=job['action']=='schedule' or job['action']=='after-publication' and date(job['scheduledAt'])>now
    document = store.update(document, {'phase':'dispatch-attempted','dispatchMode':'schedule' if native_schedule else 'send'})
    if native_schedule:
        brevo('emailCampaigns/'+str(campaign_id),'PUT',{'scheduledAt':job['scheduledAt']})
        # Editing a draft's date is not proof that Brevo accepted its send
        # request. Check the actual provider status before confirming the job.
        campaign = brevo('emailCampaigns/'+str(campaign_id)+'?excludeHtmlContent=true')
        if campaign.get('status') == 'draft':
            # Only queue this exact campaign when Brevo has saved the exact
            # owner-approved future date. Never infer a date or send now.
            if not campaign.get('scheduledAt') or date(campaign['scheduledAt']) != date(job['scheduledAt']):
                raise ProviderError('Provider schedule date not confirmed; review required',True)
            brevo('emailCampaigns/'+str(campaign_id)+'/status','PUT',{'status':'queued'})
    else:
        brevo('emailCampaigns/'+str(campaign_id)+'/sendNow','POST')
    campaign = brevo('emailCampaigns/'+str(campaign_id)+'?excludeHtmlContent=true')
    if not observed(store,document,campaign):raise ProviderError('Provider completion not yet confirmed; observation only',True)

def require_free_database(store):
    metadata=store.call(f'projects/{helpers.PROJECT}/databases/{helpers.DATABASE}')
    if metadata.get('databaseEdition')!='ENTERPRISE' or not metadata.get('freeTier'):
        raise RuntimeError('Expected database free tier changed; owner review required')

def confirmed_plans(store):
    plans, segment = provider_configuration()
    config=store.optional(BASE+'/mailSettings/delivery')
    if not config or unpack(config['fields'].get('enabled',{})) is not True or unpack(config['fields'].get('segmentVersion',{}))!=segment['updatedAt']:
        raise RuntimeError('Delivery disabled or saved segment changed; owner review required')
    return plans

def process_jobs(api, store, jobs, plans):
    for document in jobs:
        receipt=None;now=datetime.now(timezone.utc)
        try:
            receipt=operations.claim(api,store,'production','mail',document['name'].split('/')[-1],now)
            if not receipt:continue
            # Re-read after acquiring the shared lease, not a stale outbox row.
            current=store.optional(document['name'])
            if not current:continue
            if unpack(current['fields'].get('status',{})) not in {'queued','processing','scheduled','accepted'}:continue
            process(store,current,plans)
            latest=store.optional(document['name']);state=unpack(latest['fields'].get('status',{})) if latest else 'unavailable'
            operations.finish(api,store,receipt,now,state,wait_seconds=300 if state=='queued' else 0)
        except Exception as error:
            if not receipt:continue  # Another runner owns the lease/CAS.
            retryable=is_retryable(error)
            try:
                latest=store.optional(document['name'])
                # A live lease prevents overlapping create/dispatch operations.
                # Never overwrite a terminal provider acknowledgement/cancel.
                if not retryable and latest and unpack(latest['fields'].get('status',{})) in {'queued','processing'}:store.update(latest,{'status':'review'})
                reason=getattr(error,'reason','provider-or-storage-unavailable' if retryable else 'delivery-validation')
                operations.finish(api,store,receipt,now,'retrying' if retryable else 'review',reason)
            except Exception:pass
            print('One request needs reconciliation. No uncertain dispatch is automatically replayed.')

def safe_failure_code(error):
    if isinstance(error, ProviderError):
        return error.reason
    if isinstance(error, helpers.RemoteError) and error.service == 'Firestore':
        return 'firestore-http-' + str(error.status)
    return 'delivery-check'

def is_retryable(error):
    if isinstance(error, ProviderError):
        return error.retryable
    return isinstance(error, helpers.RemoteError) and error.status in {408,409,412,429,500,502,503,504}

def process_outbox(store):
    require_free_database(store)
    api=SimpleNamespace(ROOT=ROOT,pack=pack,unpack=unpack,date=date)
    now=datetime.now(timezone.utc)
    # Both clocks must acquire the shared lease before using provider quota.
    sweep=operations.claim(api,store,'production','mailSweep','current',now)
    if not sweep:return
    try:
        jobs=store.pending()
        if jobs:
            cancelled=owner_cancelled_ids('POSTCARDS_CANCELLED_JOB_IDS','mail')
            needs_provider=any(job['name'].split('/')[-1] not in cancelled for job in jobs)
            plans=confirmed_plans(store) if needs_provider else ()
            process_jobs(api, store, jobs, plans)
    except Exception as error:
        try:
            delay=300 if is_retryable(error) else 900
            operations.finish(api,store,sweep,datetime.now(timezone.utc),'blocked',safe_failure_code(error),wait_seconds=delay)
        except Exception:
            pass  # Preserve the original failure; the existing lease still expires.
        raise
    operations.finish(api,store,sweep,datetime.now(timezone.utc),'checked',wait_seconds=300)
    print('Bounded owner request processing complete. Provider acceptance does not establish inbox delivery.')

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--mode',choices=['check','activate','process'],default='check')
    mode=parser.parse_args().mode
    if mode != 'check' and not (
        os.environ.get('POSTCARDS_DELIVERY_ENABLED') == 'true'
        and os.environ.get('GITHUB_REF') == 'refs/heads/main'
        and os.environ.get('REPOSITORY_VISIBILITY') == 'public'
    ):
        raise RuntimeError('Production delivery is not explicitly activated on main')
    store=Store()
    if mode == 'check':
        _, segment=provider_configuration()
        store.pending()  # Read-only validation of the bounded outbox query.
        store.settings('staging',False,segment)
        print('Existing free provider plan, sender and saved subscriber segment are available. Staging delivery is disabled. No campaign created, changed, scheduled or sent.')
    elif mode == 'activate':
        require_free_database(store)
        _, segment=provider_configuration()
        store.settings('production',True,segment)
        print('Production delivery enabled for future explicit owner requests. No campaign created or sent.')
    else:
        process_outbox(store)

if __name__=='__main__':
    try: main()
    except Exception as error:
        # RuntimeError messages here are fixed internal descriptions only;
        # provider bodies, URLs, job text and arbitrary exceptions stay hidden.
        if type(error) is RuntimeError:
            reason=str(error)
        else:
            reason=safe_failure_code(error)
        print('Postcard delivery stopped safely: '+reason+'. No content, contact data or credentials logged.',file=sys.stderr)
        sys.exit(1)
