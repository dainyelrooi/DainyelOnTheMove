import importlib.util,unittest
from pathlib import Path
from datetime import datetime,timezone
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('pinterest_follow',Path(__file__).parents[1]/'tools/pinterest-follow-up.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class PinterestFollowUp(unittest.TestCase):
 def growing_catalogue(self,count=13,existing=0):
  class Store:
   def __init__(self):self.created=[];self.rows=[];self.config={'version':1,'enabled':True,'enabledAfter':'2026-10-27T00:00:00Z','seenStaticUrls':[]}
   def calendar(self):return self.rows
   def optional(self,path):return {'updateTime':'v1','fields':{k:module.delivery.pack(v)for k,v in self.config.items()}}
   def published(self,since):return [{'name':'x/entry-'+format(n,'032x'),'fields':{'title':{'stringValue':'Published fixture '+str(n)},'kind':{'stringValue':'blog'},'publishedAt':{'timestampValue':'2026-10-28T10:00:00Z'}}}for n in range(count)]
   def create_task(self,url,value,now):
    self.created.append(url);self.rows.append({'name':'x/'+module.task_id(url),'fields':{}});return True
   def call(self,path,method,body):
    assert path==module.ROOT+':commit' and method=='POST'
    self.config={k:module.delivery.unpack(v)for k,v in body['writes'][0]['update']['fields'].items()}
  store=Store()
  for n in range(existing):store.rows.append({'name':'x/'+module.task_id(module.SITE+'/entry/entry-'+format(n,'032x')),'fields':{'published':{'booleanValue':True}}})
  return store
 def test_thirteen_historic_publications_do_not_block_one_new_story(self):
  store=self.growing_catalogue(existing=12)
  with patch.object(module,'fetch',return_value=b'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>'):
   result=module.run(store,datetime(2026,11,16,tzinfo=timezone.utc),True)
  self.assertEqual(result['newTasks'],1);self.assertEqual(result['remaining'],0)
  self.assertEqual(len(store.created),1);self.assertEqual(len(store.rows),13)
  self.assertTrue(all(r['fields'].get('published',{}).get('booleanValue')for r in store.rows[:12]))
 def test_new_content_burst_drains_in_bounded_batches_without_duplicates(self):
  store=self.growing_catalogue(count=23)
  with patch.object(module,'fetch',return_value=b'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>'):
   results=[module.run(store,datetime(2026,11,16,tzinfo=timezone.utc),True)for _ in range(4)]
  self.assertEqual([r['newTasks']for r in results],[10,10,3,0]);self.assertEqual(len(set(store.created)),23)
 def test_processed_task_deleted_by_owner_is_not_recreated(self):
  store=self.growing_catalogue(count=2,existing=1)
  with patch.object(module,'fetch',return_value=b'<urlset/>'):
   self.assertEqual(module.run(store,datetime(2026,11,16,tzinfo=timezone.utc),True)['newTasks'],1)
   store.rows=[]
   self.assertEqual(module.run(store,datetime(2026,11,17,tzinfo=timezone.utc),True)['newTasks'],0)
  self.assertEqual(len(store.created),1);self.assertEqual(len(store.config['seenCmsEntries']),2)
 def test_check_mode_does_not_persist_existing_task_receipts(self):
  store=self.growing_catalogue(count=2,existing=2)
  with patch.object(module,'fetch',return_value=b'<urlset/>'):
   self.assertEqual(module.run(store,datetime(2026,11,16,tzinfo=timezone.utc),False)['candidateCount'],0)
  self.assertNotIn('seenCmsEntries',store.config)
 def test_invalid_processed_receipt_list_stops_safely(self):
  store=self.growing_catalogue();store.config['seenCmsEntries']=['entry-'+'a'*32]*2
  with self.assertRaisesRegex(RuntimeError,'configuration'):module.configuration(store,[],datetime.now(timezone.utc))
 def test_large_catalogue_check_mode_is_still_read_only(self):
  store=self.growing_catalogue(count=23)
  with patch.object(module,'fetch',return_value=b'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>'):
   result=module.run(store,datetime(2026,11,16,tzinfo=timezone.utc),False)
  self.assertEqual(result['candidateCount'],23);self.assertEqual(result['remaining'],13);self.assertEqual(store.created,[])
 def test_publication_pagination_keeps_timestamp_and_id_ties(self):
  store=module.Store.__new__(module.Store);calls=[]
  def call(path,method,body):
   calls.append(body);offset=0 if len(calls)==1 else 100
   return [{'document':{'name':'x/entry-'+format(n,'032x'),'fields':{'publishedAt':{'timestampValue':'2026-11-01T10:00:00Z'}}}}for n in range(offset,min(offset+100,113))]
  store.call=call;rows=store.published(datetime(2026,10,28,tzinfo=timezone.utc))
  self.assertEqual(len(rows),113);self.assertEqual(len(calls),2)
  self.assertEqual(calls[1]['structuredQuery']['startAt'],{'values':[{'timestampValue':'2026-11-01T10:00:00Z'},{'referenceValue':'x/entry-'+format(99,'032x')}],'before':False})
 def test_repeated_publication_page_is_not_silently_accepted(self):
  store=module.Store.__new__(module.Store)
  store.call=lambda *args:[{'document':{'name':'x/entry-'+format(n,'032x'),'fields':{'publishedAt':{'timestampValue':'2026-11-01T10:00:00Z'}}}}for n in range(100)]
  with self.assertRaisesRegex(RuntimeError,'pagination'):store.published(datetime(2026,10,28,tzinfo=timezone.utc))
 def test_only_same_origin_story_candidates(self):
  self.assertEqual(module.canonical('https://dainyelonthemove.com/new-story?utm_source=x#chapter'),'https://dainyelonthemove.com/new-story')
  for url in ['http://dainyelonthemove.com/story','https://evil.invalid/story','https://dainyelonthemove.com/admin','https://dainyelonthemove.com/postcard-example','https://dainyelonthemove.com/privacy']:
   self.assertIsNone(module.canonical(url))
 def test_one_stable_task_per_story(self):
  a=module.task_id('https://dainyelonthemove.com/example')
  self.assertRegex(a,r'^plan-[a-f0-9]{32}$');self.assertEqual(a,module.task_id('https://dainyelonthemove.com/example'));self.assertNotEqual(a,module.task_id('https://dainyelonthemove.com/other'))
 def test_task_has_one_owner_reminder_no_photo_and_no_external_scheduling_claim(self):
  now=datetime(2026,10,28,12,tzinfo=timezone.utc);row=module.task('A real published story','https://dainyelonthemove.com/example',now,now)
  self.assertEqual(row['kind'],'task');self.assertEqual(row['platforms'],[]);self.assertTrue(row['remindersEnabled']);self.assertFalse(row['scheduled']);self.assertFalse(row['published']);self.assertNotIn('photo',row);self.assertEqual(row['publishAt'].isoformat(),'2026-10-30T19:30:00+01:00')
 def test_late_worker_still_leaves_a_day_for_reminder(self):
  row=module.due_date(datetime(2026,10,20,tzinfo=timezone.utc),datetime(2026,10,28,23,tzinfo=timezone.utc));self.assertEqual(row.date().isoformat(),'2026-10-30')
 def test_check_mode_never_writes_or_queues_email(self):
  class Store:
   def calendar(self):return []
   def optional(self,path):return {'fields':{'version':{'integerValue':'1'},'enabled':{'booleanValue':True},'enabledAfter':{'timestampValue':'2026-10-27T00:00:00Z'},'seenStaticUrls':{'arrayValue':{'values':[]}}}}
   def published(self,since):return [{'name':'x/entry-'+'a'*32,'fields':{'title':{'stringValue':'New published fixture'},'kind':{'stringValue':'blog'},'publishedAt':{'timestampValue':'2026-10-28T10:00:00Z'}}}]
   def create_task(self,*args):raise AssertionError('check mode wrote a task')
   def call(self,*args):raise AssertionError('check mode wrote settings')
  with patch.object(module,'fetch',return_value=b'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'):
   result=module.run(Store(),datetime(2026,10,28,tzinfo=timezone.utc),False)
  self.assertEqual(result['candidateCount'],1);self.assertEqual(result['newTasks'],0)
 def test_existing_task_never_has_status_reset(self):
  store=module.Store.__new__(module.Store);store.optional=lambda path:{'fields':{'published':{'booleanValue':True}}};store.call=lambda *args:(_ for _ in()).throw(AssertionError('existing task overwritten'))
  self.assertFalse(store.create_task('https://dainyelonthemove.com/example',{},datetime.now(timezone.utc)))
 def test_redirected_shell_routes_are_not_story_candidates(self):
  for path in ['/journey','/entry','/search','/postcards-form']:
   self.assertIsNone(module.canonical('https://dainyelonthemove.com'+path))

 def test_first_activation_baselines_existing_articles_but_not_placeholders(self):
  now=datetime(2026,10,28,12,tzinfo=timezone.utc)
  class Store:
   def calendar(self):return []
   def published(self,since):return []
   def create_task(self,*args):raise AssertionError('Old static article became a new task')
   def call(self,path,method,body):self.saved=body
  store=Store();config={'version':1,'enabled':True,'enabledAfter':now.isoformat(),'seenStaticUrls':[]}
  def fetch(url,*args):
   if url.endswith('/sitemap.xml'):return b'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://dainyelonthemove.com/existing-story</loc></url><url><loc>https://dainyelonthemove.com/future-placeholder</loc></url></urlset>'
   if url.endswith('/existing-story'):return b'<meta property="og:type" content="article"><link rel="canonical" href="https://dainyelonthemove.com/existing-story"><h1>Existing story</h1>'
   return b'<h1>Coming soon</h1>'
  with patch.object(module,'configuration',return_value=(None,config)),patch.object(module,'fetch',side_effect=fetch):result=module.run(store,now,True)
  self.assertEqual(result['candidateCount'],0);self.assertEqual(result['newTasks'],0)
  fields=store.saved['writes'][0]['update']['fields'];seen=module.delivery.unpack(fields['seenStaticUrls'])
  self.assertEqual(seen,['https://dainyelonthemove.com/existing-story'])
  self.assertEqual(store.saved['writes'][0]['currentDocument'],{'exists':False})

if __name__=='__main__':unittest.main()
