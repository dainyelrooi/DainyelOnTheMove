"""Refresh committed static pages from shared HTML sources. No build dependencies."""
from pathlib import Path
from hashlib import sha256
from urllib.parse import urlsplit
import re
from html.parser import HTMLParser
from site_seo import enhance as enhance_seo
from journey_content import prepare as prepare_journey
from site_urls import clean_url, clean_html_urls
from website_editor import PAGES as EDITABLE_PAGES, annotate as annotate_editor, write_catalogues
from site_ads import consent_head

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

class Chapters(HTMLParser):
    """First real chapter heading in each named article section."""
    def __init__(self, source):
        super().__init__(); self.sections=[]; self.current=None; self.words=[]; self.items=[]; self.seen=set(); self.feed(source)
    def handle_starttag(self, tag, attrs):
        if tag=='section': self.sections.append(dict(attrs).get('id'))
        if tag=='h3' and any(self.sections):
            self.current=next(value for value in reversed(self.sections) if value); self.words=[]
    def handle_data(self, data):
        if self.current: self.words.append(data)
    def handle_endtag(self, tag):
        if tag=='h3' and self.current:
            if self.current not in self.seen: self.items.append((self.current,''.join(self.words).strip())); self.seen.add(self.current)
            self.current=None
        if tag=='section' and self.sections: self.sections.pop()

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

def defer_video_posters(text):
    # Offscreen native video posters otherwise download eagerly even with
    # preload=none. The shared observer restores them before they enter view,
    # including reduced-motion mode; hero placeholders remain immediate.
    def video(match):
        tag=match[0]
        if 'data-hero-video' in tag: return tag
        return re.sub(r'(?<![\w-])poster="([^"]+)"', r'data-poster="\1"', tag)
    return re.sub(r'<video\b[^>]*>', video, text)

