"""Synthetic, offline-only public-export tests. No credentials or real records."""
import base64
import copy
from datetime import datetime, timedelta, timezone
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import struct
import tempfile
import unittest
from unittest import mock


SPEC = importlib.util.spec_from_file_location('public_content_snapshot_test_worker', Path(__file__).parents[1] / 'tools/public-content-snapshot.py')
worker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(worker)
ROOT = worker.ROOT
TIME = '2026-10-27T12:00:00.123456Z'
OLD_TIME = '2026-10-26T12:00:00Z'
NOW = datetime(2026, 10, 27, 12, 1, tzinfo=timezone.utc)
ENTRY = 'entry-' + 'a' * 32
PHOTO = 'photo-' + 'b' * 32
SECTION = 'about-' + 'c' * 16
# A 1 x 1 static VP8 WebP fixture, independent of production files or libraries.
WEBP = base64.b64decode('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA')
# Standard public Google/Skia sRGB profile, not a visitor photograph/metadata.
SRGB = base64.b64decode('AAAByAAAAAAEMAAAbW50clJHQiBYWVogB+AAAQABAAAAAAAAYWNzcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAPbWAAEAAAAA0y0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJZGVzYwAAAPAAAAAkclhZWgAAARQAAAAUZ1hZWgAAASgAAAAUYlhZWgAAATwAAAAUd3RwdAAAAVAAAAAUclRSQwAAAWQAAAAoZ1RSQwAAAWQAAAAoYlRSQwAAAWQAAAAoY3BydAAAAYwAAAA8bWx1YwAAAAAAAAABAAAADGVuVVMAAAAIAAAAHABzAFIARwBCWFlaIAAAAAAAAG+iAAA49QAAA5BYWVogAAAAAAAAYpkAALeFAAAY2lhZWiAAAAAAAAAkoAAAD4QAALbPWFlaIAAAAAAAAPbWAAEAAAAA0y1wYXJhAAAAAAAEAAAAAmZmAADypwAADVkAABPQAAAKWwAAAAAAAAAAbWx1YwAAAAAAAAABAAAADGVuVVMAAAAgAAAAHABHAG8AbwBnAGwAZQAgAEkAbgBjAC4AIAAyADAAMQA2')


def pack(value, name=''):
    if isinstance(value, str):
        return {'timestampValue' if name in worker.PUBLIC_DATES else 'stringValue': value}
    if type(value) is bool:
        return {'booleanValue': value}
    if type(value) is int:
        return {'integerValue': str(value)}
    if isinstance(value, list):
        return {'arrayValue': {'values': [pack(item) for item in value]}}
    if isinstance(value, dict):
        return {'mapValue': {'fields': {key: pack(item, key) for key, item in value.items()}}}
    raise AssertionError('Unexpected test fixture type')


def document(path, data):
    return {'name': path, 'fields': {key: pack(value, key) for key, value in data.items()}}


def question(**overrides):
    return dict(status='published', publicationConsent=True, topic='culture', question='A synthetic public question?',
                answer='A synthetic public answer.', createdAt=OLD_TIME, answeredAt=TIME, **overrides)


def cms_entry():
    return dict(version=1, kind='field-note', title='Synthetic published note', excerpt='A synthetic public excerpt.',
                body='A synthetic public body for this isolated test.', place='Test place', sources='', videoUrl='',
                photoIds=[PHOTO], publishedAt=TIME, updatedAt=TIME)


def media(owner='entryId', identifier=ENTRY):
    return dict(version=1, **{owner: identifier}, dataUrl='data:image/webp;base64,' + base64.b64encode(WEBP).decode(),
                alt='Synthetic image', width=1, height=1)


