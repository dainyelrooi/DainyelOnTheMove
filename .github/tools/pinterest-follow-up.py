#!/usr/bin/env python3
"""Create private owner tasks for newly published stories. Never publish Pins,
upload photos, call an AI service or send email. Existing calendar mail handles
one combined day-before reminder. New tasks are deterministic and create-only.
"""
import argparse
from datetime import datetime,timezone,timedelta
import hashlib,importlib.util,json,os,re,sys,urllib.request,urllib.error,xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit,urlunsplit
from zoneinfo import ZoneInfo

spec=importlib.util.spec_from_file_location('pinterest_store',Path(__file__).with_name('postcard-delivery.py'))
delivery=importlib.util.module_from_spec(spec);spec.loader.exec_module(delivery)
ROOT=delivery.ROOT;ZONE=ZoneInfo('Europe/Amsterdam');SITE='https://dainyelonthemove.com';SETTINGS=ROOT+'/contentCalendarSettings/pinterest'
RESERVED={'/','/about','/atlas','/journey','/stories','/field-notes','/videos','/my-kit','/qa','/collaborate','/travel-costs','/privacy','/cookies','/postcards','/postcards-form','/entry','/search'}
def canonical(value):
    url=urlsplit(value)
    if url.scheme!='https' or url.netloc!='dainyelonthemove.com' or url.username or url.password:return None
    if url.path in RESERVED or url.path.startswith(('/postcard-','/entry/','/admin','/studio')):return None
    return urlunsplit((url.scheme,url.netloc,url.path.rstrip('/'),'',''))
def task_id(url):return 'plan-'+hashlib.sha256(('pinterest-story-follow-up:'+url).encode()).hexdigest()[:32]
def due_date(published,now):
    day=max(published.astimezone(ZONE).date()+timedelta(days=2),now.astimezone(ZONE).date()+timedelta(days=1))
    return datetime.combine(day,datetime.min.time(),ZONE).replace(hour=19,minute=30)
def task(title,url,published,now):
    return {'version':1,'kind':'task','platforms':[],'title':('Pinterest maken & inplannen · '+title)[:160],
      'caption':'Prepare Pinterest Pins for this published story.\nSource story: '+url+'\n\nUse only real story photographs and supplied experiences. Write English SEO titles and descriptions, verify destination links, and select relevant existing boards and available tagged topics. Save images in the owner\'s OneDrive, not Firestore. Add publication dates to the calendar and one scheduling task per batch.\n\nThe owner schedules Pins manually unless real Pinterest publication authorization is available. Do not recreate the initial prepared series. Avoid Metricool, paid image generation and new subscriptions.\n\nPrivate Pin copy & calendar: '+SITE+'/admin#admin-pinterest',
      'timezone':'Europe/Amsterdam','imageUrl':'','designUrl':'','musicTitle':'','musicArtist':'','musicNote':'','musicSearch':'','musicUrl':'',
      'scheduled':False,'published':False,'remindersEnabled':True,'publishAt':due_date(published,now)}
class Article(HTMLParser):
    def __init__(self):super().__init__();self.article=False;self.url='';self.title='';self.h1=False
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if tag=='meta' and d.get('property')=='og:type':self.article=d.get('content')=='article'
        if tag=='link' and d.get('rel')=='canonical':self.url=d.get('href','')
        if tag=='h1':self.h1=True
    def handle_endtag(self,tag):
        if tag=='h1':self.h1=False
    def handle_data(self,value):
        if self.h1:self.title+=value
def fetch(url,maximum=2*1024*1024):
    request=urllib.request.Request(url,headers={'User-Agent':'DainyelOnTheMovePinterest/1.0'})
    with urllib.request.build_opener(delivery.helpers.NoRedirect()).open(request,timeout=25) as response:
        raw=response.read(maximum+1)
        if len(raw)>maximum:raise RuntimeError('Public response exceeds limit')
        return raw
class Store(delivery.Store):
    def calendar(self):
        result=self.call(ROOT+'/contentCalendar?pageSize=200&mask.fieldPaths=title&mask.fieldPaths=caption&mask.fieldPaths=createdAt')
        rows=result.get('documents',[])
        if len(rows)>=200 or result.get('nextPageToken'):raise RuntimeError('Calendar limit needs owner review')
        return rows
    def published(self,since):
        result=self.call(ROOT+'/cmsSpaces/production:runQuery','POST',{'structuredQuery':{'from':[{'collectionId':'published'}],
          'select':{'fields':[{'fieldPath':k}for k in ['title','kind','publishedAt']]},
          'where':{'fieldFilter':{'field':{'fieldPath':'publishedAt'},'op':'GREATER_THAN_OR_EQUAL','value':{'timestampValue':since.isoformat()}}},
          'orderBy':[{'field':{'fieldPath':'publishedAt'},'direction':'ASCENDING'}],'limit':100}})
        rows=[r['document']for r in result if 'document'in r]
        if len(rows)>=100:raise RuntimeError('Publication window needs owner review')
        return rows
    def create_task(self,url,value,now):
        name=ROOT+'/contentCalendar/'+task_id(url)
        if self.optional(name):return False
        fields={k:({'timestampValue':v.isoformat()}if isinstance(v,datetime)else delivery.pack(v))for k,v in value.items()}
        fields.update({k:{'timestampValue':now.isoformat()}for k in ['createdAt','updatedAt']})
        self.call(ROOT+':commit','POST',{'writes':[{'update':{'name':name,'fields':fields},'currentDocument':{'exists':False}}]});return True