journey_model = prepare_journey()
editor_catalogues = {}
for source in sorted((TEMPLATES / 'pages').glob('*.html'), key=lambda p: (p.name != 'index.html', p.name)):
    text = expand(source.read_text(encoding='utf-8'))
    if source.name == 'entry.html':
        text = text.replace('src="assets/', 'src="/assets/').replace('href="assets/', 'href="/assets/').replace('src="js/', 'src="/js/')
    shared_style = '<link rel="stylesheet" href="assets/journey-experience.css"/>'
    if shared_style in text:
        text = text.replace(shared_style, '')
        text = text.replace('</head>', shared_style + '</head>', 1)
    if 'data-public-page=' in text or 'journey-page' in text:
        for font in ['dm-sans-latin.woff2', 'playfair-display-latin.woff2']:
            if 'href="assets/fonts/' + font + '"' not in text:
                text = text.replace('</head>', '<link rel="preload" href="assets/fonts/' + font + '" as="font" type="font/woff2" crossorigin=""/></head>', 1)
    story = next((s for s in journey_model['stories'] if s['url'] == clean_url(source.name) and s['complete']), None)
    if story:
        import html
        article = re.search(r'<article\b[^>]*data-reading-body[^>]*>(.*?)</article>', text, re.S)
        if article:
            words = len(re.findall(r'\b[\w’\'-]+\b', html.unescape(re.sub(r'<[^>]+>', ' ', article[1]))))
            minutes = max(1, (words + 199) // 200)
            text = re.sub(r'Approx\. \d+ min read', f'Approx. {minutes} min read', text)
            toc = re.search(r'(<nav\b[^>]*data-reading-toc[^>]*>)(.*?)(</nav>)', text, re.S)
            if toc:
                labels = dict(re.findall(r'<a href="#([^"]+)">(.*?)</a>', toc[2], re.S))
                links = ''.join('<a href="#' + identifier + '">' + (labels.get(identifier) or html.escape(label)) + '</a>' for identifier,label in Chapters(article[1]).items)
                text = text.replace(toc[0],toc[1]+'<span class="story-toc-label">In this story</span>'+links+toc[3],1)
        summary = '<section class="story-summary wrap" aria-label="Story at a glance"><h2>At a glance</h2><p>' + html.escape(story['summary']) + '</p><p><a href="atlas.html?place=' + story['destinationId'] + '#map">Explore this destination →</a> · <a href="field-notes.html">Small moments from the archive →</a></p></section>'
        text = text.replace('<div class="reading-layout">', summary + '<div class="reading-layout">', 1)
        text = re.sub(r'(<div class="story-meta">.*?</div>)', r'\1<div class="story-mode-tools" data-story-mode-slot><span>Read at your own pace. Explore the chapters below.</span></div>', text, count=1, flags=re.S)
    text = consent_head(text, source.name)
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
            elif primary == 'film-library':
                # The first ordinary-page card is visible on initial load.
                # Its photo is the LCP candidate, unlike offscreen film cards.
                ordinary = re.sub(r'<img\b[^>]*>', lambda m: m[0].replace('loading="lazy"', 'loading="eager"').replace('/>', ' fetchpriority="high"/>'), ordinary, count=1)
            text = text.replace(frag, ordinary, 1)
        if source.name == 'collaborate.html':
            text = text.replace('class="site-panel" data-return="collaborate" id="creator-profile"', 'class="standalone-content" data-return="collaborate" id="creator-profile"')
            text = re.sub(r'<a[^>]*data-close-panel[^>]*>.*?</a>', '', text, flags=re.S)
        if source.name == 'qa.html':
            # This ordinary page connects automatically. Avoid painting a
            # manual-only button which disappears and shifts the answers.
            text = re.sub(r'(<button\b[^>]*data-enable-service="qa"[^>]*)(>)', r'\1 hidden\2', text, count=1)
            text = re.sub(r'(<p\b[^>]*id="qa-service-status"[^>]*>).*?(</p>)', r'\1Connecting to questions and forms…\2', text, count=1, flags=re.S)
        # Local anchors stay local. Missing anchors use the existing homepage routes.
        ids = set(re.findall(r'\bid="([^"]+)"', text))
        text = re.sub(r'href="#([^"]+)"', lambda m: m[0] if m[1] in ids else 'href="/#' + m[1] + '"', text)
    if 'data-public-page=' in text or source.name in {'stories.html', 'privacy.html', 'cookies.html'}:
        canonical = 'https://dainyelonthemove.com/' + source.name
        title = re.search(r'<title>(.*?)</title>', text).group(1)
        import html, json
        schema = {'@context':'https://schema.org', '@type':'CollectionPage' if source.name in {'videos.html','field-notes.html','stories.html'} else 'WebPage', '@id':canonical, 'url':canonical, 'name':html.unescape(title), 'isPartOf':{'@type':'WebSite','name':'DainyelOnTheMove','url':'https://dainyelonthemove.com/'}}
        text = text.replace('</head>', '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False).replace('<', '\\u003c') + '</script></head>', 1)
        current_url = clean_url(source.name)
        text = text.replace('href="' + current_url + '">', 'href="' + current_url + '" aria-current="page">')
    if source.name in {'404.html', 'entry.html'}:
        # Hosting serves this document at the original missing URL, including nested paths.
        # Resolve local assets and recovery links from the site root, not that missing folder.
        text = re.sub(r'((?:src|href)=")((?:assets/|js/)[^"]+|search\.html)(")', r'\1/\2\3', text)
    text = defer_video_posters(text)
    if source.stem in EDITABLE_PAGES or source.stem.startswith('note-'):
        text = annotate_editor(clean_html_urls(text), source.stem, editor_catalogues)
    elif '{{include:footer.html}}' in source.read_text(encoding='utf-8'):
        text = annotate_editor(clean_html_urls(text), source.stem, editor_catalogues, editable=False)
    rendered = clean_html_urls(stamp_assets(enhance_seo(text, source.name)))
    (ROOT / source.name).write_text(rendered, encoding='utf-8')
    print('Updated ' + source.name)

# Server-rendered future entries use the same shared shell as static archives.
import json
(ROOT/'.github/server/public-shell.json').write_text(json.dumps({
    'header': clean_html_urls(stamp_assets(expand((TEMPLATES/'header.html').read_text(encoding='utf-8')).replace('<link rel="stylesheet" href="assets/journey-experience.css"/>', ''))),
    'footer': clean_html_urls(stamp_assets(expand((TEMPLATES/'footer.html').read_text(encoding='utf-8'))))
}, ensure_ascii=False), encoding='utf-8')

write_catalogues(ROOT, editor_catalogues)
from search_index import build as build_search_index
build_search_index(ROOT)
