"""No cloud/provider access: test-only workflows must never send owner mail."""
import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('calendar_guard',Path(__file__).parents[1]/'tools/content-calendar-reminders.py')
worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)


class ReminderSafety(unittest.TestCase):
 def test_notify_refuses_test_local_private_and_unknown_context_before_authentication(self):
  for ref,visibility in [('refs/heads/staging','public'),('refs/heads/main','private'),('',''),('refs/heads/other','public')]:
   with self.subTest(ref=ref),patch.dict(os.environ,{'GITHUB_REF':ref,'REPOSITORY_VISIBILITY':visibility}),patch.object(worker.sys,'argv',['worker','--mode','notify']),patch.object(worker,'CalendarStore')as store:
    with self.assertRaisesRegex(RuntimeError,'approved production workflow'):worker.main()
    store.assert_not_called();self.assertFalse(worker.notify_requested)
 def test_existing_production_preference_still_prevents_mail(self):
  with patch.dict(os.environ,{'GITHUB_REF':'refs/heads/main','REPOSITORY_VISIBILITY':'public'}),patch.object(worker.sys,'argv',['worker','--mode','notify']),patch.object(worker,'CalendarStore')as store,patch.object(worker.helpers,'mail_configuration')as mail:
   store.return_value.enabled.return_value=False;worker.main();mail.assert_not_called()
   store.return_value.save_state.assert_not_called();store.return_value.delivery.assert_not_called()
 def test_check_mode_remains_read_only_on_staging(self):
  with patch.dict(os.environ,{'GITHUB_REF':'refs/heads/staging','REPOSITORY_VISIBILITY':'public'}),patch.object(worker.sys,'argv',['worker','--mode','check']),patch.object(worker,'CalendarStore')as store,patch.object(worker.helpers,'mail_configuration')as mail:
   store.return_value.call.return_value={'databaseEdition':'ENTERPRISE','freeTier':True};store.return_value.posts.return_value=[];store.return_value.enabled.return_value=False
   worker.main();mail.assert_not_called();store.return_value.save_state.assert_not_called();self.assertFalse(worker.notify_requested)


if __name__=='__main__':unittest.main()
