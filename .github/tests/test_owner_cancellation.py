"""Exact cancellation intent survives unavailable storage; no real network."""
import copy
from datetime import datetime, timezone
import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('cancel_schedule_fixtures',Path(__file__).with_name('test_scheduled_content.py'))
fixtures=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixtures)
mail=fixtures.mail

class CancellationTests(unittest.TestCase):
    def test_exact_mail_cancellation_stops_before_provider_and_preserves_payload(self):
        job=fixtures.email_job(fixtures.NOW);original=copy.deepcopy(job);changes=[]
        store=fixtures.Store();store.update=lambda document,fields:changes.append(fields)
        with patch.dict(os.environ,{'POSTCARDS_CANCELLED_JOB_IDS':job['name'].split('/')[-1]}),patch.object(mail,'brevo',side_effect=AssertionError('Provider forbidden')),patch.object(mail,'public_link',side_effect=AssertionError('Link lookup forbidden')):
            mail.process(store,job,[{'credits':300}])
        self.assertEqual(changes,[{'status':'cancelled'}]);self.assertEqual(job,original)

    def test_exhausted_write_quota_still_prevents_cancelled_mail_dispatch(self):
        job=fixtures.email_job(fixtures.NOW);store=fixtures.Store()
        def unavailable(*args):raise mail.helpers.RemoteError('Firestore',429)
        store.update=unavailable
        with patch.dict(os.environ,{'POSTCARDS_CANCELLED_JOB_IDS':job['name'].split('/')[-1]}),patch.object(mail,'brevo',side_effect=AssertionError('Provider forbidden')):
            mail.process(store,job,[{'credits':300}])

    def test_other_job_is_not_cancelled(self):
        job=fixtures.email_job(fixtures.NOW)
        with patch.dict(os.environ,{'POSTCARDS_CANCELLED_JOB_IDS':'mail-'+'d'*32}):
            self.assertFalse(mail.withhold_owner_cancelled(fixtures.Store(),job,'POSTCARDS_CANCELLED_JOB_IDS','mail'))

    def test_handoff_is_not_mislabelled_cancelled(self):
        job=fixtures.email_job(fixtures.NOW);job['fields']['campaignId']=mail.pack(123)
        store=fixtures.Store();store.update=lambda *args: self.fail('Cannot recall a provider campaign by changing a row')
        with patch.dict(os.environ,{'POSTCARDS_CANCELLED_JOB_IDS':job['name'].split('/')[-1]}):
            self.assertTrue(mail.withhold_owner_cancelled(store,job,'POSTCARDS_CANCELLED_JOB_IDS','mail'))

    def test_invalid_or_wildcard_configuration_never_widens_target(self):
        for value in ['*','mail-*','entry-'+'a'*32,'x'*801]:
            with self.subTest(value=value[:20]),patch.dict(os.environ,{'POSTCARDS_CANCELLED_JOB_IDS':value}):
                with self.assertRaises(RuntimeError):mail.withhold_owner_cancelled(fixtures.Store(),fixtures.email_job(fixtures.NOW),'POSTCARDS_CANCELLED_JOB_IDS','mail')

    def test_exact_entry_conversion_can_stop_queued_publication(self):
        store=fixtures.Store();store.update=lambda *args: None
        with patch.dict(os.environ,{'CONTENT_CANCELLED_ENTRY_IDS':fixtures.ID}):
            self.assertFalse(fixtures.worker.process(store,fixtures.schedule(),'production',fixtures.NOW))
        self.assertFalse(store.writes)

if __name__=='__main__':unittest.main()
