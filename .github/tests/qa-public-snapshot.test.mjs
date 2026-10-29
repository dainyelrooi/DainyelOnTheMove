import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the real subscription coordinator without importing the CDN SDK,
// creating submissions or contacting either the database or a public service.
const source=await readFile(new URL('../../js/qa-live.js',import.meta.url),'utf8');
const coordinator=source.slice(source.indexOf('const publicFeedRetries ='),source.indexOf('const topicNames =')).replaceAll('export function ','function ');
const settle=async()=>{for(let n=0;n<8;n++)await Promise.resolve();};
const feed=(ids,{fromCache=false}={})=>({docs:ids.map(id=>({id,data:()=>({id})})),empty:!ids.length,size:ids.length,metadata:{fromCache}});
const saved=ids=>({generatedAt:'2026-10-27T12:00:00Z',snapshot:feed(ids,{fromCache:true})});

function fixture({fallback=async()=>saved(['fixture-cached']),copy=null,onReceive=()=>{},name='answers'}={}){
  const notices=[],controls={hidden:true},received=[],timers=new Map(),events=new Map();let timerId=0,listeners,unavailable=0,stopped=0,fallbackCalls=0,discarded=0,clock=Date.parse('2026-10-27T13:00:00Z');
  const status={hidden:false,textContent:'',after(node){notices.push(node);}};
  class Clock extends Date{static now(){return clock;}}
  const eventTarget={addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:(name,fn)=>{if(events.get(name)===fn)events.delete(name);}};
  const context={Map,Date:Clock,Intl,Promise,encodeURIComponent,space:'staging',window:{...eventTarget},
    document:{...eventTarget,querySelector:()=>controls,createElement:()=>({hidden:false,textContent:'',setAttribute(){},remove(){this.removed=true;}})},
    setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout(id){timers.delete(id);},
    readPublicSnapshot:async(domain,options)=>{assert.equal(domain,'qa');assert.equal(options.space,'staging');return copy;},
    snapshotDocs:rows=>rows.map(row=>({id:row.id,data:()=>row}))};
  vm.createContext(context);vm.runInContext(coordinator+'\nglobalThis.watch=watchPublicFeed;globalThis.retry=retryPublicFeed;globalThis.copy=qaSnapshotCopy;',context);
  const stop=context.watch(name,status,'Loading…',(receive,failed)=>{listeners={receive,failed};return()=>{stopped++;};},
    (snapshot,current,options={})=>{if(current()){received.push({ids:snapshot.docs.map(d=>d.id),fallback:!!options.lastPublishedCopy});onReceive(snapshot);}},
    ()=>{unavailable++;status.hidden=false;status.textContent='Unavailable';},async()=>{fallbackCalls++;return fallback();},()=>{discarded++;});
  return {status,notices,controls,received,timers,context,stop,
    emit:snapshot=>listeners.receive(snapshot),fail:()=>listeners.failed(),retry:()=>context.retry(name),
    advance:milliseconds=>{clock+=milliseconds;},event:name=>events.get(name)?.(),
    counts:()=>({unavailable,stopped,fallbackCalls,discarded})};
}

test('initial outage renders a dated last-published copy through the normal receiver',async()=>{
  const f=fixture();await f.fail();await settle();
  assert.deepEqual(f.received,[{ids:['fixture-cached'],fallback:true}]);
  assert.equal(f.notices[0].hidden,false);
  assert.match(f.notices[0].textContent,/last published copy.*27 Oct 2026.*Netherlands time/);
  assert.equal(f.controls.hidden,false);
});

test('an initial SDK-cache empty result does not block a good public copy',async()=>{
  const f=fixture();f.emit(feed([],{fromCache:true}));await settle();await f.fail();await settle();
  assert.deepEqual(f.received.map(row=>row.ids),[[],['fixture-cached']]);
  assert.equal(f.counts().fallbackCalls,1);
});

test('the existing initial-load deadline can recover from a stalled listener',async()=>{
  const f=fixture();await [...f.timers.values()][0]();await settle();
  assert.deepEqual(f.received,[{ids:['fixture-cached'],fallback:true}]);
});

test('an SDK-cache empty result keeps the server-wait deadline until fallback can load',async()=>{
  const f=fixture();f.emit(feed([],{fromCache:true}));await settle();
  assert.equal(f.timers.size,1,'An SDK-cache callback must not cancel the server deadline');
  await [...f.timers.values()][0]();await settle();
  assert.deepEqual(f.received.map(row=>row.ids),[[],['fixture-cached']]);
});

test('an identical server-empty acknowledgement cancels the pending deadline without another render',async()=>{
  const f=fixture();f.emit(feed([],{fromCache:true}));await settle();f.emit(feed([]));await settle();
  assert.equal(f.timers.size,0);assert.equal(f.received.length,1);assert.equal(f.counts().fallbackCalls,0);
});

