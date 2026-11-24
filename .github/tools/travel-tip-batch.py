#!/usr/bin/env python3
"""Import one owner-approved private tip batch after the existing quota gate.

No timer, provider operation or public draft file. Exact create-only atomic
writes and a persistent digest receipt make uncertain commits safe to retry.
"""
from datetime import datetime, timezone, timedelta
from pathlib import Path
import argparse
import base64
import hashlib
import importlib.util
import json
import os
import re
import sys

HERE=Path(__file__).parent
def module(name,filename):
    spec=importlib.util.spec_from_file_location(name,HERE/filename)
    value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
publication=module('tip_publication','content-publication.py')
snapshot=module('tip_snapshot','public-content-snapshot.py')
d=publication.delivery
SERIES='travel-tips-20261122'
MEDIA={'/assets/optimized/peru/peru-album-cover.webp','/assets/optimized/peru/lima-pacific-sunset.webp','/assets/optimized/peru/cusco-breakfast.webp'}
RECEIPT=d.ROOT+'/_automation/'+SERIES
CACHE=Path('.approved-tip-batch/receipt.json')

def digest(value):return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()

def prepare(raw,source_root,now):
    if not isinstance(raw,str) or not 1<=len(raw.encode())<=60000:raise ValueError('Invalid private batch size')
    rows=json.loads(raw)
    if not isinstance(rows,list) or len(rows)!=17:raise ValueError('Unexpected approved batch count')
    identifiers=set();photos=set();dates=set();writes=[]
    def add(path,data,transforms):
        writes.append({'update':{'name':d.ROOT+'/cmsSpaces/production/'+path,'fields':{key:d.pack(value) for key,value in data.items()}},
            'currentDocument':{'exists':False},'updateTransforms':[{'fieldPath':field,'setToServerValue':'REQUEST_TIME'} for field in transforms]})
    for index,row in enumerate(rows):
        if set(row)!={'id','scheduledAt','payload','photo'} or not re.fullmatch(r'entry-[a-f0-9]{32}',row['id']):raise ValueError('Invalid tip identity')
        payload=publication.validate(row['payload'])
        if payload['kind']!='tip':raise ValueError('Batch is tips only')
        activation=index==0 and row['scheduledAt']=='on-activation'
        due=now if activation else d.date(row['scheduledAt'])
        # Only the first, never-stored tip starts on activation. Preserve every
        # dated future plan and the publisher's existing 24-hour late-run guard.
        if not '2026-11-23'<=due.date().isoformat()<='2026-12-31' or due<now-timedelta(days=1):raise ValueError('Approved schedule needs review')
        if not activation and (due.weekday() not in {0,2,4} or due.hour!=11 or due.minute!=0 or due.second!=0):raise ValueError('Approved schedule needs review')
        photo=row['photo']
        if set(photo)!={'id','src','alt'} or photo['src'] not in MEDIA or not re.fullmatch(r'photo-[a-f0-9]{32}',photo['id']) or not isinstance(photo['alt'],str) or not 1<=len(photo['alt'])<=300:raise ValueError('Invalid approved cover')
        if payload['photoIds']!=[photo['id']] or payload['heroPhotoId']!=photo['id']:raise ValueError('Cover ownership mismatch')
        if row['id'] in identifiers or photo['id'] in photos or due in dates:raise ValueError('Duplicate tip')
        identifiers.add(row['id']);photos.add(photo['id']);dates.add(due)
        image=(Path(source_root)/photo['src'].lstrip('/')).read_bytes()
        if len(image)>140*1024:raise ValueError('Oversized cover')
        width,height=snapshot.webp_dimensions(image)
        add('media/'+photo['id'],{'version':1,'entryId':row['id'],'dataUrl':'data:image/webp;base64,'+base64.b64encode(image).decode(),'alt':photo['alt'],'width':width,'height':height},['createdAt'])
        draft={**payload,'revision':1}
        add('drafts/'+row['id'],draft,['createdAt','updatedAt'])
        add('drafts/'+row['id']+'/history/r1',{'version':1,'content':draft},['content.createdAt','content.updatedAt','savedAt'])
        add('entrySchedules/'+row['id'],{'version':1,'entryId':row['id'],'draftRevision':1,'payload':payload,'status':'queued'},['createdAt','updatedAt'])
        writes[-1]['update']['fields']['scheduledAt']={'timestampValue':due.isoformat()}
    return rows,writes,digest(rows)

def confirmed(receipt,expected,count):
    saved={key:d.unpack(value) for key,value in receipt['fields'].items()}
    if saved.get('version')!=1 or saved.get('digest')!=expected or saved.get('count')!=count:raise ValueError('A different private batch receipt exists')
    return {'version':1,'digest':expected,'count':count,'confirmed':True}

def install(store,rows,writes,expected,known_missing=False):
    receipt=None if known_missing else store.optional(RECEIPT)
    if receipt:return confirmed(receipt,expected,len(rows))
    marker={'update':{'name':RECEIPT,'fields':{'version':d.pack(1),'digest':d.pack(expected),'count':d.pack(len(rows))}},
        'updateTransforms':[{'fieldPath':'createdAt','setToServerValue':'REQUEST_TIME'}],'currentDocument':{'exists':False}}
    result=store.call(d.ROOT+':commit','POST',{'writes':writes+[marker]})
    if not result.get('commitTime') or len(result.get('writeResults',[]))!=len(writes)+1:raise RuntimeError('Unconfirmed batch commit; retry only through its receipt')
    return {'version':1,'digest':expected,'count':len(rows),'confirmed':True,'commitTime':result['commitTime']}

def main():
    raw=os.environ.get('APPROVED_TRAVEL_TIPS_BATCH','')
    if not raw:print('No approved private tip batch supplied. No action.');return
    expected=digest(json.loads(raw))
    if CACHE.is_file():
        saved=json.loads(CACHE.read_text())
        if saved.get('digest')!=expected or saved.get('confirmed') is not True:raise ValueError('Batch cache differs')
        print('Approved tip batch already confirmed. No database read.');return
    if os.environ.get('GITHUB_REF')!='refs/heads/main' or os.environ.get('GITHUB_REPOSITORY')!='dainyelrooi/DainyelOnTheMove':raise RuntimeError('Fixed production branch required')
    store=d.Store();existing=store.optional(RECEIPT)
    if existing:receipt=confirmed(existing,expected,17)
    else:
        rows,writes,expected=prepare(raw,HERE.parents[1],datetime.now(timezone.utc))
        receipt=install(store,rows,writes,expected,known_missing=True)
    CACHE.parent.mkdir(exist_ok=True);CACHE.write_text(json.dumps(receipt)+'\n')
    print('Approved tip batch stored as17private schedules. No public entry or email created.')

if __name__=='__main__':
    try:main()
    except Exception as error:
        code=d.safe_failure_code(error) if isinstance(error,d.helpers.RemoteError) else 'tip-batch-needs-review'
        print('Approved tip batch not confirmed: '+code+'. No private content logged.',file=sys.stderr);sys.exit(1)
