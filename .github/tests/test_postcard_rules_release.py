"""Rules publication guards; no credentials or network."""
import copy
import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('rules_release', Path(__file__).parents[1] / 'tools/postcard-rules-release.py')
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)
BEFORE = 'synthetic original Rules'
AFTER = 'synthetic reviewed Rules'
OLD = 'projects/dainyelonthemove/rulesets/old'
NEW = 'projects/dainyelonthemove/rulesets/new'


class Store:
    def __init__(self):
        self.writes = []
        self.backup = None

    def optional(self, path):
        return self.backup

    def call(self, path, method, body):
        self.writes.append(copy.deepcopy(body))


class API:
    def __init__(self, source=BEFORE):
        self.source = source
        self.active = OLD
        self.calls = []
        self.concurrent = False
        self.bad_readback = False

    def __call__(self, path, method='GET', body=None):
        self.calls.append((path, method))
        if method == 'POST':
            if self.concurrent:
                self.active = 'changed-concurrently'
            return {'name': NEW}
        if method == 'PATCH':
            self.active = NEW
            self.source = 'unexpected' if self.bad_readback else AFTER
            return {'name': r.staging.RELEASE, 'rulesetName': NEW}
        if path == r.staging.RELEASE:
            return {'name': path, 'rulesetName': self.active}
        return {'source': {'files': [{'name': 'firestore.rules', 'content': self.source}]}}


class Release(unittest.TestCase):
    def setUp(self):
        self.store = Store()
        self.api = API()
        pin = patch.object(r, 'REVIEWED_SHA', r.sha(AFTER))
        baseline = patch.object(r, 'BASELINE_SHA', r.sha(BEFORE))
        pin.start()
        baseline.start()
        self.addCleanup(pin.stop)
        self.addCleanup(baseline.stop)

    def run_release(self, **kwargs):
        r.release(self.store, self.api, AFTER, **kwargs)

    def test_check_never_mutates(self):
        self.run_release()
        self.assertFalse(self.store.writes)
        self.assertTrue(all(method == 'GET' for _, method in self.api.calls))

    def test_exact_expected_source_required(self):
        for expected in ['', r.sha('other')]:
            with self.assertRaises(RuntimeError):
                self.run_release(apply=True, expected=expected)
        self.assertFalse(self.store.writes)
        self.assertTrue(all(method == 'GET' for _, method in self.api.calls))

    def test_candidate_change_fails_before_any_call(self):
        with self.assertRaises(RuntimeError):
            r.release(self.store, self.api, 'different candidate', apply=True, expected=r.sha(BEFORE))
        self.assertEqual(self.api.calls, [])

    def test_unknown_baseline_is_not_overwritten(self):
        self.api.source = 'unreviewed active rights'
        with self.assertRaises(RuntimeError):
            self.run_release(apply=True, expected=r.sha(self.api.source))
        self.assertFalse(self.store.writes)

    def test_existing_staging_overlay_is_verified_then_removed_for_baseline(self):
        self.api.source = BEFORE + r.staging.overlay()
        self.run_release()
        self.api.source = BEFORE + r.staging.overlay().replace('allow write: if false;', 'allow write: if true;')
        with self.assertRaises(RuntimeError):
            self.run_release()

    def test_backup_precedes_single_publication_and_repeat_is_read_only(self):
        self.run_release(apply=True, expected=r.sha(BEFORE))
        self.assertEqual(len(self.store.writes), 1)
        backup = self.store.writes[0]['writes'][0]
        self.assertEqual(backup['currentDocument'], {'exists': False})
        self.assertEqual(r.d.unpack(backup['update']['fields']['source']), BEFORE)
        self.assertEqual(sum(method == 'PATCH' for _, method in self.api.calls), 1)
        self.assertEqual(self.api.calls[-1], (NEW, 'GET'))
        self.run_release(apply=True, expected=r.sha(BEFORE))
        self.assertEqual(sum(method == 'PATCH' for _, method in self.api.calls), 1)

    def test_concurrent_release_is_not_overwritten(self):
        self.api.concurrent = True
        with self.assertRaises(RuntimeError):
            self.run_release(apply=True, expected=r.sha(BEFORE))
        self.assertFalse(any(method == 'PATCH' for _, method in self.api.calls))

    def test_mismatched_existing_backup_blocks_publication(self):
        self.store.backup = {'fields': {'source': r.d.pack('different')}}
        with self.assertRaises(RuntimeError):
            self.run_release(apply=True, expected=r.sha(BEFORE))
        self.assertFalse(any(method != 'GET' for _, method in self.api.calls))

    def test_unconfirmed_final_source_is_error(self):
        self.api.bad_readback = True
        with self.assertRaises(RuntimeError):
            self.run_release(apply=True, expected=r.sha(BEFORE))

    def test_production_apply_cannot_run_from_staging_or_other_repo(self):
        with patch.dict(os.environ, {'GITHUB_REPOSITORY': 'dainyelrooi/DainyelOnTheMove', 'GITHUB_REF': 'refs/heads/staging'}):
            r.validate_environment(False)
            with self.assertRaises(RuntimeError):
                r.validate_environment(True)
        with patch.dict(os.environ, {'GITHUB_REPOSITORY': 'other/repo', 'GITHUB_REF': 'refs/heads/main'}):
            with self.assertRaises(RuntimeError):
                r.validate_environment(True)


if __name__ == '__main__':
    unittest.main()
