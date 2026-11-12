"""Isolated provider reconciliation. Synthetic content, no credentials/network."""
import copy
from datetime import datetime, timedelta, timezone
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('controller', Path(__file__).parents[1] / 'tools/postcard-controller.py')
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
NOW = datetime(2026, 11, 12, 16, tzinfo=timezone.utc)
DUE = '2026-11-20T10:00:00Z'
ID = 'mail-' + 'a' * 32
BASE = c.ROOT + '/cmsSpaces/staging'
PAYLOAD = {'subject': 'ISOLATED NEWSLETTER FIXTURE', 'previewText': '', 'headline': 'Fixture',
    'body': 'Synthetic newsletter body for isolated testing. No real subscriber or travel content.',
    'ctaText': 'Read', 'ctaUrl': 'https://dainyelonthemove.com/stories', 'imageUrl': ''}


def document(kind, data, identifier=ID):
    return {'name': BASE + '/' + kind + '/' + identifier, 'fields': {key: c.d.pack(value) for key, value in data.items()}, 'updateTime': 'v1'}


def job(**changes):
    return document('mailJobs', {'version': 1, 'draftId': ID, 'draftRevision': 1, 'payload': PAYLOAD,
        'action': 'schedule', 'status': 'accepted', 'phase': 'dispatch-attempted', 'campaignId': 101,
        'scheduledAt': DUE, 'createdAt': NOW.isoformat(), **changes})


def campaign(**changes):
    return {'id': 101, 'name': 'Website Postcard ' + ID, 'subject': PAYLOAD['subject'],
        'sender': {'email': c.d.SENDER}, 'status': 'queued', 'scheduledAt': DUE,
        'htmlContent': c.d.template(PAYLOAD), **changes}


class Memory(c.Store):
    def __init__(self, rows=()):
        self.rows = {row['name']: copy.deepcopy(row) for row in rows}
        self.commits = []
        self.sequence = 1
        self.ambiguous = False

    def optional(self, path):
        return copy.deepcopy(self.rows.get(path))

    def call(self, path, method='GET', body=None):
        if path != c.ROOT + ':commit' or method != 'POST':
            raise AssertionError('Unexpected network operation in isolated fixture')
        writes = body['writes']
        for write in writes:
            old = self.rows.get(write['update']['name'])
            guard = write['currentDocument']
            if guard.get('exists') is False and old or guard.get('updateTime') and guard['updateTime'] != (old or {}).get('updateTime'):
                raise c.d.helpers.RemoteError('Firestore', 412)
        self.sequence += 1
        results = []
        for write in writes:
            row = copy.deepcopy(write['update'])
            row['updateTime'] = 'v' + str(self.sequence)
            for transform in write.get('updateTransforms', []):
                row['fields'][transform['fieldPath']] = {'timestampValue': NOW.isoformat()}
            self.rows[row['name']] = row
            results.append({'updateTime': row['updateTime']})
        self.commits.append(copy.deepcopy(writes))
        if self.ambiguous:
            self.ambiguous = False
            raise RuntimeError('Synthetic lost commit response')
        return {'writeResults': results}


class Provider:
    def __init__(self, rows=None):
        self.rows = rows or [campaign()]
        self.reads = []
        self.failure = None

    def campaign(self, identifier):
        self.reads.append(identifier)
        if self.failure:
            raise self.failure
        return copy.deepcopy(next(row for row in self.rows if row['id'] == identifier))

    def campaigns(self):
        return copy.deepcopy(self.rows)


