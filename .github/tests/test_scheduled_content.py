"""Disposable local worker tests. Provider and database network are forbidden."""
import copy
from datetime import datetime,timedelta,timezone
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('publication',Path(__file__).parents[1]/'tools/content-publication.py')
worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)
mail=worker.delivery
NOW=datetime.now(timezone.utc)
ID='entry-'+'a'*32
BASE=worker.ROOT+'/cmsSpaces/production'
PAYLOAD={'version':1,'kind':'blog','title':'Disposable fixture','excerpt':'Isolated test introduction.','body':'Isolated test words.','place':'','sources':'','videoUrl':'','photoIds':[],'photoPlacements':[],'heroPhotoId':'','heroLayout':'split','heroPosition':'center','storyLabel':'','tripPeriod':''}
def document(path,data):return {'name':BASE+'/'+path,'fields':{key:mail.pack(value) for key,value in data.items()},'updateTime':'fixture-v1'}
def schedule(due=None):return document('entrySchedules/'+ID,{'version':1,'entryId':ID,'draftRevision':1,'payload':PAYLOAD,'scheduledAt':(due or NOW-timedelta(minutes=1)).isoformat(),'status':'queued'})
class Store:
    def __init__(self):self.rows={BASE+'/drafts/'+ID:document('drafts/'+ID,{'revision':2,'body':'Unreviewed later edits'})};self.writes=[];self.conflict=False
    def optional(self,path):return self.rows.get(path)
    def call(self,path,method,body):
        if self.conflict:raise RuntimeError('CAS conflict')
        self.writes.append(body['writes'])
        for write in body['writes']:
            if 'update' in write:self.rows[write['update']['name']]=dict(write['update'],updateTime='fixture-v2')

class PublicationTests(unittest.TestCase):
    def test_future_never_publishes(self):
        store=Store();self.assertFalse(worker.process(store,schedule(NOW+timedelta(days=1)),'production',NOW));self.assertFalse(store.writes)
    def test_due_atomically_publishes_reviewed_snapshot_summary_and_completion(self):
        store=Store();self.assertTrue(worker.process(store,schedule(),'production',NOW));writes=store.writes[0]
        self.assertEqual(len(writes),4);self.assertEqual(writes[0]['verify'],BASE+'/drafts/'+ID)
        self.assertEqual(writes[1]['update']['fields']['body'],mail.pack(PAYLOAD['body']))
        self.assertEqual(writes[3]['update']['fields']['status'],mail.pack('published'))
        self.assertTrue(all(w.get('currentDocument') for w in [writes[0],writes[1],writes[3]]))
    def test_cancel_or_delete_race_cannot_resurrect_publication(self):
        store=Store();store.conflict=True
        with self.assertRaises(RuntimeError):worker.process(store,schedule(),'production',NOW)
        self.assertFalse(store.writes)
    def test_missing_draft_photo_and_overdue_stop(self):
        store=Store();store.rows.clear()
        with self.assertRaises(ValueError):worker.process(store,schedule(),'production',NOW)
        store=Store();plan=schedule();plan['fields']['payload']['mapValue']['fields']['photoIds']=mail.pack(['photo-'+'b'*32]);plan['fields']['payload']['mapValue']['fields']['photoPlacements']=mail.pack([0])
        with self.assertRaises(ValueError):worker.process(store,plan,'production',NOW)
        with self.assertRaises(ValueError):worker.process(Store(),schedule(NOW-timedelta(days=2)),'production',NOW)
    def test_invalid_unknown_or_oversized_payload_rejected(self):
        for change in [{'privateField':'never'},{'body':'x'*60001},{'photoPlacements':[0]},{'heroPhotoId':'photo-'+'c'*32}]:
            with self.assertRaises(ValueError):worker.validate(PAYLOAD|change)
    def test_array_pack_roundtrip(self):self.assertEqual(mail.unpack(mail.pack({'photos':['a','b'],'positions':[0,1]})),{'photos':['a','b'],'positions':[0,1]})

def email_job(due,status='queued'):
    mid='mail-'+'c'*32
    return document('mailJobs/'+mid,{'version':1,'draftId':mid,'draftRevision':1,'payload':{'subject':'Fixture','previewText':'','headline':'Fixture','body':'Disposable email words.','ctaText':'Read','ctaUrl':'https://dainyelonthemove.com/entry/'+ID,'imageUrl':''},'action':'after-publication','entryId':ID,'publicationRevision':1,'scheduledAt':due.isoformat(),'createdAt':(NOW-timedelta(days=10)).isoformat(),'status':status})
class LinkedEmailTests(unittest.TestCase):
    def test_due_published_story_dispatches_once_through_mocked_provider(self):
        store=Store();plan=schedule();plan['fields']['status']=mail.pack('published');store.rows[BASE+'/entrySchedules/'+ID]=plan
        store.update=lambda doc,changes:dict(doc,fields=doc['fields']|{key:mail.pack(value) for key,value in changes.items()})
        calls=[]
        def provider(path,method='GET',body=None):
            calls.append((path,method,body))
            return {'name':'Website Postcard mail-'+'c'*32,'sender':{'email':mail.SENDER},'status':'queued' if any('/sendNow' in c[0] for c in calls) else 'draft'}
        with patch.object(mail,'brevo',side_effect=provider),patch.object(mail,'public_link'),patch.object(mail,'managed_campaign',return_value=123):
            mail.process(store,email_job(NOW),[{'credits':300}])
        self.assertEqual(sum('/sendNow' in path for path,_,_ in calls),1)
    def test_no_provider_call_before_date_or_while_waiting_for_publication(self):
        store=Store();store.rows[BASE+'/entrySchedules/'+ID]=schedule()
        with patch.object(mail,'brevo',side_effect=AssertionError('No provider mutation allowed')),patch.object(mail,'public_link',side_effect=AssertionError('No early link access')):
            mail.process(store,email_job(NOW+timedelta(days=1)),[{'credits':300}])
            mail.process(store,email_job(NOW),[{'credits':300}])
    def test_cancelled_changed_or_removed_schedule_holds_email(self):
        for change in [{'status':'cancelled'},{'status':'review'},{'draftRevision':2},None]:
            store=Store()
            if change is not None:
                plan=schedule();plan['fields'].update({key:mail.pack(value) for key,value in change.items()});store.rows[BASE+'/entrySchedules/'+ID]=plan
            with patch.object(mail,'brevo',side_effect=AssertionError('Never call provider')):
                with self.assertRaises(RuntimeError):mail.process(store,email_job(NOW),[{'credits':300}])
    def test_old_missed_linked_email_is_held(self):
        with patch.object(mail,'brevo',side_effect=AssertionError('Never call provider')):
            with self.assertRaises(RuntimeError):mail.process(Store(),email_job(NOW-timedelta(days=2)),[{'credits':300}])

if __name__=='__main__':unittest.main()