class FakeStore:
    """Only implements the read APIs; projections are deliberately not trusted."""
    def __init__(self, *, include_media=True):
        self.documents = {
            ROOT + '/questions/q-approved': question(),
            ROOT + '/communityThreads/thread-approved': dict(status='published', publicationConsent=True, topic='general',
                question='A synthetic community question?', displayName='Test visitor', createdAt=OLD_TIME),
            ROOT + '/communityThreads/thread-approved/replies/reply-approved': dict(status='published', publicationConsent=True,
                displayName='Another visitor', message='A synthetic public reply.', createdAt=TIME),
            ROOT + '/cmsSpaces/staging/published/' + ENTRY: cms_entry(),
            ROOT + '/websiteSpaces/staging/published/' + SECTION: dict(version=1, pageId='about', values={'f00': 'Public test heading'}, photoIds=[PHOTO]),
        }
        if include_media:
            self.documents[ROOT + '/cmsSpaces/staging/media/' + PHOTO] = media()
            self.documents[ROOT + '/websiteSpaces/staging/media/' + PHOTO] = media('sectionId', SECTION)
        self.calls, self.ignore_filter, self.transform = [], False, None

    def call(self, path, method='GET', body=None):
        self.calls.append((path, method, copy.deepcopy(body)))
        if method == 'GET' and path == worker.DATABASE:
            return {'databaseEdition': 'ENTERPRISE', 'freeTier': True}
        if method != 'POST':
            raise AssertionError('Snapshot attempted a non-read operation')
        if path == ROOT + ':batchGet':
            target = body['documents'][0]
            rows = [{'found': document(target, self.documents[target]), 'readTime': TIME}] if target in self.documents else [{'missing': target, 'readTime': TIME}]
        elif path.endswith(':runQuery'):
            query = body['structuredQuery']
            if query.get('select') == {'fields': [{'fieldPath': '__name__'}]}:
                rows = [{'readTime': TIME}]
            else:
                parent = path[:-len(':runQuery')]
                prefix = parent + '/' + query['from'][0]['collectionId'] + '/'
                candidates = [(name, data) for name, data in sorted(self.documents.items()) if name.startswith(prefix) and '/' not in name[len(prefix):]]
                if 'where' in query and not self.ignore_filter:
                    candidates = [(name, data) for name, data in candidates if data.get('status') == 'published']
                if 'startAt' in query:
                    cursor = query['startAt']['values'][0]['referenceValue']
                    candidates = [(name, data) for name, data in candidates if name > cursor]
                rows = [{'document': document(name, data), 'readTime': TIME} for name, data in candidates[:query['limit']]] or [{'readTime': TIME}]
        else:
            raise AssertionError('Snapshot attempted an unexpected path')
        return self.transform(path, body, rows) if self.transform else rows


