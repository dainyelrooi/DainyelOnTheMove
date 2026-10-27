import importlib.util,unittest
from pathlib import Path
from datetime import datetime,timezone
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('pinterest_follow',Path(__file__).parents[1]/'tools/pinterest-follow-up.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class PinterestFollowUp(unittest.TestCase):
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

if __name__=='__main__':unittest.main()
