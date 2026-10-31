import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const coreSource=await readFile(new URL('../../assets/journey-core.js',import.meta.url),'utf8');
const core=await import('data:text/javascript;base64,'+Buffer.from(coreSource).toString('base64'));
const statusSource=await readFile(new URL('../../assets/journey-status.js',import.meta.url),'utf8');
const tripSource=await readFile(new URL('../../assets/trip-data.js',import.meta.url),'utf8');
const fixture={title:'Trip to Latin America',departureAt:'2026-10-28T00:00:00+01:00',timeZone:'Europe/Amsterdam',departureConfirmed:true,confirmedDepartureAt:null,endedAt:null,revealedStops:[],currentLocation:{country:'Curaçao'}};
function node(){return{textContent:'',hidden:false,dataset:{departureBadge:fixture.departureAt},attrs:new Map(),setAttribute(key,value){this.attrs.set(key,value);},querySelector:()=>null};}
async function render(trip,serviceState='disabled',{navTrigger=false,staticCopy=false,shared}={}){
  const nodes=new Map(['[data-departure-badge]','[data-trip-phase]','[data-trip-departure]','[data-trip-secret]','[data-checkin-summary]','[data-trip-clock-label]','[data-trip-countdown]','[data-trip-clock-fallback]'].map(selector=>[selector,node()]));
  if(staticCopy){nodes.get('[data-checkin-summary]').textContent='Last shared check-in: Curaçao.';nodes.get('[data-trip-departure]').textContent='The journey is underway.';nodes.get('[data-trip-secret]').textContent='Follow the places, stories and moments I share along the way.';}
  if(navTrigger){const badge=nodes.get('[data-departure-badge]');badge.dataset.navUpdatesTrigger='';badge.textContent='Travel updates';badge.setAttribute('aria-label','Location and updates');}
  const handlers=new Map();
  const document={currentScript:{src:'https://fixture.invalid/assets/journey-status.js'},hidden:false,
    querySelector:selector=>nodes.get(selector)||null,querySelectorAll:selector=>nodes.has(selector)?[nodes.get(selector)]:[],addEventListener:(event,handler)=>handlers.set(event,handler)};
  const window={publicTripReady:Promise.resolve(trip),publicServiceState:serviceState,...(shared?{siteSharedCheckin:shared}:{})};
  runInNewContext(statusSource.replace("import(new URL('journey-core.js',script.src))",'Promise.resolve(core)'),{core,document,window,Intl,Date,Promise,setInterval:()=>1,clearInterval(){},addEventListener(){}});
  await new Promise(resolve=>setImmediate(resolve));
  return{nodes,handlers};
}
test('undated underway status and country-only check-in render without a fake date or city',async()=>{
  const {nodes}=await render(fixture,'unavailable');
  assert.equal(nodes.get('[data-departure-badge]').textContent,'On the move');
  assert.equal(nodes.get('[data-trip-phase]').textContent,'On the move');
  assert.equal(nodes.get('[data-trip-departure]').textContent,'The journey is underway.');
  assert.equal(nodes.get('[data-checkin-summary]').textContent,'Last shared check-in: Curaçao.');
  assert.equal(nodes.get('[data-trip-countdown]').hidden,true);
  assert.equal(nodes.get('[data-trip-clock-label]').textContent,'On the move');
  assert.equal(nodes.get('[data-trip-clock-label]').hidden,true);
  assert.equal(nodes.get('[data-trip-secret]').textContent,'Follow the places, stories and moments I share along the way.');
});
test('an exact owner-supplied timestamp retains the original reporting day and date behavior',async()=>{
  const {nodes}=await render({...fixture,confirmedDepartureAt:'2026-10-28T10:00:00+01:00',currentLocation:{country:'Test country',city:'Test city',updatedAt:'2026-10-28T15:00:00Z'}});
  assert.match(nodes.get('[data-departure-badge]').textContent,/^On the move · day \d+$/);
  assert.equal(nodes.get('[data-trip-departure]').textContent,'On the road since 28 October 2026');
  assert.equal(nodes.get('[data-checkin-summary]').textContent,'Last shared check-in: Test city, Test country. Shared 28 October 2026.');
});
test('journey countdown updates do not overwrite the rotating navigation summary or its stable name',async()=>{
  const {nodes}=await render(fixture,'disabled',{navTrigger:true});
  assert.equal(nodes.get('[data-departure-badge]').textContent,'Travel updates');
  assert.equal(nodes.get('[data-departure-badge]').attrs.get('aria-label'),'Location and updates');
  assert.equal(nodes.get('[data-trip-phase]').textContent,'On the move');
});
async function loadTrip(trip){
  const window={},calls=[];
  const fetch=async url=>{
    calls.push(String(url));
    if(String(url)==='https://fixture.invalid/data/trip.json')return{ok:true,json:async()=>trip};
    if(String(url)==='https://fixture.invalid/data/services.json')return{ok:true,json:async()=>({journeyApi:false})};
    throw Error('Unexpected remote request');
  };
  runInNewContext(tripSource,{URL,window,document:{currentScript:{src:'https://fixture.invalid/assets/trip-data.js'}},fetch});
  const result=await window.publicTripReady;return{result,calls};
}
test('public trip loader preserves the undated confirmation and country without another service',async()=>{
  const {result,calls}=await loadTrip(fixture);
  assert.equal(result.departureConfirmed,true);assert.equal(result.confirmedDepartureAt,null);
  assert.equal(result.currentLocation.country,'Curaçao');assert.deepEqual(Object.keys(result.currentLocation),['country']);
  assert.equal(calls.length,2);assert.ok(calls.every(url=>!url.includes('/api/')));
});
test('public trip loader refuses an ambiguous non-boolean departure confirmation',async()=>{
  const {result}=await loadTrip({...fixture,departureConfirmed:'true'});assert.equal(result,null);
});


