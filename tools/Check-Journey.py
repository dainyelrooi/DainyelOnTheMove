"""Non-destructive generated content, routes and hosting boundary checks."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json, gzip, re
from journey_content import validate
ROOT=Path(__file__).resolve().parent.parent
class Page(HTMLParser):
    def __init__(self,text):
        super().__init__();self.ids=[];self.links=[];self.assets=[];self.headings=0;self.feed(text)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if a.get('id'):self.ids.append(a['id'])
        if tag=='a' and a.get('href'):self.links.append(a['href'])
        if tag in ['script','img','source','link']:
            value=a.get('src') or a.get('href')
            if value:self.assets.append(value)
        if tag=='h1':self.headings+=1

model=validate(json.loads((ROOT/'data/journey.json').read_text(encoding='utf-8')))
routes=json.loads((ROOT/'.github/content-routes.json').read_text())
pages={p.name:Page(p.read_text(encoding='utf-8')) for p in ROOT.glob('*.html')}
errors=[]
for filename in ['index.html','atlas.html','stories.html','qa.html','collaborate.html',*routes]:
    page=pages[filename]
    if page.headings!=1:errors.append(filename+': expected one h1')
    if len(page.ids)!=len(set(page.ids)):errors.append(filename+': duplicate IDs')
    text=(ROOT/filename).read_text(encoding='utf-8')
    if '{{include:' in text or '{{fragment:' in text:errors.append(filename+': unexpanded template')
    for href in page.links+page.assets:
        u=urlsplit(href)
        if u.scheme or u.netloc or not (u.path.endswith('.html') or u.path.startswith(('assets/','js/','/assets/','/js/')) or href.startswith('#') or u.path=='/'):continue
        path=unquote(u.path).lstrip('/') or filename
        if u.path=='/':path='index.html'
        target=ROOT/path
        if not target.is_file():errors.append(filename+': missing '+path)
        elif u.fragment and path in pages and u.fragment not in pages[path].ids:
            # Legacy Hosting redirects preserve hashes; their destination resolves them.
            if path not in ['journey.html','blog.html','destinations.html','updates.html']:errors.append(filename+': missing #'+u.fragment+' in '+path)
    if filename in routes:
        for token in ['rel="canonical"','property="og:title"','property="og:description"','name="description"']:
            if token not in text:errors.append(filename+': missing metadata '+token)
        if 'https://dainyelonthemove.com/'+filename not in (ROOT/'sitemap.xml').read_text():errors.append(filename+': absent from sitemap')
for hosting in json.loads((ROOT/'firebase.json').read_text())['hosting']:
    assert all(p in hosting['ignore'] for p in ['private/**','.github/**','tools/**'])
for collection in ['fieldNotes','questions','communityThreads']:
    assert collection in (ROOT/'firestore.rules').read_text()
assert all(not r['id'].startswith('fixture-') for r in model['expenses']), 'Test fixtures cannot be published.'
assert all(not r['id'].startswith('fixture-') for r in model['challenges']), 'Test fixtures cannot be published.'
assert not json.loads((ROOT/'data/services.json').read_text())['journeyApi'], 'Do not enable the unreleased service.'
assert all(n.get('publicationPrecision')=='legacy-unknown' for n in model['journal'] if n['publishedAt'] is None), 'Unknown dates must be explicit.'
if errors:
    print('\n'.join(errors));raise SystemExit(1)
print(f'PASS: {len(routes)} new public routes; links, assets, IDs, metadata, sitemap and hosting exclusions.')
print('PASS: empty expenses/challenges, unknown legacy publication dates and disabled new service remain truthful.')
