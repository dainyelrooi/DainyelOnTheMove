#!/usr/bin/env python3
"""Private saved-content snapshots to the existing owner OneDrive connection.

No mail calls, subscriber/contact collections, private/ files, public artifacts,
credential output or deletion. One fixed readTime covers every exported page.
"""
import argparse
import configparser
from datetime import datetime, timezone, timedelta
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import urlencode
import zipfile

spec=importlib.util.spec_from_file_location('private_store',Path(__file__).with_name('question-notifications.py'))
helpers=importlib.util.module_from_spec(spec);spec.loader.exec_module(helpers)
ROOT=helpers.ROOT
DESTINATION='onedrive:DainyelOnTheMove website/backups/content'
MAX_DOCUMENTS=10000
MAX_BYTES=64*1024*1024

def collections(space):
    return [*(f'cmsSpaces/{space}/{kind}' for kind in ['drafts','published','summaries','media','mailDrafts','entrySchedules']),
        *(f'websiteSpaces/{space}/{kind}' for kind in ['drafts','published','media','search']),
        f'calendarSpaces/{space}/posts']

def read_all(store,path,read_time):
    token=None;count=0
    while True:
        args={'pageSize':100,'readTime':read_time}
        if token:args['pageToken']=token
        response=store.call(ROOT+'/'+path+'?'+urlencode(args))
        for row in response.get('documents',[]):
            count+=1
            if count>MAX_DOCUMENTS:raise RuntimeError('Snapshot exceeds the safe document limit; no partial backup was uploaded')
            yield row
        token=response.get('nextPageToken')
        if not token:break

def plain(value):
    for key in ['stringValue','timestampValue','booleanValue']:
        if key in value:return value[key]
    if 'integerValue' in value:return int(value['integerValue'])
    if 'mapValue' in value:return {key:plain(item) for key,item in value['mapValue'].get('fields',{}).items()}
    if 'arrayValue' in value:return [plain(item) for item in value['arrayValue'].get('values',[])]
    return None

def content(document):return {key:plain(value) for key,value in document.get('fields',{}).items()}

def snapshot(store,space):
    read_time=(datetime.now(timezone.utc)-timedelta(seconds=5)).isoformat().replace('+00:00','Z')
    rows={};total=0
    def append(row):
        nonlocal total
        total+=len(json.dumps(row,ensure_ascii=False).encode())
        if total>MAX_BYTES or len(rows)>=MAX_DOCUMENTS:raise RuntimeError('Snapshot exceeds the safe size limit; incomplete backup refused')
        rows[row['name'][len(ROOT)+1:]]=row
    paths=collections(space)
    # The live legacy calendar is backed up but never changed by this worker.
    if space=='production':paths.append('contentCalendar')
    for path in paths:
        for row in read_all(store,path,read_time):
            relative=row['name'][len(ROOT)+1:]
            if not relative.startswith(path+'/') or '/' in relative[len(path)+1:]:raise RuntimeError('Unexpected snapshot path')
            append(row)
            if path.endswith(('/drafts','/mailDrafts')):
                for history in read_all(store,relative+'/history',read_time):append(history)
            if len(rows)>MAX_DOCUMENTS:raise RuntimeError('Snapshot exceeds the safe document limit')
    return read_time,rows

