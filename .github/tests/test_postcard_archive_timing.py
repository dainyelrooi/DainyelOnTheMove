"""Sent-to-website automation; synthetic campaigns and GET-only provider fixtures."""
from datetime import datetime, timedelta, timezone
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock

spec=importlib.util.spec_from_file_location('archive_timing',Path(__file__).parents[1]/'tools/postcard-archive.py')
archive=importlib.util.module_from_spec(spec);spec.loader.exec_module(archive)

def campaign(**patch):
    return {'id':42,'status':'sent','type':'classic','sender':{'email':archive.mail.SENDER},
        'recipients':{'segments':[1]},'sentDate':datetime.now(timezone.utc).isoformat(),
        'subject':'Isolated fixture','htmlContent':'<h1>Public fixture</h1><p>A complete synthetic public paragraph.</p>',**patch}

class TimingTests(unittest.TestCase):
    def test_exact_send_instant_in_amsterdam_and_bogota(self):
        now=datetime(2026,11,22,10,tzinfo=timezone.utc)
        self.assertTrue(archive.eligible(campaign(sentDate='2026-11-22T11:00:00+01:00'),now))
        self.assertTrue(archive.eligible(campaign(sentDate='2026-11-22T05:00:00-05:00'),now))
        self.assertFalse(archive.eligible(campaign(sentDate='2026-11-22T10:00:01Z'),now))
        for value in [None,'invalid','2026-11-22T10:00:00']:
            self.assertFalse(archive.eligible(campaign(sentDate=value),now))

    def test_schedules_drafts_cancelled_and_other_audiences_never_become_public(self):
        now=datetime.now(timezone.utc)
        for patch in [{'status':s} for s in ['draft','queued','scheduled','suspended','cancelled']]+[
            {'type':'trigger'},{'sender':{'email':'another@example.invalid'}},
            {'recipients':{}},{'recipients':{'lists':[3,4]}},{'recipients':{'segments':[1,2]}}]:
            self.assertFalse(archive.eligible(campaign(**patch),now))

    def run_archive(self,folder,rows,mode='sync',live=True):
        calls=[]
        def provider(path,method='GET',**kwargs):
            self.assertEqual(method,'GET');calls.append(path)
            return {'campaigns':rows} if path.startswith('emailCampaigns?') else next(c for c in rows if path=='emailCampaigns/'+str(c['id']))
        output=Path(folder)/'clock-output'
        with mock.patch.object(archive,'ROOT',Path(folder)),mock.patch.object(archive.mail,'brevo',provider),mock.patch.object(archive,'deployed_index_matches',return_value=live),mock.patch.dict(os.environ,{'GITHUB_OUTPUT':str(output)}),mock.patch('sys.argv',['archive','--mode',mode]),mock.patch('sys.stdout',new_callable=io.StringIO) as stdout:
            archive.main()
        return calls,stdout.getvalue(),output.read_text() if output.exists() else ''

    def test_sync_same_day_is_idempotent_and_never_requests_subscribers_or_sends(self):
        with tempfile.TemporaryDirectory() as folder:
            row=campaign(sentDate=(datetime.now(timezone.utc)-timedelta(seconds=1)).isoformat())
            calls,_,_=self.run_archive(folder,[row]);path=Path(folder)/'data/postcards/editions/brevo-42.json'
            first=path.read_bytes();data=json.loads(first)
            self.assertEqual(archive.instant(data['availableAt']),archive.instant(data['sentAt']))
            self.assertNotIn('recipients',data)
            again,_,_=self.run_archive(folder,[row]);self.assertEqual(path.read_bytes(),first)
            self.assertEqual(len(again),1);self.assertTrue(all(p.startswith('emailCampaigns') for p in calls+again))

    def test_light_clock_probe_writes_only_boolean_output_and_retry_detects_failed_hosting(self):
        with tempfile.TemporaryDirectory() as folder:
            row=campaign(sentDate=(datetime.now(timezone.utc)-timedelta(seconds=1)).isoformat())
            _,_,result=self.run_archive(folder,[row],mode='needed');self.assertEqual(result,'archive_needed=true\n')
            self.assertFalse((Path(folder)/'data').exists())
            self.run_archive(folder,[row]);
            _,_,result=self.run_archive(folder,[],mode='needed',live=False);self.assertTrue(result.endswith('archive_needed=true\n'))

    def test_empty_authoritative_provider_check_does_not_request_a_deploy(self):
        with tempfile.TemporaryDirectory() as folder:
            _,_,result=self.run_archive(folder,[],mode='needed');self.assertEqual(result,'archive_needed=false\n')

    def test_a_missing_or_unverifiable_photo_does_not_hide_the_public_letter(self):
        with tempfile.TemporaryDirectory() as folder,mock.patch.object(archive,'public_photo',side_effect=ValueError('Unverifiable public photo')):
            row=campaign(sentDate=(datetime.now(timezone.utc)-timedelta(seconds=1)).isoformat())
            _,output,_=self.run_archive(folder,[row]);edition=json.loads((Path(folder)/'data/postcards/editions/brevo-42.json').read_text())
            self.assertIsNone(edition['photo']);self.assertIn('A complete synthetic public paragraph.',edition['paragraphs'])
            self.assertIn('Verified branded covers used: 1',output);self.assertNotIn('Unverifiable',output)

    def test_audit_reads_plans_without_exporting_or_logging_their_private_content(self):
        with tempfile.TemporaryDirectory() as folder:
            row=campaign(status='queued',scheduledAt='2026-12-01T10:00:00Z',subject='PRIVATE SUBJECT',htmlContent='<p>PRIVATE BODY</p>')
            _,output,_=self.run_archive(folder,[row],mode='audit');result=json.loads(output)
            self.assertTrue(result['postcardsAudience']);self.assertTrue(result['hasSchedule']);self.assertTrue(result['hasPublicText'])
            self.assertNotIn('PRIVATE',output);self.assertNotIn('2026-12-01',output)
            self.assertFalse((Path(folder)/'data').exists())
