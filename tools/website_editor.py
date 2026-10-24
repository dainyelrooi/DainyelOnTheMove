"""Compile a bounded, public editing catalogue from the site's actual content.

No HTML from the editor is executed. Structural changes remain in the templates.
Keys include the original content, so a later template change cannot silently
attach an old override to a different paragraph.
"""
from collections import Counter
from hashlib import sha256
from html import escape
from html.parser import HTMLParser
import json
import re

PAGES = {'index': 'Home', 'about': 'About me', 'stories': 'Stories & notes',
         'videos': 'Films', 'collaborate': 'Contact & collaborate', 'my-kit': 'My kit',
         'atlas': 'Atlas', 'qa': 'Questions & community', 'thailand': 'Thailand exchange',
         'thailand-solo': 'Thailand solo', 'bali': 'Bali', 'philippines': 'Philippines'}
BLOCKS = {'h1', 'h2', 'h3', 'h4', 'p', 'li', 'figcaption'}
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
SKIP_IDS = {'next-chapter','home-title','support','trip','field-notes-list','qa-list',
            'community-threads','journey-notes','postcard-archive','social-diary'}
SKIP_TAGS = {'script','style','noscript','template','form','dialog','svg','button','iframe','video','time'}

class Node:
    def __init__(self, tag='', attrs=(), parent=None, start=0, raw=''):
        self.tag, self.attrs, self.parent, self.start, self.raw = tag, dict(attrs), parent, start, raw
        self.children = []
    def parents(self):
        n = self
        while n:
            yield n
            n = n.parent
    def nodes(self):
        for n in self.children:
            if isinstance(n, Node):
                yield n
                yield from n.nodes()
    def plain(self):
        if self.tag == 'br': return ' '
        return ''.join(n.plain() if isinstance(n, Node) else n for n in self.children)
    def markdown(self):
        body = ''.join(n.markdown() if isinstance(n, Node) else n for n in self.children)
        if self.tag == 'br': return '\n'
        if self.tag in {'b','strong'}: return '**'+body+'**'
        if self.tag in {'i','em'}: return '*'+body+'*'
        if self.tag == 'a': return '['+body+']('+self.attrs.get('href','')+')'
        return body

class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.root = Node(); self.stack = [self.root]; self.offsets = [0]
        for line in text.splitlines(keepends=True): self.offsets.append(self.offsets[-1]+len(line))
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        line,col = self.getpos()
        node = Node(tag, attrs, self.stack[-1], self.offsets[line-1]+col, self.get_starttag_text())
        self.stack[-1].children.append(node)
        if tag not in VOID: self.stack.append(node)
    handle_startendtag = handle_starttag
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]; break
    def handle_data(self, data): self.stack[-1].children.append(data)

def excluded(node):
    for p in node.parents():
        if p.tag in SKIP_TAGS or p.attrs.get('id') in SKIP_IDS: return True
        if p.tag == 'nav' and not any(a.tag=='footer' for a in node.parents()): return True
        if 'hidden' in p.attrs or p.attrs.get('aria-hidden') == 'true': return True
        if any(k.startswith(('data-trip-', 'data-checkin-', 'data-mini-', 'data-current-location',
                             'data-published-', 'data-contact-', 'data-postcard-', 'data-latest-',
                             'data-reading-toc', 'data-site-search')) for k in p.attrs): return True
        if any(c in p.attrs.get('class','').split() for c in ('story-meta','story-toc','trip-countdown-card','postcard-signup','social-diary','support-section')): return True
    return False

def region(node):
    ancestors = list(node.parents())
    section = next((p for p in ancestors if p.tag == 'section' and p.attrs.get('id')), None)
    if not section: section = next((p for p in ancestors if p.tag == 'section'), None)
    if not section: section = next((p for p in ancestors if p.tag in ('main','footer')), node.parent)
    heading = next((p for p in section.nodes() if p.tag in ('h1','h2','h3') and not excluded(p)), None)
    label = re.sub(r'\s+',' ',heading.plain()).strip() if heading else 'Page introduction'
    return section, label[:100] or 'Page content'

