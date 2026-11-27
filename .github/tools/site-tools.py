"""Free, bounded website-service setup/status and opted-in browser notifications.

No email sending endpoints, contact imports or campaign rescheduling exist here.
Secrets and provider responses never appear in reports or logs.
"""
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, urlsplit
import hashlib
import hmac
import importlib.util
import json
import os
import re
import subprocess
import urllib.request
import urllib.error

ROOT=Path(__file__).resolve().parents[2]
ATTRIBUTES=('DOTM_STORIES','DOTM_FILMS','DOTM_TIPS')
EVENTS=('delivered','hardBounce','softBounce','unsubscribed','spam')
DESCRIPTION='Website service status — '

class SafeError(Exception): pass

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): return None

def http(url,method='GET',body=None,headers=None):
    request=urllib.request.Request(url,data=json.dumps(body).encode() if body is not None else None,method=method,headers={'Accept':'application/json','User-Agent':'DainyelOnTheMove-Service/1.0',**({'Content-Type':'application/json'} if body is not None else {}),**(headers or {})})
    try:
        with urllib.request.build_opener(NoRedirect).open(request,timeout=20) as response:
            raw=response.read(4*1024*1024+1)
            if len(raw)>4*1024*1024:raise SafeError('response-too-large')
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        code='remote-http-'+str(error.code)
        host=urlsplit(url).hostname or ''
        if host.endswith('.actions.githubusercontent.com'):code='runner-identity-http-'+str(error.code)
        if host in {'dotm-inbox-staging.dainyelr.workers.dev','dotm-inbox-production.dainyelr.workers.dev'}:
            code='worker-http-'+str(error.code)
            try:
                reason=json.loads(error.read(4096)).get('error','')
                if re.fullmatch(r'bridge-[a-z]+-refused',reason) or reason in {'not-authorized','origin-not-allowed','not-configured','services-not-connected'}:code=reason
            except Exception:pass
        raise SafeError(code) from None
    except (urllib.error.URLError,TimeoutError,json.JSONDecodeError):raise SafeError('remote-unavailable') from None

def provider():
    spec=importlib.util.spec_from_file_location('existing_postcard_transport',Path(__file__).with_name('postcard-delivery.py'))
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    def call(path,method='GET',body=None):
        try:return module.brevo(path,method,body)
        except module.ProviderError as error:
            code=getattr(error,'reason','provider-unavailable')
            category='preferences' if path.startswith('contacts/attributes') else 'feedback' if path.startswith('webhooks') else 'status'
            raise SafeError(category+'-'+code if re.fullmatch(r'[a-z0-9-]{1,55}',code) else category+'-provider-unavailable') from None
    return call

def free_allowance(account):
    plans=account.get('plan',[])
    free=[row for row in plans if row.get('type')=='free']
    if not free:raise SafeError('free-email-plan-not-confirmed')
    remaining=free[0].get('creditsLeft')
    if not isinstance(remaining,int) or isinstance(remaining,bool) or not 0<=remaining<=300:remaining=None
    return {'plan':'free','dailyLimit':300,'remaining':remaining}

def ensure_attributes(brevo):
    rows=brevo('contacts/attributes').get('attributes',[])
    for name in ATTRIBUTES:
        matching=[row for row in rows if row.get('name')==name]
        if matching:
            if matching[0].get('category')!='normal' or matching[0].get('type')!='boolean':raise SafeError('preference-attribute-type-mismatch')
        else:brevo('contacts/attributes/normal/'+name,'POST',{'type':'boolean'})

def webhook_token(api_key,space):
    return hmac.new(api_key.encode(),('website-status-webhook-v1:'+space).encode(),hashlib.sha256).hexdigest()

def ensure_webhook(brevo,base,space,token):
    rows=brevo('webhooks?type=marketing').get('webhooks',[])
    matching=[row for row in rows if row.get('description')==DESCRIPTION+space]
    if len(matching)>1:raise SafeError('duplicate-owned-webhook-needs-review')
    desired={'url':base+'/hooks/brevo','description':DESCRIPTION+space,'events':list(EVENTS),'type':'marketing','batched':False,'auth':{'type':'bearer','token':token}}
    if matching:
        saved=matching[0]
        if saved.get('url')!=desired['url'] or saved.get('type')!='marketing':raise SafeError('owned-webhook-identity-mismatch')
        # Reconcile an uncertain earlier creation; never create another hook.
        if set(saved.get('events',[]))!=set(EVENTS):raise SafeError('owned-webhook-events-need-review')
        brevo('webhooks/'+str(saved['id']),'PUT',{'auth':desired['auth']})
        return saved.get('id')
    if len(rows)>=40:raise SafeError('webhook-capacity-reached')
    created=brevo('webhooks','POST',desired)
    if not isinstance(created.get('id'),int):raise SafeError('webhook-creation-not-confirmed')
    return created['id']

