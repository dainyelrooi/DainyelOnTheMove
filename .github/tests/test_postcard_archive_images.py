"""Owner-uploaded public Postcard covers; all transports and provider calls mocked."""
import base64
from datetime import datetime, timedelta, timezone
from email.message import Message
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

spec = importlib.util.spec_from_file_location('postcard_archive_images', Path(__file__).parents[1] / 'tools/postcard-archive.py')
archive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive)
JPEG = b'\xff\xd8\xff' + b'isolated-image-fixture' * 6 + b'\xff\xd9'
DIGEST = hashlib.sha256(base64.b64encode(JPEG)).hexdigest()
URL = 'https://dotm-inbox-production.dainyelr.workers.dev/postcard-images/' + DIGEST + '.jpg'


class Response(io.BytesIO):
    def __init__(self, raw=JPEG, url=URL, kind='image/jpeg'):
        super().__init__(raw)
        self.url = url
        self.headers = Message()
        self.headers['Content-Type'] = kind

    def geturl(self):
        return self.url


class PostcardArchiveImageTests(unittest.TestCase):
    def test_only_exact_production_uploads_are_accepted_and_branding_does_not_hide_the_photo(self):
        self.assertEqual(archive.canonical(URL, True), URL)
        for url in [URL + '?email=private', URL + '#fragment', URL.replace('https:', 'http:'),
                    URL.replace('-production.', '-staging.'), URL.replace('.workers.dev/', '.workers.dev.evil.invalid/'),
                    URL.replace('https://', 'https://user:pass@'), URL.replace('.jpg', '.png')]:
            self.assertIsNone(archive.canonical(url, True))
        parsed = archive.PublicCopy('<h1>Public fixture</h1><img src="https://dainyelonthemove.com/assets/optimized/brand-banner.webp"><p>A public paragraph.</p><img src="' + URL + '" alt="A chosen photograph">')
        self.assertEqual(parsed.image, {'src': URL, 'alt': 'A chosen photograph'})
        self.assertIn('A public paragraph.', parsed.blocks)

    def test_check_mode_never_downloads_or_writes_and_sync_keeps_a_verified_same_origin_copy(self):
        with tempfile.TemporaryDirectory() as folder, mock.patch.object(archive, 'ROOT', Path(folder)), mock.patch.object(archive, 'build_opener') as opener:
            expected = 'https://dainyelonthemove.com/assets/optimized/postcards/postcard-upload-' + DIGEST + '.jpg'
            photo = archive.public_photo({'src': URL, 'alt': ''})
            self.assertEqual(photo['src'], expected)
            opener.assert_not_called()
            self.assertEqual(list(Path(folder).rglob('*.jpg')), [])
            opener.return_value.open.return_value = Response()
            self.assertEqual(archive.public_photo({'src': URL, 'alt': 'Chosen'}, persist=True)['src'], expected)
            path = Path(folder) / expected.removeprefix('https://dainyelonthemove.com/')
            self.assertEqual(path.read_bytes(), JPEG)
            archive.public_photo({'src': URL, 'alt': 'Chosen'}, persist=True)
            self.assertEqual(opener.return_value.open.call_count, 1)

    def test_wrong_bytes_type_oversize_or_redirect_cannot_be_saved_as_a_public_cover(self):
        variants = [(JPEG + b'changed', URL, 'image/jpeg'), (JPEG, URL, 'text/html'),
                    (b'\xff\xd8\xff' + b'x' * (140 * 1024) + b'\xff\xd9', URL, 'image/jpeg'),
                    (JPEG, 'https://foreign.invalid/image.jpg', 'image/jpeg')]
        for raw, url, kind in variants:
            with self.subTest(kind=kind, redirected=url != URL), tempfile.TemporaryDirectory() as folder, mock.patch.object(archive, 'ROOT', Path(folder)), mock.patch.object(archive, 'build_opener') as opener:
                opener.return_value.open.return_value = Response(raw, url, kind)
                with self.assertRaises(ValueError):
                    archive.public_photo({'src': URL}, persist=True)
                self.assertEqual(list(Path(folder).rglob('*.jpg')), [])
        self.assertIsNone(archive.NoImageRedirect().redirect_request(None, None, 302, '', {}, 'https://foreign.invalid'))

    def test_sent_eligible_edition_imports_its_photo_without_a_provider_mutation(self):
        sent = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        campaign = {'id': 42, 'status': 'sent', 'type': 'classic', 'sender': {'email': archive.mail.SENDER},
                    'recipients': {'lists': [3]}, 'sentDate': sent, 'subject': 'An isolated public fixture',
                    'htmlContent': '<h1>An isolated public fixture</h1><p>Already approved public words for this isolated archive test.</p><img src="' + URL + '">'}
        calls = []

        def provider(path, method='GET', **kwargs):
            self.assertEqual(method, 'GET')
            calls.append(path)
            return {'campaigns': [campaign]} if path.startswith('emailCampaigns?') else campaign

        with tempfile.TemporaryDirectory() as folder, mock.patch.object(archive, 'ROOT', Path(folder)), mock.patch.object(archive.mail, 'brevo', provider), mock.patch.object(archive, 'build_opener') as opener, mock.patch('sys.argv', ['postcard-archive.py', '--mode', 'sync']), mock.patch('sys.stdout', new_callable=io.StringIO):
            opener.return_value.open.return_value = Response()
            archive.main()
            edition = json.loads((Path(folder) / 'data/postcards/editions/brevo-42.json').read_text())
            self.assertEqual(edition['photo']['src'], 'https://dainyelonthemove.com/assets/optimized/postcards/postcard-upload-' + DIGEST + '.jpg')
            self.assertNotIn('recipients', edition)
            self.assertEqual(len(calls), 2)
            self.assertTrue(all(path.startswith('emailCampaigns') for path in calls))
