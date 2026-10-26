"""Only the homepage's explicit public popup copy crosses hidden-field exclusion."""
from pathlib import Path
import importlib.util
import unittest

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('follow_website_editor',ROOT/'tools/website_editor.py')
editor=importlib.util.module_from_spec(spec);spec.loader.exec_module(editor)

class HomeFollowEditorTests(unittest.TestCase):
    def annotate(self,body,page='index',editable=True):
        catalog={}
        html=editor.annotate('<html><head></head><body>'+body+'</body></html>',page,catalog,editable)
        return html,catalog

    def test_exactly_eight_popup_fields_in_four_named_homepage_groups(self):
        partial=(ROOT/'.github/templates/home-follow-popup.html').read_text(encoding='utf-8')
        html,catalog=self.annotate(partial)
        groups=catalog['index']
        self.assertEqual(len(groups),4)
        self.assertEqual({g['label'] for g in groups},set(editor.FOLLOW_COPY_PHASES.values()))
        self.assertTrue(all([f['tag'] for f in g['fields']]==['h2','p'] for g in groups))
        self.assertEqual(html.count('data-site-field='),8)
        self.assertNotIn('data-follow-title data-site-field=',html)

    def test_unknown_or_duplicate_marker_and_other_hidden_ui_stay_excluded(self):
        base='<div data-follow-config="before" hidden aria-hidden="true"><h2 data-follow-copy="title">Only approved heading</h2><p data-follow-copy="description">Only approved description.</p><p>Unmarked text is not editable.</p><p data-follow-copy="other">Unknown field.</p></div>'
        other='<div hidden><h2>Private hidden heading</h2><p>Private hidden paragraph</p></div><dialog><p>Dialog content</p></dialog>'
        html,catalog=self.annotate(base+other)
        self.assertEqual(sum(len(g['fields']) for g in catalog['index']),2)
        self.assertNotIn('Unmarked text is not editable. data-site-field',html)
        _,duplicate=self.annotate(base+base)
        self.assertNotIn('index',duplicate)
        _,unknown=self.annotate(base.replace('data-follow-config="before"','data-follow-config="unknown"'))
        self.assertNotIn('index',unknown)

    def test_popup_exception_never_applies_on_other_pages_private_ancestors_or_disabled_editing(self):
        config='<div data-follow-config="before" hidden aria-hidden="true"><h2 data-follow-copy="title">Approved title</h2><p data-follow-copy="description">Approved description.</p></div>'
        for page,body,editable in [('about',config,True),('index','<section hidden>'+config+'</section>',True),('index',config,False),('index',config.replace('<h2 ','<h2 hidden '),True)]:
            _,catalog=self.annotate(body,page,editable)
            fields=[f for groups in catalog.values() for group in groups for f in group['fields']]
            if 'h2 hidden' in body:self.assertEqual([f['tag'] for f in fields],['p'])
            else:self.assertEqual(fields,[])

    def test_nested_hidden_or_executable_content_is_not_popup_copy(self):
        body='<div data-follow-config="before" hidden aria-hidden="true"><h2 data-follow-copy="title">Title <script>private()</script></h2><p data-follow-copy="description">Description <span hidden>hidden text</span></p></div>'
        _,catalog=self.annotate(body)
        self.assertNotIn('index',catalog)

if __name__=='__main__':unittest.main()
