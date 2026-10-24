#!/usr/bin/env python3
"""Fixed-recipient enquiry delivery. Never log visitor details or send to visitors."""
import argparse
from html import escape
import importlib.util
import os
from pathlib import Path
import re
import sys

spec=importlib.util.spec_from_file_location('postcards',Path(__file__).with_name('postcard-delivery.py'))
mail=importlib.util.module_from_spec(spec);spec.loader.exec_module(mail)
TOPICS={'collaboration','photography','travel-question','website-feedback','privacy','other'}

def pending(store,space):
    rows=store.call(mail.ROOT+'/contactSpaces/'+space+':runQuery','POST',{'structuredQuery':{
        'from':[{'collectionId':'messages'}], 'where':{'fieldFilter':{'field':{'fieldPath':'status'},'op':'EQUAL','value':mail.pack('queued')}},'limit':10}})
    return [row['document'] for row in rows if 'document' in row]

def valid(document):
    d={k:mail.unpack(v) for k,v in document['fields'].items()}
    if d.get('schemaVersion')!=1 or d.get('consent') is not True or d.get('status')!='queued' or d.get('topic') not in TOPICS: raise RuntimeError('Invalid private enquiry')
    for key,minimum,maximum in [('name',1,80),('email',3,254),('message',10,5000),('brand',0,120),('timing',0,120),('budget',0,80)]:
        if not isinstance(d.get(key),str) or not minimum<=len(d[key])<=maximum: raise RuntimeError('Invalid private enquiry')
    if not re.fullmatch(r'[^\s@<>]+@[^\s@<>]+\.[A-Za-z]{2,}',d['email']): raise RuntimeError('Invalid reply address')
    return d

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--mode',choices=['check','process'],default='check');mode=parser.parse_args().mode
    store=mail.Store()
    if mode=='check':
        pending(store,'staging')
        print('Private staging queue is readable by the existing server identity. No email sent or message changed.');return
    if os.environ.get('GITHUB_REF')!='refs/heads/main' or os.environ.get('CONTACT_DELIVERY_ENABLED')!='true': raise RuntimeError('Contact delivery is not activated on main')
    recipient=os.environ.get('QUESTION_NOTIFY_TO','').strip()
    if not re.fullmatch(r'[^\s@<>]+@[^\s@<>]+\.[A-Za-z]{2,}',recipient): raise RuntimeError('Existing fixed owner recipient unavailable')
    mail.provider_configuration() # Existing free plan and verified sender only; no configuration mutation.
    for document in pending(store,'production'):
        claimed=None
        try:
            d=valid(document);request_id=document['name'].rsplit('/',1)[-1]
            if not re.fullmatch('[a-f0-9]{32}',request_id): raise RuntimeError('Invalid request ID')
            claimed=store.update(document,{'status':'processing'}) # CAS before send; processing is never automatically replayed.
            lines=[('Name',d['name']),('Reply email',d['email']),('Topic',d['topic']),('Organisation',d['brand']),('Timing',d['timing']),('Indicative budget',d['budget'])]
            body='<h1>New private website enquiry</h1>'+''.join('<p><strong>'+label+':</strong> '+escape(value)+'</p>' for label,value in lines if value)+'<p>'+escape(d['message']).replace('\n','<br>')+'</p><p>Reference: '+request_id+'</p>'
            result=mail.brevo('smtp/email','POST',{'sender':{'email':mail.SENDER,'name':'Dainyel on the Move'},'to':[{'email':recipient}], 'replyTo':{'email':d['email']}, 'subject':'New website enquiry · '+d['topic'].replace('-',' '),'htmlContent':body,'headers':{'idempotencyKey':request_id},'tags':['private-contact-enquiry']})
            if not isinstance(result.get('messageId'),str): raise RuntimeError('Provider acceptance unconfirmed')
            store.update(claimed,{'status':'accepted'})
        except Exception:
            if claimed:
                try: store.update(claimed,{'status':'held'})
                except Exception: pass
            print('One enquiry needs private review. No uncertain send is replayed and no visitor details are logged.')
    print('Bounded contact queue processed. Provider acceptance does not establish inbox receipt.')

if __name__=='__main__':
    try: main()
    except Exception:
        print('Contact delivery stopped safely. Check configuration privately; no visitor data or credentials logged.',file=sys.stderr);sys.exit(1)