class Reconciliation(unittest.TestCase):
    def setUp(self):
        self.no_network = patch.object(c.d, 'brevo', side_effect=AssertionError('Real Brevo forbidden in tests'))
        self.no_network.start()
        self.addCleanup(self.no_network.stop)

    def run_check(self, row=None, provider=None, now=NOW, **kwargs):
        row = row or job()
        store = Memory([row] + ([kwargs['draft']] if kwargs.get('draft') else []))
        provider = provider or Provider()
        c.reconcile(store, provider, row, 'staging', now, **kwargs)
        return store, c.values(store.optional(row['name'])), provider

    def test_exact_future_provider_queue_becomes_scheduled_not_sent(self):
        store, saved, provider = self.run_check()
        self.assertEqual(saved['status'], 'scheduled')
        self.assertEqual(saved['provider']['state'], 'scheduled')
        self.assertEqual(c.instant(saved['provider']['calendarAt']), c.instant(DUE))
        self.assertNotIn('sentAt', saved['provider'])
        self.assertEqual(provider.reads, [101])
        self.assertTrue(saved['providerOnly'])
        self.assertEqual(c.values(store.optional(BASE + '/mailCampaigns/101'))['draftId'], ID)

    def test_timezone_equivalence_is_exact_and_mismatch_remains_visible(self):
        _, saved, _ = self.run_check(provider=Provider([campaign(scheduledAt='2026-11-20T11:00:00+01:00')]))
        self.assertEqual(saved['status'], 'scheduled')
        _, saved, _ = self.run_check(provider=Provider([campaign(scheduledAt='2026-11-20T11:01:00+01:00')]))
        self.assertEqual(saved['provider']['error'], 'provider-schedule-mismatch')
        self.assertEqual(saved['status'], 'review')
        self.assertNotIn('calendarAt', saved['provider'])

    def test_original_indexed_timestamps_and_payload_are_preserved_as_rest_types(self):
        row = job()
        row['fields']['scheduledAt'] = {'timestampValue': DUE}
        row['fields']['createdAt'] = {'timestampValue': NOW.isoformat()}
        original = copy.deepcopy(row['fields'])
        store, saved, _ = self.run_check(row=row)
        current = store.optional(row['name'])['fields']
        for key in ['scheduledAt', 'createdAt', 'payload', 'draftRevision']:
            self.assertEqual(current[key], original[key])
        baseline = c.values(store.optional(row['name'] + '/providerHistory/baseline'))
        self.assertIn('timestampValue', baseline['beforeDocumentJson'])

    def test_queued_accepted_processing_draft_and_unknown_never_become_sent(self):
        for state in ['queued', 'accepted', 'processing', 'inProcess', 'draft', 'unexpected']:
            with self.subTest(state=state):
                _, saved, _ = self.run_check(row=job(scheduledAt=NOW.isoformat()), provider=Provider([campaign(status=state, scheduledAt=NOW.isoformat())]))
                self.assertNotEqual(saved['provider']['state'], 'sent')
                self.assertNotIn('sentAt', saved['provider'])

    def test_created_campaign_can_resume_only_the_first_approved_dispatch(self):
        _, saved, provider = self.run_check(row=job(status='processing',phase='created'),provider=Provider([campaign(status='draft')]))
        self.assertEqual(saved['status'],'processing')
        self.assertEqual(saved['campaignId'],101)
        self.assertFalse(saved.get('providerOnly',False))
        self.assertEqual(saved['provider']['state'],'pending')
        self.assertEqual(provider.reads,[101])

    def test_send_now_queue_waits_for_sent_without_inventing_a_schedule_or_error(self):
        _, saved, _ = self.run_check(row=job(action='send',status='accepted',phase='observe-only'),provider=Provider([campaign(status='queued')]))
        self.assertEqual(saved['status'],'accepted')
        self.assertEqual(saved['provider']['state'],'pending')
        self.assertEqual(saved['provider']['error'],'')
        self.assertNotIn('sentAt',saved['provider'])
        self.assertNotIn('calendarAt',saved['provider'])
        self.assertTrue(saved['providerOnly'])

    def test_uncertain_dispatch_remains_observe_only_when_the_provider_shows_draft(self):
        _, saved, _ = self.run_check(row=job(status='processing',phase='dispatch-attempted'),provider=Provider([campaign(status='draft')]))
        self.assertEqual(saved['status'],'review')
        self.assertTrue(saved['providerOnly'])

    def test_external_link_can_never_resume_a_provider_dispatch(self):
        binding={'kind':'owner-link','campaignId':101,'subjectHash':c.subject_hash(PAYLOAD['subject'])}
        _, saved, _ = self.run_check(row=job(status='processing',phase='created',binding=binding),provider=Provider([campaign(name='Manual fixture',status='draft')]))
        self.assertEqual(saved['status'],'review')
        self.assertTrue(saved['providerOnly'])

    def test_created_receipt_outage_keeps_the_same_approved_request_without_creation(self):
        provider=Provider();provider.failure=c.d.ProviderError('Synthetic temporary outage',True,'provider-http-503')
        _, saved, _ = self.run_check(row=job(status='processing',phase='created'),provider=provider)
        self.assertEqual(saved['status'],'processing')
        self.assertEqual(saved['campaignId'],101)
        self.assertFalse(saved.get('providerOnly',False))
        self.assertEqual(saved['provider']['error'],'provider-http-503')

    def test_real_sent_date_is_retained_and_calendar_updates_once(self):
        store, scheduled, provider = self.run_check()
        due = c.instant(DUE)
        provider.rows[0].update(status='sent', sentDate=(due + timedelta(minutes=2)).isoformat())
        c.reconcile(store, provider, store.optional(BASE + '/mailJobs/' + ID), 'staging', due + timedelta(minutes=3))
        saved = c.values(store.optional(BASE + '/mailJobs/' + ID))
        self.assertEqual(saved['status'], 'sent')
        self.assertEqual(c.instant(saved['provider']['sentAt']), due + timedelta(minutes=2))
        self.assertEqual(saved['provider']['calendarAt'], saved['provider']['sentAt'])
        self.assertEqual(saved['scheduledAt'], DUE)
        histories = [key for key in store.rows if '/providerHistory/' in key]
        c.reconcile(store, provider, store.optional(BASE + '/mailJobs/' + ID), 'staging', due + timedelta(days=2))
        self.assertEqual([key for key in store.rows if '/providerHistory/' in key], histories)
        self.assertEqual(len([key for key in store.rows if '/mailJobs/' in key and '/providerHistory/' not in key]), 1)

    def test_sender_subject_campaign_id_and_name_must_match(self):
        for changes in [{'id': 102}, {'sender': {'email': 'other@example.invalid'}}, {'subject': 'Other'}, {'name': 'Unrelated manual campaign'}]:
            with self.subTest(changes=changes):
                sample = campaign(**changes)
                provider = Provider([sample])
                provider.campaign = lambda identifier: sample
                _, saved, _ = self.run_check(provider=provider)
                self.assertEqual(saved['status'], 'review')
                self.assertNotIn('calendarAt', saved['provider'])

    def test_invalid_missing_or_future_sent_date_cannot_mark_sent(self):
        for value in [None, '2026-11-12T15:00:00', 'not-a-date', (NOW + timedelta(hours=1)).isoformat()]:
            _, saved, _ = self.run_check(provider=Provider([campaign(status='sent', sentDate=value)]))
            self.assertNotEqual(saved['provider']['state'], 'sent')

    def test_outage_remains_pending_and_read_only_retry_recovers(self):
        store, scheduled, provider = self.run_check()
        provider.failure = c.d.ProviderError('Synthetic outage', True, 'provider-http-503')
        c.reconcile(store, provider, store.optional(BASE + '/mailJobs/' + ID), 'staging', NOW + timedelta(hours=1))
        failed = c.values(store.optional(BASE + '/mailJobs/' + ID))
        self.assertEqual(failed['provider']['state'], 'pending')
        self.assertEqual(failed['provider']['lastSuccessAt'], scheduled['provider']['lastSuccessAt'])
        self.assertEqual(failed['provider']['calendarAt'], scheduled['provider']['calendarAt'])
        provider.failure = None
        c.reconcile(store, provider, store.optional(BASE + '/mailJobs/' + ID), 'staging', NOW + timedelta(hours=2))
        self.assertEqual(c.values(store.optional(BASE + '/mailJobs/' + ID))['provider']['state'], 'scheduled')

    def test_cancelled_records_are_never_linked_or_replayed(self):
        store, saved, provider = self.run_check(row=job(status='cancelled'))
        self.assertEqual(saved['status'], 'cancelled')
        self.assertEqual(provider.reads, [])
        self.assertEqual(store.commits, [])

    def test_controller_respects_the_existing_dispatch_lease(self):
        row = job()
        store = Memory([row])
        store.page = lambda space, kind, *args, **kwargs: [row] if kind == 'mailJobs' and not kwargs.get('due') else []
        api = c.d.SimpleNamespace(ROOT=c.ROOT, pack=c.d.pack, unpack=c.d.unpack, date=c.d.date)
        c.d.operations.claim(api, store, 'staging', 'mail', ID, NOW)
        provider = Provider()
        c.sweep(store, provider, 'staging', NOW)
        self.assertEqual(provider.reads, [])
        self.assertEqual(c.values(store.optional(row['name']))['status'], 'accepted')

    def test_sent_date_survives_provider_regression_and_cannot_change(self):
        sent = campaign(status='sent', sentDate=(NOW - timedelta(hours=1)).isoformat())
        store, saved, provider = self.run_check(provider=Provider([sent]))
        for changes in [{'status': 'draft'}, {'status': 'sent', 'sentDate': NOW.isoformat()}]:
            provider.rows[0].update(changes)
            c.reconcile(store, provider, store.optional(BASE + '/mailJobs/' + ID), 'staging', NOW + timedelta(days=2))
            latest = c.values(store.optional(BASE + '/mailJobs/' + ID))
            self.assertEqual(latest['provider']['sentAt'], saved['provider']['sentAt'])
            self.assertEqual(latest['provider']['calendarAt'], saved['provider']['sentAt'])
            self.assertEqual(latest['provider']['state'], 'review')

    def test_saved_poll_deadline_prevents_extra_provider_reads(self):
        store, saved, provider = self.run_check()
        c.reconcile(store, provider, store.optional(BASE + '/mailJobs/' + ID), 'staging', NOW + timedelta(minutes=1))
        self.assertEqual(provider.reads, [101])

    def test_ambiguous_database_commit_recovers_by_reading_without_duplicate_history(self):
        row = job()
        store = Memory([row]);store.ambiguous = True;provider = Provider()
        with self.assertRaises(RuntimeError):
            c.reconcile(store, provider, row, 'staging', NOW)
        paths = set(store.rows)
        c.reconcile(store, provider, store.optional(row['name']), 'staging', NOW + timedelta(hours=1))
        self.assertEqual(set(store.rows), paths)

    def test_one_campaign_cannot_confirm_two_calendar_records(self):
        row = job()
        mapping = document('mailCampaigns', {'draftId': 'mail-' + 'b' * 32}, '101')
        store = Memory([row, mapping])
        c.reconcile(store, Provider(), row, 'staging', NOW)
        saved = c.values(store.optional(row['name']))
        self.assertEqual(saved['provider']['state'], 'review')
        self.assertEqual(saved['provider']['error'], 'campaign-already-linked')
        self.assertNotIn('calendarAt', saved['provider'])
        self.assertEqual(c.values(store.optional(mapping['name']))['draftId'], 'mail-' + 'b' * 32)

    def test_unique_manual_content_link_uses_body_cta_sender_and_subject(self):
        draft = document('mailDrafts', {'version': 1, 'revision': 3, **PAYLOAD})
        row = c.draft_job(draft, 'staging', NOW)
        provider = Provider([campaign(name='Manual existing fixture')])
        store = Memory([draft])
        c.reconcile(store, provider, row, 'staging', NOW, draft=draft)
        saved = c.values(store.optional(row['name']))
        self.assertEqual(saved['provider']['identity'], 'content-match')
        self.assertEqual(saved['status'], 'scheduled')
        self.assertEqual(c.values(store.optional(draft['name']))['revision'], 3)

    def test_subject_alone_or_multiple_manual_candidates_requires_owner_link(self):
        row = job();row['fields'].pop('campaignId')
        for campaigns in [[campaign(name='Manual', htmlContent='Different body')], [campaign(name='First'), campaign(id=102, name='Second')]]:
            _, saved, _ = self.run_check(row=row, provider=Provider(campaigns))
            self.assertEqual(saved['provider']['error'], 'manual-link-required')
            self.assertNotIn('campaignId', saved)

    def test_owner_link_preserves_original_request_and_uses_explicit_approved_date(self):
        row = job(scheduledAt='2026-11-20T14:00:00Z', status='review')
        draft = document('mailDrafts', {**PAYLOAD, 'revision': 8})
        link = {'draftId': ID, 'draftRevision': 8, 'campaignId': 101, 'approvedScheduledAt': DUE, 'revision': 1}
        _, saved, _ = self.run_check(row=row, provider=Provider([campaign(name='Manual campaign')]), draft=draft, link=link)
        self.assertEqual(saved['provider']['state'], 'scheduled')
        self.assertEqual(saved['scheduledAt'], '2026-11-20T14:00:00Z')
        self.assertEqual(c.instant(saved['approvedScheduledAt']), c.instant(DUE))
        self.assertEqual(saved['linkedDraftRevision'], 8)

    def test_failed_or_suspended_provider_state_stays_visible(self):
        for status in ['failed', 'suspended', 'archive']:
            _, saved, _ = self.run_check(provider=Provider([campaign(status=status)]))
            self.assertEqual(saved['provider']['state'], 'failed')
            self.assertNotEqual(saved['status'], 'sent')


