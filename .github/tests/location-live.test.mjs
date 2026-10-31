import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {sharedPlaceLabel} from '../../assets/journey-core.js';
const source=(await readFile(new URL('../../js/location-live.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const trip={departureConfirmed:true,departureAt:'2026-10-28T00:00:00+01:00',currentLocation:{country:'Curaçao'}};
const checkin=(country,updatedAt,city)=>({country,...(city?{city}:{}),...(updatedAt?{updatedAt:{toDate:()=>new Date(updatedAt)}}:{})});
function fixture({ready=null,readyState='complete'}={}){
  const place={textContent:''},updated={textContent:''},card={hidden:true},events=[],calls=[];
  const listeners=new Map();
  const document={readyState,querySelector:()=>({}),querySelectorAll:selector=>selector==='[data-location-place]'?[place]:selector==='[data-location-updated]'?[updated]:selector==='[data-location-card]'?[card]:[],getElementById:()=>null,dispatchEvent:event=>events.push(event),addEventListener:(type,callback)=>listeners.set(type,callback)};
  const context={window:ready?{publicTripReady:ready}:{},document,sharedPlaceLabel,db:{},doc:()=>({}),Date,Promise,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},onSnapshot:(ref,options,receive,failed)=>calls.push({options,receive,failed})};
  vm.createContext(context);const load=()=>vm.runInContext('{'+source+'}',context);load();return{...context,calls,events,place,updated,card,load,listeners};
}
test('one shared location listener accepts country-only data and clears withdrawn values authoritatively',async()=>{
  const f=fixture();assert.equal(f.calls.length,1);assert.equal(f.calls[0].options.includeMetadataChanges,true);
  f.calls[0].receive({exists:()=>true,data:()=>({country:'Curaçao'})});
  await settle();
  assert.equal(f.place.textContent,'Curaçao');assert.equal(f.updated.textContent,'Shared date not provided');assert.equal(f.card.hidden,false);
  assert.equal(f.window.siteSharedCheckin.value.country,'Curaçao');
  f.load();assert.equal(f.calls.length,1,'Hashed and plain imports reuse the public subscription.');
  f.calls[0].receive({exists:()=>false});assert.equal(f.window.siteSharedCheckin.known,true);assert.equal(f.window.siteSharedCheckin.value,null);assert.equal(f.events.at(-1).detail,null);assert.equal(f.card.hidden,true);
});
test('cached absence and a connection error never masquerade as an authoritative withdrawal',async()=>{
  const f=fixture();f.calls[0].receive({metadata:{fromCache:true},exists:()=>false});assert.equal(f.window.siteSharedCheckin,undefined);assert.equal(f.events.length,0);
  f.calls[0].failed();assert.equal(f.window.siteSharedCheckin,undefined);assert.equal(f.events.length,0);
  f.calls[0].receive({exists:()=>true,data:()=>({city:'Shared city',country:'Shared country'})});
  await settle();
  f.calls[0].failed();assert.equal(f.window.siteSharedCheckin.value.city,'Shared city');
  f.calls[0].receive({exists:()=>true,data:()=>({city:123,country:'Invalid city'})});assert.equal(f.window.siteSharedCheckin.value,null);
});

test('a positively dated pre-trip check-in never flashes before the confirmed journey place',async()=>{
  let resolveTrip;const ready=new Promise(resolve=>resolveTrip=resolve);const f=fixture({ready});
  f.calls[0].receive({exists:()=>true,data:()=>checkin('The Netherlands','2026-10-25T12:00:00Z','Emmen')});
  await settle();assert.equal(f.events.length,0);assert.equal(f.window.siteSharedCheckin,undefined);
  resolveTrip(trip);await settle();
  assert.equal(f.events.length,1);assert.equal(f.place.textContent,'Curaçao');
  assert.equal(f.window.siteSharedCheckin.value.country,'Curaçao');
  assert.equal('city' in f.window.siteSharedCheckin.value,false);assert.equal('updatedAt' in f.window.siteSharedCheckin.value,false);
  assert.equal(f.updated.textContent,'Shared date not provided');
});

test('new check-ins win and missing age or trip evidence is never guessed obsolete',async()=>{
  const cases=[
    {entry:checkin('New shared place','2026-10-29T12:00:00Z'),context:trip},
    {entry:checkin('Boundary shared place','2026-10-27T23:00:00Z'),context:trip},
    {entry:checkin('Undated shared place'),context:trip},
    {entry:checkin('Unconfirmed shared place','2026-10-25T12:00:00Z'),context:{...trip,departureConfirmed:false}},
    {entry:checkin('No fallback shared place','2026-10-25T12:00:00Z'),context:{...trip,currentLocation:null}},
    {entry:checkin('No boundary shared place','2026-10-25T12:00:00Z'),context:{...trip,departureAt:'invalid'}},
    {entry:checkin('No trip shared place','2026-10-25T12:00:00Z'),context:null}
  ];
  for(const {entry,context} of cases){
    const f=fixture({ready:Promise.resolve(context)});f.calls[0].receive({exists:()=>true,data:()=>entry});await settle();
    assert.equal(f.window.siteSharedCheckin.value.country,entry.country);
  }
});

test('withdrawal or newer snapshot invalidates a pending old check-in before trip context resolves',async()=>{
  let resolveTrip;const ready=new Promise(resolve=>resolveTrip=resolve);const f=fixture({ready});
  f.calls[0].receive({exists:()=>true,data:()=>checkin('Old shared place','2026-10-25T12:00:00Z')});
  f.calls[0].receive({exists:()=>false});assert.equal(f.window.siteSharedCheckin.value,null);
  resolveTrip(trip);await settle();assert.equal(f.window.siteSharedCheckin.value,null);assert.equal(f.events.length,1);
  let resolveNext;const g=fixture({ready:new Promise(resolve=>resolveNext=resolve)});
  g.calls[0].receive({exists:()=>true,data:()=>checkin('Old shared place','2026-10-25T12:00:00Z')});
  g.calls[0].receive({exists:()=>true,data:()=>checkin('Newest shared place','2026-10-29T12:00:00Z')});
  resolveNext(trip);await settle();assert.equal(g.events.length,1);assert.equal(g.window.siteSharedCheckin.value.country,'Newest shared place');
});

test('late trip bootstrap is awaited without another subscription',async()=>{
  const f=fixture({readyState:'loading'});
  f.calls[0].receive({exists:()=>true,data:()=>checkin('Old shared place','2026-10-25T12:00:00Z')});
  await settle();assert.equal(f.events.length,0);
  f.window.publicTripReady=Promise.resolve(trip);f.listeners.get('DOMContentLoaded')();await settle();
  assert.equal(f.window.siteSharedCheckin.value.country,'Curaçao');assert.equal(f.calls.length,1);
});

test('failed trip context and unreadable timestamps never invent a place age or date',async()=>{
  const f=fixture({ready:Promise.reject(new Error('Unavailable trip context'))});
  f.calls[0].receive({exists:()=>true,data:()=>({country:'Shared place',updatedAt:{toDate(){throw new Error('Unreadable timestamp');}}})});
  await settle();assert.equal(f.window.siteSharedCheckin.value.country,'Shared place');
  assert.equal('updatedAt' in f.window.siteSharedCheckin.value,false);assert.equal(f.updated.textContent,'Shared date not provided');
});


test('an absent trip bootstrap after parsing never leaves the location waiting for a past event',async()=>{
  for(const readyState of ['interactive','complete']){
    const f=fixture({readyState});
    f.calls[0].receive({exists:()=>true,data:()=>({country:'Owner-shared place'})});
    await settle();assert.equal(f.window.siteSharedCheckin.value.country,'Owner-shared place');
  }
});
