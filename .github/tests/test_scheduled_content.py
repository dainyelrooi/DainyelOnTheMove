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
        for write in body['writes']:
            if len({'update','delete','transform'} & set(write))!=1 or set(write)-{'update','delete','transform','updateMask','updateTransforms','currentDocument'}:
                raise ValueError('Unsupported REST Write')
        self.writes.append(body['writes'])
        for write in body['writes']:
            if 'update' in write:self.rows[write['update']['name']]=dict(write['update'],updateTime='fixture-v2')

class PublicationTests(unittest.TestCase):
    def test_future_never_publishes(self):
        store=Store();self.assertFalse(worker.process(store,schedule(NOW+timedelta(days=1)),'production',NOW));self.assertFalse(store.writes)
    def test_due_atomically_publishes_reviewed_snapshot_summary_and_completion(self):
        store=Store();self.assertTrue(worker.process(store,schedule(),'production',NOW));writes=store.writes[0]
        self.assertEqual(len(writes),5);self.assertEqual(writes[0]['update']['name'],BASE+'/drafts/'+ID)
        self.assertEqual(writes[1]['update']['fields']['body'],mail.pack(PAYLOAD['body']))
        self.assertEqual(writes[3]['update']['fields']['status'],mail.pack('published'))
        self.assertTrue(all(w.get('currentDocument') for w in [writes[0],writes[1],writes[3]]))
    def test_draft_guard_preserves_exact_current_draft_and_revision(self):
        store=Store();original=copy.deepcopy(store.rows[BASE+'/drafts/'+ID])
        original['fields']['updatedAt']={'timestampValue':'2026-01-01T00:00:00Z'}
        store.rows[original['name']]=copy.deepcopy(original)
        worker.process(store,schedule(),'production',NOW)
        guard=store.writes[0][0]
        self.assertEqual(guard,{'update':{'name':original['name'],'fields':original['fields']},'currentDocument':{'updateTime':original['updateTime']}})
        self.assertEqual(store.rows[original['name']]['fields'],original['fields'])
    def test_rest_contract_rejects_invented_verify_operation(self):
        with self.assertRaises(ValueError):Store().call(worker.ROOT+':commit','POST',{'writes':[{'verify':BASE+'/drafts/'+ID}]})
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


class NativeSchedulingTests(unittest.TestCase):
    def test_creation_explicitly_disables_premium_or_time_shifting_features(self):
        store=Store();due=NOW+timedelta(hours=10);plan=schedule();plan['fields']['status']=mail.pack('published');store.rows[BASE+'/entrySchedules/'+ID]=plan
        store.update=lambda doc,changes:dict(doc,fields=doc['fields']|{key:mail.pack(value) for key,value in changes.items()})
        calls=[]
        def provider(path,method='GET',body=None):
            calls.append((path,method,body))
            if path=='emailCampaigns' and method=='POST':return {'id':123}
            return {'name':'Website Postcard mail-'+'c'*32,'sender':{'email':mail.SENDER},'status':'scheduled' if any(method=='PUT' and body and 'scheduledAt' in body for _,method,body in calls) else 'draft','scheduledAt':due.isoformat()}
        with patch.object(mail,'brevo',side_effect=provider),patch.object(mail,'public_link'),patch.object(mail,'managed_campaign',return_value=None):mail.process(store,email_job(due),[{'credits':300}])
        created=next(body for path,method,body in calls if path=='emailCampaigns' and method=='POST')
        self.assertIs(created['abTesting'],False);self.assertIs(created['sendAtBestTime'],False)
        self.assertEqual(created['recipients'],{'segmentIds':[1]});self.assertFalse(any('/sendNow' in path for path,_,_ in calls))
    def test_future_linked_published_mail_is_scheduled_at_provider_without_send_now(self):
        store=Store();due=NOW+timedelta(hours=10);plan=schedule();plan['fields']['status']=mail.pack('published');store.rows[BASE+'/entrySchedules/'+ID]=plan
        saved=[]
        def update(doc,changes):
            value=dict(doc,fields=doc['fields']|{key:mail.pack(value) for key,value in changes.items()});saved.append(value);return value
        store.update=update;calls=[]
        def provider(path,method='GET',body=None):
            calls.append((path,method,body));scheduled=any(method=='PUT' and body and 'scheduledAt' in body for _,method,body in calls)
            return {'name':'Website Postcard mail-'+'c'*32,'sender':{'email':mail.SENDER},'status':'scheduled' if scheduled else 'draft','scheduledAt':due.isoformat()}
        with patch.object(mail,'brevo',side_effect=provider),patch.object(mail,'public_link'),patch.object(mail,'managed_campaign',return_value=123):
            mail.process(store,email_job(due),[{'credits':300}])
            self.assertEqual(mail.unpack(saved[-1]['fields']['status']),'scheduled')
            mail.process(store,saved[-1],[{'credits':300}])
        self.assertFalse(any('/sendNow' in path for path,_,_ in calls))
        self.assertEqual(sum(method=='PUT' and body and 'scheduledAt' in body for _,method,body in calls),1)
        self.assertEqual(next(body['scheduledAt'] for _,_,body in calls if body and 'scheduledAt' in body),due.isoformat())
        self.assertTrue(all(body.get('recipients',mail.AUDIENCE)==mail.AUDIENCE for _,_,body in calls if body))
    def test_ambiguous_dispatch_is_never_replayed(self):
        store=Store();plan=schedule();plan['fields']['status']=mail.pack('published');store.rows[BASE+'/entrySchedules/'+ID]=plan
        store.update=lambda doc,changes:dict(doc,fields=doc['fields']|{key:mail.pack(value) for key,value in changes.items()})
        job=email_job(NOW,'processing');job['fields'].update(phase=mail.pack('dispatch-attempted'),campaignId=mail.pack(123));calls=[]
        def provider(path,method='GET',body=None):
            calls.append(method);return {'name':'Website Postcard mail-'+'c'*32,'sender':{'email':mail.SENDER},'status':'draft'}
        with patch.object(mail,'brevo',side_effect=provider),patch.object(mail,'public_link'):
            with self.assertRaises(RuntimeError):mail.process(store,job,[{'credits':300}])
        self.assertEqual(calls,['GET'])

