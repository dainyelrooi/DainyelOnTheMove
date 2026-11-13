"""Verify deployed public pages; write private display evidence only.

Never reads/deletes drafts, publishes content, invokes Brevo or changes a plan.
Uses the existing complete public-copy validator (including photographs).
"""
import argparse
from datetime import datetime, timezone, timedelta
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import tempfile
import time
import urllib.request

def module(name,file):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name(file));value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
snapshot=module('verified_snapshot','public-content-snapshot.py')
delivery=module('verified_delivery','postcard-delivery.py')
KEYS=['kind','title','excerpt','body','place','sources','videoUrl','photoIds','photoPlacements','heroPhotoId','heroPosition','heroLayout','storyLabel','tripPeriod']
def digest(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def entry_digest(entry):
    date=lambda value:delivery.date(value).isoformat(timespec='milliseconds').replace('+00:00','Z')
    return digest([entry[key] for key in KEYS]+[date(entry['publishedAt']),date(entry['updatedAt'])])
def page_digest(page):return digest([1,page['pageId'],dict(sorted(page['values'].items())),page['photoIds']])

class PublicReader:
    def __init__(self,space):self.host=snapshot.CDN_HOSTS[space];self.deadline=time.monotonic()+100;self.calls=0
    def __call__(self,url,headers=None,method='GET',body=None,*,maximum,missing_ok=False):
        if method!='GET' or body is not None or not url.startswith(self.host+'/') or time.monotonic()>self.deadline:raise RuntimeError('public-read-bound')
        self.calls+=1
        if self.calls>400:raise RuntimeError('public-read-bound')
        request=urllib.request.Request(url,headers={'Cache-Control':'no-cache','User-Agent':'Dainyel-publication-verification/1.0'})
        try:
            with urllib.request.build_opener(delivery.helpers.NoRedirect()).open(request,timeout=8) as response:
                if response.status!=200:raise RuntimeError('public-response')
                raw=response.read(maximum+1)
                if len(raw)>maximum:raise RuntimeError('public-byte-bound')
                return raw
        except Exception:
            if missing_ok:return None
            raise RuntimeError('public-unavailable') from None

def verify(space,previous,now,reader):
    host=snapshot.CDN_HOSTS[space]
    manifest=json.loads(reader(host+'/data/public-content/manifest.json',maximum=16384))
    captured=snapshot.validate_manifest(manifest,space,now)
    if now-captured>timedelta(hours=24):raise RuntimeError('public-copy-expired')
    if previous.get('state')=='complete' and previous.get('generation')==manifest['generation'] and now-delivery.date(previous['checkedAt'])<timedelta(hours=12):return None
    with tempfile.TemporaryDirectory(prefix='dotm-public-proof-') as folder:
        result=snapshot.retain_snapshot(folder,space,now=now,fetch=reader)
        if result['status']!='PASS':raise RuntimeError('public-copy-unavailable')
        cms=json.loads((Path(folder)/'data/public-content/cms.json').read_text(encoding='utf-8'))
        website=json.loads((Path(folder)/'data/public-content/website.json').read_text(encoding='utf-8'))
    if cms['generation']!=manifest['generation'] or website['generation']!=manifest['generation']:raise RuntimeError('public-copy-changed')
    entries,pages={},{};pending=0;checked=0;htmls={}
    def html(path):
        if path not in htmls:htmls[path]=reader(host+path,maximum=2*1024*1024).decode('utf-8')
        return htmls[path]
    stories=html('/stories') if cms['entries'] else ''
    for entry in cms['entries']:
        identifier=entry['id'];key=entry_digest(entry)
        if previous.get('entries',{}).get(identifier)==key and now-delivery.date(previous.get('checkedAt',now.isoformat()))<timedelta(hours=12):entries[identifier]=key;continue
        if checked>=20:pending+=1;continue
        checked+=1
        try:
            page=html('/entry/'+identifier)
            if 'data-server-entry' not in page or 'data-server-content-hash="'+key+'"' not in page or 'href="/entry/'+identifier+'"' not in stories:raise RuntimeError('public-entry-not-current')
            hero=entry['heroPhotoId'] or next(iter(entry['photoIds']),'')
            visible={identifier for index,identifier in enumerate(entry['photoIds']) if identifier==hero or entry['photoPlacements'][index]>=0}
            if any(photo['src'] not in page for photo in entry['photos'] if photo['id'] in visible):raise RuntimeError('public-photo-reference')
            entries[identifier]=key
        except Exception:pending+=1
    for section in website['sections']:
        identifier=section['id'];key=page_digest(section)
        if previous.get('pages',{}).get(identifier)==key and now-delivery.date(previous.get('checkedAt',now.isoformat()))<timedelta(hours=12):pages[identifier]=key;continue
        if checked>=20:pending+=1;continue
        checked+=1
        try:
            page=html('/' if section['pageId'] in {'index','shared'} else '/'+section['pageId'])
            if 'data-site-field="'+identifier+'/' not in page or 'website-public.js' not in page:raise RuntimeError('public-section-not-current')
            pages[identifier]=key
        except Exception:pending+=1
    return {'version':1,'source':'public-cdn','space':space,'state':'partial' if pending else 'complete','generation':manifest['generation'],
        'checkedAt':now.isoformat(),'generatedAt':manifest['generatedAt'],'entries':entries,'pages':pages,'pending':pending}

def run(store,space,now,reader):
    path=delivery.ROOT+'/adminOperations/'+space+'/status/publicReading';old=store.optional(path)
    previous={key:delivery.unpack(value) for key,value in (old or {}).get('fields',{}).items()}
    proof=verify(space,previous,now,reader)
    if proof is None:return {'unchanged':True}
    # CAS protects concurrent verification. An uncertain receipt is never replayed.
    store.call(delivery.ROOT+':commit','POST',{'writes':[{'update':{'name':path,'fields':{key:delivery.pack(value) for key,value in proof.items()}},
        'currentDocument':{'updateTime':old['updateTime']} if old else {'exists':False}}]})
    return {'state':proof['state'],'entries':len(proof['entries']),'pages':len(proof['pages']),'pending':proof['pending']}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--space',choices=['staging','production'],default='staging');args=parser.parse_args()
    snapshot.sync_guard(args.space)
    result=run(delivery.Store(),args.space,datetime.now(timezone.utc),PublicReader(args.space))
    print('Public publication verification complete. '+json.dumps(result)+' No draft deletion, publication or email action.')
if __name__=='__main__':
    try:main()
    except Exception:print('Public verification unavailable; unconfirmed drafts remain active. No content or email changed.');raise SystemExit(1)
