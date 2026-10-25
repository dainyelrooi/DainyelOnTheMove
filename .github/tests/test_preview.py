"""The audit preview must open / while keeping authoring/private files closed."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

SOURCE = Path(__file__).resolve().parents[2] / 'tools' / 'Preview-Site.py'
spec = importlib.util.spec_from_file_location('dotm_preview', SOURCE)
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)


class PreviewRouting(unittest.TestCase):
    def test_root_clean_routes_and_private_boundaries(self):
        with tempfile.TemporaryDirectory() as folder:
            previous = preview.ROOT
            try:
                preview.ROOT = Path(folder)
                for name in ['index.html', 'admin.html', 'entry.html', 'private/secret.txt', '.github/report.html', 'assets/public.js']:
                    target = preview.ROOT / name
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_text('fixture', encoding='utf-8')
                handler = preview.Preview.__new__(preview.Preview)
                handler.directory = folder
                for path, expected in [('/', True), ('/?review=1', True), ('/index', True), ('/studio', True),
                                       ('/entry/entry-' + 'a' * 32, True), ('/assets/public.js', True),
                                       ('/private/secret.txt', False), ('/.github/report.html', False),
                                       ('/%2e%67ithub/report.html', False), ('/missing', False)]:
                    with self.subTest(path=path):
                        handler.path = path
                        self.assertEqual(handler.allowed(), expected)
            finally:
                preview.ROOT = previous