test('a healthy authoritative result prevents subsequent stale fallback',async()=>{
  const f=fixture();f.emit(feed(['fixture-live']));await settle();await f.fail();await settle();
  assert.deepEqual(f.received,[{ids:['fixture-live'],fallback:false}]);
  assert.equal(f.counts().fallbackCalls,0);assert.equal(f.notices[0].hidden,true);
});

test('authoritative empty and retry remain empty rather than restoring withdrawn records',async()=>{
  const f=fixture();f.emit(feed([]));await settle();await f.fail();f.retry();
  f.emit(feed(['fixture-stale-sdk'],{fromCache:true}));await f.fail();await settle();
  assert.deepEqual(f.received,[{ids:[],fallback:false}]);
  assert.equal(f.counts().fallbackCalls,0);
});

test('a newer live result wins while the public copy is still loading',async()=>{
  let resolve;const loading=new Promise(done=>{resolve=done;});const f=fixture({fallback:()=>loading});
  const pending=f.fail();f.emit(feed(['fixture-live']));await settle();resolve(saved(['fixture-stale']));await pending;await settle();
  assert.deepEqual(f.received,[{ids:['fixture-live'],fallback:false}]);assert.equal(f.notices[0].hidden,true);
});

test('a live withdrawal replaces a displayed public copy and cannot later be reversed by fallback',async()=>{
  const f=fixture();await f.fail();await settle();f.emit(feed([]));await settle();await f.fail();await settle();
  assert.deepEqual(f.received.map(row=>row.ids),[['fixture-cached'],[]]);
  assert.equal(f.notices[0].hidden,true);assert.equal(f.counts().fallbackCalls,1);
});

test('unavailable public data is not represented as an empty published collection',async()=>{
  const f=fixture({fallback:async()=>null});await f.fail();await settle();
  assert.deepEqual(f.received,[]);assert.equal(f.status.textContent,'Unavailable');assert.equal(f.notices[0].hidden,true);
});

test('removing a community feed invalidates its pending fallback and listener',async()=>{
  let resolve;const loading=new Promise(done=>{resolve=done;});const f=fixture({fallback:()=>loading});
  const pending=f.fail();f.stop();resolve(saved(['fixture-stale']));await pending;f.emit(feed(['fixture-late']));await settle();
  assert.deepEqual(f.received,[]);assert.equal(f.notices[0].removed,true);assert.equal(f.counts().stopped,1);
});

test('Retry invalidates an older in-flight public-copy request',async()=>{
  let resolve;const loading=new Promise(done=>{resolve=done;});const f=fixture({fallback:()=>loading});
  const pending=f.fail();f.retry();resolve(saved(['fixture-obsolete']));await pending;await settle();
  assert.deepEqual(f.received,[]);assert.equal(f.counts().stopped,1);
});

test('a displayed public copy expires on its exact 24-hour deadline',async()=>{
  const f=fixture();await f.fail();await settle();f.advance(23*3600000);
  await [...f.timers.values()][0]();await settle();
  assert.equal(f.counts().discarded,1);assert.equal(f.notices[0].hidden,true);assert.equal(f.status.textContent,'Unavailable');
  f.emit(feed(['fixture-expired-sdk'],{fromCache:true}));await settle();
  assert.equal(f.received.length,1,'An SDK-cache result cannot resurrect an expired public copy');
});

test('returning to a suspended page removes an expired public copy',async()=>{
  for(const event of ['pageshow','visibilitychange']){
    const f=fixture();await f.fail();await settle();f.advance(24*3600000);f.event(event);await settle();
    assert.equal(f.counts().discarded,1);assert.equal(f.notices[0].hidden,true);f.stop();
  }
});

test('copy expiry cannot clear a newer authoritative server result',async()=>{
  const f=fixture();await f.fail();await settle();const delayedExpiry=[...f.timers.values()][0];
  f.emit(feed(['fixture-live']));await settle();f.advance(24*3600000);delayedExpiry();f.event('pageshow');await settle();
  assert.equal(f.counts().discarded,0);assert.deepEqual(f.received.at(-1),{ids:['fixture-live'],fallback:false});
});

test('metadata-only server confirmation is requested for current and legacy answer listeners',()=>{
  const block=source.slice(source.indexOf("watchPublicFeed('answers',"),source.indexOf('communityForm.addEventListener'));
  const subscriptions=[];let error;
  const context={questionStatus:{},publishedQuestions:{},db:{},collection(){},where(){},orderBy(){},limit(){},query(){return {};},
    watchPublicFeed(name,status,message,listen){listen(()=>{},()=>{});},
    onSnapshot(query,options,receive,failed){subscriptions.push(options);error=failed;return()=>{};},
    receivePublishedAnswers(){},showAnswersUnavailable(){},qaSnapshotCopy(){}};
  vm.runInNewContext(block,context);error({code:'failed-precondition'});
  assert.equal(subscriptions.length,2);assert.ok(subscriptions.every(options=>options.includeMetadataChanges===true));
});

