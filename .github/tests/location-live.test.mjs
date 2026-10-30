import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {sharedPlaceLabel} from '../../assets/journey-core.js';
const source=(await readFile(new URL('../../js/location-live.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'');
function fixture(){
  const place={textContent:''},updated={textContent:''},card={hidden:true},events=[],calls=[];
  const document={querySelector:()=>({}),querySelectorAll:selector=>selector==='[data-location-place]'?[place]:selector==='[data-location-updated]'?[updated]:selector==='[data-location-card]'?[card]:[],getElementById:()=>null,dispatchEvent:event=>events.push(event)};
  const context={window:{},document,sharedPlaceLabel,db:{},doc:()=>({}),Date,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},onSnapshot:(ref,options,receive,failed)=>calls.push({options,receive,failed})};
  vm.createContext(context);const load=()=>vm.runInContext('{'+source+'}',context);load();return{...context,calls,events,place,updated,card,load};
}
test('one shared location listener accepts country-only data and clears withdrawn values authoritatively',()=>{
  const f=fixture();assert.equal(f.calls.length,1);assert.equal(f.calls[0].options.includeMetadataChanges,true);
  f.calls[0].receive({exists:()=>true,data:()=>({country:'Curaçao'})});
  assert.equal(f.place.textContent,'Curaçao');assert.equal(f.updated.textContent,'Shared date not provided');assert.equal(f.card.hidden,false);
  assert.equal(f.window.siteSharedCheckin.value.country,'Curaçao');
  f.load();assert.equal(f.calls.length,1,'Hashed and plain imports reuse the public subscription.');
  f.calls[0].receive({exists:()=>false});assert.equal(f.window.siteSharedCheckin.known,true);assert.equal(f.window.siteSharedCheckin.value,null);assert.equal(f.events.at(-1).detail,null);assert.equal(f.card.hidden,true);
});
test('cached absence and a connection error never masquerade as an authoritative withdrawal',()=>{
  const f=fixture();f.calls[0].receive({metadata:{fromCache:true},exists:()=>false});assert.equal(f.window.siteSharedCheckin,undefined);assert.equal(f.events.length,0);
  f.calls[0].failed();assert.equal(f.window.siteSharedCheckin,undefined);assert.equal(f.events.length,0);
  f.calls[0].receive({exists:()=>true,data:()=>({city:'Shared city',country:'Shared country'})});
  f.calls[0].failed();assert.equal(f.window.siteSharedCheckin.value.city,'Shared city');
  f.calls[0].receive({exists:()=>true,data:()=>({city:123,country:'Invalid city'})});assert.equal(f.window.siteSharedCheckin.value,null);
});