class Transport(unittest.TestCase):
    def test_production_sweep_cannot_run_from_the_staging_branch(self):
        with patch('sys.argv',['controller','--space','production']),patch.dict(c.os.environ,{'GITHUB_REF':'refs/heads/staging','REPOSITORY_VISIBILITY':'public'}),patch.object(c,'Store',side_effect=AssertionError('No storage access before branch guard')):
            with self.assertRaises(c.Review):c.main()

    def test_approved_main_clock_needs_no_additional_variable_or_credential(self):
        store=Memory();provider=Provider()
        with patch('sys.argv',['controller','--space','production']),patch.dict(c.os.environ,{'GITHUB_REF':'refs/heads/main','REPOSITORY_VISIBILITY':'public'}),patch.object(c,'Store',return_value=store),patch.object(c,'Provider',return_value=provider),patch.object(c.d,'require_free_database'),patch.object(c,'sweep') as sweep:
            c.main()
            self.assertEqual(sweep.call_args.args[:3],(store,provider,'production'))

    def test_provider_reads_retry_transient_errors_only_and_honor_retry_after(self):
        provider = c.Provider()
        transient = c.d.ProviderError('fixture', True, 'provider-http-429', retry_after=3)
        with patch.object(c.d, 'brevo', side_effect=[transient, campaign()]) as get, patch.object(c.time, 'sleep') as sleep:
            self.assertEqual(provider.campaign(101)['id'], 101)
            self.assertEqual(get.call_args_list[0].args, ('emailCampaigns/101',))
            self.assertTrue(all(not call.kwargs for call in get.call_args_list))
            sleep.assert_called_once_with(3)
        with patch.object(c.d, 'brevo', side_effect=c.d.ProviderError('fixture', True, retry_after=60)) as get, patch.object(c.time, 'sleep') as sleep:
            with self.assertRaises(c.d.ProviderError): c.Provider().campaign(101)
            get.assert_called_once();sleep.assert_not_called()
        with self.assertRaises(c.Review): provider.get('emailCampaigns/101/sendNow')

    def test_firestore_read_retries_do_not_replay_commit_or_brevo_send(self):
        h = c.d.helpers
        error = h.RemoteError('Firestore', 503)
        with patch.object(h, '_request_once', side_effect=[error, {'ok': True}]) as call, patch.object(h.time, 'sleep'):
            self.assertEqual(h.request('Firestore', 'https://firestore.googleapis.com/v1/fixture:runQuery', {}, 'POST', {}), {'ok': True})
            self.assertEqual(call.call_count, 2)
        for service, url in [('Firestore', 'https://firestore.googleapis.com/v1/fixture:commit'), ('Brevo', 'https://api.brevo.com/v3/smtp/email')]:
            with patch.object(h, '_request_once', side_effect=error) as call, patch.object(h.time, 'sleep'):
                with self.assertRaises(h.RemoteError): h.request(service, url, {}, 'POST', {})
                self.assertEqual(call.call_count, 1)


