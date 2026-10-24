"""Public static search corpus. Excludes admin, drafts, forms and service files."""
from html.parser import HTMLParser
import json
import re

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(); self.main=False; self.skip=0; self.words=[]; self.description=''; self.title=[]; self.in_title=False; self.feed(source)
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='main': self.main=True
        if tag in {'script','style','noscript'}: self.skip+=1
        if tag=='title': self.in_title=True
        if tag=='meta' and attrs.get('name')=='description': self.description=attrs.get('content','')
    def handle_endtag(self,tag):
        if tag=='main': self.main=False
        if tag in {'script','style','noscript'}: self.skip=max(0,self.skip-1)
        if tag=='title': self.in_title=False
    def handle_data(self,data):
        if self.in_title: self.title.append(data)
        if self.main and not self.skip: self.words.append(data)

def build(root):
    names={'index','stories','field-notes','videos','atlas','about','my-kit','collaborate','qa','journey','travel-costs','postcards','thailand','thailand-solo','bali','philippines','note-room-to-breathe','note-a-local-place-became-a-ritual','note-more-to-tell-from-the-road','postcard-thailand-photo-journal','privacy','cookies'}
    items=[]
    for name in sorted(names):
        file=root/(name+'.html')
        if not file.exists(): continue
        page=Page(file.read_text(encoding='utf-8'));title=''.join(page.title).split(' | ')[0]
        kind='Travel Story' if name in {'thailand','thailand-solo','bali','philippines'} else 'Field Note' if name.startswith('note-') else 'Postcard' if name.startswith('postcard-') else 'Page'
        items.append({'title':title,'url':'/' if name=='index' else '/'+name,'type':kind,'text':page.description[:400],'keywords':re.sub(r'\s+',' ',' '.join(page.words))[:45000]})
    (root/'data/site-search.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
