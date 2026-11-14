"""No network or subscriber operations; verify the actual provider transport."""
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('delivery_transport', Path(__file__).parents[1] / 'tools/postcard-delivery.py')
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)


class Transport(unittest.TestCase):
    def request(self, method, body):
        with patch.dict(d.os.environ, {'BREVO_API_KEY': 'synthetic-test-key'}), patch.object(d.shutil, 'which', return_value='curl'), patch.object(d.subprocess, 'run', return_value=SimpleNamespace(returncode=0, stdout='\nDOTM_HTTP_CODE:204')) as run:
            self.assertEqual(d.brevo('emailCampaigns/1/sendNow', method, body), {})
            return run.call_args.kwargs['input']

    def test_bodyless_send_does_not_send_json_null(self):
        config = self.request('POST', None)
        self.assertNotIn('data-binary', config)
        self.assertNotIn('null', config)
        self.assertIn('request = "POST"', config)

    def test_explicit_empty_object_is_preserved(self):
        config = self.request('POST', {})
        value = next(line.split(' = ', 1)[1] for line in config.splitlines() if line.startswith('data-binary'))
        self.assertEqual(json.loads(json.loads(value)), {})

    def test_campaign_update_body_is_preserved(self):
        body = {'subject': 'Synthetic isolated example', 'recipients': {'segmentIds': [1]}}
        config = self.request('PUT', body)
        value = next(line.split(' = ', 1)[1] for line in config.splitlines() if line.startswith('data-binary'))
        self.assertEqual(json.loads(json.loads(value)), body)


if __name__ == '__main__':
    unittest.main()
