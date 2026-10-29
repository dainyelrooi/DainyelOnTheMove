import importlib.util,unittest,io,re
from types import SimpleNamespace
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('calendar_seed',Path(__file__).parents[1]/'tools/content-backup.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class CalendarSeed(unittest.TestCase):
 def test_copy_preserves_pinterest_empty_task_channels_flags_and_existing_items(self):
  rows=[{'name':'source/plan-'+letter*32,'fields':{'kind':{'stringValue':kind},'platforms':{'arrayValue':{'values':channels}},'scheduled':{'booleanValue':scheduled}}}for letter,kind,channels,scheduled in [('a','social',[{'stringValue':'pinterest'}],True),('b','task',[],False),('c','social',[{'stringValue':'instagram'}],False)]]
  class Store:
   def __init__(self):self.writes=[]
   def call(self,path,method='GET',body=None):
    if method=='GET':
     if path.endswith('/plan-'+'c'*32):return {'fields':{'existing':True}}
     raise module.helpers.RemoteError('firestore',404)
    self.writes.extend(body['writes']);return {}
  store=Store()
  with patch.object(module,'read_all',return_value=iter(rows)):module.seed_calendar(store)
  self.assertEqual(len(store.writes),2)
  for saved,original in zip(store.writes,rows):
   self.assertEqual(saved['update']['fields'],original['fields'])
   self.assertIn('/calendarSpaces/staging/posts/',saved['update']['name'])
   self.assertEqual(saved['currentDocument'],{'exists':False})

 def test_existing_target_read_failures_abort_without_a_copy(self):
  row={'name':module.ROOT+'/contentCalendar/plan-'+'a'*32,'fields':{'version':{'integerValue':'1'}}}
  class Store:
   def __init__(self):self.writes=[]
   def call(self,path,method='GET',body=None):
    if method=='GET':raise module.helpers.RemoteError('Firestore',429)
    self.writes.append(body)
  store=Store()
  with patch.object(module,'read_all',return_value=iter([row])):
   with self.assertRaises(module.helpers.RemoteError):module.seed_calendar(store)
  self.assertEqual(store.writes,[])

 def test_create_only_conflict_is_not_overwritten_or_silenced(self):
  row={'name':module.ROOT+'/contentCalendar/plan-'+'a'*32,'fields':{'version':{'integerValue':'1'}}}
  class Store:
   def __init__(self):self.writes=[]
   def call(self,path,method='GET',body=None):
    if method=='GET':raise module.helpers.RemoteError('Firestore',404)
    self.writes.extend(body['writes']);raise module.helpers.RemoteError('Firestore',409)
  store=Store()
  with patch.object(module,'read_all',return_value=iter([row])):
   with self.assertRaises(module.helpers.RemoteError):module.seed_calendar(store)
  self.assertEqual(len(store.writes),1)
  self.assertEqual(store.writes[0]['currentDocument'],{'exists':False})
  self.assertNotIn('delete',store.writes[0])

 def run_mode(self,mode,space='staging',branch='refs/heads/staging'):
  store=object()
  with patch.dict(module.os.environ,{'GITHUB_REF':branch},clear=True),patch.object(module.sys,'argv',['content-backup.py','--mode',mode,'--space',space]),patch.object(module.helpers,'Firestore',return_value=store) as identity,patch.object(module,'seed_calendar') as seed,patch.object(module,'backup') as backup,patch.object(module,'snapshot',return_value=('2026-10-29T00:00:00Z',{})) as snapshot,patch('sys.stdout',new_callable=io.StringIO):
   module.main()
   return store,identity,seed,backup,snapshot

 def test_manual_seed_is_the_only_mode_that_copies_the_plan(self):
  store,identity,seed,backup,snapshot=self.run_mode('seed-calendar')
  identity.assert_called_once();seed.assert_called_once_with(store);backup.assert_not_called();snapshot.assert_not_called()
  store,_,seed,backup,snapshot=self.run_mode('backup')
  seed.assert_not_called();backup.assert_called_once_with(store,'staging');snapshot.assert_not_called()
  store,_,seed,backup,snapshot=self.run_mode('check')
  seed.assert_not_called();backup.assert_not_called();snapshot.assert_called_once_with(store,'staging')

 def test_production_seed_is_rejected_before_identity_or_any_operation(self):
  with patch.dict(module.os.environ,{'GITHUB_REF':'refs/heads/main'},clear=True),patch.object(module.sys,'argv',['content-backup.py','--mode','seed-calendar','--space','production']),patch.object(module.helpers,'Firestore') as identity,patch.object(module,'seed_calendar') as seed:
   with self.assertRaisesRegex(RuntimeError,'Only the isolated test calendar'):module.main()
   identity.assert_not_called();seed.assert_not_called()

 def test_push_and_schedule_keep_real_backup_and_release_checks_without_automatic_seed(self):
  workflow=(Path(__file__).parents[1]/'workflows/content-backup.yml').read_text(encoding='utf-8')
  self.assertRegex(workflow,r'options:\s*\[backup, check, seed-calendar\]')
  self.assertIn("REQUESTED_MODE: ${{ github.event_name == 'workflow_dispatch' && inputs.mode || 'backup' }}",workflow)
  self.assertIn('python3 .github/tools/content-backup.py --mode "$REQUESTED_MODE" --space "$space"',workflow)
  self.assertNotRegex(workflow,r'run:.*--mode seed-calendar')
  self.assertNotIn('Copy the real plan into isolated test storage once',workflow)
  self.assertIn('set -euo pipefail',workflow)
  self.assertNotIn('continue-on-error',workflow)
  self.assertRegex(workflow,r"name: Read-only release preparation checks\s+if: github.ref == 'refs/heads/staging'")
  self.assertIn('run: python3 .github/tools/owner-release-check.py',workflow)
  paths=re.search(r'    paths:\n((?:      - [^\n]+\n)+)',workflow).group(1)
  self.assertEqual(re.findall(r"      - '([^']+)'",paths),['.github/workflows/content-backup.yml','.github/tools/content-backup.py','.github/tests/test_calendar_seed.py'])
  self.assertIn("cron: '37 9 * * *'",workflow)
  self.assertNotIn("cron: '37 3 * * *'",workflow)

 def test_failure_diagnostic_never_prints_exception_payload_or_connection_details(self):
  secret='PRIVATE-SYNTHETIC-PAYLOAD-NOT-LOGGED'
  cases=[(module.helpers.RemoteError(secret,429,secret),'remote-http-429'),
         (module.helpers.RemoteError(secret,403,secret),'remote-http-403'),
         (RuntimeError('Unexpected calendar ID'),'calendar-id-invalid'),
         (RuntimeError('Existing Google service identity is unavailable'),'google-identity-unavailable'),
         (RuntimeError('OneDrive readback did not match; backup status was not advanced'),'onedrive-readback-mismatch'),
         (RuntimeError(secret),'unexpected-error'),(ValueError(secret),'unexpected-error')]
  for error,category in cases:
   with self.subTest(category=category),patch('sys.stderr',new_callable=io.StringIO) as output:
    module.report_failure(error)
    self.assertIn('Category: '+category+'.',output.getvalue());self.assertNotIn(secret,output.getvalue())
  self.assertEqual(module.safe_error_category(module.helpers.RemoteError(secret,secret,secret)),'remote-request-failed')

 def test_backup_failure_stages_distinguish_reads_from_final_status_after_verified_archive(self):
  raw=b'synthetic isolated backup bytes'
  for failure in ['reading','assembling','uploading','verifying','status-confirming']:
   operations=[]
   class Store:
    def call(self,*args):
     operations.append('status-confirming')
     raise module.helpers.RemoteError('PRIVATE-SYNTHETIC-SERVICE',429)
   def read(*args):
    operations.append('reading')
    if failure=='reading':raise module.helpers.RemoteError('PRIVATE-SYNTHETIC-SERVICE',429)
    return '2026-10-29T00:00:00Z',{}
   def assemble(path,*args):
    operations.append('assembling')
    if failure=='assembling':raise RuntimeError('PRIVATE-SYNTHETIC-PAYLOAD')
    path.write_bytes(raw);return{'documents':0}
   def transfer(args,**kwargs):
    step='uploading' if 'copyto' in args else 'verifying';operations.append(step)
    return SimpleNamespace(returncode=1 if failure==step else 0,stdout=raw)
   with self.subTest(failure=failure),patch.dict(module.os.environ,{'ONEDRIVE_RCLONE_CONFIG':'[onedrive]\ntype=onedrive\ntoken=SYNTHETIC-SECRET\n'},clear=True),patch.object(module.shutil,'which',return_value='rclone'),patch.object(module,'snapshot',side_effect=read),patch.object(module,'make_archive',side_effect=assemble),patch.object(module.subprocess,'run',side_effect=transfer),patch('sys.stderr',new_callable=io.StringIO) as output:
    try:module.backup(Store(),'staging')
    except Exception as error:module.report_failure(error)
    else:self.fail('The synthetic failure must fail the backup')
    self.assertEqual(operations[-1],failure)
    self.assertIn('Stage: '+failure+'.',output.getvalue())
    if failure in ['reading','status-confirming']:self.assertIn('Category: remote-http-429.',output.getvalue())
    self.assertNotIn('PRIVATE-SYNTHETIC',output.getvalue());self.assertNotIn('SYNTHETIC-SECRET',output.getvalue())
    if failure=='status-confirming':self.assertEqual(operations,['reading','assembling','uploading','verifying','status-confirming'])

 def test_failure_stage_is_fixed_and_cannot_log_arbitrary_paths_or_payload(self):
  secret='PRIVATE-SYNTHETIC-PATH'
  with patch.object(module,'failure_stage',secret),patch('sys.stderr',new_callable=io.StringIO) as output:
   module.report_failure(ValueError(secret))
   self.assertIn('Stage: initializing.',output.getvalue());self.assertNotIn(secret,output.getvalue())

if __name__=='__main__':unittest.main()