test('an identical metadata acknowledgement establishes authority without resetting the reader',async()=>{
  const view={page:0,conversationOpen:false,focus:'none'};
  const f=fixture({onReceive:()=>Object.assign(view,{page:0,conversationOpen:false,focus:'none'})});
  f.emit(feed(['fixture-live'],{fromCache:true}));await settle();
  Object.assign(view,{page:2,conversationOpen:true,focus:'reply-input'});
  f.emit(feed(['fixture-live']));await settle();await f.fail();await settle();
  assert.equal(f.received.length,1);assert.equal(f.counts().fallbackCalls,0);
  assert.deepEqual(view,{page:2,conversationOpen:true,focus:'reply-input'});
});

test('an identical server copy clears the cached notice and expiry without repainting',async()=>{
  const f=fixture();await f.fail();await settle();
  f.emit(feed(['fixture-cached']));await settle();f.advance(24*3600000);f.event('pageshow');
  assert.equal(f.received.length,1);assert.equal(f.notices[0].hidden,true);assert.equal(f.counts().discarded,0);
});

test('the same record ID with corrected content still rerenders',async()=>{
  const f=fixture();
  const record=question=>({docs:[{id:'fixture-one',data:()=>({status:'published',topic:'culture',question,answer:'Fixture answer'})}],metadata:{fromCache:true}});
  f.emit(record('Previous fixture question'));await settle();
  const corrected=record('Corrected fixture question');corrected.metadata.fromCache=false;
  f.emit(corrected);await settle();
  assert.equal(f.received.length,2);
});

test('community server acknowledgement preserves an open conversation with separately loaded replies',async()=>{
  const thread={status:'published',topic:'culture',question:'Fixture conversation?',displayName:'Fixture nickname'};
  const snapshot=data=>({docs:[{id:'fixture-thread',data:()=>data}],metadata:{fromCache:false}});
  const view={open:false};
  const f=fixture({name:'community',onReceive:()=>{view.open=false;},fallback:async()=>({generatedAt:'2026-10-27T12:00:00Z',snapshot:snapshot({...thread,replies:[{id:'fixture-reply'}]})})});
  await f.fail();await settle();view.open=true;f.emit(snapshot(thread));await settle();
  assert.equal(f.received.length,1);assert.equal(view.open,true);assert.equal(f.notices[0].hidden,true);
});

test('a corrected community reply with the same ID is rendered after metadata confirmation',async()=>{
  const f=fixture({name:'replies-fixture-thread'});
  const record=(message,fromCache)=>({docs:[{id:'fixture-reply',data:()=>({status:'published',displayName:'Fixture nickname',message})}],metadata:{fromCache}});
  f.emit(record('Previous fixture reply',true));await settle();f.emit(record('Previous fixture reply',false));await settle();
  assert.equal(f.received.length,1);f.emit(record('Corrected fixture reply',false));await settle();assert.equal(f.received.length,2);
});

test('a missing parent thread is not fabricated as a thread with no replies',async()=>{
  const f=fixture({copy:{generatedAt:'2026-10-27T12:00:00Z',questions:[],threads:[]}});
  assert.equal(await f.context.copy('replies','fixture-missing'),null);
});

test('fallback permalink rendering never performs a direct Firestore lookup',async()=>{
  const fn=source.slice(source.indexOf('async function receivePublishedAnswers('),source.indexOf('function showAnswersUnavailable()'));
  const combine=source.slice(source.indexOf('function combinedAnswers()'),source.indexOf('let answersLoaded ='));
  let lookups=0;const context={URL,location:{href:'https://example.invalid/qa?question=fixture-missing'},publishedAnswers:[],legacyAnswers:[],cloudflarePublic:{questions:[]},snapshotDocs:rows=>rows,answersLoaded:false,activePage:0,
    questionsList:{replaceChildren(){}},questionStatus:{hidden:false,textContent:''},carouselControls:{hidden:false},
    getDoc(){lookups++;throw Error('Network forbidden');},refreshCarousel(){},requestAnimationFrame(){},clearTimeout(){}};
  vm.createContext(context);vm.runInContext(combine+fn+'\nglobalThis.receive=receivePublishedAnswers;',context);
  await context.receive(feed([],{fromCache:true}),()=>true,{lastPublishedCopy:true});
  assert.equal(lookups,0);assert.equal(context.answersLoaded,true);
});
