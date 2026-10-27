import importlib.util,unittest
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

if __name__=='__main__':unittest.main()
