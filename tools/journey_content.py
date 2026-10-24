"""Public-only content validation and static projections. Standard library only."""
from pathlib import Path
from datetime import datetime, date
import html
import json
import re
import xml.etree.ElementTree as ET
from site_urls import clean_url, page_file

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / '.github/templates'
BASE = 'https://dainyelonthemove.com/'
esc = lambda value: html.escape(str(value), quote=True)

def local_url(value):
    return isinstance(value, str) and re.fullmatch(r'/?[a-z0-9-]+(?:\.html)?(?:#[a-zA-Z0-9-]+)?', value)

def validate(model):
    assert set(model) == {'schemaVersion','destinations','stories','journal','postcards','checkins','expenses','challenges','budgets'}
    assert model['schemaVersion'] == 1
    allowed = {
        'destinations': {'id','name','region','mapName','year','listYear','tripDetails','coordinates','storyStatus','storyText','storyHref','storyLink','memory','filmHref','photo','kind','parent','years'},
        'stories': {'id','destinationId','tripId','year','title','url','summary','complete'},
        'journal': {'id','destinationId','tripId','eventLabel','eventYear','eventDate','title','text','photo','storyUrl','status','publishedAt','updatedAt','publicationPrecision','url'},
        'postcards': {'id','title','subtitle','sentDate','status','destinationIds','storyUrls','photo','paragraphs','url','publishedAt','updatedAt'},
        'expenses': {'id','status','date','tripId','destinationId','category','currency','amountMinor','personalMinor','coverageNote','publishedAt','updatedAt'},
        'checkins': {'id','status','city','country','eventDate','tripId','publishedAt','updatedAt'},
        'challenges': {'id','status','title','text','displayName','lifecycle','result','publishedAt','updatedAt'},
        'budgets': {'tripId','currency','rangeMinMinor','rangeMaxMinor','note'}
    }
    for kind, fields in allowed.items():
        assert isinstance(model[kind], list)
        for item in model[kind]: assert isinstance(item,dict) and set(item)<=fields, 'Unexpected or private fields in public '+kind
    for kind in ['destinations','stories','journal','postcards','challenges']:
        ids = set()
        for item in model[kind]:
            assert re.fullmatch(r'[a-z0-9-]+', item['id']) and item['id'] not in ids
            ids.add(item['id'])
            if kind in ['journal','postcards','challenges']:
                assert item['status'] == 'published', 'Only published content belongs in the public model'
            if 'url' in item: assert local_url(item['url'])
            for key in ['storyUrl','storyHref']:
                if key in item: assert local_url(item[key])
            if item.get('photo'):
                photo = item['photo']
                assert re.fullmatch(r'assets/[a-zA-Z0-9_./-]+\.(webp|avif|png|jpe?g)', photo['src']) and '..' not in photo['src']
                assert (ROOT / photo['src']).is_file() and photo.get('alt')
                assert photo.get('fit', 'cover') in {'cover', 'contain'}
            assert not set(item) & {'email','ip','recipient','token','unsubscribe','draft','privateNotes'}
    for note in model['journal']:
        assert note.get('publishedAt') or note.get('publicationPrecision') == 'legacy-unknown'
        if note.get('publishedAt'): assert datetime.fromisoformat(note['publishedAt'].replace('Z','+00:00')).tzinfo
    for expense in model['expenses']:
        assert expense['status'] == 'published'
        assert type(expense['amountMinor']) is int and type(expense['personalMinor']) is int
        assert 0 <= expense['personalMinor'] <= expense['amountMinor'] <= 100000000000
        assert re.fullmatch(r'[A-Z]{3}',expense['currency'])
        date.fromisoformat(expense['date'])
    return model

def image(photo):
    return f'<img src="{esc(photo["src"])}" alt="{esc(photo["alt"])}" width="640" height="420" loading="lazy" decoding="async"/>'

