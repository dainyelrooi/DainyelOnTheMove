"""Validate API access with an intentionally invalid, recipient-free request.

Never uses an owner draft, creates a valid campaign or sends anything. Only
fixed diagnostic words/status are emitted; the provider body stays private.
"""
import json
import os
import re
import subprocess

def main():
    if os.environ.get('GITHUB_REF')!='refs/heads/staging':raise RuntimeError('Diagnostic is staging-source only')
    key=os.environ.get('BREVO_API_KEY','').strip()
    if not key:raise RuntimeError('Existing credential unavailable')
    config='\n'.join(['url = "https://api.brevo.com/v3/emailCampaigns"','request = "POST"',
        'header = '+json.dumps('api-key: '+key),'header = "Content-Type: application/json"',
        'header = "Accept: application/json"','data-binary = "{}"'])+'\n'
    result=subprocess.run(['curl','--config','-','--silent','--show-error','--max-time','40','--connect-timeout','15',
        '--proto','=https','--max-redirs','0','--write-out','\nDOTM_STATUS:%{http_code}'],input=config,capture_output=True,text=True,timeout=45)
    raw,_,status=result.stdout.rpartition('\nDOTM_STATUS:')
    if result.returncode or not re.fullmatch(r'\d{3}',status):raise RuntimeError('Response unavailable')
    try:
        detail=json.loads(raw);code=detail.get('code','');message=str(detail.get('message','')).lower()
        codes={'method_not_allowed','unauthorized','permission_denied','invalid_parameter','missing_parameter','bad_request','account_under_validation','not_enough_credits'}
        allowed={'premium','plan','abtesting','sendatbesttime','inactive','activated','allowed','permission','campaign','api','account','segment','recipient','list','sender','sending','suspended','free','invalid','parameter','name','required','empty','mandatory','disabled'}
        words=sorted(allowed & set(re.findall(r'[a-z]+',message)))
        report={'http':int(status),'format':'json','code':code if code in codes else 'other','diagnosticTerms':words}
    except (ValueError,AttributeError):
        report={'http':int(status),'format':'html' if re.search(r'<html|<!doctype html',raw,re.I) else 'other','providerEdge':bool(re.search('cloudflare',raw,re.I))}
    print(json.dumps(report))
    print('Intentionally invalid empty campaign: no name, sender, content or recipients; no send/schedule endpoint called.')
    if int(status)<400:raise RuntimeError('Unexpected acceptance requires owner reconciliation')

if __name__=='__main__':main()
