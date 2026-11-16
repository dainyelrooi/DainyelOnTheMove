"""No credentials/network: daily quota classification, reset and safe deferral."""
from datetime import datetime, timezone
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

spec = importlib.util.spec_from_file_location('quota_helpers', Path(__file__).parents[1] / 'tools/question-notifications.py')
h = importlib.util.module_from_spec(spec); spec.loader.exec_module(h)
b = h.budget


class BudgetTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory(); self.addCleanup(self.folder.cleanup)
        self.path = Path(self.folder.name) / 'state.json'
        env = patch.dict(os.environ, {'FIRESTORE_QUOTA_STATE': str(self.path)}, clear=False)
        env.start(); self.addCleanup(env.stop)

    def error(self, status=429, message='Quota exceeded: Read requests per day. PRIVATE-TEST-CANARY', code='RESOURCE_EXHAUSTED'):
        return HTTPError('https://firestore.googleapis.com/v1/fixture', status, 'fixture', {}, io.BytesIO(json.dumps({'error': {'status': code, 'message': message}}).encode()))

    def test_daily_read_is_not_retried_and_logs_no_response_content(self):
        with patch.object(h.urllib.request, 'build_opener') as opener, patch.object(h.time, 'sleep') as sleep:
            opener.return_value.open.side_effect = self.error()
            with self.assertRaises(h.RemoteError) as caught:
                h.request('Firestore', 'https://firestore.googleapis.com/v1/fixture:runQuery', {}, 'POST', {})
            self.assertEqual(caught.exception.code, 'daily-read-quota')
            self.assertNotIn('PRIVATE-TEST-CANARY', str(caught.exception))
            self.assertEqual(opener.return_value.open.call_count, 1); sleep.assert_not_called()
        self.assertEqual(set(json.loads(self.path.read_text())), {'version', 'reason', 'until'})
        self.assertNotIn('PRIVATE', self.path.read_text())

    def test_persisted_block_makes_no_http_call_or_ambiguous_commit(self):
        b.record('daily-read-quota')
        for method, suffix in [('GET', '/fixture'), ('POST', ':commit')]:
            with patch.object(h, '_request_once') as request:
                with self.assertRaises(h.RemoteError): h.request('Firestore', 'https://firestore.googleapis.com/v1/fixture' + suffix, {}, method, {})
                request.assert_not_called()
        with patch.object(h, '_request_once', return_value={'ok': True}) as request:
            self.assertEqual(h.request('Brevo', 'https://api.brevo.com/v3/account', {}), {'ok': True})
            request.assert_called_once()  # native provider schedules remain independent

    def test_reset_uses_pacific_midnight_including_dst(self):
        for now, expected in [('2026-11-15T23:00:00+00:00', '2026-11-16T08:02:00+00:00'),
                              ('2026-07-15T23:00:00+00:00', '2026-07-16T07:02:00+00:00'),
                              ('2026-11-01T06:59:00+00:00', '2026-11-01T07:02:00+00:00'),
                              ('2026-11-01T07:01:00+00:00', '2026-11-02T08:02:00+00:00')]:
            self.assertEqual(b.next_reset(datetime.fromisoformat(now)).isoformat(), expected)

    def test_service_identity_generic_quota_gets_only_a_short_persistent_hold(self):
        now = datetime(2026, 11, 15, 23, tzinfo=timezone.utc)
        reason = h.remote_error('Firestore', self.error(message='Quota exceeded.')).code
        self.assertEqual(reason, 'quota-exhausted')
        self.assertEqual(b.record(reason, now=now), 900)
        self.assertEqual(b.read_state(now=now)['until'], '2026-11-15T23:15:00+00:00')
        self.assertIsNone(b.read_state(now=datetime(2026, 11, 15, 23, 16, tzinfo=timezone.utc)))

    def test_rate_burst_permission_or_bad_json_does_not_create_daily_hold(self):
        for error in [self.error(message='Too many requests per minute.'), self.error(403), self.error(code='UNAVAILABLE')]:
            self.assertEqual(h.remote_error('Firestore', error).code, '')
            self.assertFalse(self.path.exists())
        with patch.object(h, '_request_once', side_effect=[h.RemoteError('Firestore', 429), {'ok': 1}]) as call, patch.object(h.time, 'sleep') as sleep:
            self.assertEqual(h.request('Firestore', 'https://firestore.googleapis.com/v1/fixture', {}), {'ok': 1})
            self.assertEqual(call.call_count, 2); sleep.assert_called_once()

    def test_expired_or_malformed_state_allows_a_real_probe(self):
        for value in ['invalid', '{}', json.dumps({'version': 1, 'reason': 'daily-read-quota', 'until': '2020-01-01T00:00:00+00:00'})]:
            self.path.write_text(value)
            with patch.object(h, '_request_once', return_value={'ok': 1}) as call:
                self.assertEqual(h.request('Firestore', 'https://firestore.googleapis.com/v1/fixture', {}), {'ok': 1})
                call.assert_called_once()

    def test_step_summary_is_blocked_and_never_claims_publication(self):
        output = Path(self.folder.name) / 'output'; summary = Path(self.folder.name) / 'summary'
        with patch.dict(os.environ, {'GITHUB_OUTPUT': str(output), 'GITHUB_STEP_SUMMARY': str(summary)}):
            b.record('daily-read-quota')
            self.assertFalse(b.check())
        self.assertIn('available=false', output.read_text())
        self.assertIn('quota_blocked=true', output.read_text())
        self.assertIn('BLOCKED', summary.read_text())
        self.assertIn('did not publish', summary.read_text())


if __name__ == '__main__': unittest.main()
