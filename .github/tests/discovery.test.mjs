import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {parsePublishedCatalog,catalogFresh,catalogEntry} from '../../assets/published-catalog.js';
import {searchEntries} from '../../assets/search-engine.js';
const now=Date.now(),stamp=new Date(now-60000).toISOString(),id='entry-'+'a'.repeat(32);
const entry={id,kind:'blog',title:'Published local fixture',excerpt:'An approved synthetic fixture for isolated checks.',place:'',publishedAt:stamp};
const catalog={version:1,space:'production',generatedAt:stamp,entries:[entry]};
const flush=async()=>{for(let n=0;n<8;n++)await Promise.resolve();await new Promise(done=>setImmediate(done));};
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return{promise,resolve};};
test('discovery accepts only a fresh same-space bounded published catalogue and projects public summary fields',()=>{
  const result=parsePublishedCatalog({...catalog,entries:[{...entry,privateNote:'never displayed',body:'not needed'}]},'production',now);
  assert.deepEqual(result.entries,[entry]);assert.equal(catalogFresh(result,now),true);
  for(const value of [{...catalog,space:'staging'},{...catalog,generatedAt:new Date(now-86400000).toISOString()},{...catalog,generatedAt:new Date(now+300001).toISOString()},{...catalog,entries:[entry,entry]},{...catalog,entries:[{...entry,id:'private-draft'}]},{...catalog,entries:[{...entry,publishedAt:'unknown'}]}])assert.equal(parsePublishedCatalog(value,'production',now),null);
  assert.equal(catalogEntry({...entry,publishedAt:{toDate:()=>new Date('invalid')}}),null);
  assert.equal(parsePublishedCatalog(catalog,'unsupported',now),null);
});
test('empty search starts with current stories and useful collections; privacy pages remain searchable by name',()=>{
  const rows=[{title:'Cookies and privacy',text:'Your cookie choices',type:'Page',url:'/cookies'},{title:'Old story',text:'An older journey',type:'Travel Story',url:'/bali'},{...entry,type:'Travel Story',text:entry.excerpt,url:'/entry/'+id,cms:true,publishedTime:now},{title:'Explore stories',text:'The archive',type:'Page',url:'/stories'}];
  assert.deepEqual(searchEntries(rows,'').slice(0,2).map(row=>row.url),['/entry/'+id,'/stories']);assert.equal(searchEntries(rows,'cookies')[0].url,'/cookies');
});
const source=await readFile(new URL('../../assets/home-latest.js',import.meta.url),'utf8');
async function home({copy=Promise.resolve(parsePublishedCatalog(catalog,'production')),sdkWait=Promise.resolve(),clock=now}={}){
  const events={},windowEvents={},link={},root={dataset:{},hidden:true,querySelector:()=>link},timers=new Map(),listeners=[];let serial=0;
  const sdk={collection:(...args)=>args,query:(...args)=>args,orderBy:(...args)=>args,limit:n=>{assert.equal(n,1);return n;},onSnapshot:(query,options,next)=>{assert.equal(options.includeMetadataChanges,true);const sub={next,stopped:false};listeners.push(sub);return()=>sub.stopped=true;}};
  class ClockDate extends Date{static now(){return clock;}}
  const context={root,Date:ClockDate,window:{addEventListener:(type,fn)=>windowEvents[type]=fn},document:{querySelector:()=>root,addEventListener:(type,fn)=>events[type]=fn},space:'production',publicLoadReady:()=>Promise.resolve(),readPublishedCatalog:()=>copy,catalogFresh:(value)=>catalogFresh(value,clock),catalogEntry,setTimeout:(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;},clearTimeout:n=>timers.delete(n),fixtures:{db:{},sdkWait:sdkWait.then(()=>sdk)}};
  const script=source.replace(/^import .*;\r?\n/gm,'').replace('export function','function').replaceAll("import('../js/firebase.js')",'Promise.resolve({db:{}})').replaceAll("import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')",'fixtures.sdkWait');
  vm.createContext(context);vm.runInContext(script+'\n;initHomeLatest();',context);await flush();return{root,link,events,windowEvents,timers,listeners,advance(ms){clock+=ms;}};
}
const snapshot=(rows=[],metadata={fromCache:false})=>({metadata,docs:rows.map(row=>({id:row.id,data:()=>row}))});
test('homepage latest story appears from its public reading copy without waiting for the protected SDK',async()=>{
  const blocked=deferred(),f=await home({sdkWait:blocked.promise});assert.equal(f.root.hidden,false);assert.equal(f.link.href,'/entry/'+id);assert.match(f.link.textContent,/Published local fixture/);assert.equal(f.listeners.length,0);
  f.advance(86400000);f.events.visibilitychange();assert.equal(f.root.hidden,true);
});
test('an authoritative empty latest result wins a delayed catalogue; local and pending snapshots cannot withdraw it',async()=>{
  const delayed=deferred(),f=await home({copy:delayed.promise});f.listeners[0].next(snapshot([]));delayed.resolve(parsePublishedCatalog(catalog,'production'));await flush();assert.equal(f.root.hidden,true);
  const cached=await home();cached.listeners[0].next(snapshot([],{fromCache:true}));assert.equal(cached.root.hidden,false);cached.listeners[0].next(snapshot([],{hasPendingWrites:true}));assert.equal(cached.root.hidden,false);
  cached.listeners[0].next(snapshot([]));assert.equal(cached.root.hidden,true);
});
test('live latest changes use the same entry URL, and pagehide blocks late SDK/subscription callbacks',async()=>{
  const f=await home(),next={...entry,id:'entry-'+'b'.repeat(32),title:'A newer published fixture'};f.listeners[0].next(snapshot([next]));assert.equal(f.link.href,'/entry/'+next.id);
  f.windowEvents.pagehide();f.listeners[0].next(snapshot([]));assert.equal(f.root.hidden,false);assert.equal(f.listeners[0].stopped,true);
  const delayed=deferred(),waiting=await home({sdkWait:delayed.promise});waiting.windowEvents.pagehide();delayed.resolve();await flush();assert.equal(waiting.listeners.length,0);
});
