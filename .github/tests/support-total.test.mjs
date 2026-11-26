import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {campaignTotal,createSupportTotal,CAMPAIGN} from '../cloudflare/support-total.mjs';
import {createWorker} from '../cloudflare/worker.mjs';
const time=Date.parse('2026-11-24T18:00:00Z');
const state=(amount=50,currency='eur',slug='dainyelonthemove')=>({slug,payload:{data:{result:{currency_code:currency,donation:{amount},amount_target:0}}},donors:[{name:'Never project this synthetic donor',message:'Private fixture'}]});
const html=value=>'<html><script id="wd-fundraiser-state" type="application/json">'+JSON.stringify(value)+'</script></html>';
const upstream=value=>new Response(html(value),{headers:{'Content-Type':'text/html; charset=utf-8','Set-Cookie':'never-forward=this'}});
const request=new Request('https://fixture.workers.dev/support-total');
const total=(amountMinor=5000,checkedAt=new Date(time).toISOString())=>({schemaVersion:1,currency:'EUR',amountMinor,checkedAt});

test('exact campaign aggregate supports zero, cents and decreases; rejects another currency/campaign or malformed state',()=>{
  assert.equal(campaignTotal(html(state())),5000);assert.equal(campaignTotal(html(state(0))),0);assert.equal(campaignTotal(html(state(12.34))),1234);
  for(const amount of [-1,null,'50',50.001,100000001])assert.throws(()=>campaignTotal(html(state(amount))));
  assert.throws(()=>campaignTotal(html(state(50,'usd'))));assert.throws(()=>campaignTotal(html(state(50,'eur','another-fundraiser'))));
  for(const text of ['missing',html(state())+html(state()),'<script id="wd-fundraiser-state">invalid</script>'])assert.throws(()=>campaignTotal(text));
});

test('concurrent visitors share a bounded read; no cookies, donor data or goal enters the cached/public projection',async()=>{
  let reads=0,current=time,amount=50;const stored=new Map();
  const cache={async match(key){return stored.get(key.url)?.clone();},async put(key,response){stored.set(key.url,response.clone());}};
  const endpoint=createSupportTotal({now:()=>current,cache,fetcher:async(url,options)=>{reads++;assert.equal(url,CAMPAIGN);assert.equal(options.redirect,'manual');assert.equal(options.credentials,undefined);return upstream(state(amount));}});
  const [a,b]=await Promise.all([endpoint(request,{}),endpoint(request,{})]);assert.deepEqual(await a.json(),total());assert.deepEqual(await b.json(),total());assert.equal(reads,1);
  assert.equal(a.headers.get('set-cookie'),null);assert.equal(a.headers.get('cache-control'),'public, max-age=60');
  const newIsolate=createSupportTotal({now:()=>current,cache,fetcher:()=>{throw Error('cache miss');}});
  assert.deepEqual(await (await newIsolate(request,{})).json(),total());
  current+=300001;amount=25;assert.equal((await (await endpoint(request,{})).json()).amountMinor,2500);assert.equal(reads,2);
  assert.doesNotMatch(await (await cache.match(new Request([...stored.keys()][0]))).text(),/donor|goal|target|Private|Cookie/);
});

test('failure and stale data never become a fake zero; redirects, oversized bodies and unexpected formats fail closed with backoff',async()=>{
  for(const response of [new Response('',{status:302}),new Response('{}',{headers:{'content-type':'application/json'}}),upstream({}),new Response('x'.repeat(262145),{headers:{'content-type':'text/html'}})]){
    let reads=0;const endpoint=createSupportTotal({now:()=>time,cache:null,fetcher:async()=>{reads++;return response;}});
    const result=await endpoint(request,{});assert.equal(result.status,503);assert.deepEqual(await result.json(),{error:'support-total-unavailable'});
    assert.equal((await endpoint(request,{})).status,503);assert.equal(reads,1);
  }
  const stale=createSupportTotal({now:()=>time,cache:{match:async()=>Response.json(total(5000,new Date(time-300001).toISOString()))},fetcher:()=>{throw Error('Unavailable');}});
  assert.equal((await stale(request,{})).status,503);
});

