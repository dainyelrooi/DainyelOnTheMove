#!/usr/bin/env python3
"""Read sent marketing editions; export only public text and canonical website links.

No provider mutation, contact request, tracking URL, recipient field or raw HTML
is ever written to the website. Delay is measured from actual sentDate, not a plan.
"""
import argparse
import base64
import hashlib
from datetime import datetime,timezone,timedelta
from html.parser import HTMLParser
import importlib.util
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit
from urllib.request import build_opener, HTTPRedirectHandler

spec=importlib.util.spec_from_file_location('postcards',Path(__file__).with_name('postcard-delivery.py'))
mail=importlib.util.module_from_spec(spec);spec.loader.exec_module(mail)
ROOT=Path(__file__).resolve().parents[2]
EMAIL=re.compile(r'[^\s<>@]+@[^\s<>@]+\.[A-Za-z]{2,}')
PRIVATE=re.compile(r'\{\{|\{%|unsubscribe|unsubscrib|view (?:this )?(?:email|message) in|manage (?:your )?preferences|email sent to|received this (?:email|message)',re.I)
UPLOADED_IMAGE=re.compile(r'https://dotm-inbox-production[.]dainyelr[.]workers[.]dev/postcard-images/([a-f0-9]{64})[.]jpg\Z')
BRANDING_IMAGES={'/assets/optimized/brand-banner.webp','/assets/optimized/brand-profile.webp','/assets/optimized/responsive/brand-profile-80.webp'}

class NoImageRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def public_photo(photo, persist=False):
    """Retain only an eligible sent letter's exact owner-uploaded public JPEG.

    Check mode performs no network request or write. Upload IDs are the Worker's
    SHA256 of the base64 JPEG; use the same identity before keeping a local copy.
    """
    if not photo:return None
    match=UPLOADED_IMAGE.fullmatch(photo['src'])
    if not match:return photo
    identifier=match[1]
    path=ROOT/'assets/optimized/postcards'/('postcard-upload-'+identifier+'.jpg')
    if persist:
        if path.is_symlink():raise ValueError('Unsafe public image target')
        if path.exists():
            raw=path.read_bytes()
        else:
            with build_opener(NoImageRedirect()).open(photo['src'],timeout=15) as response:
                if response.geturl()!=photo['src'] or response.headers.get_content_type()!='image/jpeg':raise ValueError('Unexpected public image response')
                raw=response.read(140*1024+1)
        if not 100<=len(raw)<=140*1024 or not raw.startswith(b'\xff\xd8\xff') or not raw.endswith(b'\xff\xd9') or hashlib.sha256(base64.b64encode(raw)).hexdigest()!=identifier:
            raise ValueError('Public image differs from its approved identity')
        if not path.exists():
            path.parent.mkdir(parents=True,exist_ok=True)
            with path.open('xb') as target:target.write(raw)
    return {'src':'https://dainyelonthemove.com/'+path.relative_to(ROOT).as_posix(),'alt':photo.get('alt') or 'A photograph from this Postcard'}

def canonical(value,image=False):
    try:
        u=urlsplit(value)
        if image and UPLOADED_IMAGE.fullmatch(value):return value
        if u.scheme!='https' or u.netloc!='dainyelonthemove.com' or u.username or u.password: return None
        if image:
            if u.path in BRANDING_IMAGES:return None
            if u.query or not re.fullmatch(r'/assets/[A-Za-z0-9/_-]+\.(?:webp|jpg|jpeg|png|avif)',u.path):return None
            original=ROOT/u.path.lstrip('/');stem=original.stem
            for candidate in [ROOT/'assets/optimized/responsive'/(stem+'-640.webp'),ROOT/'assets/optimized'/(stem+'.webp'),original]:
                if candidate.is_file() and candidate.stat().st_size<=500000:return 'https://dainyelonthemove.com/'+candidate.relative_to(ROOT).as_posix()
            return None
        path=u.path.removesuffix('.html');path='/' if path=='/index' else path
        if not re.fullmatch(r'/(?:[a-z0-9-]+(?:/[a-z0-9-]+)?)?',path) or path.split('/')[1] in {'admin','studio','search','postcards-form'}: return None
        if u.fragment and not re.fullmatch('[a-zA-Z0-9_-]+',u.fragment): return None
        # All query parameters are dropped; no mirror/recipient/tracking tokens survive.
        return path+('#'+u.fragment if u.fragment else '')
    except ValueError: return None