def page(filename, title, description, body, eyebrow='From the journey', script=''):
    canonical = BASE + clean_url(filename).lstrip('/')
    schema = {'@context':'https://schema.org','@type':'WebPage','name':title,'url':canonical,'description':description,'isPartOf':{'@type':'WebSite','name':'Dainyel on the Move','url':BASE}}
    return f'''<!doctype html><html lang="en-GB"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="theme-color" content="#0c1b25"/><title>{esc(title)} | Dainyel on the Move</title><meta name="description" content="{esc(description)}"/><link rel="canonical" href="{canonical}"/><meta name="robots" content="index,follow,max-image-preview:large"/><meta property="og:title" content="{esc(title)} | Dainyel on the Move"/><meta property="og:description" content="{esc(description)}"/><meta property="og:url" content="{canonical}"/><meta property="og:type" content="website"/><meta property="og:image" content="{BASE}assets/optimized/hero-bay-1280.webp"/><meta name="twitter:card" content="summary_large_image"/><link rel="icon" href="assets/favicon.svg"/><link rel="stylesheet" href="assets/design-system.css"/><link rel="stylesheet" href="assets/journey-experience.css"/><script defer src="assets/site-ui.js"></script><script type="application/ld+json">{json.dumps(schema).replace('<', chr(92)+'u003c')}</script></head><body class="public-page journey-page">{{{{include:header.html}}}}<main id="main-content"><nav class="breadcrumbs wrap" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><span aria-current="page">{esc(title)}</span></li></ol></nav><section class="overview-hero"><div class="wrap"><span class="eyebrow">{esc(eyebrow)}</span><h1>{esc(title)}</h1><p>{esc(description)}</p></div></section>{body}</main>{{{{include:footer.html}}}}<script defer src="assets/analytics-consent.js"></script>{script}</body></html>'''