def annotate(text, page, catalogues, editable=True):
    doc = Document(text); fields = []; edits = {}; regions = {}; counts = Counter()
    for node in doc.root.nodes():
        in_main = any(p.tag == 'main' for p in node.parents())
        in_footer = any(p.tag == 'footer' for p in node.parents())
        if (not in_main and not in_footer) or (in_main and not editable) or excluded(node): continue
        owner = 'shared' if in_footer else page
        if in_footer and page != 'index': continue
        kind = None
        if node.tag in BLOCKS and not any(p.tag in BLOCKS for p in node.nodes()) and len(node.plain().strip()) >= 3:
            kind = 'text'
            value = node.markdown().strip()
            if len(value) > 8000: continue
        elif node.tag == 'img':
            src = node.attrs.get('src','').split('?')[0].lstrip('/')
            if not re.fullmatch(r'assets/[A-Za-z0-9_./-]+\.(?:webp|jpg|jpeg|png|avif)',src) or '..' in src: continue
            kind = 'image'; value = json.dumps({'src':'/'+src, 'alt':node.attrs.get('alt',''), 'position':'center'},ensure_ascii=False,separators=(',',':'))
        elif node.tag == 'a' and not any(p.tag in BLOCKS for p in list(node.parents())[1:]) and not any(p.tag in BLOCKS or p.tag=='img' for p in node.nodes()):
            if not node.plain().strip() or not node.attrs.get('href'): continue
            kind='link'; value=json.dumps({'text':node.plain().strip(), 'href':node.attrs['href']},ensure_ascii=False,separators=(',',':'))
        if not kind: continue
        container,label = region(node)
        key=(owner,id(container)); current=regions.get(key)
        if not current or len(current['fields']) >= 24 or sum(f['kind']=='image' for f in current['fields']) >= 12:
            number=counts[(owner,label)]; counts[(owner,label)]+=1
            current={'label':('Footer' if in_footer else label)+((' · continued '+str(number+1)) if number else ''),'fields':[]}
            regions[key]=current; fields.append((owner,current))
        field={'kind':kind,'label': ('Photograph: '+node.attrs.get('alt',''))[:110] if kind=='image' else ('Link: '+node.plain().strip()[:80] if kind=='link' else node.plain().strip()[:100]),'default':value,'tag':node.tag}
        current['fields'].append(field); field['_node']=node
    for owner,group in fields:
        signature=json.dumps([[f['kind'],f['default']] for f in group['fields']],ensure_ascii=False)
        group['id']=owner+'-'+sha256(signature.encode()).hexdigest()[:16]
        for i,field in enumerate(group['fields']):
            field['key']='f'+str(i).zfill(2); node=field.pop('_node')
            marker=' data-site-field="'+group['id']+'/'+field['key']+'"'
            edits[node.start]=node.raw[:-2]+marker+'/>' if node.raw.endswith('/>') else node.raw[:-1]+marker+'>'
        catalogues.setdefault(owner,[]).append(group)
    # Footer controls are shared by all public pages, using the same original markup.
    if page != 'index':
        for group in catalogues.get('shared',[]):
            for field in group['fields']:
                for node in doc.root.nodes():
                    if not any(p.tag=='footer' for p in node.parents()) or excluded(node): continue
                    matched = field['kind']=='text' and node.tag==field['tag'] and node.markdown().strip()==field['default']
                    if field['kind']=='link' and node.tag=='a':
                        old=json.loads(field['default']); matched=node.attrs.get('href')==old['href'] and node.plain().strip()==old['text']
                    if matched:
                        marker=' data-site-field="'+group['id']+'/'+field['key']+'"'
                        edits[node.start]=node.raw[:-1]+marker+'>'
    for offset,tag in sorted(edits.items(),reverse=True):
        text=text[:offset]+tag+text[offset+len(doc_text_tag(text,offset)):]
    text=re.sub(r'<body\b', '<body data-site-page="'+page+'"', text,count=1)
    text=text.replace('</head>','<script type="module" src="/assets/website-public.js"></script></head>',1)
    return text

def doc_text_tag(text,offset): return text[offset:text.index('>',offset)+1]

def write_catalogues(root,catalogues):
    folder=root/'data'/'website-editor'; folder.mkdir(exist_ok=True)
    index=[]
    for page,groups in catalogues.items():
        title='Shared footer' if page=='shared' else PAGES.get(page,page.replace('note-','Field Note: ').replace('-',' ').title())
        document={'version':1,'id':page,'title':title,'url':'/' if page in ('index','shared') else '/'+page,'groups':groups}
        (folder/(page+'.json')).write_text(json.dumps(document,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
        index.append({'id':page,'title':title,'url':document['url'],'groups':len(groups),'fields':sum(len(g['fields']) for g in groups)})
    (folder/'catalog.json').write_text(json.dumps({'version':1,'pages':index},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Website editor: '+str(sum(p['fields'] for p in index))+' fields across '+str(len(index))+' page areas')
