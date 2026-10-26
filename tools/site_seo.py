"""Consistent public identity and navigation metadata for committed static pages."""
import html
import json
import re
from html.parser import HTMLParser
from site_urls import clean_url

BASE = 'https://dainyelonthemove.com/'
BRAND = 'Dainyel on the Move'
WEBSITE = BASE + '#website'
PERSON = BASE + '#dainyel'
SOCIALS = [
    'https://www.youtube.com/@DainyelOnTheMove',
    'https://www.instagram.com/dainyelonthemove/',
    'https://www.tiktok.com/@dainyelonthemove',
]
PAGES = {
    'index.html': ('Travel Stories & Films', 'Travel Blog & Films'),
    'stories.html': ('Stories & Field Notes', 'Travel Stories & Field Notes'),
    'thailand.html': ('Thailand study exchange', 'Thailand Study Exchange: Three Months'),
    'bali.html': ('Bali', 'Bali Travel Story: Three Months in Denpasar'),
    'thailand-solo.html': ('Thailand solo', 'Solo Thailand: An Eight-Day Journey'),
    'philippines.html': ('Philippines', 'Philippines Travel Story: Beneath the Philippine Blue'),
    'about.html': ('About Dainyel', 'About Dainyel | Dutch Travel Creator'),
    'videos.html': ('Travel films', 'Travel Films & Videos'),
    'atlas.html': ('Travel atlas', 'Travel Atlas & Visited Destinations'),
    'journey.html': ('The next chapter', 'The Next Chapter | Trip to Latin America'),
    'qa.html': ('Travel Q&A', 'Travel Q&A | Ask Dainyel & the Community'),
    'my-kit.html': ('My kit', 'My Travel Camera & Creator Kit'),
    'collaborate.html': ('Collaborate', 'Collaborate with a Dutch Travel Creator'),
    'field-notes.html': ('Field Notes', 'Field Notes | Short Personal Travel Updates'),
    'privacy.html': ('Privacy', 'Privacy Policy'),
    'cookies.html': ('Cookies', 'Cookies & Privacy Choices'),
}
STORIES = {'thailand.html', 'bali.html', 'thailand-solo.html', 'philippines.html'}


class Meta(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.fields = {}
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta':
            self.fields[attrs.get('name', attrs.get('property', ''))] = attrs.get('content', '')


def dumps(data):
    return json.dumps(data, ensure_ascii=False).replace('<', '\\u003c')


def enhance(text, filename):
    if filename not in PAGES:
        return text
    label, subject = PAGES[filename]
    canonical = BASE if filename == 'index.html' else clean_url(BASE + filename)
    title = BRAND + ' | ' + subject if filename == 'index.html' else subject + ' | ' + BRAND
    head = text.split('</head>', 1)[0]
    fields = Meta(head).fields
    description = fields.get('description', '').replace('DainyelOnTheMove', BRAND)
    if filename == 'index.html':
        description = ('Dainyel on the Move (DainyelOnTheMove): a Dutch travel creator sharing '
                       'personal stories, travel films and Field Notes from Thailand, Bali and beyond.')
    updates = {'description': description, 'og:description': description,
               'twitter:description': description, 'og:site_name': BRAND,
               'og:title': title, 'twitter:title': title}
    def meta(match):
        tag = match.group()
        key = re.search(r'(?:name|property)="([^"]+)"', tag)
        if key and key[1] in updates:
            tag = re.sub(r'content="[^"]*"', 'content="' + html.escape(updates[key[1]], quote=True) + '"', tag)
        return tag
    text = re.sub(r'<meta\b[^>]*>', meta, text)
    text = re.sub(r'<title>.*?</title>', '<title>' + html.escape(title) + '</title>', text, count=1, flags=re.S)
    person = {'@type': 'Person', '@id': PERSON, 'name': 'Dainyel',
              'alternateName': [BRAND, 'DainyelOnTheMove'], 'url': clean_url(BASE + 'about.html'),
              'image': BASE + 'assets/optimized/brand-profile.webp',
              'jobTitle': 'Travel creator', 'sameAs': SOCIALS}
    def schema(match):
        data = json.loads(match[1])
        for node in data.get('@graph', [data]):
            kind = node.get('@type')
            if kind == 'WebSite':
                node.update(name=BRAND, alternateName=['DainyelOnTheMove', 'Dainyel On The Move'], description=description)
            elif kind == 'Person':
                node.update(person)
            elif kind == 'BlogPosting':
                node['author'] = {k: person[k] for k in ['@type', '@id', 'name', 'url']}
                node['isPartOf'] = {'@id': WEBSITE}
            elif kind in ['WebPage', 'CollectionPage']:
                node['name'] = title
                node['description'] = description
                node['inLanguage'] = 'en-GB'
                node['isPartOf'] = {'@type': 'WebSite', '@id': WEBSITE, 'name': BRAND, 'url': BASE}
                if filename == 'about.html':
                    node['@type'] = 'ProfilePage'
                    node['mainEntity'] = person
        return '<script type="application/ld+json">' + dumps(data) + '</script>'
    text = re.sub(r'<script type="application/ld\+json">(.*?)</script>', schema, text, flags=re.S)
    if 'twitter:image:alt' not in fields and fields.get('og:image:alt'):
        text = text.replace('</head>', '<meta name="twitter:image:alt" content="' + html.escape(fields['og:image:alt'], quote=True) + '"/></head>', 1)
    if filename != 'index.html':
        trail = [('Home', BASE)]
        if filename in STORIES:
            trail.append(('Travel stories', clean_url(BASE + 'stories.html')))
        trail.append((label, canonical))
        crumbs = {'@context': 'https://schema.org', '@type': 'BreadcrumbList',
                  'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': name, 'item': url}
                                      for i, (name, url) in enumerate(trail)]}
        text = text.replace('</head>', '<script type="application/ld+json">' + dumps(crumbs) + '</script></head>', 1)
        items = ''.join('<li>' + ('<span aria-current="page">' + html.escape(name) + '</span>' if i == len(trail) - 1 else '<a href="' + ('/' if url == BASE else url.removeprefix(BASE)) + '">' + html.escape(name) + '</a>') + '</li>' for i, (name, url) in enumerate(trail))
        nav = '<nav class="breadcrumbs wrap" aria-label="Breadcrumb"><ol>' + items + '</ol></nav>'
        text = re.sub(r'(<main\b[^>]*>)', lambda m: m[1] + nav, text, count=1)
    return text