def oidc(base):
    url=os.environ.get('ACTIONS_ID_TOKEN_REQUEST_URL','')
    parsed=urlsplit(url)
    if parsed.scheme!='https' or not parsed.hostname or not parsed.hostname.endswith('.actions.githubusercontent.com'):raise SafeError('runner-identity-unavailable')
    token=http(url+('&' if parsed.query else '?')+urlencode({'audience':base}),headers={'Authorization':'Bearer '+os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']}).get('value')
    if not isinstance(token,str) or len(token)>16384:raise SafeError('runner-identity-not-confirmed')
    if os.environ.get('GITHUB_ACTIONS')=='true':print('::add-mask::'+token)
    return token

def valid_public_entries(value,space,now):
    if not isinstance(value,dict) or value.get('space')!=space or value.get('version')!=1 or value.get('complete') is not True:raise SafeError('public-reading-copy-unavailable')
    try:generated=datetime.fromisoformat(value['generatedAt'].replace('Z','+00:00')).timestamp()
    except (KeyError,ValueError,TypeError):raise SafeError('public-reading-copy-unavailable') from None
    if not now-86400<generated<=now+60:raise SafeError('public-reading-copy-expired')
    entries=[]
    for row in value.get('entries',[]):
        if row.get('kind') not in {'blog','field-note'}:continue
        try:stamp=datetime.fromisoformat(row['publishedAt'].replace('Z','+00:00')).timestamp()
        except (KeyError,ValueError,TypeError):continue
        if re.fullmatch(r'entry-[a-f0-9]{32}',row.get('id','')) and isinstance(row.get('title'),str) and 0<len(row['title'])<=140 and now-86400<stamp<=now:
            entries.append({'entryId':row['id'],'title':row['title'],'publishedAt':row['publishedAt']})
    return sorted(entries,key=lambda row:row['publishedAt'])[-4:]

def fcm_message(recipient):
    if not re.fullmatch(r'[A-Za-z0-9_-]{22,128}',recipient.get('fid','')) or not re.fullmatch(r'entry-[a-f0-9]{32}',recipient.get('entryId','')) or recipient.get('url')!='/entry/'+recipient['entryId']:raise SafeError('notification-target-invalid')
    if not isinstance(recipient.get('title'),str) or not 0<len(recipient['title'])<=140:raise SafeError('notification-content-invalid')
    return {'message':{'fid':recipient['fid'],'data':{'title':recipient['title'],'url':recipient['url']},'webpush':{'headers':{'TTL':'3600','Urgency':'normal','Topic':recipient['entryId'][-32:]}}}}

def send_notifications(bridge,host,space):
    now=datetime.now(timezone.utc).timestamp();manifest=http(host+'/data/public-content/manifest.json');copy=http(host+'/data/public-content/cms.json')
    entries=valid_public_entries(copy,space,now)
    if not manifest.get('complete') or manifest.get('space')!=space or manifest.get('generation')!=copy.get('generation') or manifest.get('generatedAt')!=copy.get('generatedAt'):raise SafeError('public-copy-generation-mismatch')
    access=None
    for item in entries:
        # Only a real public reading page, never a queued revision or admin link.
        try:
            request=urllib.request.Request(host+'/entry/'+item['entryId'],headers={'Accept':'text/html','Cache-Control':'no-cache'})
            with urllib.request.build_opener(NoRedirect).open(request,timeout=15) as response:
                page=response.read(500001)
                if response.status!=200 or len(page)>500000 or ('data-published-entry="'+item['entryId']+'"').encode() not in page:continue
        except (urllib.error.URLError,TimeoutError):continue
        for _ in range(5):
            targets=bridge('/bridge/push/claim',item).get('recipients',[])
            if not targets:break
            if len(targets)>10:raise SafeError('notification-batch-too-large')
            if access is None:
                result=subprocess.run(['gcloud','auth','print-access-token'],capture_output=True,text=True,check=True,timeout=20);access=result.stdout.strip()
                if not access:raise SafeError('notification-sender-unavailable')
                if os.environ.get('GITHUB_ACTIONS')=='true':print('::add-mask::'+access)
            receipts=[]
            for recipient in targets:
                outcome='uncertain'
                try:
                    http('https://fcm.googleapis.com/v1/projects/dainyelonthemove/messages:send','POST',fcm_message(recipient),{'Authorization':'Bearer '+access});outcome='accepted'
                except SafeError as error:
                    if str(error)=='remote-http-429':outcome='retry'
                    elif str(error)=='remote-http-404':outcome='unregistered'
                    elif str(error) in {'remote-http-400','remote-http-401','remote-http-403'}:outcome='failed'
                receipts.append({key:recipient[key] for key in ['entryId','fid','lease']}|{'result':outcome})
            bridge('/bridge/push/receipt',{'receipts':receipts})

def main():
    mode=os.environ.get('TOOLS_MODE','check');space=os.environ.get('TOOLS_SPACE','staging')
    branch='main' if space=='production' else 'staging'
    if space not in {'staging','production'} or mode not in {'check','refresh','setup','process'} or os.environ.get('GITHUB_REF')!='refs/heads/'+branch:raise SafeError('source-environment-mismatch')
    if space=='production' and os.environ.get('SITE_TOOLS_PRODUCTION_ENABLED')!='true':raise SafeError('production-services-not-approved')
    base=json.loads((ROOT/'data/cloudflare.json').read_text())[space]['url'].rstrip('/')
    if not re.fullmatch(r'https://dotm-inbox-'+space+r'[.]dainyelr[.]workers[.]dev',base):raise SafeError('worker-identity-mismatch')
    brevo=provider()
    if mode=='check':free_allowance(brevo('account'));print('Existing free provider plan verified; no provider changes or messages.');return
    identity=None;identity_time=0
    def bridge(path,body):
        nonlocal identity,identity_time
        if identity is None or datetime.now(timezone.utc).timestamp()-identity_time>240:
            identity=oidc(base);identity_time=datetime.now(timezone.utc).timestamp()
        return http(base+path,'POST',body,{'Authorization':'Bearer '+identity})
    settings=bridge('/bridge/preferences',{})
    config={}
    refresh=mode in {'setup','refresh'} or settings.get('refreshDue',True)
    allowance=free_allowance(brevo('account')) if refresh else None
    if mode=='setup':
        ensure_attributes(brevo);token=webhook_token(os.environ['BREVO_API_KEY'],space)
        if os.environ.get('GITHUB_ACTIONS')=='true':print('::add-mask::'+token)
        config['webhookSecretHash']=hashlib.sha256(token.encode()).hexdigest()
        form=os.environ.get('TOOLS_PREFERENCES_FORM_ID','')
        segments=json.loads(os.environ.get('TOOLS_SEGMENTS_JSON','{}'))
        if form:
            if not re.fullmatch(r'[a-f0-9]{24}',form):raise SafeError('preferences-form-invalid')
            config['preferencesFormId']=form
        if segments:
            if set(segments)!={'stories','films','tips'} or any(not isinstance(v,int) or isinstance(v,bool) or v<=1 for v in segments.values()) or len(set(segments.values()))!=3:raise SafeError('preference-segments-invalid')
            config['segments']=segments
        bridge('/bridge/configure',config)
        ensure_webhook(brevo,base,space,token)
    if refresh:
        rows=brevo('webhooks?type=marketing').get('webhooks',[])
        hook=any(row.get('description')==DESCRIPTION+space and row.get('url')==base+'/hooks/brevo' for row in rows)
        bridge('/bridge/status',{'brevo':allowance|{'checkedAt':datetime.now(timezone.utc).isoformat(),'preferencesReady':bool((config.get('preferencesFormId') or settings.get('preferencesFormId')) and (config.get('segments') or settings.get('segments'))),'webhookReady':hook}})
    if mode=='process':send_notifications(bridge,'https://dainyelonthemove.com' if space=='production' else 'https://dainyelonthemove-staging.web.app',space)
    print('Private service status updated. No email sending or campaign scheduling performed.')

if __name__=='__main__':
    try:main()
    except Exception as error:
        # Never echo provider bodies, addresses, tokens or titles into public CI.
        code=str(error) if isinstance(error,SafeError) and re.fullmatch(r'[a-z0-9-]{1,80}',str(error)) else 'service-check-unavailable'
        print('::notice::Website services: '+code+'. Existing website and email schedules remain unchanged.')