test('phase copy stays truthful before departure, while awaiting confirmation and after returning',async()=>{
  const planned=await render({...fixture,departureAt:'2099-10-28T00:00:00+01:00',departureConfirmed:false,currentLocation:null});
  assert.equal(planned.nodes.get('[data-trip-departure]').textContent,'Planned departure · 28 October 2099');
  assert.equal(planned.nodes.get('[data-trip-secret]').textContent,'The route will be revealed along the way.');
  assert.equal(planned.nodes.get('[data-trip-clock-label]').hidden,false);
  assert.equal(planned.nodes.get('[data-trip-countdown]').hidden,false);
  const awaiting=await render({...fixture,departureAt:'2000-01-01T00:00:00Z',departureConfirmed:false,currentLocation:null});
  assert.match(awaiting.nodes.get('[data-trip-secret]').textContent,/share a departure update when it is confirmed/);
  assert.equal(awaiting.nodes.get('[data-trip-clock-label]').hidden,false);
  const completed=await render({...fixture,confirmedDepartureAt:'2000-01-01T00:00:00Z',endedAt:'2000-02-01T00:00:00Z'});
  assert.equal(completed.nodes.get('[data-trip-departure]').textContent,'A journey to remember.');
  assert.equal(completed.nodes.get('[data-trip-secret]').textContent,'Revisit the stories and moments shared from the journey.');
  assert.equal(completed.nodes.get('[data-trip-clock-label]').hidden,true);
});


test('underway copy never claims the whole route is secret when check-ins or reveal cards change',async()=>{
  for(const update of [{currentLocation:null},{currentLocation:{country:'Owner-shared place'}},{revealedStops:[{title:'An already public stop'}]}]){
    const {nodes}=await render({...fixture,...update});
    assert.equal(nodes.get('[data-trip-secret]').textContent,'Follow the places, stories and moments I share along the way.');
    assert.doesNotMatch(nodes.get('[data-trip-departure]').textContent,/Departure confirmed|day/);
  }
});


test('loading never replaces the published underway copy with a guessed planned state',async()=>{
  let resolveTrip;const pending=new Promise(resolve=>resolveTrip=resolve);
  const {nodes,handlers}=await render(pending,'disabled',{staticCopy:true});
  assert.equal(nodes.get('[data-trip-departure]').textContent,'The journey is underway.');
  assert.equal(nodes.get('[data-trip-secret]').textContent,'Follow the places, stories and moments I share along the way.');
  handlers.get('site:check-in')({detail:null});
  assert.equal(nodes.get('[data-checkin-summary]').textContent,'No check-in shared for this trip yet.');
  resolveTrip(fixture);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(nodes.get('[data-trip-departure]').textContent,'The journey is underway.');
  assert.equal(nodes.get('[data-checkin-summary]').textContent,'No check-in shared for this trip yet.');
});

test('an unavailable trip context retains the published static copy',async()=>{
  const {nodes}=await render(Promise.reject(new Error('Trip unavailable')),'unavailable',{staticCopy:true});
  assert.equal(nodes.get('[data-trip-departure]').textContent,'The journey is underway.');
  assert.equal(nodes.get('[data-trip-secret]').textContent,'Follow the places, stories and moments I share along the way.');
});


test('an authoritative cleared check-in hides the static place even when the trip context cannot load',async()=>{
  const {nodes}=await render(Promise.resolve(null),'disabled',{staticCopy:true,shared:{known:true,value:null}});
  assert.equal(nodes.get('[data-checkin-summary]').textContent,'No check-in shared for this trip yet.');
  assert.equal(nodes.get('[data-trip-departure]').textContent,'The journey is underway.');
});
