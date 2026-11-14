"""Protect against replaying accepted/uncertain sends or widening recipients."""
import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('exact_recovery', Path(__file__).parents[1] / 'tools/cusco-postcard-recovery.py')
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)


class Recovery(unittest.TestCase):
    def setUp(self):
        self.job = {'phase': 'dispatch-attempted'}
        self.campaign = {'status': 'draft', 'recipients': {'segmentIds': [1]}}
        self.operation = {'events': [{'code': 'provider-http-400'}]}

    def test_confirmed_rejected_draft_qualifies(self):
        self.assertTrue(r.recoverable(self.job, self.campaign, self.operation, True))

    def test_provider_handoff_or_sent_timestamp_never_qualifies(self):
        for status in ['queued', 'scheduled', 'sent', 'inProcess', 'processing']:
            self.assertFalse(r.recoverable(self.job, {**self.campaign, 'status': status}, self.operation, True))
        self.assertFalse(r.recoverable(self.job, {**self.campaign, 'sentDate': '2026-11-14T00:00:00Z'}, self.operation, True))

    def test_uncertain_error_or_missing_rejection_never_qualifies(self):
        for events in [[], [{'code': 'provider-http-500'}], [{'code': 'provider-or-storage-unavailable'}]]:
            self.assertFalse(r.recoverable(self.job, self.campaign, {'events': events}, True))

    def test_audience_cannot_expand_to_other_segments_or_lists(self):
        for recipients in [{'segmentIds': [1, 2]}, {'segmentIds': [2]}, {'segmentIds': [1], 'listIds': [3]}, {}]:
            self.assertFalse(r.recoverable(self.job, {**self.campaign, 'recipients': recipients}, self.operation, True))

    def test_missing_credit_or_wrong_phase_never_qualifies(self):
        self.assertFalse(r.recoverable(self.job, self.campaign, self.operation, False))
        self.assertFalse(r.recoverable({'phase': 'complete'}, self.campaign, self.operation, True))


if __name__ == '__main__':
    unittest.main()
