"""Only explicit public announcement links extend the shared editing surface."""
from pathlib import Path
import importlib.util
import re
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('header_website_editor', ROOT / 'tools/website_editor.py')
editor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(editor)
HEADER = '<header class="site-header"><a href="/admin">Protected navigation</a><details data-nav-updates><summary>Location and updates</summary><ul><li><a data-header-announcement="postcards" href="/postcards">Postcards from the road</a></li><li><a data-header-announcement="stories" href="/stories">Stories &amp; Field Notes</a></li></ul><label><input type="checkbox">Keep updates still</label></details></header>'
FOOTER = '<footer><p>Original footer description.</p><nav><a href="/stories">Stories &amp; Field Notes</a></nav></footer>'

def document(body):
    return '<html><head></head><body>' + body + '</body></html>'

class HeaderEditorTests(unittest.TestCase):
    def test_exact_two_announcements_are_shared_and_other_header_controls_stay_protected(self):
        catalog = {}
        rendered = editor.annotate(document(HEADER + FOOTER), 'index', catalog)
        group = next(g for g in catalog['shared'] if g['label'] == 'Header · announcements')
        self.assertEqual(len(group['fields']), 2)
        self.assertEqual({f['headerAnnouncement'] for f in group['fields']}, {'postcards', 'stories'})
        self.assertTrue(all(f['kind'] == 'link' and f['optional'] and f['websiteOnly'] and f['labelMaxLength'] == 60 for f in group['fields']))
        self.assertNotIn('href="/admin" data-site-field=', rendered)
        self.assertNotIn('<summary data-site-field=', rendered)

    def test_footer_ids_are_unchanged_and_equal_footer_link_does_not_steal_header_key(self):
        before, after = {}, {}
        editor.annotate(document(FOOTER), 'index', before)
        html = editor.annotate(document(HEADER + FOOTER), 'index', after)
        footer_groups = [g for g in after['shared'] if g['label'] == 'Footer']
        self.assertEqual(footer_groups, before['shared'])
        header_id = next(g['id'] for g in after['shared'] if g['label'] == 'Header · announcements')
        self.assertNotIn(header_id, html.split('<footer>')[1])

    def test_same_keys_reach_other_pages_and_future_entry_shell_without_growing_catalogue(self):
        catalog = {}
        editor.annotate(document(HEADER + FOOTER), 'index', catalog)
        count = len(catalog['shared'])
        ordinary = editor.annotate(document(HEADER + FOOTER), 'about', catalog)
        shell = editor.mark_shared(HEADER, catalog)
        for field in next(g for g in catalog['shared'] if g['label'] == 'Header · announcements')['fields']:
            marker = next(g['id'] for g in catalog['shared'] if g['label'] == 'Header · announcements') + '/' + field['key']
            self.assertIn(marker, ordinary)
            self.assertIn(marker, shell)
        self.assertEqual(len(catalog['shared']), count)
        self.assertNotIn('website-public.js', shell)
        import json
        generated = json.loads((ROOT / '.github/server/public-shell.json').read_text(encoding='utf-8'))
        self.assertIn('/assets/website-public.js', generated['header'])
        self.assertIn('data-header-announcement', generated['header'])

    def test_unknown_duplicate_and_hidden_markers_do_not_open_arbitrary_header_editing(self):
        for source in [HEADER.replace('data-header-announcement="postcards"', 'data-header-announcement="unknown"'),
                       HEADER.replace('href="/postcards"', 'hidden href="/postcards"')]:
            catalog = {}
            editor.annotate(document(source), 'index', catalog)
            fields = [f for g in catalog.get('shared', []) for f in g['fields']]
            self.assertEqual([f['headerAnnouncement'] for f in fields], ['stories'])
        duplicate = HEADER.replace('</ul>', '<li><a data-header-announcement="postcards" href="/postcards">Duplicate choice</a></li></ul>')
        catalog = {}
        editor.annotate(document(duplicate), 'index', catalog)
        self.assertEqual([f['headerAnnouncement'] for g in catalog['shared'] for f in g['fields']], ['stories'])

if __name__ == '__main__': unittest.main()