def make_archive(path,space,read_time,rows):
    files={}
    def add(name,value):
        raw=json.dumps(value,ensure_ascii=False,separators=(',',':')).encode();files[name]=raw
    for relative,row in rows.items():add('documents/'+relative+'.json',row)
    # Ready-to-import copies make a recovery possible in the normal owner UI.
    for relative,row in rows.items():
        data=content(row)
        if re.fullmatch(r'cmsSpaces/'+space+r'/drafts/entry-[a-f0-9]{32}',relative):
            photos=[]
            for photo_id in data.get('photoIds',[]):
                photo=rows.get(f'cmsSpaces/{space}/media/{photo_id}')
                if not photo:raise RuntimeError('A saved entry photograph is missing; incomplete backup refused')
                item=content(photo);photos.append({key:item[key] for key in ['alt','dataUrl','width','height']}|{'id':photo_id})
            add('restore-in-admin/entries/'+relative.rsplit('/',1)[-1]+'.json',{'version':2,'id':relative.rsplit('/',1)[-1],'entry':data,'photos':photos})
        if re.fullmatch(r'websiteSpaces/'+space+r'/drafts/[a-z0-9-]+',relative):
            media={}
            for photo_id in data.get('photoIds',[]):
                photo=rows.get(f'websiteSpaces/{space}/media/{photo_id}')
                if not photo:raise RuntimeError('A saved page photograph is missing; incomplete backup refused')
                media[photo_id]=content(photo)
            add('restore-in-admin/website/'+relative.rsplit('/',1)[-1]+'.json',{'type':'dainyel-website-section','version':1,'pageId':data['pageId'],'sectionId':relative.rsplit('/',1)[-1],'values':data['values'],'media':media})
        if re.fullmatch(r'cmsSpaces/'+space+r'/mailDrafts/mail-[a-f0-9]{32}',relative):add('restore-in-admin/postcards/'+relative.rsplit('/',1)[-1]+'.json',{'type':'dainyel-postcard-draft','version':1,'mail':data})
    posts=[content(row) for relative,row in rows.items() if relative.startswith(f'calendarSpaces/{space}/posts/') and relative.count('/')==3]
    if posts:
        from zoneinfo import ZoneInfo
        exported=[]
        for post in posts:
            post['publishLocal']=datetime.fromisoformat(post['publishAt'].replace('Z','+00:00')).astimezone(ZoneInfo('Europe/Amsterdam')).strftime('%Y-%m-%dT%H:%M')
            exported.append(post)
        # Import is intentionally a plan, not proof that external posts were
        # scheduled/published. Existing checkmarks remain in raw documents.
        for index in range(0,len(exported),50):add(f'restore-in-admin/calendar/plan-{index//50+1}.json',{'version':1,'timezone':'Europe/Amsterdam','posts':exported[index:index+50]})
    manifest={'version':1,'type':'dainyel-private-content-backup','space':space,'snapshotAt':read_time,'documents':len(rows),'files':{name:hashlib.sha256(raw).hexdigest() for name,raw in files.items()}}
    with zipfile.ZipFile(path,'x',compression=zipfile.ZIP_DEFLATED) as archive:
        for name,raw in files.items():archive.writestr(name,raw)
        archive.writestr('manifest.json',json.dumps(manifest,indent=2))
        archive.writestr('RESTORE.txt','PRIVATE OWNER BACKUP. Keep this archive private.\nUnzip and use restore-in-admin JSON files in the matching Write / Website / Postcards / Calendar backup import. Restoring opens private unsaved edits, never an automatic publication or email. Website sections must still exist in the source catalogue. Calendar imports reset new checklist flags; review external social plans before scheduling again. Raw documents preserve original IDs, checkmarks, timestamps and saved versions for a technical disaster recovery. Never blindly restore public snapshots, security identities or mail delivery queues. No subscriber/contact data or credentials is included.\n')
    verify_archive(path)
    return manifest

def verify_archive(path):
    with zipfile.ZipFile(path) as archive:
        names=archive.namelist()
        if len(names)!=len(set(names)) or any(name.startswith('/') or '..' in name.split('/') or '\\' in name for name in names):raise RuntimeError('Invalid backup paths')
        if sum(info.file_size for info in archive.infolist())>MAX_BYTES*3:raise RuntimeError('Backup is too large')
        manifest=json.loads(archive.read('manifest.json'))
        if manifest.get('type')!='dainyel-private-content-backup' or manifest.get('version')!=1:raise RuntimeError('Invalid backup manifest')
        if set(names)!=set(manifest['files'])|{'manifest.json','RESTORE.txt'}:raise RuntimeError('Unexpected backup files')
        for name,digest in manifest['files'].items():
            if hashlib.sha256(archive.read(name)).hexdigest()!=digest:raise RuntimeError('Backup checksum mismatch')
    return manifest

