"""Refresh committed static pages from shared HTML sources. No build dependencies."""
from pathlib import Path
from hashlib import sha256
from urllib.parse import urlsplit
import re

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / '.github' / 'templates'

def expand(text, stack=()):
    def include(match):
        relative = match.group(1)
        source = (TEMPLATES / relative).resolve()
        if not source.is_relative_to(TEMPLATES.resolve()) or source in stack:
            raise ValueError('Invalid or recursive template include')
        return expand(source.read_text(encoding='utf-8'), stack + (source,))
    return re.sub(r'\{\{include:([a-zA-Z0-9_./-]+)\}\}', include, text)

def stamp_assets(text):
    def version(match):
        path = urlsplit(match.group(2)).path
        if not path.startswith(('assets/', 'js/')) or not path.endswith(('.css', '.js')):
            return match.group(0)
        file = ROOT / path
        if not file.is_file():
            raise FileNotFoundError(path)
        return match.group(1) + path + '?v=' + sha256(file.read_bytes().replace(b'\r\n', b'\n')).hexdigest()[:12] + match.group(3)
    return re.sub(r'((?:src|href)=")([^"]+)(")', version, text)

for source in (TEMPLATES / 'pages').glob('*.html'):
    text = expand(source.read_text(encoding='utf-8'))
    if source.name in {'index.html', 'stories.html', 'thailand.html', 'thailand-solo.html', 'bali.html', 'philippines.html', 'privacy.html', 'cookies.html', 'search.html', '404.html'}:
        text = text.replace('<head>', '<head><script defer src="assets/analytics-consent.js"></script>', 1)
    rendered = stamp_assets(text)
    (ROOT / source.name).write_text(rendered, encoding='utf-8')
    print('Updated ' + source.name)