test('router keeps staging/production origin boundaries and reads totals without D1, Firebase, auth or submissions',async()=>{
  let reads=0;const worker=createWorker({now:()=>time,fetcher:async()=>{reads++;return upstream(state());}});
  const env={ENABLED:'true',SPACE:'staging',DB:{prepare(){throw Error('No database access allowed');}}};
  const req=(origin,method='GET',path='/support-total')=>new Request('https://fixture.workers.dev'+path,{method,headers:{Origin:origin,'Access-Control-Request-Method':'GET'}});
  const origin='https://dainyelonthemove-staging.web.app';
  const result=await worker.fetch(req(origin),env);assert.equal(result.status,200);assert.equal(result.headers.get('Access-Control-Allow-Origin'),origin);assert.deepEqual(await result.json(),total());
  assert.equal((await worker.fetch(req(origin,'OPTIONS'),env)).status,204);
  assert.equal((await worker.fetch(req('https://dainyelonthemove.com'),env)).status,403);
  assert.equal((await worker.fetch(req('https://evil.invalid'),env)).status,403);
  assert.notEqual((await worker.fetch(req(origin,'POST'),env)).status,200);
  assert.notEqual((await worker.fetch(req(origin,'GET','/support-total?url=https://evil.invalid'),env)).status,200);assert.equal(reads,1);
});

const browserSource=await readFile(new URL('../../assets/support-total.js',import.meta.url),'utf8');
function browser({count=1,reply=total()}={}){
  let current=time,requests=0,observation;const docEvents={},viewEvents={},timers=new Map(),detailEvents={};
  const detail={open:false,addEventListener(name,fn){detailEvents[name]=fn;}};
  const boxes=Array.from({length:count},()=>{const nodes=Object.fromEntries(['amount','fallback','updated'].map(name=>['[data-support-'+name+']',{hidden:name!=='fallback',textContent:''}]));return{nodes,closest:()=>detail,querySelector:selector=>nodes[selector]};});
  const root={hidden:false,querySelectorAll:()=>boxes,addEventListener(name,fn){docEvents[name]=fn;}};
  const view={setTimeout(fn,ms){timers.set(fn,ms);return fn;},clearTimeout(fn){timers.delete(fn);},addEventListener(name,fn){viewEvents[name]=fn;},IntersectionObserver:class{constructor(fn){observation=fn;}observe(){}}};
  const context={fixtures:{root,view,now:()=>current,getEndpoint:async()=>'https://fixture.workers.dev',fetcher:async(url,options)=>{requests++;assert.equal(url,'https://fixture.workers.dev/support-total');assert.equal(options.credentials,'omit');return Response.json(reply);}},Intl,Date,JSON,Number,Error,AbortSignal};
  vm.createContext(context);vm.runInContext(browserSource.replace(/^import .*;\n/,'const getCloudflareConfig=undefined;\n').replaceAll('export function','function')+'\nstartSupportTotals(fixtures);globalThis.format=formatSupportTotal;',context);
  return{boxes,root,detail,timers,docEvents,viewEvents,format:context.format,get requests(){return requests;},advance(ms){current+=ms;},seen(){observation(boxes.map(target=>({target,isIntersecting:true})));},open(){detail.open=true;detailEvents.toggle();}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('counter waits for open/in-view, coalesces placements, refreshes and stops for hidden/offscreen pages',async()=>{
  const f=browser({count:2});assert.equal(f.requests,0);f.seen();assert.equal(f.requests,0);f.open();await flush();assert.equal(f.requests,1);
  for(const box of f.boxes){assert.equal(box.nodes['[data-support-amount]'].textContent,'€50');assert.equal(box.nodes['[data-support-fallback]'].hidden,true);}
  assert.equal(f.timers.size,1);f.root.hidden=true;f.docEvents.visibilitychange();assert.equal(f.timers.size,0);
  f.advance(300001);f.root.hidden=false;f.docEvents.visibilitychange();await flush();assert.equal(f.requests,2);
  f.viewEvents.pagehide();assert.equal(f.timers.size,0);
});
test('invalid or old frontend data leaves the real campaign link visible and does not invent an amount',async()=>{
  for(const reply of [{},total(-1),total(5000,new Date(time-360001).toISOString())]){const f=browser({reply});f.seen();f.open();await flush();assert.equal(f.boxes[0].nodes['[data-support-fallback]'].hidden,false);assert.equal(f.boxes[0].nodes['[data-support-amount]'].hidden,true);}
  assert.equal(browser().format(total(1234),time),'€12.34');
});
test('a cached source check does not add another full five-minute polling delay',async()=>{
  const f=browser({reply:total(15000,new Date(time-240000).toISOString())});f.seen();f.open();await flush();
  assert.equal(f.boxes[0].nodes['[data-support-amount]'].textContent,'€150');
  assert.deepEqual([...f.timers.values()],[60000]);
  f.detail.open=false;f.docEvents.visibilitychange();assert.equal(f.timers.size,0);
});