def configuration(store,rows,now):
    doc=store.optional(SETTINGS)
    if doc:
        value={k:delivery.unpack(v)for k,v in doc.get('fields',{}).items()}
        if value.get('version')!=1 or type(value.get('enabled'))is not bool or not isinstance(value.get('seenStaticUrls'),list) or len(value['seenStaticUrls'])>500:raise RuntimeError('Pinterest configuration needs review')
        return doc,value
    # The initial owner-approved Pin import is the baseline. Never create
    # tasks for every old story on the first run or rewrite its checkmarks.
    baseline=[];created=[]
    for row in rows:
        value={k:delivery.unpack(v)for k,v in row['fields'].items()}
        if re.match(r'^Pinterest [A-Z][0-9]{2,3} · ',value.get('title','')):
            match=re.search(r'\n\nLINK\n([^\n]+)',value.get('caption',''))
            if match and (url:=canonical(match[1])):baseline.append(url)
            if value.get('createdAt'):created.append(delivery.date(value['createdAt']))
    return None,{'version':1,'enabled':bool(baseline),'enabledAfter':min(created).isoformat()if created else now.isoformat(),'seenStaticUrls':sorted(set(baseline)),'taskDelayDays':2,'timezone':'Europe/Amsterdam'}
def run(store,now,process=False):
    rows=store.calendar();settings,config=configuration(store,rows,now)
    if not config.get('enabled'):return {'enabled':False,'newTasks':0}
    since=delivery.date(config['enabledAfter']);seen=set(config.get('seenStaticUrls',[]));candidates=[]
    for row in store.published(since):
        value={k:delivery.unpack(v)for k,v in row['fields'].items()};identifier=row['name'].rsplit('/',1)[-1]
        if re.fullmatch('entry-[a-f0-9]{32}',identifier) and value.get('kind')in['blog','field-note','fact']:
            candidates.append((SITE+'/entry/'+identifier,value['title'],delivery.date(value['publishedAt'])))
    sitemap=ET.fromstring(fetch(SITE+'/sitemap.xml',200000))
    urls={e.text for e in sitemap.iter()if e.tag.endswith('}loc')and e.text}
    if len(urls)>500:raise RuntimeError('Public catalogue limit needs review')
    for raw in sorted(urls):
        url=canonical(raw)
        if not url or url in seen:continue
        try:raw_html=fetch(url)
        except urllib.error.HTTPError as error:
            if error.code in {301,302,303,307,308,404}:continue
            raise
        parser=Article();parser.feed(raw_html.decode('utf-8'))
        if parser.article and canonical(parser.url)==url and parser.title.strip():
            # First activation baselines already-published static articles.
            # Unpublished placeholders remain eligible for a later real story.
            if settings is None:seen.add(url)
            else:candidates.append((url,parser.title.strip(),now))
        # A temporary placeholder/non-article must not hide a later real story.
    if len(candidates)>10:raise RuntimeError('New-content burst needs owner review; no baseline advanced')
    created=0
    for url,title,published in candidates[:10]:
        if len(rows)+created>=200:raise RuntimeError('Calendar full')
        if process:
            created+=int(store.create_task(url,task(title,url,published,now),now))
            if canonical(url):seen.add(url)
    if process:
        config['seenStaticUrls']=sorted(seen)
        fields={k:delivery.pack(v)for k,v in config.items()};fields['enabledAfter']={'timestampValue':since.isoformat()};fields['updatedAt']={'timestampValue':now.isoformat()}
        if not settings:fields['createdAt']={'timestampValue':now.isoformat()}
        previous={k:delivery.unpack(v)for k,v in settings.get('fields',{}).items()}if settings else None
        if not settings or previous.get('seenStaticUrls')!=config['seenStaticUrls']:
            store.call(ROOT+':commit','POST',{'writes':[{'update':{'name':SETTINGS,'fields':fields},'currentDocument':{'updateTime':settings['updateTime']}if settings else{'exists':False}}]})
    return {'enabled':True,'candidateCount':len(candidates),'newTasks':created,'process':process}
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--mode',choices=['check','process'],default='check');args=parser.parse_args();store=Store()
    if args.mode=='process':
        if os.environ.get('GITHUB_REF')!='refs/heads/main' or os.environ.get('REPOSITORY_VISIBILITY')!='public':raise RuntimeError('Unapproved execution branch')
        meta=store.call('projects/'+delivery.helpers.PROJECT+'/databases/'+delivery.helpers.DATABASE)
        if meta.get('databaseEdition')!='ENTERPRISE' or not meta.get('freeTier'):raise RuntimeError('Existing free database changed')
    result=run(store,datetime.now(timezone.utc),args.mode=='process')
    print('Pinterest follow-up check complete. Enabled: '+str(result['enabled'])+'. New tasks: '+str(result['newTasks'])+'. No photos, Pins or email sent.')
if __name__=='__main__':
    try:main()
    except Exception:print('Pinterest follow-up stopped safely. No private content logged; existing tasks preserved.',file=sys.stderr);sys.exit(1)
