"""Public content, delayed-mail archive and current-place publishing contracts."""
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from tempfile import TemporaryDirectory
import importlib.util
import json
import re
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('postcard_pages', ROOT / 'tools/postcard_pages.py')
pages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pages)


class PublicContentTests(unittest.TestCase):
    def fixture(self, root, **patch):
        edition = {'id': 'brevo-42', 'exportVersion': 2, 'title': 'A public fixture',
                   'subject': 'A public fixture', 'sentAt': '2026-11-04T12:00:00Z',
                   'availableAt': '2026-11-05T12:00:00Z', 'paragraphs': ['Original public text.'],
                   'links': ['/stories'], 'photo': None, **patch}
        directory = root / 'data/postcards'
        (directory / 'editions').mkdir(parents=True, exist_ok=True)
        (directory / 'index.json').write_text(json.dumps({'schemaVersion': 1, 'editions': [{'id': 'brevo-42'}]}), encoding='utf-8')
        (directory / 'editions/brevo-42.json').write_text(json.dumps(edition), encoding='utf-8')
        return edition

    def test_sent_letter_is_withheld_until_exact_24_hour_boundary(self):
        with TemporaryDirectory() as path:
            root = Path(path)
            self.fixture(root)
            self.assertEqual(pages.load_editions(root, datetime(2026, 11, 5, 11, 59, 59, tzinfo=timezone.utc)), [])
            actual = pages.load_editions(root, datetime(2026, 11, 5, 12, tzinfo=timezone.utc))
            self.assertEqual(actual[0]['url'], '/postcard-brevo-42')

    def test_bad_delay_private_fields_and_unsafe_content_targets_fail_closed(self):
        for patch in [{'availableAt': '2026-11-04T12:00:00Z'}, {'privateNotes': 'Must never be projected'},
                      {'links': ['javascript:alert(1)']}, {'links': ['/admin']}, {'links': ['//example.invalid']},
                      {'photo': {'src': 'https://example.invalid/photo.jpg'}}, {'paragraphs': 'Not a list'}]:
            with self.subTest(patch=patch), TemporaryDirectory() as path:
                root = Path(path)
                self.fixture(root, **patch)
                with self.assertRaises(ValueError):
                    pages.load_editions(root, datetime(2026, 11, 6, tzinfo=timezone.utc))

    def test_unlisted_files_are_not_published_and_duplicate_ids_are_rejected(self):
        with TemporaryDirectory() as path:
            root = Path(path)
            self.fixture(root)
            (root / 'data/postcards/editions/brevo-99.json').write_text('{"draft":true}', encoding='utf-8')
            self.assertEqual(len(pages.load_editions(root, datetime(2026, 11, 6, tzinfo=timezone.utc))), 1)
            (root / 'data/postcards/index.json').write_text(json.dumps({'schemaVersion': 1, 'editions': [{'id': 'brevo-42'}, {'id': 'brevo-42'}]}), encoding='utf-8')
            with self.assertRaises(ValueError):
                pages.load_editions(root)

    def test_future_letters_without_a_photo_always_receive_a_local_cover(self):
        with TemporaryDirectory() as path:
            root = Path(path)
            self.fixture(root)
            actual = pages.load_editions(root, datetime(2026, 11, 6, tzinfo=timezone.utc))[0]
            self.assertEqual(actual['photo']['src'], 'https://dainyelonthemove.com/assets/postcards-cover.svg')
            self.assertTrue(actual['photo']['alt'])
            bad = {'schemaVersion': 1, 'default': {'src': '//foreign.invalid/photo.jpg', 'alt': 'Bad', 'caption': ''}, 'editions': {}}
            (root / 'data/postcards/covers.json').write_text(json.dumps(bad), encoding='utf-8')
            with self.assertRaises(ValueError):
                pages.load_editions(root)

    def test_current_place_and_home_totals_match_the_actual_public_destinations(self):
        trip = json.loads((ROOT / 'data/trip.json').read_text(encoding='utf-8'))
        model = json.loads((ROOT / 'data/journey.json').read_text(encoding='utf-8'))
        ids = [place['id'] for place in model['destinations']]
        self.assertEqual(len(ids), len(set(ids)))
        country = trip['currentLocation']['country']
        self.assertTrue(any(country in [place['name'], place.get('mapName')] for place in model['destinations']))
        self.assertEqual(max(trip['revealedStops'], key=lambda stop: stop['date'])['country'], country)
        home = (ROOT / 'index.html').read_text(encoding='utf-8')
        self.assertIn(str(len(ids)) + ' destinations', home)
        self.assertIn(str(len(ids)) + ' visited destinations', home)
        self.assertIn('Latest shared place: '+country+'.', home)

    def test_field_notes_have_complete_readable_text_and_attribution_without_javascript(self):
        model = json.loads((ROOT / 'data/journey.json').read_text(encoding='utf-8'))
        for note in model['journal']:
            with self.subTest(note=note['id']):
                filename = note['url'].lstrip('/')
                if not filename.endswith('.html'):
                    filename += '.html'
                content = (ROOT / filename).read_text(encoding='utf-8')
                text = unescape(re.sub(r'<[^>]+>', ' ', content))
                for paragraph in note['text'].split('\n\n'):
                    self.assertIn(paragraph, text)
                self.assertIn('A personal Field Note', text)
                self.assertIn(note['storyUrl'], content)

    def test_every_already_public_letter_has_an_initial_html_reading_route(self):
        archive = (ROOT / 'postcards.html').read_text(encoding='utf-8')
        search_urls = {item['url'] for item in json.loads((ROOT / 'data/site-search.json').read_text(encoding='utf-8'))}
        for edition in pages.load_editions(ROOT):
            identifier = edition['id']
            match = re.search(r'data-archive-id="'+identifier+r'".*?<h2><a href="([^"]+)"', archive, re.S)
            self.assertIsNotNone(match)
            route = match[1]
            self.assertNotIn('#', route)
            self.assertIn(route, search_urls)
            content = (ROOT / (route.lstrip('/') + '.html')).read_text(encoding='utf-8')
            text = unescape(re.sub(r'<[^>]+>', ' ', content))
            for paragraph in edition['paragraphs']:
                if paragraph.strip() and paragraph != edition['title']:
                    self.assertIn(paragraph, text)
            self.assertIn('https://dainyelonthemove.com'+route, content)
            self.assertTrue(edition['photo']['src'])
            image_path = edition['photo']['src'].removeprefix('https://dainyelonthemove.com')
            self.assertIn('src="' + image_path + '"', content)
            self.assertIn('src="' + image_path + '"', archive)
        self.assertEqual(archive.count('data-archive-id='), len(pages.load_editions(ROOT)))

    def test_empty_expense_page_is_not_indexed_and_legacy_notes_keep_a_working_destination(self):
        content = (ROOT / 'travel-costs.html').read_text(encoding='utf-8')
        model = json.loads((ROOT / 'data/journey.json').read_text(encoding='utf-8'))
        if not model['expenses']: self.assertIn('content="noindex,follow"', content)
        sitemap = (ROOT / 'sitemap.xml').read_text(encoding='utf-8')
        if not model['expenses']: self.assertNotIn('/travel-costs</loc>', sitemap)
        self.assertNotIn('/field-notes</loc>', sitemap)
        stories = (ROOT / 'stories.html').read_text(encoding='utf-8')
        self.assertIn('id="field-notes"', stories)
        for hosting in json.loads((ROOT / 'firebase.json').read_text(encoding='utf-8'))['hosting']:
            redirects = {item['source']: item['destination'] for item in hosting['redirects']}
            for alias in ['/field-notes', '/field-notes/', '/field-notes.html']:
                self.assertEqual(redirects[alias], '/stories#field-notes')


if __name__ == '__main__':
    unittest.main()
