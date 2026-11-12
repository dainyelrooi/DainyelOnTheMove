#!/usr/bin/env python3
"""Add only private staging link/history reads to the current named Rules.

The current cloud source is preserved byte-for-byte outside this additive
staging-only block. Full production candidate changes are never deployed here.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path

spec=importlib.util.spec_from_file_location('staging_rules_delivery',Path(__file__).with_name('postcard-delivery.py'))
d=importlib.util.module_from_spec(spec);spec.loader.exec_module(d)
API='https://firebaserules.googleapis.com/v1/'
RELEASE='projects/'+d.helpers.PROJECT+'/releases/cloud.firestore/'+d.helpers.DATABASE
START='    // BEGIN private Postcard staging extension\n'
END='    // END private Postcard staging extension\n'


def overlay():
    source=(Path(__file__).parents[2]/'firestore.rules').read_text()
    begin=source.index('    function validMailLink(')
    finish=source.index('    match /cmsSpaces/{space}/mailLinks/',begin)
    validator=source[begin:finish].replace('validMailLink(', 'validStagingPostcardLink(')
    return START+validator+'''    match /cmsSpaces/{space}/mailLinks/{mailId} {
      allow get: if space == 'staging' && cmsSpace(space) && isOwner();
      allow list,delete: if false;
      allow create: if space == 'staging' && cmsSpace(space) && isOwner() && cmsMailId(mailId)
        && validStagingPostcardLink(request.resource.data,space,mailId) && request.resource.data.revision == 1;
      allow update: if space == 'staging' && cmsSpace(space) && isOwner() && cmsMailId(mailId)
        && validStagingPostcardLink(request.resource.data,space,mailId) && request.resource.data.revision == resource.data.revision + 1;
    }
    match /cmsSpaces/{space}/mailJobs/{mailId}/providerHistory/{eventId} {
      allow get: if space == 'staging' && cmsSpace(space) && isOwner() && cmsMailId(mailId);
      allow list: if space == 'staging' && cmsSpace(space) && isOwner() && cmsMailId(mailId) && request.query.limit <= 20;
      allow write: if false;
    }
    match /adminOperations/{space}/status/{id} {
      allow get: if space == 'staging' && id == 'postcards' && isOwner();
      allow list,write: if false;
    }
'''+END


def candidate(source):
    block=overlay()
    if START in source:
        old=source[source.index(START):source.index(END)+len(END)]
        if old!=block:
            raise RuntimeError('Existing staging extension differs; review required')
        return source
    anchor='    match /{document=**} {'
    if source.count(anchor)!=1 or 'validStagingPostcardLink' in source:
        raise RuntimeError('Current named Rules layout changed')
    result=source.replace(anchor,block+anchor)
    if result.replace(block,'',1)!=source:
        raise RuntimeError('Non-staging source changed')
    return result


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    if os.environ.get('GITHUB_REF')!='refs/heads/staging':raise RuntimeError('Staging branch required')
    store=d.Store()
    def call(path,method='GET',body=None):
        return d.helpers.request('Firebase Rules',API+path,store.headers,method,body)
    release=call(RELEASE)
    ruleset=call(release['rulesetName'])
    files=ruleset.get('source',{}).get('files',[])
    if len(files)!=1 or not isinstance(files[0].get('content'),str):raise RuntimeError('Unexpected named Rules source')
    source=files[0]['content'];reviewed=candidate(source)
    digest=hashlib.sha256(source.encode()).hexdigest()
    print('Current named Rules read; additive staging-only source checked. Existing production source remains identical outside the isolated extension.')
    if not args.apply:return
    if reviewed!=source:
        # Private immutable pre-change backup, never a public workflow artifact.
        path=d.ROOT+'/_automation/postcard-staging-rules-'+digest
        if not store.optional(path):
            store.call(d.ROOT+':commit','POST',{'writes':[{'update':{'name':path,'fields':{
                'source':d.pack(source),'rulesetName':d.pack(release['rulesetName']),'sourceSha256':d.pack(digest)}},'currentDocument':{'exists':False}}]})
        created=call('projects/'+d.helpers.PROJECT+'/rulesets','POST',{'source':{'files':[{'name':files[0]['name'],'content':reviewed}]}})
        current=call(RELEASE)
        if current.get('rulesetName')!=release.get('rulesetName'):raise RuntimeError('Named Rules changed concurrently; no release replaced')
        call(RELEASE,'PATCH',{'release':{'name':RELEASE,'rulesetName':created['name']},'updateMask':'rulesetName'})
    saved=call(RELEASE);actual=call(saved['rulesetName'])['source']['files'][0]['content']
    if actual!=reviewed:raise RuntimeError('Exact named Rules readback failed')
    print('Private staging-only Postcard links, history and controller status are active; exact named source readback passed. No production permission or Auth setting changed.')


if __name__=='__main__':
    try:main()
    except Exception as error:
        code=('http-'+str(error.status)) if isinstance(error,d.helpers.RemoteError) else 'staging-rules-unconfirmed'
        raise SystemExit('Staging Rules check stopped safely: '+code) from None
