"""Validate API access with one disposable recipient-free draft.

No owner draft or subscriber selection is loaded. Never calls a send or
schedule endpoint. A successfully created probe is checked and removed.
"""
import json
import importlib.util
import os
from pathlib import Path
import re
import subprocess

def main():
    if os.environ.get('GITHUB_REF')!='refs/heads/staging':raise RuntimeError('Diagnostic is staging-source only')
    key=os.environ.get('BREVO_API_KEY','').strip()
    if not key:raise RuntimeError('Existing credential unavailable')
    payload={'name':'DOTM recipient-free API validation '+os.environ.get('GITHUB_RUN_ID','isolated'),
        'type':'classic','sender':{'email':'postcards@dainyelonthemove.com'},'subject':'Disposable API validation',
        'htmlContent':'<html><body><p>Disposable validation. No recipients. Never send.</p></body></html>',
        'abTesting':False,'sendAtBestTime':False}
    config='\n'.join(['url = "https://api.brevo.com/v3/emailCampaigns"','request = "POST"',
        'header = '+json.dumps('api-key: '+key),'header = "Content-Type: application/json"',
        'header = "Accept: application/json"','data-binary = '+json.dumps(json.dumps(payload))])+'\n'
    result=subprocess.run(['curl','--config','-','--silent','--show-error','--max-time','40','--connect-timeout','15',
        '--proto','=https','--max-redirs','0','--write-out','\nDOTM_STATUS:%{http_code}'],input=config,capture_output=True,text=True,timeout=45)
    raw,_,status=result.stdout.rpartition('\nDOTM_STATUS:')
    if result.returncode or not re.fullmatch(r'\d{3}',status):raise RuntimeError('Response unavailable')
    try:
        detail=json.loads(raw);code=detail.get('code','');message=str(detail.get('message','')).lower()
        codes={'method_not_allowed','unauthorized','permission_denied','invalid_parameter','missing_parameter','bad_request','account_under_validation','not_enough_credits'}
        allowed={'premium','plan','abtesting','sendatbesttime','inactive','activated','allowed','permission','campaign','api','account','segment','recipient','list','sender','sending','suspended','free','invalid','parameter','name','required','empty','mandatory','disabled','template','syntax','language','enabled','html','classic','creation','not','paid','feature','new','old','deprecated','email','message','access','configuration','unavailable','external','transactional','marketing'}
        words=sorted(allowed & set(re.findall(r'[a-z]+',message)))
        report={'http':int(status),'format':'json','code':code if code in codes else 'other','diagnosticTerms':words}
    except (ValueError,AttributeError):
        report={'http':int(status),'format':'html' if re.search(r'<html|<!doctype html',raw,re.I) else 'other','providerEdge':bool(re.search('cloudflare',raw,re.I))}
    print(json.dumps(report))
    print('Recipient-free disposable validation: no owner draft, subscriber data or send/schedule endpoint.')
    if int(status)==201:
        identifier=detail.get('id')
        if not isinstance(identifier,int):raise RuntimeError('Missing disposable draft receipt')
        def call(method,body=None):
            settings='\n'.join(['url = '+json.dumps('https://api.brevo.com/v3/emailCampaigns/'+str(identifier)),
                'request = '+json.dumps(method),'header = '+json.dumps('api-key: '+key),'header = "Accept: application/json"',
                'header = "Content-Type: application/json"']+(['data-binary = '+json.dumps(json.dumps(body))] if body is not None else []))+'\n'
            response=subprocess.run(['curl','--config','-','--silent','--show-error','--max-time','40','--proto','=https','--max-redirs','0','--write-out','\nDOTM_STATUS:%{http_code}'],input=settings,capture_output=True,text=True,timeout=45)
            content,_,code=response.stdout.rpartition('\nDOTM_STATUS:')
            if response.returncode or not re.fullmatch(r'\d{3}',code):raise RuntimeError('Disposable receipt unavailable')
            return int(code),content
        code,content=call('GET');saved=json.loads(content)
        if code!=200 or saved.get('name')!=payload['name'] or saved.get('status')!='draft' or any(saved.get('recipients',{}).get(k) for k in ['lists','listIds','segments','segmentIds']):raise RuntimeError('Disposable identity or recipient check failed')
        spec=importlib.util.spec_from_file_location('delivery',Path(__file__).with_name('postcard-delivery.py'))
        delivery=importlib.util.module_from_spec(spec);spec.loader.exec_module(delivery)
        fixture={'subject':'Disposable API validation','previewText':'No email will be sent.','headline':'Disposable API validation','body':'Disposable recipient-free validation. Never send this draft.','ctaText':'Website','ctaUrl':'https://dainyelonthemove.com/stories','imageUrl':''}
        for phase,changes in [('template',{'sender':{'name':'Dainyel on the Move','email':delivery.SENDER},'replyTo':'support@dainyelonthemove.com','subject':fixture['subject'],'previewText':fixture['previewText'],'htmlContent':delivery.template(fixture),'tag':'website-postcards'}),('saved-audience',{'recipients':delivery.AUDIENCE})]:
            code,content=call('PUT',changes)
            print(json.dumps({'phase':phase,'http':code,'reason':delivery.provider_reason(code,content) if code>=400 else 'accepted-draft-only'}))
        code,content=call('GET');saved=json.loads(content)
        if code!=200 or saved.get('name')!=payload['name'] or saved.get('status')!='draft':raise RuntimeError('Disposable draft state changed; stop cleanup')
        code,_=call('DELETE')
        if code!=204:raise RuntimeError('Disposable draft cleanup not confirmed')
        print('Recipient-free disposable draft created, verified as draft and removed; no email sent.')
    elif int(status)<400:raise RuntimeError('Unexpected acceptance requires owner reconciliation')

if __name__=='__main__':main()