def seed_calendar(store):
    read_time=(datetime.now(timezone.utc)-timedelta(seconds=2)).isoformat().replace('+00:00','Z');count=0
    for row in read_all(store,'contentCalendar',read_time):
        post_id=row['name'].rsplit('/',1)[-1]
        if not re.fullmatch('plan-[a-f0-9]{32}',post_id):raise RuntimeError('Unexpected calendar ID')
        destination=ROOT+'/calendarSpaces/staging/posts/'+post_id
        try:store.call(destination);continue
        except helpers.RemoteError as error:
            if error.status!=404:raise
        fields=row['fields']
        store.call(ROOT+':commit','POST',{'writes':[{'update':{'name':destination,'fields':fields},'currentDocument':{'exists':False}}]});count+=1
    print('Private staging calendar copy prepared. Existing test edits, live posts and reminder preferences were preserved. Copied posts: '+str(count))

def backup(store,space):
    value=os.environ.pop('ONEDRIVE_RCLONE_CONFIG','');config=configparser.ConfigParser(interpolation=None)
    config.read_string(value.lstrip('\ufeff'))
    if config.get('onedrive','type',fallback='')!='onedrive' or not shutil.which('rclone'):raise RuntimeError('Existing OneDrive backup connection is unavailable')
    with tempfile.TemporaryDirectory(prefix='dainyel-content-',dir=os.environ.get('RUNNER_TEMP')) as directory:
        folder=Path(directory);credential=folder/'rclone.conf';descriptor=os.open(credential,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
        with os.fdopen(descriptor,'w',encoding='utf-8') as file:file.write(value.lstrip('\ufeff'))
        del value,config
        read_time,rows=snapshot(store,space);name='content_'+space+'_'+datetime.now(timezone.utc).strftime('%Y-%m-%d_%H-%M-%S')+'_'+os.environ.get('GITHUB_RUN_ID','manual')+'_'+os.environ.get('GITHUB_RUN_ATTEMPT','1')+'.zip'
        archive=folder/name;manifest=make_archive(archive,space,read_time,rows);destination=DESTINATION+'/'+name
        result=subprocess.run(['rclone','--config',str(credential),'copyto',str(archive),destination,'--immutable','--retries','3'],capture_output=True,timeout=300)
        if result.returncode:raise RuntimeError('OneDrive backup upload was not confirmed; existing backups were preserved')
        result=subprocess.run(['rclone','--config',str(credential),'cat',destination],capture_output=True,timeout=300)
        if result.returncode or hashlib.sha256(result.stdout).digest()!=hashlib.sha256(archive.read_bytes()).digest():raise RuntimeError('OneDrive readback did not match; backup status was not advanced')
        store.call(ROOT+':commit','POST',{'writes':[{'update':{'name':ROOT+'/adminOperations/'+space+'/status/backup','fields':{'version':{'integerValue':'1'},'snapshotAt':{'timestampValue':read_time},'documents':{'integerValue':str(manifest['documents'])},'archiveName':{'stringValue':name},'sha256':{'stringValue':hashlib.sha256(archive.read_bytes()).hexdigest()}}},'updateTransforms':[{'fieldPath':'completedAt','setToServerValue':'REQUEST_TIME'}]}]})
        print('Private OneDrive content snapshot uploaded and checksum readback verified. No email, publication or deletion. Documents: '+str(manifest['documents']))

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--mode',choices=['backup','seed-calendar','check'],default='check');parser.add_argument('--space',choices=['staging','production'],default='staging');parser.add_argument('--verify',type=Path);args=parser.parse_args()
    if args.verify:manifest=verify_archive(args.verify);print('Backup checksums verified. No data restored. Documents: '+str(manifest['documents']));return
    if os.environ.get('GITHUB_REF') not in {'refs/heads/staging','refs/heads/main'}:raise RuntimeError('Run only from the reviewed staging or main branch')
    if args.space=='production' and os.environ.get('GITHUB_REF')!='refs/heads/main':raise RuntimeError('Production backup requires the approved main workflow')
    store=helpers.Firestore()
    if args.mode=='seed-calendar':
        if args.space!='staging':raise RuntimeError('Only the isolated test calendar can be seeded')
        seed_calendar(store)
    elif args.mode=='backup':backup(store,args.space)
    else:
        _,rows=snapshot(store,args.space);print('Private saved-content sources readable. No data logged, written, sent or published. Documents: '+str(len(rows)))

if __name__=='__main__':
    try:main()
    except Exception:
        print('Private content backup stopped safely. No content or connection details were logged; existing backups were preserved.',file=sys.stderr);sys.exit(1)
