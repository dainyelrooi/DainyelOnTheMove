"""Freeze the approved topic segment for a new campaign; legacy jobs stay exact."""
import importlib.util
import json
import re
from pathlib import Path

TOPICS={'stories','films','tips'}

def configuration():
    spec=importlib.util.spec_from_file_location('website_service_transport',Path(__file__).with_name('site-tools.py'))
    services=importlib.util.module_from_spec(spec);spec.loader.exec_module(services)
    base=json.loads((Path(__file__).parents[2]/'data/cloudflare.json').read_text())['production']['url'].rstrip('/')
    if base!='https://dotm-inbox-production.dainyelr.workers.dev':raise RuntimeError('Preference service identity changed')
    return services.http(base+'/bridge/preferences','POST',{}, {'Authorization':'Bearer '+services.oidc(base)})

def validate_frozen(topic,audience,form):
    if topic not in TOPICS or not isinstance(audience,dict) or set(audience)!={'segmentIds'} or not isinstance(audience['segmentIds'],list) or len(audience['segmentIds'])!=1 or type(audience['segmentIds'][0]) is not int or audience['segmentIds'][0]<=1 or not isinstance(form,str) or not re.fullmatch(r'[a-f0-9]{24}',form):raise RuntimeError('Topic audience requires review')
    return audience,{'updateFormId':form}

def prepare(delivery,store,document,payload,load=configuration):
    topic=payload.get('audienceTopic')
    if not topic:return document,delivery.AUDIENCE,{}
    if topic not in TOPICS:raise RuntimeError('Unsupported Postcard topic')
    job={key:delivery.unpack(value) for key,value in document['fields'].items()}
    if 'providerAudience' in job:
        audience,extra=validate_frozen(topic,job['providerAudience'],job.get('preferencesFormId'))
        if job.get('providerAudienceTopic')!=topic:raise RuntimeError('Approved topic changed')
        return document,audience,extra
    saved=load();mapping=saved.get('segments',{});form=saved.get('preferencesFormId')
    if set(mapping)!=TOPICS or any(type(v) is not int or v<=1 for v in mapping.values()) or len(set(mapping.values()))!=3:raise RuntimeError('Preference segments are not confirmed')
    audience,extra=validate_frozen(topic,{'segmentIds':[mapping[topic]]},form)
    document=store.update(document,{'providerAudience':audience,'providerAudienceTopic':topic,'preferencesFormId':form})
    return document,audience,extra
