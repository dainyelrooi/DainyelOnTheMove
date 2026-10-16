"""Refresh committed static pages from shared HTML sources. No build dependencies."""
from pathlib import Path
from hashlib import sha256
from urllib.parse import urlsplit
import re
from html.parser import HTMLParser
from site_seo import enhance as enhance_seo

class Fragment(HTMLParser):
    void = {"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"}
    def __init__(self, text, identifier):
        super().__init__(convert_charrefs=False)
        self.text, self.identifier, self.depth, self.start, self.end = text, identifier, 0, None, None
        self.offsets = [0]
        for line in text.splitlines(keepends=True): self.offsets.append(self.offsets[-1] + len(line))
        self.feed(text)
    def position(self):
        line, col = self.getpos(); return self.offsets[line-1] + col
    def handle_starttag(self, tag, attrs):
        if self.end is not None: return
        if self.start is None and dict(attrs).get("id") == self.identifier: self.start = self.position()
        if self.start is not None and tag not in self.void: self.depth += 1
    def handle_startendtag(self, tag, attrs): pass
    def handle_endtag(self, tag):
        if self.start is None or self.end is not None or tag in self.void: return
        self.depth -= 1
        if self.depth == 0: self.end = self.text.index(">", self.position()) + 1
    def content(self):
        if self.start is None or self.end is None: raise ValueError("Missing fragment: " + self.identifier)
        return self.text[self.start:self.end]

def fragment(relative, identifier, stack):
    source = (TEMPLATES / relative).resolve()
    if not source.is_relative_to(TEMPLATES.resolve()) or source in stack: raise ValueError("Invalid fragment include")
    text = expand(source.read_text(encoding="utf-8"), stack + (source,))
    return Fragment(text, identifier).content()

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / '.github' / 'templates'

def expand(text, stack=()):
    def include(match):
        relative = match.group(1)
        source = (TEMPLATES / relative).resolve()
        if not source.is_relative_to(TEMPLATES.resolve()) or source in stack:
            raise ValueError('Invalid or recursive template include')
        return expand(source.read_text(encoding='utf-8'), stack + (source,))
    text = re.sub(r'\{\{fragment:([a-zA-Z0-9_./-]+)#([a-zA-Z0-9_-]+)\}\}', lambda m: fragment(m[1], m[2], stack), text)
    return re.sub(r'\{\{include:([a-zA-Z0-9_./-]+)\}\}', include, text)

def stamp_assets(text):
    def version(match):
        path = urlsplit(match.group(2)).path
        local = path.lstrip('/')
        if not local.startswith(('assets/', 'js/')) or not path.endswith(('.css', '.js')):
            return match.group(0)
        file = ROOT / local
        if not file.is_file():
            raise FileNotFoundError(path)
        return match.group(1) + path + '?v=' + sha256(file.read_bytes().replace(b'\r\n', b'\n')).hexdigest()[:12] + match.group(3)
    return re.sub(r'((?:src|href)=")([^"]+)(")', version, text)

for source in (TEMPLATES / 'pages').glob('*.html'):
    text = expand(source.read_text(encoding='utf-8'))
    if source.name in {'about.html', 'videos.html', 'atlas.html', 'journey.html', 'qa.html', 'my-kit.html', 'collaborate.html', 'field-notes.html', 'index.html', 'stories.html', 'thailand.html', 'thailand-solo.html', 'bali.html', 'philippines.html', 'privacy.html', 'cookies.html', 'search.html', '404.html'}:
        script = 'assets/analytics-consent.js'
        if source.name == '404.html':
            digest = sha256((ROOT / script).read_bytes().replace(b'\r\n', b'\n')).hexdigest()[:12]
            script = '/' + script + '?v=' + digest
        text = text.replace('<head>', '<head><script defer src="' + script + '"></script>', 1)
    if 'data-public-page=' in text:
        # Selected shared content is an ordinary page, never an always-open dialog.
        primary_ids = {'about.html':'about-me','videos.html':'film-library','atlas.html':'map','qa.html':'ask','my-kit.html':'kit','collaborate.html':'contact'}
        primary = primary_ids.get(source.name)
        if primary:
            frag = Fragment(text, primary).content()
            ordinary = frag.replace('class="site-panel', 'class="standalone-content', 1)
            ordinary = re.sub(r'<div class="panel-top">.*?</div>', '', ordinary, count=1, flags=re.S)
            if primary == 'kit':
                ordinary = ordinary.replace('<details ', '<section ', 1)
                ordinary = re.sub(r'<summary>.*?</summary>', '', ordinary, count=1, flags=re.S)
                ordinary = ordinary.rsplit('</details>', 1)[0] + '</section>'
            text = text.replace(frag, ordinary, 1)
        if source.name == 'collaborate.html':
            text = text.replace('class="site-panel" data-return="collaborate" id="creator-profile"', 'class="standalone-content" data-return="collaborate" id="creator-profile"')
            text = re.sub(r'<a[^>]*data-close-panel[^>]*>.*?</a>', '', text, flags=re.S)
        # Local anchors stay local. Missing anchors use the existing homepage routes.
        ids = set(re.findall(r'\bid="([^"]+)"', text))
        text = re.sub(r'href="#([^"]+)"', lambda m: m[0] if m[1] in ids else 'href="/#' + m[1] + '"', text)
    if 'data-public-page=' in text or source.name in {'stories.html', 'privacy.html', 'cookies.html'}:
        canonical = 'https://dainyelonthemove.com/' + source.name
        title = re.search(r'<title>(.*?)</title>', text).group(1)
        import html, json
        schema = {'@context':'https://schema.org', '@type':'CollectionPage' if source.name in {'videos.html','field-notes.html','stories.html'} else 'WebPage', '@id':canonical, 'url':canonical, 'name':html.unescape(title), 'isPartOf':{'@type':'WebSite','name':'DainyelOnTheMove','url':'https://dainyelonthemove.com/'}}
        text = text.replace('</head>', '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False).replace('<', '\\u003c') + '</script></head>', 1)
        text = text.replace('href="/' + source.name + '">', 'href="/' + source.name + '" aria-current="page">')
    if source.name == '404.html':
        # Hosting serves this document at the original missing URL, including nested paths.
        # Resolve local assets and recovery links from the site root, not that missing folder.
        text = re.sub(r'((?:src|href)=")((?:assets/|js/)[^"]+|search\.html)(")', r'\1/\2\3', text)
    rendered = stamp_assets(enhance_seo(text, source.name))
    (ROOT / source.name).write_text(rendered, encoding='utf-8')
    print('Updated ' + source.name)
