#!/usr/bin/env python3
"""Snapshot the public channel feed and locally serve its latest thumbnail.
No API key, player, visitor data or paid quota. Preserve the last valid snapshot
if YouTube is temporarily unavailable. The player itself uses the live uploads list.
"""
import argparse
import json
from pathlib import Path
import re
import urllib.request
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[2]
CHANNEL='UC107rsLuNIUqOtjkHG8tm8Q'
def download(url,maximum):
    request=urllib.request.Request(url,headers={'User-Agent':'DainyelOnTheMovePublicFeed/1.0'})
    with urllib.request.urlopen(request,timeout=25) as response:
        raw=response.read(maximum+1)
    if len(raw)>maximum:raise ValueError('Feed exceeds bound')
    return raw
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    root=ET.fromstring(download('https://www.youtube.com/feeds/videos.xml?channel_id='+CHANNEL,1000000));ns={'a':'http://www.w3.org/2005/Atom','yt':'http://www.youtube.com/xml/schemas/2015'}
    channel=root.findtext('yt:channelId',namespaces=ns)
    if channel not in {CHANNEL,CHANNEL[2:]}:raise ValueError('Unexpected channel')
    entries=root.findall('a:entry',ns)
    if not entries:raise ValueError('Empty feed')
    latest=max(entries,key=lambda entry:entry.findtext('a:published',namespaces=ns) or '')
    identifier=latest.findtext('yt:videoId',namespaces=ns)
    if not re.fullmatch('[A-Za-z0-9_-]{11}',identifier or ''):raise ValueError('Invalid public video')
    data={'schemaVersion':1,'channelId':CHANNEL,'videoId':identifier,'title':latest.findtext('a:title',namespaces=ns)[:240],'publishedAt':latest.findtext('a:published',namespaces=ns),'poster':'/assets/optimized/youtube-latest.jpg'}
    if not args.check:
        poster=download('https://i.ytimg.com/vi/'+identifier+'/hqdefault.jpg',500000)
        if not poster.startswith(b'\xff\xd8\xff'):raise ValueError('Invalid thumbnail')
        (ROOT/'assets/optimized/youtube-latest.jpg').write_bytes(poster)
        (ROOT/'data/latest-youtube.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Latest public channel upload verified'+('; snapshot refreshed.' if not args.check else '; no files changed.'))
if __name__=='__main__':
    try:main()
    except Exception:print('Public channel feed unavailable; existing snapshot preserved. The live uploads player and channel links remain available.')