class PublicCopy(HTMLParser):
    def __init__(self,source):
        super().__init__(convert_charrefs=True);self.skip=[];self.words=[];self.blocks=[];self.links=[];self.image=None;self.heading='';self.in_heading=False;self.feed(source);self.flush()
    def flush(self):
        text=re.sub(r'\s+',' ',' '.join(self.words)).strip();self.words=[]
        if not text or PRIVATE.search(text) or any(email.lower() not in {mail.SENDER,'support@dainyelonthemove.com'} for email in EMAIL.findall(text)): return
        if 'support@dainyelonthemove.com' in text.lower() and 'brevo' in text.lower() and 'netherlands' in text.lower():return
        if self.in_heading and not self.heading and not re.search('take the scenic route|postcards from dainyel|dainyel on the move',text,re.I): self.heading=text[:180]
        if text not in self.blocks and text.lower() not in {'unsubscribe','brevo','take the scenic route.','dainyel on the move','postcards from dainyel'}: self.blocks.append(text)
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs);style=attrs.get('style','').replace(' ','').lower()
        blocked=tag in {'head','script','style','noscript','iframe','form'} or 'display:none' in style or 'visibility:hidden' in style or attrs.get('hidden') is not None
        if self.skip or blocked:
            if tag not in {'img','br','meta','link','input','hr'}: self.skip.append(tag)
            return
        if tag in {'p','h1','h2','h3','li'}: self.flush();self.in_heading=tag in {'h1','h2','h3'}
        if tag=='br': self.words.append(' ')
        if tag=='a':
            url=canonical(attrs.get('href',''))
            if url and url not in self.links:self.links.append(url)
        if tag=='img' and not self.image:
            url=canonical(attrs.get('src',''),True)
            if url:self.image={'src':url,'alt':attrs.get('alt','A photograph from the Postcard')[:240]}
    def handle_endtag(self,tag):
        if self.skip:
            if tag==self.skip[-1]:self.skip.pop()
            return
        if tag in {'p','h1','h2','h3','li','div','td'}:self.flush();self.in_heading=False
    def handle_data(self,data):
        if not self.skip:self.words.append(data)

def eligible(campaign,now):
    if campaign.get('status')!='sent' or campaign.get('type')!='classic' or campaign.get('sender',{}).get('email','').lower()!=mail.SENDER:return False
    recipients=campaign.get('recipients',{});lists=recipients.get('lists',recipients.get('listIds',[]));segments=recipients.get('segments',recipients.get('segmentIds',[]))
    if not ((lists==[3] and not segments) or (segments==[1] and not lists)):return False
    try:sent=mail.date(campaign['sentDate'])
    except (KeyError,ValueError,TypeError):return False
    return sent<=now-timedelta(hours=24)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--mode',choices=['check','sync'],default='check');mode=parser.parse_args().mode
    # Only GET provider operations are used here. Never call the marketing sender.
    now=datetime.now(timezone.utc);candidates=[];offset=0
    for _ in range(10):
        page=mail.brevo('emailCampaigns?status=sent&type=classic&excludeHtmlContent=true&limit=100&offset='+str(offset)+'&sort=desc')
        rows=page.get('campaigns',[])
        if not isinstance(rows,list):raise RuntimeError('Unexpected archive metadata')
        candidates.extend(rows);offset+=len(rows)
        if len(rows)<100:break
    else:raise RuntimeError('Archive exceeds bounded provider page limit; review required')
    output=ROOT/'data/postcards';index=output/'index.json'
    prior=json.loads(index.read_text(encoding='utf-8')) if index.exists() else {'schemaVersion':1,'editions':[]}
    editions={item['id']:item for item in prior['editions']};prepared=[];held=0
    for summary in candidates:
        cid=summary.get('id')
        if not isinstance(cid,int) or cid<=0:continue
        if editions.get('brevo-'+str(cid),{}).get('exportVersion')==2:continue
        # Some list responses omit sentDate; use the authoritative single report.
        if summary.get('sender',{}).get('email','').lower()!=mail.SENDER:continue
        campaign=mail.brevo('emailCampaigns/'+str(cid))
        if not eligible(campaign,now):continue
        identifier='brevo-'+str(cid)
        if editions.get(identifier,{}).get('exportVersion')==2:continue
        source=campaign.get('htmlContent','')
        if not isinstance(source,str) or len(source)>500000:held+=1;continue
        parsed=PublicCopy(source)
        paragraphs=[p for p in parsed.blocks if len(p)>1][:70]
        if not paragraphs or sum(map(len,paragraphs))>24000:held+=1;continue
        subject=re.sub(r'<[^>]*>','',str(campaign.get('subject','Postcard from Dainyel')))[:180]
        if PRIVATE.search(subject):held+=1;continue
        title=parsed.heading or subject
        try:photo=public_photo(parsed.image,persist=mode=='sync')
        except Exception:held+=1;continue
        edition={'id':identifier,'exportVersion':2,'title':title,'subject':subject,'sentAt':campaign['sentDate'],'availableAt':(mail.date(campaign['sentDate'])+timedelta(hours=24)).isoformat(),'paragraphs':paragraphs,'links':parsed.links[:12],'photo':photo}
        item={key:edition[key] for key in ['id','exportVersion','title','sentAt','availableAt','photo']};item['excerpt']=next((p for p in paragraphs if len(p)>60 and p!=title),'Read this edition from the road.')[:240]
        editions[identifier]=item;prepared.append(edition)
    if mode=='sync':
        output.mkdir(parents=True,exist_ok=True);(output/'editions').mkdir(exist_ok=True)
        for edition in prepared:(output/'editions'/(edition['id']+'.json')).write_text(json.dumps(edition,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        items=sorted(editions.values(),key=lambda item:mail.date(item['sentAt']),reverse=True)
        index.write_text(json.dumps({'schemaVersion':1,'editions':items},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Archive '+mode+' complete: '+str(len(prepared))+' eligible new public copies; '+str(held)+' held for review. No campaigns changed and no emails sent.')

if __name__=='__main__':
    try:main()
    except Exception:
        print('Public archive stopped safely. Existing public copies preserved; no provider content, personal links or credentials logged.',file=sys.stderr);sys.exit(1)
