import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('calendar_import', Path(__file__).with_name('command-center-content.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def plan(date='2026-10-28T12:00'):
    return {'version': 1, 'timezone': 'Europe/Amsterdam', 'posts': [{
        'title': 'Review fixture', 'caption': 'A local test, never uploaded.',
        'publishLocal': date, 'imageUrl': '', 'designUrl': 'https://www.canva.com/design/fixture/edit'}]}


class Store:
    def __init__(self, existing=None):
        self.existing = existing
        self.writes = []

    def call(self, path, method, body):
        if path.endswith(':runQuery'):
            return [{'document': {'name': module.ROOT + '/contentCalendar/' + key}} for key in (self.existing or {})]
        if path.endswith(':batchGet'):
            return [{'found': {'name': module.ROOT + '/contentCalendar/' + key, 'fields': fields}} for key, fields in self.existing.items()]
        self.writes.extend(body['writes'])
        return {}


class ImportTests(unittest.TestCase):
    def test_requests_identify_the_app_without_changing_authentication(self):
        calls = []
        def request(service, url, headers, method='GET', body=None):
            calls.append((service, headers, method))
            if service == 'GitHub identity':
                return {'value': 'fixture-identity'}
            return {'plan': plan()} if method == 'GET' else {'ok': True}
        with patch.dict(module.os.environ, {
                'COMMAND_CENTER_JOB': 'a' * 36,
                'ACTIONS_ID_TOKEN_REQUEST_URL': 'https://fixture.invalid/token?api-version=2',
                'ACTIONS_ID_TOKEN_REQUEST_TOKEN': 'fixture-request'}), \
                patch.object(module.helpers, 'request', side_effect=request), \
                patch.object(module.helpers, 'Firestore', return_value=Store()):
            module.main()
        self.assertEqual(len(calls), 3)
        self.assertTrue(all(headers['User-Agent'] == 'Dainyel-Command-Center' for _, headers, _ in calls))
        self.assertEqual(calls[0][1]['Authorization'], 'Bearer fixture-request')
        for _, headers, _ in calls[1:]:
            self.assertEqual(headers['Authorization'], 'Bearer fixture-identity')
            self.assertEqual(headers['X-Command-Center'], '1')

    def test_amsterdam_summer_and_winter(self):
        winter = next(iter(module.validate(plan()).values()))
        summer = next(iter(module.validate(plan('2026-07-15T12:00')).values()))
        self.assertEqual(winter['publishAt']['timestampValue'], '2026-10-28T11:00:00Z')
        self.assertEqual(summer['publishAt']['timestampValue'], '2026-07-15T10:00:00Z')

    def test_invalid_clock_jump_and_links_are_rejected(self):
        with self.assertRaises(ValueError):
            module.validate(plan('2027-03-28T02:30'))
        value = plan()
        value['posts'][0]['designUrl'] = 'https://attacker.invalid/design/fixture'
        with self.assertRaises(ValueError):
            module.validate(value)

    def test_drafts_are_private_and_created_only_once(self):
        rows = module.validate(plan())
        first = Store()
        self.assertEqual(module.import_rows(first, rows), 1)
        self.assertEqual(len(first.writes), 1)
        self.assertEqual(first.writes[0]['currentDocument'], {'exists': False})
        fields = first.writes[0]['update']['fields']
        self.assertFalse(fields['scheduled']['booleanValue'])
        self.assertFalse(fields['published']['booleanValue'])
        repeat = Store(rows)
        self.assertEqual(module.import_rows(repeat, rows), 1)
        self.assertEqual(repeat.writes, [])

    def test_owner_changes_are_preserved_and_block_conflicting_imports(self):
        rows = module.validate(plan())
        existing = module.validate(plan())
        next(iter(existing.values()))['caption'] = {'stringValue': 'Owner edited this'}
        store = Store(existing)
        with self.assertRaises(ValueError):
            module.import_rows(store, rows)
        self.assertEqual(store.writes, [])


if __name__ == '__main__':
    unittest.main()
