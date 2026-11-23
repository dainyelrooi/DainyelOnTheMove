import copy
from datetime import datetime,timedelta,timezone
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('tip_batch',Path(__file__).parents[1]/'tools/travel-tip-batch.py')
batch=importlib.util.module_from_spec(spec);spec.loader.exec_module(batch)
NOW=datetime(2026,11,22,12,tzinfo=timezone.utc)
def fixture():
    rows=[];day=NOW.replace(hour=11)+timedelta(days=1)
    while len(rows)<17:
        if day.weekday() in {0,2,4}:
            n=len(rows)+1;identifier='entry-'+f'{n:032x}';photo='photo-'+f'{n:032x}'
            payload={'version':1,'kind':'tip','title':'Synthetic advice '+str(n),'excerpt':'A synthetic practical introduction.','body':'A complete isolated advice fixture.',
                'place':'','sources':'','videoUrl':'','photoIds':[photo],'photoPlacements':[-1],'heroPhotoId':photo,'heroLayout':'split','heroPosition':'center','storyLabel':'Travel tip','tripPeriod':''}
            rows.append({'id':identifier,'scheduledAt':day.isoformat(),'payload':payload,'photo':{'id':photo,'src':sorted(batch.MEDIA)[0],'alt':'An approved test image'}})
        day+=timedelta(days=1)
    return rows
class Store:
    def __init__(self):self.marker=None;self.calls=0;self.uncertain=False
    def optional(self,path):return self.marker
    def call(self,path,method,body):
        self.calls+=1;self.marker={'fields':body['writes'][-1]['update']['fields']}
        if self.uncertain:raise RuntimeError('Uncertain transport response')
        return {'commitTime':NOW.isoformat(),'writeResults':[{} for _ in body['writes']]}
class BatchTests(unittest.TestCase):
    def prepared(self,rows=None,now=NOW):
        with tempfile.TemporaryDirectory() as root,patch.object(batch.snapshot,'webp_dimensions',return_value=(1,1)):
            for src in batch.MEDIA:
                p=Path(root)/src.lstrip('/');p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b'synthetic-image')
            return batch.prepare(json.dumps(rows or fixture()),root,now)
    def test_one_atomic_create_only_batch_never_publishes_or_creates_mail(self):
        rows,writes,digest=self.prepared();self.assertEqual(len(writes),68)
        self.assertTrue(all(w['currentDocument']=={'exists':False} for w in writes))
        self.assertTrue(all('/published/' not in w['update']['name'] and '/mail' not in w['update']['name'] for w in writes))
        store=Store();result=batch.install(store,rows,writes,digest)
        self.assertTrue(result['confirmed']);self.assertEqual(result['count'],17);self.assertEqual(store.calls,1)
        batch.install(store,rows,writes,digest);self.assertEqual(store.calls,1)
    def test_uncertain_commit_reconciles_its_exact_marker_without_duplicate_writes(self):
        rows,writes,digest=self.prepared();store=Store();store.uncertain=True
        with self.assertRaises(RuntimeError):batch.install(store,rows,writes,digest)
        result=batch.install(store,rows,writes,digest);self.assertTrue(result['confirmed']);self.assertEqual(store.calls,1)
        with self.assertRaises(ValueError):batch.install(store,rows,writes,'different-digest')
    def test_unknown_kind_duplicate_identity_unapproved_media_or_changed_dates_fail_closed(self):
        for changed in ['kind','identity','media','date','private-field']:
            rows=fixture()
            if changed=='kind':rows[0]['payload']['kind']='blog'
            if changed=='identity':rows[1]['id']=rows[0]['id']
            if changed=='media':rows[0]['photo']['src']='/private/photo.webp'
            if changed=='date':rows[0]['scheduledAt']='2027-01-01T11:00:00Z'
            if changed=='private-field':rows[0]['payload']['contact']='never'
            with self.subTest(changed=changed),self.assertRaises((ValueError,KeyError)):self.prepared(rows)
        with self.assertRaises(ValueError):self.prepared(now=NOW+timedelta(days=2))
    def test_cache_and_persistent_receipt_survive_the_end_of_the_series(self):
        rows=fixture();digest=batch.digest(rows);store=Store()
        store.marker={'fields':{'version':batch.d.pack(1),'count':batch.d.pack(17),'digest':batch.d.pack(digest)}}
        with tempfile.TemporaryDirectory() as root,patch.object(batch,'CACHE',Path(root)/'receipt.json'),patch.object(batch.d,'Store',return_value=store),patch.object(batch,'prepare',side_effect=AssertionError('Do not revalidate old dates after confirmation')),patch.dict('os.environ',{'APPROVED_TRAVEL_TIPS_BATCH':json.dumps(rows),'GITHUB_REF':'refs/heads/main','GITHUB_REPOSITORY':'dainyelrooi/DainyelOnTheMove'}):
            batch.main();self.assertTrue(batch.CACHE.is_file())
            with patch.object(batch.d,'Store',side_effect=AssertionError('No repeated database read')):batch.main()
        self.assertEqual(store.calls,0)
