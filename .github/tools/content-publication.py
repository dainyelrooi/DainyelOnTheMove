#!/usr/bin/env python3
"""Publish only due, immutable owner-reviewed snapshots. No email/provider calls.

Publication, archive card and completion marker commit atomically with exact
preconditions. Cancellation/deletion/concurrent editing cannot race the claim.
"""
import argparse
from datetime import datetime, timezone, timedelta
import importlib.util
import os
from pathlib import Path
import re
import sys

spec=importlib.util.spec_from_file_location('publication_store',Path(__file__).with_name('postcard-delivery.py'))
delivery=importlib.util.module_from_spec(spec);spec.loader.exec_module(delivery)
ROOT=delivery.ROOT
FIELDS={'version','kind','title','excerpt','body','place','sources','videoUrl','photoIds','photoPlacements','heroPhotoId','heroLayout','heroPosition','storyLabel','tripPeriod'}

def validate(payload):
    if not isinstance(payload,dict) or set(payload)!=FIELDS or payload['version']!=1:raise ValueError('Unexpected content fields')
    for key,low,high in [('title',1,140),('excerpt',10,320),('body',10,60000),('place',0,100),('sources',0,3000),('videoUrl',0,500),('heroPhotoId',0,38),('storyLabel',0,120),('tripPeriod',0,80)]:
        if not isinstance(payload[key],str) or not low<=len(payload[key])<=high:raise ValueError('Invalid content')
    if payload['kind'] not in {'blog','field-note','fact'} or payload['heroLayout'] not in {'split','wide'} or payload['heroPosition'] not in {'top','center','bottom'}:raise ValueError('Invalid presentation')
    photos=payload['photoIds'];positions=payload['photoPlacements']
    if not isinstance(photos,list) or len(photos)>12 or len(set(photos))!=len(photos) or any(not isinstance(p,str) or not re.fullmatch(r'photo-[a-f0-9]{32}',p) for p in photos):raise ValueError('Invalid photos')
    if payload['heroPhotoId'] and payload['heroPhotoId'] not in photos:raise ValueError('Invalid banner')
    if not isinstance(positions,list) or len(positions)!=len(photos) or any(type(n) is not int or not -1<=n<=24 for n in positions):raise ValueError('Invalid photo positions')
    if payload['videoUrl'] and not re.fullmatch(r'https://(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com)/[^ ]+',payload['videoUrl']):raise ValueError('Invalid video')
    return payload

class Store(delivery.Store):
    def pending_entries(self,space,now):
        result=self.call(ROOT+'/cmsSpaces/'+space+':runQuery','POST',{'structuredQuery':{
            'from':[{'collectionId':'entrySchedules'}],
            'where':{'compositeFilter':{'op':'AND','filters':[
                {'fieldFilter':{'field':{'fieldPath':'status'},'op':'EQUAL','value':delivery.pack('queued')}},
                {'fieldFilter':{'field':{'fieldPath':'scheduledAt'},'op':'LESS_THAN_OR_EQUAL','value':{'timestampValue':now.isoformat()}}}]}},
            'orderBy':[{'field':{'fieldPath':'scheduledAt'},'direction':'ASCENDING'}],'limit':20}})
        return [row['document'] for row in result if 'document' in row]