class ReceiptStore:
    def __init__(self):self.rows={};self.sequence=0
    def optional(self,path):return copy.deepcopy(self.rows.get(path))
    def call(self,path,method,body):
        for write in body['writes']:
            name=write['update']['name'];old=self.rows.get(name);guard=write['currentDocument']
            if guard.get('exists') is False and old or guard.get('updateTime') and (not old or old['updateTime']!=guard['updateTime']):raise RuntimeError('conflict')
        self.sequence+=1;results=[]
        for write in body['writes']:
            row={**copy.deepcopy(write['update']),'updateTime':str(self.sequence)};self.rows[row['name']]=row;results.append({'updateTime':row['updateTime']})
        return {'writeResults':results}
class ReceiptTests(unittest.TestCase):
    def test_lease_excludes_second_runner_and_retry_delay_survives_a_restart(self):
        store=ReceiptStore();receipt=worker.operations.claim(mail,store,'staging','publication',ID,NOW)
        self.assertIsNone(worker.operations.claim(mail,store,'staging','publication',ID,NOW))
        worker.operations.finish(mail,store,receipt,NOW,'retrying','database-unavailable')
        self.assertIsNone(worker.operations.claim(mail,store,'staging','publication',ID,NOW+timedelta(seconds=10)))
        new=worker.operations.claim(mail,store,'staging','publication',ID,NOW+timedelta(seconds=31))
        self.assertEqual(worker.operations.values(mail,new)['attempts'],2)
        with self.assertRaises(RuntimeError):worker.operations.finish(mail,store,receipt,NOW,'published')
        self.assertEqual(worker.operations.values(mail,new)['events'][0]['code'],'database-unavailable')


class ProviderTransportTests(unittest.TestCase):
    def test_only_fixed_provider_failure_categories_are_persisted(self):
        self.assertEqual(mail.provider_reason(405,json.dumps({'message':'Private title: segments require a premium plan'})),'provider-http-405-segment')
        self.assertEqual(mail.provider_reason(405,json.dumps({'message':'Private owner body','code':'method_not_allowed'})),'provider-http-405-method-not-allowed')
        self.assertEqual(mail.provider_reason(405,'private response body'),'provider-http-405')
    def test_secret_and_content_use_stdin_only_and_creation_receipt_is_preserved(self):
        result=type('Result',(),{'returncode':0,'stdout':'{"id":123}\nDOTM_HTTP_CODE:201'})()
        with patch.dict(mail.os.environ,{'BREVO_API_KEY':'fixture-not-a-secret'}),patch.object(mail.shutil,'which',return_value='/fixture/curl'),patch.object(mail.subprocess,'run',return_value=result) as run:
            self.assertEqual(mail.brevo('emailCampaigns','POST',{'name':'fixture'}),{'id':123})
            args,kwargs=run.call_args;self.assertNotIn('fixture-not-a-secret',' '.join(args[0]));self.assertIn('fixture-not-a-secret',kwargs['input']);self.assertIn('--max-redirs',args[0])
    def test_provider_rejection_is_distinct_from_an_ambiguous_transport_failure(self):
        with patch.dict(mail.os.environ,{'BREVO_API_KEY':'fixture-not-a-secret'}),patch.object(mail.shutil,'which',return_value='/fixture/curl'):
            with patch.object(mail.subprocess,'run',return_value=type('Result',(),{'returncode':0,'stdout':'private response body\nDOTM_HTTP_CODE:405'})()):
                with self.assertRaises(mail.ProviderError) as failure:mail.brevo('emailCampaigns','POST',{})
                self.assertEqual(failure.exception.reason,'provider-http-405');self.assertFalse(failure.exception.retryable);self.assertNotIn('private response',str(failure.exception))
            with patch.object(mail.subprocess,'run',return_value=type('Result',(),{'returncode':28,'stdout':''})()):
                with self.assertRaises(mail.ProviderError) as failure:mail.brevo('emailCampaigns','POST',{})
                self.assertTrue(failure.exception.retryable)

if __name__=='__main__':unittest.main()
