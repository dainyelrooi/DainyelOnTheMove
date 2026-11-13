"""No provider, private-content read or cloud write: disposable public fixtures."""
import copy
from datetime import datetime,timezone,timedelta
import importlib.util
import json
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('verified_publication',Path(__file__).parents[1]/'tools/verify-publication.py')
v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
NOW=datetime(2026,11,12,14,tzinfo=timezone.utc);ID='entry-'+'a'*32;SID='about-'+'b'*16
ENTRY={'version':1,'id':ID,'kind':'field-note','title':'ISOLATED fixture','excerpt':'A test introduction.','body':'Safe fixture — text 🥾','place':'','sources':'','videoUrl':'','photoIds':[],'photoPlacements':[],'heroPhotoId':'','heroLayout':'split','heroPosition':'center','storyLabel':'','tripPeriod':'','publishedAt':'2026-11-12T12:00:00.123456Z','updatedAt':'2026-11-12T12:00:00.987654Z','photos':[]}
PAGE={'id':SID,'pageId':'about','values':{'f01':'Fixture link','f00':'Fixture text'},'photoIds':[],'media':[]}
MANIFEST={'version':1,'complete':True,'space':'staging','generation':'a'*32,'generatedAt':'2026-11-12T13:00:00Z','domains':v.snapshot.DOMAINS}
class Fixture:
    def __init__(self):
        self.entries=[copy.deepcopy(ENTRY)];self.pages=[copy.deepcopy(PAGE)];self.manifest=copy.deepcopy(MANIFEST);self.calls=[];self.fail=set()
        self.html={'/stories':'<a href="/entry/'+ID+'">Fixture</a>','/entry/'+ID:'<main data-server-entry data-server-content-hash="'+v.entry_digest(ENTRY)+'"></main>','/about':'<script src="/assets/website-public.js"></script><h2 data-site-field="'+SID+'/f00">Original</h2>'}
    def reader(self,url,**kwargs):
        path=url.removeprefix(v.snapshot.CDN_HOSTS['staging']);self.calls.append(path)
        if path in self.fail:raise RuntimeError('Fixture unavailable')
        return json.dumps(self.manifest).encode() if path.endswith('manifest.json') else self.html[path].encode()
    def retain(self,folder,space,**kwargs):
        target=Path(folder)/'data/public-content';target.mkdir(parents=True)
        for name,data in [('cms.json',{'generation':self.manifest['generation'],'entries':self.entries}),('website.json',{'generation':self.manifest['generation'],'sections':self.pages})]:(target/name).write_text(json.dumps(data),encoding='utf-8')
        return {'status':'PASS'}
    def verify(self,previous=None,now=NOW):
        with patch.object(v.snapshot,'retain_snapshot',self.retain):return v.verify('staging',previous or {},now,self.reader)
class Tests(unittest.TestCase):
    def test_complete_exact_pages_and_card_produce_private_hashes_not_content(self):
        f=Fixture();proof=f.verify();self.assertEqual(proof['state'],'complete');self.assertEqual(proof['entries'],{ID:v.entry_digest(ENTRY)});self.assertEqual(proof['pages'],{SID:v.page_digest(PAGE)})
        self.assertNotIn(ENTRY['body'],json.dumps(proof));self.assertNotIn(PAGE['values']['f00'],json.dumps(proof))
    def test_missing_card_wrong_article_failed_page_and_missing_photo_never_confirm(self):
        for path in ['/entry/'+ID,'/stories','/about']:
            f=Fixture();f.html[path]='Wrong or incomplete deployed copy';proof=f.verify();self.assertEqual(proof['state'],'partial');self.assertFalse((proof['pages'] if path=='/about' else proof['entries']))
        f=Fixture();pid='photo-'+'c'*32;f.entries[0].update(photoIds=[pid],photoPlacements=[0],heroPhotoId=pid,photos=[{'id':pid,'src':'/assets/public-content/'+'d'*64+'.webp'}]);f.html['/entry/'+ID]='<main data-server-entry data-server-content-hash="'+v.entry_digest(f.entries[0])+'">';self.assertEqual(f.verify()['entries'],{})
        f=Fixture();f.fail.add('/entry/'+ID);self.assertEqual(f.verify()['entries'],{})
    def test_repeat_is_idempotent_and_withdrawals_drop_previous_hashes(self):
        f=Fixture();proof=f.verify();calls=len(f.calls);self.assertIsNone(f.verify(proof));self.assertEqual(len(f.calls),calls+1)
        f.manifest['generation']='b'*32;f.entries=[];f.pages=[];new=f.verify(proof);self.assertEqual(new['entries'],{});self.assertEqual(new['pages'],{})
    def test_expired_wrong_environment_mixed_generation_fail_closed(self):
        f=Fixture()
        with self.assertRaises(RuntimeError):f.verify(now=NOW+timedelta(days=2))
        f.manifest['space']='production'
        with self.assertRaises(RuntimeError):f.verify()
        f=Fixture()
        def mixed(folder,space,**kwargs):
            f.retain(folder,space,**kwargs);p=Path(folder)/'data/public-content/cms.json';p.write_text(json.dumps({'generation':'b'*32,'entries':f.entries}),encoding='utf-8');return {'status':'PASS'}
        with patch.object(v.snapshot,'retain_snapshot',mixed):
            with self.assertRaises(RuntimeError):v.verify('staging',{},NOW,f.reader)
    def test_only_version_checked_technical_receipt_can_be_written(self):
        f=Fixture();writes=[]
        class Store:
            def optional(self,path):self.path=path;return None
            def call(self,path,method,body):writes.append(body['writes'])
        store=Store()
        with patch.object(v.snapshot,'retain_snapshot',f.retain):v.run(store,'staging',NOW,f.reader)
        self.assertEqual(len(writes),1);write=writes[0][0];self.assertTrue(write['update']['name'].endswith('/adminOperations/staging/status/publicReading'));self.assertEqual(write['currentDocument'],{'exists':False})
        self.assertFalse(any(word in write['update']['name'] for word in ['/drafts/','/published/','/mailJobs/']))
    def test_browser_and_server_hash_contract_handles_unicode_dates_and_key_order(self):
        source="import {contentDigest,pageContentKey} from './assets/draft-publication-state.js';import {entryContentKey} from './assets/publishing-model.js';let input='';for await(const part of process.stdin)input+=part;const x=JSON.parse(input);console.log(JSON.stringify([await contentDigest(entryContentKey(x.entry)),await contentDigest(pageContentKey(x.page))]));"
        result=subprocess.run(['node','--input-type=module','-e',source],input=json.dumps({'entry':ENTRY,'page':PAGE}),capture_output=True,text=True,encoding='utf-8',cwd=Path(__file__).parents[2],check=True)
        self.assertEqual(json.loads(result.stdout),[v.entry_digest(ENTRY),v.page_digest(PAGE)])