def process(store,document,space,now):
    job={key:delivery.unpack(value) for key,value in document['fields'].items()}
    identifier=document['name'].split('/')[-1]
    if not re.fullmatch(r'entry-[a-f0-9]{32}',identifier) or job.get('entryId')!=identifier or job.get('version')!=1 or job.get('status')!='queued':raise ValueError('Invalid schedule')
    if delivery.withhold_owner_cancelled(store,document,'CONTENT_CANCELLED_ENTRY_IDS','entry'):return False
    due=delivery.date(job['scheduledAt'])
    if due>now:return False
    if now-due>timedelta(days=1):raise ValueError('Missed publication needs review')
    payload=validate(job['payload']);base=ROOT+'/cmsSpaces/'+space
    draft=store.optional(base+'/drafts/'+identifier)
    if not draft:raise ValueError('Draft deleted')
    for photo_id in payload['photoIds']:
        photo=store.optional(base+'/media/'+photo_id)
        if not photo or delivery.unpack(photo['fields'].get('entryId',{}))!=identifier:raise ValueError('Missing or mismatched photograph')
    published=store.optional(base+'/published/'+identifier)
    public_fields={key:delivery.pack(value) for key,value in payload.items()}
    public_fields['version']=delivery.pack(1)
    summary={key:public_fields[key] for key in ['version','kind','title','excerpt','place']}
    summary['coverPhotoId']=delivery.pack(payload['photoIds'][0] if payload['photoIds'] else '')
    transforms=[{'fieldPath':'updatedAt','setToServerValue':'REQUEST_TIME'}]
    if published:
        public_fields['publishedAt']=summary['publishedAt']=published['fields']['publishedAt']
    else:transforms.append({'fieldPath':'publishedAt','setToServerValue':'REQUEST_TIME'})
    schedule_fields=dict(document['fields']);schedule_fields['status']=delivery.pack('published')
    # REST Write has no verify operation. Re-save the exact draft under its
    # read version so deletion/editing races still abort the entire commit.
    # No draft content, revision or owner-facing saved timestamp is changed.
    writes=[{'update':{'name':draft['name'],'fields':draft['fields']},
         'currentDocument':{'updateTime':draft['updateTime']}},
        {'update':{'name':base+'/published/'+identifier,'fields':public_fields},'updateTransforms':transforms,
         'currentDocument':{'updateTime':published['updateTime']} if published else {'exists':False}},
        {'update':{'name':base+'/summaries/'+identifier,'fields':summary},'updateTransforms':transforms},
        {'update':{'name':document['name'],'fields':schedule_fields},'updateTransforms':[{'fieldPath':'updatedAt','setToServerValue':'REQUEST_TIME'}],
         'currentDocument':{'updateTime':document['updateTime']}}]
    store.call(ROOT+':commit','POST',{'writes':writes})
    return True

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--mode',choices=['check','process'],default='check');parser.add_argument('--space',choices=['staging','production'],default='staging');args=parser.parse_args()
    store=Store();now=datetime.now(timezone.utc)
    if args.mode=='process':
        expected='refs/heads/main' if args.space=='production' else 'refs/heads/staging'
        if os.environ.get('GITHUB_REF')!=expected or os.environ.get('REPOSITORY_VISIBILITY')!='public':raise RuntimeError('Unexpected execution branch')
        metadata=store.call(f'projects/{delivery.helpers.PROJECT}/databases/{delivery.helpers.DATABASE}')
        if metadata.get('databaseEdition')!='ENTERPRISE' or not metadata.get('freeTier'):raise RuntimeError('Existing free database unavailable')
    rows=store.pending_entries(args.space,now)
    if args.mode=='check':print('Bounded schedule check complete. No publication or email action.');return
    unconfirmed=False
    for document in rows:
        try:process(store,document,args.space,now)
        except ValueError:
            try:store.update(document,{'status':'review'})
            except Exception:pass  # A newer cancellation/replacement always wins.
            print('One publication requires private owner review.')
        except Exception as error:
            # A CAS failure or uncertain commit never creates a second snapshot.
            unconfirmed=True
            safe_status=f' HTTP {error.status}' if isinstance(error,delivery.helpers.RemoteError) else ''
            print('One publication was not confirmed.'+safe_status+' The next bounded check reconciles saved status.')
    print('Due publication check complete. No email/provider operation exists in this worker.')
    if unconfirmed:raise RuntimeError('Publication was not confirmed')

if __name__=='__main__':
    try:main()
    except Exception as error:
        safe_status=f' HTTP {error.status}' if isinstance(error,delivery.helpers.RemoteError) else ''
        print('Publication check stopped safely.'+safe_status+' No private content or credentials logged.',file=sys.stderr);sys.exit(1)