class PublicSnapshotTests(unittest.TestCase):
    def setUp(self):
        # Every test forbids authentication/network entry points. FakeStore is
        # injected explicitly; even a regression cannot contact production.
        self.auth = mock.patch.object(worker.helpers.Firestore, '__init__', side_effect=AssertionError('Real authentication forbidden'))
        self.network = mock.patch.object(worker.helpers, 'request', side_effect=AssertionError('Network forbidden'))
        self.http = mock.patch.object(worker.urllib.request, 'build_opener', side_effect=AssertionError('HTTP forbidden'))
        self.auth.start(); self.network.start(); self.http.start()
        self.addCleanup(self.auth.stop); self.addCleanup(self.network.stop); self.addCleanup(self.http.stop)

    def bundle(self, store=None, generation='a' * 32):
        return worker.build_snapshot(store or FakeStore(), 'staging', generation=generation)

    def test_complete_public_contract_and_actual_webp_files(self):
        bundle = self.bundle()
        data = bundle['documents']
        self.assertEqual(set(data), {'manifest.json', 'qa.json', 'cms.json', 'website.json'})
        for value in data.values():
            self.assertEqual({key: value[key] for key in worker.ENVELOPE}, dict(version=1, complete=True, space='staging', generation='a' * 32, generatedAt=TIME))
        self.assertEqual(data['manifest.json']['domains'], worker.DOMAINS)
        entry = data['cms.json']['entries'][0]
        self.assertEqual(set(entry), worker.CMS_FIELDS | {'id', 'publishedAt', 'updatedAt', 'photos'})
        self.assertEqual(entry['heroPhotoId'], PHOTO)
        self.assertEqual(entry['photoPlacements'], [0])
        self.assertEqual(data['cms.json']['summaries'][0]['coverPhoto'], entry['photos'][0])
        self.assertEqual(data['website.json']['sections'][0]['media'][0]['sectionId'], SECTION)
        digest = hashlib.sha256(WEBP).hexdigest()
        self.assertEqual(bundle['images'], {digest: WEBP})
        self.assertEqual(entry['photos'][0]['src'], '/assets/public-content/' + digest + '.webp')
        with tempfile.TemporaryDirectory() as root:
            worker.install_snapshot(bundle, root)
            self.assertEqual((Path(root) / entry['photos'][0]['src'].lstrip('/')).read_bytes(), WEBP)
            self.assertEqual(worker.check_local_snapshot(root, 'staging', now=NOW)['status'], 'PASS')

    def test_private_fields_are_never_copied_or_even_decoded(self):
        store = FakeStore()
        for data in store.documents.values():
            data.update(email='private@example.invalid', contact='private contact', internalNote='private note', reminderEnabled=True)
        original = store.call
        def with_unsupported_private_value(path, method='GET', body=None):
            rows = original(path, method, body)
            for row in rows:
                if 'document' in row: row['document']['fields']['privateBlob'] = {'bytesValue': 'untrusted private bytes'}
                if 'found' in row: row['found']['fields']['privateBlob'] = {'bytesValue': 'untrusted private bytes'}
            return rows
        store.call = with_unsupported_private_value
        serialized = b''.join(self.bundle(store)['encoded'].values()).decode()
        for forbidden in ['private@example.invalid', 'private contact', 'private note', 'internalNote', 'privateBlob', 'reminderEnabled', 'dataUrl', 'entryId']:
            self.assertNotIn(forbidden, serialized)

    def test_unpublished_refused_or_orphan_content_never_exports(self):
        store = FakeStore(); store.ignore_filter = True
        for identifier, state, consent in [('q-pending', 'pending', True), ('q-rejected', 'rejected', True), ('q-refused', 'published', False)]:
            store.documents[ROOT + '/questions/' + identifier] = {**question(), 'status': state, 'publicationConsent': consent}
        for identifier, state, consent in [('thread-pending', 'pending', True), ('thread-refused', 'published', False)]:
            store.documents[ROOT + '/communityThreads/' + identifier] = dict(status=state, publicationConsent=consent)
            store.documents[ROOT + '/communityThreads/' + identifier + '/replies/orphan'] = dict(status='published', publicationConsent=True, message='Must never be queried')
        store.documents[ROOT + '/communityThreads/thread-approved/replies/pending'] = dict(status='pending', publicationConsent=True)
        store.documents[ROOT + '/communityThreads/thread-approved/replies/refused'] = dict(status='published', publicationConsent=False)
        store.documents[ROOT + '/cmsSpaces/staging/drafts/' + ENTRY] = {**cms_entry(), 'title': 'PRIVATE DRAFT'}
        store.documents[ROOT + '/cmsSpaces/staging/publicationPlans/plan-private'] = dict(status='queued', title='PRIVATE QUEUED NOTE')
        store.documents[ROOT + '/cmsSpaces/staging/published/' + 'entry-' + 'd' * 32] = {**cms_entry(), 'status': 'queued', 'title': 'NOT PUBLISHED'}
        store.documents[ROOT + '/cmsSpaces/staging/media/' + 'photo-' + 'e' * 32] = {**media(), 'alt': 'ORPHAN IMAGE'}
        bundle = self.bundle(store)
        qa = bundle['documents']['qa.json']
        self.assertEqual([q['id'] for q in qa['questions']], ['q-approved'])
        self.assertEqual([t['id'] for t in qa['threads']], ['thread-approved'])
        self.assertEqual([r['id'] for r in qa['threads'][0]['replies']], ['reply-approved'])
        serialized = b''.join(bundle['encoded'].values()).decode()
        for phrase in ['PRIVATE DRAFT', 'PRIVATE QUEUED NOTE', 'NOT PUBLISHED', 'ORPHAN IMAGE']:
            self.assertNotIn(phrase, serialized)
        for path, _, body in store.calls:
            self.assertNotIn('/drafts', path); self.assertNotIn('/publicationPlans', path)
            self.assertNotIn('thread-pending:', path); self.assertNotIn('thread-refused:', path)
            if path.endswith(':batchGet'):
                self.assertNotIn('photo-' + 'e' * 32, body['documents'][0])

    def test_every_content_and_media_read_uses_one_read_time(self):
        store = FakeStore(); self.bundle(store)
        self.assertNotIn('readTime', store.calls[0][2])
        for path, method, body in store.calls[1:]:
            self.assertEqual(method, 'POST'); self.assertEqual(body['readTime'], TIME)
            if path.endswith(':runQuery'):
                self.assertIn('select', body['structuredQuery'])
            else:
                self.assertEqual(path, ROOT + ':batchGet'); self.assertIn('mask', body)

    def test_only_published_questions_threads_and_replies_are_queried(self):
        store = FakeStore(); self.bundle(store)
        for _, _, body in store.calls:
            query = body.get('structuredQuery', {})
            if query.get('from', [{}])[0].get('collectionId') in {'questions', 'communityThreads', 'replies'}:
                self.assertEqual(query['where']['fieldFilter']['value'], {'stringValue': 'published'})

    def test_inconsistent_read_time_aborts(self):
        for kind in ['query', 'media']:
            with self.subTest(kind=kind):
                store = FakeStore()
                def transform(path, body, rows):
                    is_media = path.endswith(':batchGet')
                    is_content = 'readTime' in body and not is_media
                    if is_media and kind == 'media' or is_content and kind == 'query':
                        rows[0]['readTime'] = '2026-10-27T12:00:01Z'
                    return rows
                store.transform = transform
                with self.assertRaises(worker.SnapshotError): self.bundle(store)

    def test_missing_partial_or_error_responses_abort_instead_of_empty_feed(self):
        for rows in [[], None, {'error': 'synthetic'}, [{'readTime': TIME, 'skippedResults': 1}], [{'readTime': TIME, 'error': {'code': 429}}]]:
            with self.subTest(response=rows):
                store = FakeStore()
                store.transform = lambda path, body, original, rows=rows: rows if 'readTime' in body else original
                with self.assertRaises(worker.SnapshotError): self.bundle(store)

    def test_no_server_read_time_aborts(self):
        store = FakeStore(); store.transform = lambda *_: []
        with self.assertRaises(worker.SnapshotError): self.bundle(store)

    def test_pagination_completes_with_monotonic_document_cursor(self):
        store = FakeStore(); store.documents = {ROOT + '/questions/q' + str(n): question() for n in range(5)}
        reader = worker.Reader(store); reader.pin()
        with mock.patch.object(worker, 'PAGE_SIZE', 2):
            found = reader.query(ROOT, 'questions', {'status'}, published=True)
        self.assertEqual(len(found), 5)
        calls = store.calls[1:]
        self.assertEqual(len(calls), 3)
        self.assertNotIn('startAt', calls[0][2]['structuredQuery'])
        self.assertEqual(calls[1][2]['structuredQuery']['startAt'], {'values': [{'referenceValue': ROOT + '/questions/q1'}], 'before': False})
        self.assertTrue(all(call[2]['readTime'] == TIME for call in calls))

    def test_exact_page_boundary_checks_the_next_page(self):
        store = FakeStore(); store.documents = {ROOT + '/questions/q' + str(n): question() for n in range(4)}
        reader = worker.Reader(store); reader.pin()
        with mock.patch.object(worker, 'PAGE_SIZE', 2):
            self.assertEqual(len(reader.query(ROOT, 'questions', {'status'}, published=True)), 4)
        self.assertEqual(len(store.calls), 4)  # Probe + two full pages + completion.

    def test_pagination_bounds_fail_closed_without_truncating(self):
        for limit_name, limit in [('MAX_PAGES', 2), ('MAX_ROWS', 3), ('MAX_CALLS', 2)]:
            with self.subTest(bound=limit_name):
                store = FakeStore(); store.documents = {ROOT + '/questions/q' + str(n): question() for n in range(5)}
                reader = worker.Reader(store); reader.pin()
                with mock.patch.object(worker, 'PAGE_SIZE', 2), mock.patch.object(worker, limit_name, limit):
                    with self.assertRaises(worker.SnapshotError): reader.query(ROOT, 'questions', {'status'}, published=True)

    def test_pagination_duplicate_or_wrong_parent_aborts(self):
        for wrong_path in [ROOT + '/questions/q0', ROOT + '/private/secret']:
            with self.subTest(path=wrong_path):
                store = FakeStore(); store.documents = {ROOT + '/questions/q' + str(n): question() for n in range(3)}
                def transform(path, body, rows):
                    if 'startAt' in body.get('structuredQuery', {}): rows[0]['document']['name'] = wrong_path
                    return rows
                store.transform = transform; reader = worker.Reader(store); reader.pin()
                with mock.patch.object(worker, 'PAGE_SIZE', 2):
                    with self.assertRaises(worker.SnapshotError): reader.query(ROOT, 'questions', {'status'}, published=True)

    def test_linked_media_must_exist_and_belong_to_the_published_owner(self):
        for namespace, owner_key in [('cmsSpaces', 'entryId'), ('websiteSpaces', 'sectionId')]:
            for action in ['missing', 'wrong-owner', 'wrong-id']:
                with self.subTest(namespace=namespace, action=action):
                    store = FakeStore(); path = ROOT + '/' + namespace + '/staging/media/' + PHOTO
                    if action == 'missing': del store.documents[path]
                    elif action == 'wrong-owner': store.documents[path][owner_key] = 'private-unrelated-owner'
                    else:
                        def transform(request_path, body, rows, path=path):
                            if request_path.endswith(':batchGet') and body['documents'] == [path]: rows[0]['found']['name'] += '-other'
                            return rows
                        store.transform = transform
                    with self.assertRaises(worker.SnapshotError): self.bundle(store)

    def test_future_published_content_is_not_exported_early(self):
        store = FakeStore(); store.documents[ROOT + '/cmsSpaces/staging/published/' + ENTRY]['publishedAt'] = '2026-11-05T10:00:00Z'
        with self.assertRaises(worker.SnapshotError): self.bundle(store)

    def test_website_section_id_must_match_exact_page(self):
        store = FakeStore()
        data = store.documents.pop(ROOT + '/websiteSpaces/staging/published/' + SECTION)
        store.documents[ROOT + '/websiteSpaces/staging/published/about-extra-' + 'c' * 16] = data
        with self.assertRaises(worker.SnapshotError): self.bundle(store)

    def test_invalid_image_encoding_dimensions_or_metadata_aborts(self):
        def chunk(kind, payload):
            return kind + struct.pack('<I', len(payload)) + payload + (b'\0' if len(payload) % 2 else b'')
        annotated = WEBP[:4] + struct.pack('<I', len(WEBP) - 8 + 10) + WEBP[8:] + chunk(b'EXIF', b'xx')
        cases = [dict(dataUrl='data:image/jpeg;base64,' + base64.b64encode(WEBP).decode()), dict(dataUrl='data:image/webp;base64,%%%'),
                 dict(dataUrl='data:image/webp;base64,' + base64.b64encode(WEBP + b'x').decode()),
                 dict(dataUrl='data:image/webp;base64,' + base64.b64encode(annotated).decode()), dict(width=2), dict(height=1601), dict(width=True)]
        for changes in cases:
            with self.subTest(changes=changes):
                store = FakeStore(); store.documents[ROOT + '/cmsSpaces/staging/media/' + PHOTO].update(changes)
                with self.assertRaises(worker.SnapshotError): self.bundle(store)

    def test_canvas_standard_srgb_is_preserved_without_allowing_arbitrary_metadata(self):
        def chunk(kind, payload):
            return kind + struct.pack('<I', len(payload)) + payload + (b'\0' if len(payload) % 2 else b'')
        def image(profile=SRGB, flags=0x20, extra=b''):
            body=b'WEBP'+chunk(b'VP8X', bytes([flags])+b'\0'*9)+chunk(b'ICCP',profile)+WEBP[12:]+extra
            return b'RIFF'+struct.pack('<I',len(body))+body
        raw=image();self.assertEqual(worker.webp_dimensions(raw),(1,1))
        store=FakeStore();store.documents[ROOT+'/cmsSpaces/staging/media/'+PHOTO]['dataUrl']='data:image/webp;base64,'+base64.b64encode(raw).decode()
        bundle=self.bundle(store);self.assertIn(raw,bundle['images'].values())
        for raw in [image(profile=b'unknown-profile'),image(profile=SRGB+b'private'),image(flags=0),image(extra=chunk(b'ICCP',SRGB)),image(extra=chunk(b'EXIF',b'private')),image(extra=chunk(b'XMP ',b'private'))]:
            with self.assertRaises(worker.SnapshotError):worker.webp_dimensions(raw)

    def test_json_and_combined_image_bounds_abort(self):
        for name, size in [('MAX_JSON_BYTES', 128), ('MAX_TOTAL_IMAGE_BYTES', len(WEBP) - 1)]:
            with self.subTest(bound=name), mock.patch.object(worker, name, size):
                with self.assertRaises(worker.SnapshotError): self.bundle()

    def test_aggregate_rest_response_bound_aborts_before_more_queries(self):
        store = FakeStore()
        with mock.patch.object(worker, 'MAX_REST_BYTES', 300):
            with self.assertRaises(worker.SnapshotError): self.bundle(store)
        self.assertEqual(len(store.calls), 2)  # Time probe + first bounded page.

    def test_bounded_http_limits_bytes_before_parsing_and_never_follows_redirects(self):
        response = mock.MagicMock(); response.headers = {}; response.read.return_value = b'{}'
        response.__enter__.return_value = response
        opener = mock.Mock(); opener.open.return_value = response
        with mock.patch.object(worker.urllib.request, 'build_opener', return_value=opener) as factory:
            self.assertEqual(worker.bounded_request('https://example.invalid/test', {}, maximum=100), b'{}')
        response.read.assert_called_once_with(101)
        self.assertIsInstance(factory.call_args.args[0], worker.helpers.NoRedirect)
        for header, raw in [('101', b'{}'), (None, b'x' * 101)]:
            response.read.reset_mock(); response.headers = {} if header is None else {'Content-Length': header}; response.read.return_value = raw
            with self.subTest(header=header), mock.patch.object(worker.urllib.request, 'build_opener', return_value=opener):
                with self.assertRaises(worker.SnapshotError): worker.bounded_request('https://example.invalid/test', {}, maximum=100)
                if header: response.read.assert_not_called()

    def test_public_404_is_optional_only_for_manifest_and_redirect_is_refused(self):
        for status, missing_ok, allowed in [(404, True, True), (404, False, False), (302, True, False)]:
            error = worker.urllib.error.HTTPError('https://example.invalid/test', status, 'synthetic', {}, None)
            opener = mock.Mock(); opener.open.side_effect = error
            with self.subTest(status=status, missing_ok=missing_ok), mock.patch.object(worker.urllib.request, 'build_opener', return_value=opener):
                if allowed: self.assertIsNone(worker.bounded_request('https://example.invalid/test', {}, maximum=100, missing_ok=missing_ok))
                else:
                    with self.assertRaises(worker.SnapshotError): worker.bounded_request('https://example.invalid/test', {}, maximum=100, missing_ok=missing_ok)

    def test_offline_initial_check_does_not_authenticate_or_invent_empty_data(self):
        with tempfile.TemporaryDirectory() as root, mock.patch.object(worker, 'Store', side_effect=AssertionError('Store forbidden')), mock.patch('sys.stdout', new_callable=io.StringIO) as output:
            result = worker.main(['--mode', 'check', '--output-root', root])
            self.assertEqual(result, {'status': 'NOT_AVAILABLE', 'space': 'staging'})
            self.assertIn('NOT_AVAILABLE', output.getvalue())
            self.assertEqual(list(Path(root).iterdir()), [])

    def test_offline_partial_missing_mixed_stale_and_wrong_space_checks(self):
        with tempfile.TemporaryDirectory() as root:
            folder = Path(root) / 'data/public-content'; folder.mkdir(parents=True)
            (folder / 'qa.json').write_text('{}')
            with self.assertRaises(worker.SnapshotError): worker.check_local_snapshot(root, 'staging', now=NOW)
            worker.install_snapshot(self.bundle(), root)
            self.assertEqual(worker.check_local_snapshot(root, 'staging', now=NOW + timedelta(hours=25))['status'], 'NOT_AVAILABLE')
            with self.assertRaises(worker.SnapshotError): worker.check_local_snapshot(root, 'production', now=NOW)
            value = json.loads((folder / 'qa.json').read_text()); value['generation'] = 'b' * 32
            (folder / 'qa.json').write_text(json.dumps(value))
            with self.assertRaises(worker.SnapshotError): worker.check_local_snapshot(root, 'staging', now=NOW)

    def test_offline_check_rejects_private_fields_or_missing_public_summary(self):
        for edit in ['private-question', 'private-reply', 'missing-summary', 'wrong-owner', 'altered-image']:
            with self.subTest(edit=edit), tempfile.TemporaryDirectory() as root:
                bundle = self.bundle(); worker.install_snapshot(bundle, root)
                name = 'qa.json' if edit.startswith('private') else 'cms.json' if edit == 'missing-summary' else 'website.json'
                path = Path(root) / 'data/public-content' / name; value = json.loads(path.read_text())
                if edit == 'private-question': value['questions'][0]['email'] = 'private@example.invalid'
                elif edit == 'private-reply': value['threads'][0]['replies'][0]['contact'] = 'private contact'
                elif edit == 'missing-summary': value['summaries'] = []
                elif edit == 'wrong-owner': value['sections'][0]['media'][0]['sectionId'] = 'unrelated-section'
                else:
                    image = value['sections'][0]['media'][0]
                    (Path(root) / image['src'].lstrip('/')).write_bytes(WEBP[:-1] + b'x')
                path.write_text(json.dumps(value))
                with self.assertRaises(worker.SnapshotError): worker.check_local_snapshot(root, 'staging', now=NOW)

    def test_manifest_is_replaced_last_and_old_images_are_not_purged(self):
        with tempfile.TemporaryDirectory() as root:
            old_image = Path(root) / 'assets/public-content' / ('f' * 64 + '.webp'); old_image.parent.mkdir(parents=True); old_image.write_bytes(b'old immutable asset')
            actual_replace = os.replace; destinations = []
            def record(source, destination):
                destinations.append(Path(destination).name); return actual_replace(source, destination)
            with mock.patch.object(worker.os, 'replace', side_effect=record): worker.install_snapshot(self.bundle(), root)
            self.assertEqual(destinations[-1], 'manifest.json')
            self.assertEqual(old_image.read_bytes(), b'old immutable asset')
            self.assertFalse(list(Path(root).glob('.public-snapshot-*')))

    def test_write_failure_restores_previous_complete_snapshot(self):
        with tempfile.TemporaryDirectory() as root:
            old = self.bundle(); worker.install_snapshot(old, root)
            paths = [Path(root) / 'data/public-content' / name for name in old['encoded']]
            previous = {path: path.read_bytes() for path in paths}
            new = self.bundle(generation='b' * 32)
            actual_replace = os.replace; failed = False
            def failing_replace(source, destination):
                nonlocal failed
                if not failed and Path(destination).name == 'website.json':
                    failed = True; raise OSError('Synthetic disk failure')
                return actual_replace(source, destination)
            with mock.patch.object(worker.os, 'replace', side_effect=failing_replace):
                with self.assertRaises(OSError): worker.install_snapshot(new, root)
            self.assertTrue(failed)
            self.assertEqual({path: path.read_bytes() for path in paths}, previous)
            self.assertEqual(worker.check_local_snapshot(root, 'staging', now=NOW)['generation'], 'a' * 32)
            self.assertFalse(list(Path(root).glob('.public-snapshot-*')))

    def test_failed_initial_install_leaves_no_partial_public_json_or_new_image(self):
        with tempfile.TemporaryDirectory() as root:
            actual_replace = os.replace; failed = False
            def failing_replace(source, destination):
                nonlocal failed
                if not failed and Path(destination).name == 'cms.json':
                    failed = True; raise OSError('Synthetic disk failure')
                return actual_replace(source, destination)
            with mock.patch.object(worker.os, 'replace', side_effect=failing_replace):
                with self.assertRaises(OSError): worker.install_snapshot(self.bundle(), root)
            self.assertEqual(worker.check_local_snapshot(root, 'staging', now=NOW)['status'], 'NOT_AVAILABLE')
            self.assertFalse(list(Path(root).rglob('*.webp')))

    def test_existing_asset_hash_collision_keeps_previous_copy(self):
        with tempfile.TemporaryDirectory() as root:
            bundle = self.bundle(); worker.install_snapshot(bundle, root)
            asset = Path(root) / 'assets/public-content' / (hashlib.sha256(WEBP).hexdigest() + '.webp')
            asset.write_bytes(b'synthetic conflicting asset')
            manifest = Path(root) / 'data/public-content/manifest.json'; before = manifest.read_bytes()
            with self.assertRaises(worker.SnapshotError): worker.install_snapshot(self.bundle(generation='b' * 32), root)
            self.assertEqual(manifest.read_bytes(), before)

    def test_invalid_source_cannot_replace_old_complete_files(self):
        with tempfile.TemporaryDirectory() as root:
            old = self.bundle(); worker.install_snapshot(old, root)
            before = {name: (Path(root) / 'data/public-content' / name).read_bytes() for name in old['encoded']}
            store = FakeStore(include_media=False)
            with self.assertRaises(worker.SnapshotError):
                bundle = self.bundle(store); worker.install_snapshot(bundle, root)
            self.assertEqual({name: (Path(root) / 'data/public-content' / name).read_bytes() for name in old['encoded']}, before)

    def test_sync_guards_refuse_wrong_branch_private_repo_or_disabled_production(self):
        cases = [('staging', {'GITHUB_REF': 'refs/heads/main', 'REPOSITORY_VISIBILITY': 'public'}),
                 ('staging', {'GITHUB_REF': 'refs/heads/staging', 'REPOSITORY_VISIBILITY': 'private'}),
                 ('production', {'GITHUB_REF': 'refs/heads/main', 'REPOSITORY_VISIBILITY': 'public'})]
        for space, environment in cases:
            with self.subTest(space=space, environment=environment), mock.patch.dict(os.environ, environment, clear=True), mock.patch.object(worker, 'Store', side_effect=AssertionError('Must refuse before auth')):
                with self.assertRaises(worker.SnapshotError): worker.main(['--mode', 'sync', '--space', space])
        with mock.patch.dict(os.environ, dict(GITHUB_REF='refs/heads/staging', REPOSITORY_VISIBILITY='public'), clear=True): worker.sync_guard('staging')
        with mock.patch.dict(os.environ, dict(GITHUB_REF='refs/heads/main', REPOSITORY_VISIBILITY='public', PUBLIC_CONTENT_SNAPSHOT_ENABLED='true'), clear=True): worker.sync_guard('production')

    def test_non_free_or_wrong_edition_database_refused_before_queries(self):
        for metadata in [dict(databaseEdition='STANDARD', freeTier=True), dict(databaseEdition='ENTERPRISE', freeTier=False), dict(databaseEdition='ENTERPRISE')]:
            fake = mock.Mock(); fake.call.return_value = metadata
            with self.subTest(metadata=metadata), mock.patch.dict(os.environ, dict(GITHUB_REF='refs/heads/staging', REPOSITORY_VISIBILITY='public'), clear=True), mock.patch.object(worker, 'Store', return_value=fake), mock.patch.object(worker, 'build_snapshot', side_effect=AssertionError('Queries forbidden')):
                with self.assertRaises(worker.SnapshotError): worker.main(['--mode', 'sync'])
                fake.call.assert_called_once_with(worker.DATABASE)

    def test_store_rejects_all_database_mutations_and_unrelated_operations(self):
        store = object.__new__(worker.Store)
        for path, method in [(ROOT + ':commit', 'POST'), (ROOT + '/questions/a', 'PATCH'), (ROOT + '/questions/a', 'DELETE'), (ROOT + '/questions/a', 'GET'), ('https://example.invalid/send', 'POST')]:
            with self.subTest(path=path, method=method):
                with self.assertRaises(worker.SnapshotError): store.call(path, method, {})

    def remote(self, bundle, *, override=None):
        mapping = {'/data/public-content/' + name: raw for name, raw in bundle['encoded'].items()}
        mapping.update({'/assets/public-content/' + digest + '.webp': raw for digest, raw in bundle['images'].items()})
        mapping.update(override or {})
        calls = []
        def fetch(url, headers, *, maximum, missing_ok=False):
            self.assertEqual(headers, {})
            prefix = worker.CDN_HOSTS['staging']; self.assertTrue(url.startswith(prefix + '/'))
            path = url[len(prefix):]; calls.append((path, maximum, missing_ok))
            if path not in mapping or mapping[path] is None:
                if missing_ok: return None
                raise worker.SnapshotError('Synthetic public CDN file missing')
            raw = mapping[path]
            return raw
        return fetch, calls

    def test_retain_validates_complete_public_cdn_generation_without_auth_or_database(self):
        bundle = self.bundle(); fetch, calls = self.remote(bundle)
        with tempfile.TemporaryDirectory() as root, mock.patch.object(worker, 'Store', side_effect=AssertionError('Store forbidden')):
            result = worker.retain_snapshot(root, 'staging', now=NOW, fetch=fetch)
            self.assertEqual(result['status'], 'PASS')
            self.assertEqual(worker.check_local_snapshot(root, 'staging', now=NOW)['status'], 'PASS')
            self.assertEqual(len(calls), 5)  # Manifest, three domains, one deduplicated image.
            self.assertEqual(calls[0], ('/data/public-content/manifest.json', 16384, True))
            self.assertTrue(all(not call[2] for call in calls[1:]))
            for name, raw in bundle['encoded'].items(): self.assertEqual((Path(root) / 'data/public-content' / name).read_bytes(), raw)

    def test_retain_missing_or_expired_manifest_is_honestly_unavailable_without_files(self):
        bundle = self.bundle()
        for missing, age in [(True, timedelta()), (False, timedelta(hours=25))]:
            fetch, calls = self.remote(bundle, override={'/data/public-content/manifest.json': None} if missing else None)
            with self.subTest(missing=missing), tempfile.TemporaryDirectory() as root:
                self.assertEqual(worker.retain_snapshot(root, 'staging', now=NOW + age, fetch=fetch)['status'], 'NOT_AVAILABLE')
                self.assertEqual(list(Path(root).iterdir()), [])
                self.assertEqual(len(calls), 1)

    def test_retain_invalid_or_incomplete_cdn_generation_keeps_old_local_copy(self):
        for edit in ['missing-domain', 'mixed', 'private', 'missing-image', 'bad-hash', 'bad-space']:
            with self.subTest(edit=edit), tempfile.TemporaryDirectory() as root:
                old = self.bundle(); worker.install_snapshot(old, root)
                new = self.bundle(generation='b' * 32); override = {}
                if edit == 'missing-domain': override['/data/public-content/cms.json'] = None
                elif edit in {'mixed', 'private'}:
                    value = copy.deepcopy(new['documents']['qa.json'])
                    if edit == 'mixed': value['generation'] = 'c' * 32
                    else: value['questions'][0]['email'] = 'private@example.invalid'
                    override['/data/public-content/qa.json'] = json.dumps(value).encode()
                elif edit == 'bad-space':
                    value = copy.deepcopy(new['documents']['manifest.json']); value['space'] = 'production'
                    override['/data/public-content/manifest.json'] = json.dumps(value).encode()
                else: override['/assets/public-content/' + hashlib.sha256(WEBP).hexdigest() + '.webp'] = None if edit == 'missing-image' else WEBP + b'corrupt'
                fetch, _ = self.remote(new, override=override)
                with self.assertRaises(worker.SnapshotError): worker.retain_snapshot(root, 'staging', now=NOW, fetch=fetch)
                self.assertEqual(worker.check_local_snapshot(root, 'staging', now=NOW)['generation'], 'a' * 32)
                self.assertEqual((Path(root) / 'data/public-content/manifest.json').read_bytes(), old['encoded']['manifest.json'])

    def test_retain_has_aggregate_byte_and_request_bounds(self):
        for name, maximum in [('MAX_CDN_BYTES', 16500), ('MAX_CALLS', 3)]:
            fetch, _ = self.remote(self.bundle())
            with self.subTest(bound=name), tempfile.TemporaryDirectory() as root, mock.patch.object(worker, name, maximum):
                # The byte bound must be below the synthetic complete copy.
                if name == 'MAX_CDN_BYTES': worker.MAX_CDN_BYTES = 500
                with self.assertRaises(worker.SnapshotError): worker.retain_snapshot(root, 'staging', now=NOW, fetch=fetch)
                self.assertEqual(list(Path(root).iterdir()), [])

    def test_retain_rejects_external_image_urls_without_fetching_them(self):
        bundle = self.bundle(); value = copy.deepcopy(bundle['documents']['cms.json'])
        value['entries'][0]['photos'][0]['src'] = 'https://private.example.invalid/secret'
        fetch, calls = self.remote(bundle, override={'/data/public-content/cms.json': json.dumps(value).encode()})
        with tempfile.TemporaryDirectory() as root:
            with self.assertRaises(worker.SnapshotError): worker.retain_snapshot(root, 'staging', now=NOW, fetch=fetch)
            self.assertEqual(len(calls), 4)
            self.assertEqual(list(Path(root).iterdir()), [])


if __name__ == '__main__':
    unittest.main()
