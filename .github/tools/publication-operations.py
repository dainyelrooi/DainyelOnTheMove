"""Bounded owner-only receipts. Leases coordinate independent server clocks.

Only identifiers, fixed reason codes and timestamps are stored; no content.
Publication status in the actual CMS remains the source of truth.
"""
from datetime import timedelta
import uuid

def values(delivery, doc):
    return {key:delivery.unpack(value) for key,value in (doc or {}).get('fields',{}).items()}

def write(delivery, store, path, changes, previous=None):
    fields=dict((previous or {}).get('fields',{}))
    fields.update({key:delivery.pack(value) for key,value in changes.items()})
    result=store.call(delivery.ROOT+':commit','POST',{'writes':[{
        'update':{'name':path,'fields':fields},
        'currentDocument':{'updateTime':previous['updateTime']} if previous else {'exists':False}}]})
    return {'name':path,'fields':fields,'updateTime':result['writeResults'][0]['updateTime']}

def claim(delivery,store,space,kind,identifier,now):
    path=delivery.ROOT+'/adminOperations/'+space+'/'+kind+'Jobs/'+identifier
    previous=store.optional(path);data=values(delivery,previous)
    if any(delivery.date(data[key])>now for key in ['leaseUntil','nextRetryAt'] if data.get(key)):return None
    return write(delivery,store,path,{'version':1,'state':'processing','attempts':min(100000,data.get('attempts',0)+1),
        'leaseId':uuid.uuid4().hex,'leaseUntil':(now+timedelta(minutes=5)).isoformat(),
        'lastCheckedAt':now.isoformat()},previous)

def finish(delivery,store,receipt,now,state,code='',wait_seconds=0):
    data=values(delivery,receipt)
    history=data.get('events',[])[-11:]+[{'at':now.isoformat(),'state':state,'code':code}]
    delay=min(900,30*2**min(data.get('attempts',1)-1,5)) if state=='retrying' else wait_seconds
    return write(delivery,store,receipt['name'],{'state':state,'lastError':code,'events':history,
        'leaseUntil':now.isoformat(),'nextRetryAt':(now+timedelta(seconds=delay)).isoformat(),
        'lastCheckedAt':now.isoformat()},receipt)

def heartbeat(delivery,store,space,now,state,code='',**counts):
    path=delivery.ROOT+'/adminOperations/'+space+'/status/publication'
    previous=store.optional(path)
    changes={'version':1,'source':'server-worker','state':state,'lastError':code,'lastRunAt':now.isoformat(),**counts}
    if state=='healthy':changes['lastSuccessAt']=now.isoformat()
    write(delivery,store,path,changes,previous)