class OwnerSelectedRepair(unittest.TestCase):
    def fixture(self):
        rows, campaigns, repairs = [], [], []
        for index in range(1, 4):
            identifier = 'mail-' + str(index) * 32
            target = job(status='review')
            target['name'] = target['name'].replace('/staging/', '/production/').replace(ID, identifier)
            target['fields']['draftId'] = c.d.pack(identifier)
            target['fields']['campaignId'] = c.d.pack(100 + index)
            target['fields']['scheduledAt'] = {'timestampValue': '2026-11-20T14:00:00Z'}
            draft = document('mailDrafts', {**PAYLOAD, 'revision': 8}, identifier)
            draft['name'] = draft['name'].replace('/staging/', '/production/')
            rows.extend([target, draft])
            item = {'draftId': identifier, 'campaignId': 100 + index, 'subjectHash': c.subject_hash(PAYLOAD['subject'])}
            sample = campaign(id=100 + index, name='Manual existing fixture')
            if index < 3:
                sample.update(status='sent', sentDate=(NOW - timedelta(hours=index)).isoformat())
            else:
                item['approvedScheduledAt'] = DUE
            campaigns.append(sample);repairs.append(item)
        return Memory(rows), Provider(campaigns), repairs

    def test_exact_three_existing_records_are_reconciled_with_no_provider_action(self):
        store, provider, repairs = self.fixture()
        c.repair_existing(store, provider, repairs, NOW)
        for index, item in enumerate(repairs):
            saved = c.values(store.optional(c.ROOT + '/cmsSpaces/production/mailJobs/' + item['draftId']))
            self.assertEqual(saved['provider']['state'], 'sent' if index < 2 else 'scheduled')
            self.assertEqual(saved['payload'], PAYLOAD)
            self.assertEqual(saved['scheduledAt'], '2026-11-20T14:00:00Z')
            self.assertEqual(saved['linkedDraftRevision'], 8)
        self.assertEqual(provider.reads, [101, 102, 103, 101, 102, 103])

    def test_all_selected_identities_are_checked_before_any_record_changes(self):
        store, provider, repairs = self.fixture()
        repairs[-1]['subjectHash'] = 'invalid-fixture-hash'
        with self.assertRaises(c.Review): c.repair_existing(store, provider, repairs, NOW)
        self.assertEqual(store.commits, [])


if __name__ == '__main__':
    unittest.main()
