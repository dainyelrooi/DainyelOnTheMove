"""Isolated notification checks: synthetic records only; no network or email."""
import contextlib
import copy
from datetime import datetime, timedelta, timezone
import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('question_notifications',
    Path(__file__).resolve().parents[1] / 'tools' / 'question-notifications.py')
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)

STAMP = '2026-10-21T06:00:00Z'
CURSOR = {'time': '2026-10-21T05:00:00Z'}


def document(number, question='Synthetic question for a private notification test.'):
    return {'name': worker.ROOT + f'/questions/test-{number:03d}', 'fields': {
        'createdAt': {'timestampValue': STAMP}, 'topic': {'stringValue': 'culture'},
        'question': {'stringValue': question}, 'displayName': {'stringValue': 'Synthetic tester'}}}


def batch(items=None):
    return {'id': 'synthetic-outbox', 'kind': 'questions', 'status': 'prepared',
        'counts': {'questions': 1, 'communityThreads': 0},
        'nextCursors': {source: {'time': STAMP} for source in worker.SOURCES},
        'items': items if items is not None else [worker.question_item(document(1), 'questions')]}


class FakeDatabase:
    def __init__(self, pending=None, rows=None):
        self.data = {'version': 1, 'initialized': True, 'pending': pending,
                     'cursors': {source: copy.deepcopy(CURSOR) for source in worker.SOURCES}}
        self.rows = rows or {}
        self.queries, self.saved = [], []

    def read(self):
        return {'data': copy.deepcopy(self.data), 'clock': STAMP, 'updateTime': STAMP}

    def save(self, data, prior):
        self.data = copy.deepcopy(data)
        self.saved.append(copy.deepcopy(data))
        return {'data': data, 'clock': STAMP, 'updateTime': STAMP}

    def query(self, source, status, cursor=None, read_time=None, limit=worker.LIMIT):
        self.queries.append((source, status, cursor, read_time, limit))
        return [doc for doc in self.rows.get((source, status), [])
                if worker.order_key(worker.document_cursor(doc)) > worker.order_key(cursor or CURSOR)][:limit]