def prepare():
    model = validate(json.loads((ROOT / 'data/journey.json').read_text(encoding='utf-8')))
    # Adapter for the already deployed atlas and home components, never a second hand-maintained list.
    (ROOT / 'assets/travel-data.js').write_text('/* Generated from data/journey.json by Compose-Site.py. */\nwindow.travelData = ' + json.dumps({'visitedDestinations':model['destinations']}, ensure_ascii=False).replace('<','\\u003c') + ';\n',encoding='utf-8')
    generated = []
    search = []
    notes = []
    for note in model['journal']:
        caption = 'Originally shared in the archive; publication date was not recorded.' if not note['publishedAt'] else 'Published ' + note['publishedAt'][:10]
        notes.append(f'<article class="note">{image(note["photo"])}<div class="note-copy"><span class="note-meta">{esc(note["eventLabel"])}</span><h2><a href="{note["url"]}">{esc(note["title"])}</a></h2><p>{esc(note["text"])}</p><a class="text-link" href="{note["url"]}">Open Field Note →</a></div></article>')
        body = f'<article class="wrap journal-detail"><figure>{image(note["photo"])}<figcaption>{esc(note["eventLabel"])}</figcaption></figure><p>{esc(note["text"])}</p><p class="content-date">{esc(caption)}</p><div class="journey-links"><a href="{esc(note["storyUrl"])}">Explore the related story →</a><a href="atlas.html?place={esc(note["destinationId"])}#map">Find this place in the atlas →</a><a href="field-notes.html">All Field Notes →</a></div></article>'
        (TEMPLATES/'pages'/page_file(note['url'])).write_text(page(note['url'],note['title'],note['eventLabel']+' · An unfiltered moment from Dainyel’s travels.',body,'Unfiltered journal · Field Notes'),encoding='utf-8')
        generated.append(page_file(note['url'])); search.append({'title':note['title'],'url':note['url'],'description':note['text'],'tags':'Field Notes journal '+note['eventLabel']})
    (TEMPLATES/'journey-notes.html').write_text('<div class="note-grid">'+''.join(notes)+'</div>',encoding='utf-8')
    postcard_cards = []
    for card in model['postcards']:
        postcard_cards.append(f'<article class="postcard-edition">{image(card["photo"])}<div><span class="eyebrow">Sent {esc(card["sentDate"])}</span><h2><a href="{card["url"]}">{esc(card["title"])}</a></h2><p>{esc(card["subtitle"])}</p><a class="text-link" href="{card["url"]}">Read the Postcard →</a></div></article>')
        links = ''.join(f'<a href="{esc(url)}">Explore the story →</a>' for url in card['storyUrls'])
        body = f'<article class="wrap journal-detail postcard-letter"><p class="content-date">Sent {esc(card["sentDate"])} · Public edition</p><figure>{image(card["photo"])}</figure>'+''.join('<p>'+esc(p)+'</p>' for p in card['paragraphs'])+f'<div class="journey-links">{links}<a href="postcards.html">All Postcards →</a><a href="/#follow-trip">Receive the next one →</a></div></article>'
        (TEMPLATES/'pages'/page_file(card['url'])).write_text(page(card['url'],card['title'],card['subtitle'],body,'Postcards from Dainyel'),encoding='utf-8')
        generated.append(page_file(card['url'])); search.append({'title':card['title'],'url':card['url'],'description':card['subtitle'],'tags':'Postcards '+card['sentDate']})
    body='<section class="section"><div class="wrap" data-postcard-collection><p>Read a past edition before joining. These public copies contain no personal email links.</p><div class="postcard-wall" data-postcard-archive>'+''.join(postcard_cards)+'</div><p><a class="button" href="/#follow-trip">Receive Postcards →</a></p><p data-archive-status>Public editions follow at least 24 hours after sending. Subscribers receive them first, directly in their inbox.</p></div></section><section class="section wrap postcard-public-body" data-postcard-edition hidden></section>'
    (TEMPLATES/'pages/postcards.html').write_text(page('postcards.html','Postcards from the road.','A little piece of the journey, collected in one place.',body,script='<script type="module" src="assets/postcard-archive.js"></script>'),encoding='utf-8')
    body='''<section class="section"><div class="wrap cost-overview" data-costs><p><strong>Planning range: €8,000–€10,000.</strong> I would prefer to stay below budget. This is a plan, not money already spent.</p><p data-cost-status>No actual expense records have been published yet. There is no spending total or daily average to report.</p><div class="journey-controls" data-cost-controls hidden><label>Trip<select data-cost-trip><option value="">All published trips</option></select></label><label>Destination<select data-cost-place><option value="">All destinations</option></select></label><label>Category<select data-cost-category><option value="">All categories</option></select></label><label>From<input type="date" data-cost-from/></label><label>To<input type="date" data-cost-to/></label></div><div data-cost-results></div><details><summary>How the numbers work</summary><p>Each record stores the amount and my share in integer currency units. A group payment is shown separately from my own cost. Currencies stay separate; no estimated exchange rates are used.</p><p>Daily average = my recorded share ÷ inclusive calendar days from the first to last record in the selected currency and period. Missing days and incomplete records mean this is a partial overview, never a complete trip total.</p></details><a class="text-link" href="qa.html?topic=budget#ask">Ask about travel costs →</a></div></section>'''
    (TEMPLATES/'pages/travel-costs.html').write_text(page('travel-costs.html','Real travel costs.','The plan, the actual spending, and what the records cover.',body,script='<script type="module" src="assets/travel-costs.js"></script>'),encoding='utf-8')
    generated += ['postcards.html','travel-costs.html']
    (ROOT/'data/search-content.json').write_text(json.dumps(search,ensure_ascii=False).replace('<','\\u003c')+'\n',encoding='utf-8')
    # Stable sitemap entries, without fabricated publication/modified dates.
    sitemap=ROOT/'sitemap.xml'; ns='http://www.sitemaps.org/schemas/sitemap/0.9'
    ET.register_namespace('',ns)
    tree=ET.parse(ROOT/'sitemap-static.xml' if (ROOT/'sitemap-static.xml').exists() and '<sitemapindex ' in sitemap.read_text() else sitemap); root=tree.getroot()
    for loc in root.findall('{'+ns+'}url/{'+ns+'}loc'): loc.text=clean_url(loc.text)
    existing={n.text for n in root.findall('{'+ns+'}url/{'+ns+'}loc')}
    manifest=ROOT/'.github/content-routes.json'
    old=json.loads(manifest.read_text()) if manifest.exists() else []
    for obsolete in set(old)-set(generated):
        for node in list(root):
            if node.findtext('{'+ns+'}loc')==clean_url(BASE+obsolete): root.remove(node)
        (ROOT/obsolete).unlink(missing_ok=True); (TEMPLATES/'pages'/obsolete).unlink(missing_ok=True)
    for filename in generated:
        canonical=clean_url(BASE+filename)
        if canonical not in existing: ET.SubElement(ET.SubElement(root,'{'+ns+'}url'),'{'+ns+'}loc').text=canonical
    tree.write(sitemap,encoding='utf-8',xml_declaration=True)
    if json.loads((ROOT/'data/services.json').read_text()).get('journeyApi'):
        tree.write(ROOT/'sitemap-static.xml',encoding='utf-8',xml_declaration=True)
        sitemap.write_text('<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="'+ns+'"><sitemap><loc>'+BASE+'sitemap-static.xml</loc></sitemap><sitemap><loc>'+BASE+'sitemap-updates.xml</loc></sitemap></sitemapindex>')
    manifest.write_text(json.dumps(generated,indent=2)+'\n')
    return model
