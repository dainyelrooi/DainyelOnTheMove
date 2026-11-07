import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('visits_snapshot',Path(__file__).parents[1]/'tools/public-content-snapshot.py')
worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)
TIME='2026-11-06T12:00:00Z'
class PublicVisits(unittest.TestCase):
    def test_legacy_location_with_no_projected_fields_does_not_break_the_export(self):
        class Store:
            def call(self,path,method,body):return [{'readTime':TIME,'found':{'name':body['documents'][0]}}]
        with tempfile.TemporaryDirectory() as folder:
            worker.sync_visits(Store(),Path(folder),'production',TIME)
            self.assertEqual(json.loads((Path(folder)/'data/public-content/visits.json').read_text()),{'version':1,'space':'production','revision':0,'visits':{}})
    def test_malformed_projected_fields_still_fail_closed(self):
        class Store:
            def call(self,path,method,body):return [{'readTime':TIME,'found':{'name':body['documents'][0],'fields':None}}]
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(worker.SnapshotError):worker.sync_visits(Store(),Path(folder),'production',TIME)
    def test_exact_public_whitelist_and_namespace(self):
        value={'version':1,'space':'staging','revision':1,'visits':{'PE':[2026]}}
        self.assertEqual(worker.validate_visits(value,'staging'),value)
        for bad in [{**value,'city':'Not copied'},{**value,'space':'production'},{**value,'visits':{'XX':[2026]}},{**value,'visits':{'PE':[2026,2026]}},{**value,'visits':{'PE':['2026']}}]:
            with self.assertRaises(worker.SnapshotError):worker.validate_visits(bad,'staging')
    def test_projected_single_document_read_does_not_request_city_or_private_data(self):
        calls=[]
        class Store:
            def call(self,path,method,body):
                calls.append((path,method,body));name=body['documents'][0]
                return [{'readTime':TIME,'found':{'name':name,'fields':{'version':{'integerValue':'2'},'revision':{'integerValue':'1'},'visits':{'mapValue':{'fields':{'PE':{'arrayValue':{'values':[{'integerValue':'2026'}]}}}}}}}}]
        with tempfile.TemporaryDirectory() as folder:
            worker.sync_visits(Store(),Path(folder),'staging',TIME)
            data=json.loads((Path(folder)/'data/public-content/visits.json').read_text())
            self.assertEqual(data['visits'],{'PE':[2026]});self.assertEqual(set(data),{'version','space','revision','visits'})
        self.assertEqual(calls[0][2]['mask']['fieldPaths'],['version','revision','visits','stops'])
        self.assertTrue(calls[0][2]['documents'][0].endswith('/siteStatus/staging'))
    def test_bad_retained_copy_cannot_overwrite_previous_complete_archive(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);good={'version':1,'space':'production','revision':1,'visits':{'PE':[2026]}}
            worker.install_visits(good,root,'production');path=root/'data/public-content/visits.json';before=path.read_bytes()
            with patch.object(worker,'bounded_request',return_value=b'{"city":"private"}'):
                with self.assertRaises(worker.SnapshotError):worker.retain_visits(root,'production')
            self.assertEqual(path.read_bytes(),before)
    def test_first_deploy_with_no_copy_is_an_empty_archive(self):
        with tempfile.TemporaryDirectory() as folder,patch.object(worker,'bounded_request',return_value=None):
            worker.retain_visits(Path(folder),'staging')
            self.assertEqual(json.loads((Path(folder)/'data/public-content/visits.json').read_text())['visits'],{})
    def test_offline_check_rejects_a_corrupt_visits_copy(self):
        with tempfile.TemporaryDirectory() as folder,patch.object(worker,'check_local_snapshot',return_value={'status':'PASS'}):
            root=Path(folder);path=root/'data/public-content/visits.json';path.parent.mkdir(parents=True);path.write_text('{"city":"not public"}')
            with self.assertRaises(worker.SnapshotError):worker.main(['--mode','check','--space','staging','--output-root',str(root)])