class NotificationChecks(unittest.TestCase):
    def test_plain_and_html_include_both_complete_questions(self):
        personal = worker.question_item(document(1, 'First line\nSecond line: café & palms.'), 'questions')
        community = worker.question_item(document(2, 'Another complete question?'), 'communityThreads')
        body = worker.mail_body(batch([personal, community]), 'owner@example.invalid')
        for item in [personal, community]:
            self.assertIn(item['question'], body['textContent'])
            self.assertIn(worker.escape(item['question']), body['htmlContent'])
        for label in ['Ask Dainyel', 'Ask the Community', 'culture', 'Synthetic tester', STAMP]:
            self.assertIn(label, body['textContent'])
        self.assertEqual(body['to'], [{'email': 'owner@example.invalid'}])
        self.assertNotIn('bcc', body)
        self.assertNotIn('listIds', body)
        self.assertEqual(body['headers'], {'idempotencyKey': 'synthetic-outbox'})

    def test_html_escapes_user_content_without_truncating_plain_text(self):
        question = '<script>alert("test")</script> & <a href="https://example.invalid">hello</a>'
        item = worker.question_item(document(1, question), 'questions')
        item['displayName'] = '<img src=x onerror=alert(1)>'
        body = worker.mail_body(batch([item]), 'owner@example.invalid')
        self.assertIn(question, body['textContent'])
        self.assertNotIn('<script>', body['htmlContent'])
        self.assertNotIn('<img', body['htmlContent'])
        self.assertNotIn('<a href="https://example.invalid">', body['htmlContent'])
        self.assertIn('&lt;script&gt;', body['htmlContent'])

    def test_maximum_question_and_unicode_remain_complete(self):
        question = '🌴é' * 500
        item = worker.question_item(document(1, question), 'questions')
        body = worker.mail_body(batch([item]), 'owner@example.invalid')
        self.assertIn(question, body['textContent'])
        self.assertIn(question, body['htmlContent'])

    def test_optional_name_and_unexpected_fields(self):
        doc = document(1)
        del doc['fields']['displayName']
        item = worker.question_item(doc, 'questions')
        self.assertIn('Geen bijnaam opgegeven', worker.mail_body(batch([item]), 'owner@example.invalid')['textContent'])
        doc['fields']['question']['stringValue'] = 'x' * 1001
        with self.assertRaisesRegex(RuntimeError, 'cursor was not advanced'):
            worker.question_item(doc, 'questions')

    def test_query_projects_only_required_fields_and_shared_snapshot(self):
        db = object.__new__(worker.Firestore)
        with patch.object(db, 'call', return_value=[]) as call:
            db.query('questions', 'pending', {'time': STAMP, 'name': document(1)['name']}, STAMP)
        payload = call.call_args.args[2]
        self.assertEqual(payload['readTime'], STAMP)
        query = payload['structuredQuery']
        self.assertEqual([field['fieldPath'] for field in query['select']['fields']],
                         ['createdAt', 'topic', 'question', 'displayName'])
        self.assertFalse(query['startAt']['before'])
        self.assertEqual(query['limit'], 100)

    def test_scan_sorts_caps_and_leaves_backlog_eligible(self):
        docs = [document(i) for i in range(25)]
        db = FakeDatabase(rows={('questions', 'pending'): docs})
        first, cursor = worker.scan(db, 'questions', CURSOR, STAMP)
        second, next_cursor = worker.scan(db, 'questions', cursor, STAMP)
        third, end = worker.scan(db, 'questions', next_cursor, STAMP)
        empty, unchanged = worker.scan(db, 'questions', end, STAMP)
        self.assertEqual([len(first), len(second), len(third), len(empty)], [10, 10, 5, 0])
        self.assertEqual(end, unchanged)
        self.assertEqual(len(db.queries), 12)
        self.assertTrue(all(query[3] == STAMP for query in db.queries))

    def test_scan_deduplicates_and_respects_full_query_boundary(self):
        full = [document(i) for i in range(worker.LIMIT)]
        db = FakeDatabase(rows={('questions', 'pending'): full,
                                ('questions', 'published'): [full[0], document(101)]})
        with patch.object(worker, 'MAIL_LIMIT_PER_SOURCE', 200):
            items, cursor = worker.scan(db, 'questions', CURSOR, STAMP)
        self.assertEqual(len(items), worker.LIMIT)
        self.assertEqual(cursor, worker.document_cursor(full[-1]))

    def test_timestamp_fraction_order_and_initial_inclusive_cursor(self):
        self.assertEqual(worker.order_key({'time': '2026-10-21T06:00:00.1Z'}),
                         worker.order_key({'time': '2026-10-21T06:00:00.100000000Z'}))
        db = object.__new__(worker.Firestore)
        with patch.object(db, 'call', return_value=[]) as call:
            db.query('questions', 'pending', {'time': STAMP})
        self.assertTrue(call.call_args.args[2]['structuredQuery']['startAt']['before'])

    def test_accepted_mail_clears_private_text_and_advances_cursors(self):
        db = FakeDatabase(pending=batch())
        output = io.StringIO()
        with patch.object(worker, 'send', return_value='provider-test-id'), contextlib.redirect_stdout(output):
            worker.deliver(db, db.read())
        self.assertIsNone(db.data['pending'])
        self.assertEqual(db.data['cursors']['questions']['time'], STAMP)
        self.assertNotIn('items', db.data['lastAccepted'])
        self.assertNotIn('Synthetic question', json.dumps(db.data))
        self.assertNotIn('Synthetic question', output.getvalue())

    def test_ambiguous_failure_keeps_frozen_payload_and_retry_key(self):
        db = FakeDatabase(pending=batch())
        with patch.object(worker, 'send', side_effect=RuntimeError('Brevo unavailable')):
            with self.assertRaises(RuntimeError):
                worker.deliver(db, db.read())
        self.assertEqual(db.data['pending']['status'], 'attempted')
        self.assertEqual(db.data['cursors']['questions'], CURSOR)
        first = worker.mail_body(db.data['pending'], 'owner@example.invalid')
        db.data['pending']['firstAttemptAt'] = datetime.now(timezone.utc).isoformat()
        with patch.object(worker, 'send', return_value='provider-test-id') as send, contextlib.redirect_stdout(io.StringIO()):
            worker.deliver(db, db.read())
        self.assertEqual(first, worker.mail_body(send.call_args.args[0], 'owner@example.invalid'))

    def test_expired_ambiguous_send_stops_without_resend(self):
        pending = batch()
        pending.update(status='attempted', firstAttemptAt=(datetime.now(timezone.utc) - timedelta(minutes=26)).isoformat())
        db = FakeDatabase(pending=pending)
        with patch.object(worker, 'send') as send:
            with self.assertRaisesRegex(RuntimeError, 'no resend attempted'):
                worker.deliver(db, db.read())
        send.assert_not_called()
        self.assertEqual(db.data['pending'], pending)

    def test_provider_duplicate_acceptance_completes_without_another_key(self):
        db = FakeDatabase(pending=batch())
        with patch.object(worker, 'send', side_effect=worker.RemoteError('Brevo', 400, 'duplicate_parameter')), contextlib.redirect_stdout(io.StringIO()):
            worker.deliver(db, db.read())
        self.assertIsNone(db.data['pending'])
        self.assertEqual(db.data['lastAccepted']['messageId'], 'provider-idempotency-confirmed')

    def test_definite_rejection_returns_to_prepared_without_advancing(self):
        db = FakeDatabase(pending=batch())
        with patch.object(worker, 'send', side_effect=worker.RemoteError('Brevo', 429, 'too_many_requests')):
            with self.assertRaises(worker.RemoteError):
                worker.deliver(db, db.read())
        self.assertEqual(db.data['pending']['status'], 'prepared')
        self.assertNotIn('firstAttemptAt', db.data['pending'])
        self.assertEqual(db.data['cursors']['questions'], CURSOR)

    def test_legacy_outbox_and_verification_remain_compatible(self):
        pending = batch()
        del pending['items']
        body = worker.mail_body(pending, 'owner@example.invalid')
        self.assertIn('1 aan jou', body['textContent'])
        self.assertNotIn('Hieronder staan de volledige vragen', body['textContent'])
        verified = worker.mail_body({'id': 'check', 'kind': 'verification'}, 'owner@example.invalid')
        self.assertIn('geen bezoekersvragen aangemaakt', verified['textContent'])

    def test_real_mode_saves_items_before_send_then_repeat_sends_nothing(self):
        db = FakeDatabase(rows={('questions', 'pending'): [document(1)],
                                ('communityThreads', 'pending'): [document(2)]})
        with patch.object(worker, 'Firestore', return_value=db), patch.object(worker, 'mail_configuration'), \
             patch.object(worker.sys, 'argv', ['worker', '--mode', 'notify']), \
             patch.object(worker, 'send', return_value='provider-test-id') as send, contextlib.redirect_stdout(io.StringIO()):
            worker.main()
            worker.main()
        send.assert_called_once()
        self.assertTrue(any(state.get('pending', {}).get('items') for state in db.saved if state.get('pending')))
        self.assertEqual(db.data['lastAccepted']['counts'], {'questions': 1, 'communityThreads': 1})


if __name__ == '__main__':
    unittest.main()
