import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {countries,countryFor,validVisits,publicVisits,mergeDestinations,nextSharedLocation} from '../../assets/visited-model.js';
const base=JSON.parse(await readFile(new URL('../../data/journey.json',import.meta.url),'utf8')).destinations;
test('the shared country catalogue and database allowlist stay aligned',async()=>{
  const rules=await readFile(new URL('../../firestore.rules',import.meta.url),'utf8');
  const codes=JSON.parse(rules.match(/code in (\[[^\]]+\])/)[1].replaceAll("'",'"'));
  assert.deepEqual(codes,countries.map(country=>country.code));
});
test('English, Dutch, accents and codes identify the same country',()=>{
  for(const name of ['Peru','PE','perú'])assert.equal(countryFor(name)?.code,'PE');
  assert.equal(countryFor('Duitsland')?.code,'DE');assert.equal(countryFor('Curacao')?.code,'CW');
  assert.equal(countryFor('not a real country'),null);
});
test('a newly shared country joins every destination model once, while authored memories survive',()=>{
  const prior=base.filter(place=>place.id!=='peru');
  const saved=nextSharedLocation(null,{country:'Peru',city:''},'server',2026);
  const added=mergeDestinations(prior,saved.visits);assert.equal(added.length,prior.length+1);
  assert.equal(added.find(place=>place.name==='Peru').mapName,'Peru');
  const repeated=nextSharedLocation(saved,{country:'PE',city:'Shared city'},'server',2026);
  assert.equal(mergeDestinations(prior,repeated.visits).length,added.length);
  assert.deepEqual(saved.visits,{PE:[2026]});assert.deepEqual(repeated.visits,saved.visits);
  const existing=mergeDestinations(base,{PE:[2026],ID:[2026],GB:[2026],CW:[2026]});
  assert.equal(existing.length,base.length,'Bali and Scotland keep their existing country grouping.');
  assert.equal(existing.find(place=>place.id==='peru').memory,base.find(place=>place.id==='peru').memory);
  assert.equal(existing.find(place=>place.id==='curacao').photo.src,base.find(place=>place.id==='curacao').photo.src);
});
test('revisits keep years, edits are immutable, and hiding a location preserves the archive',()=>{
  const first=nextSharedLocation(null,{country:'Peru'},'server',2026);
  const next=nextSharedLocation(first,{country:'Peru'},'server',2027);
  assert.deepEqual(next.visits.PE,[2026,2027]);assert.deepEqual(first.visits.PE,[2026]);
  const hidden=nextSharedLocation(next,null,'server',2027);
  assert.equal(hidden.country,'');assert.equal(hidden.revision,3);assert.deepEqual(hidden.visits,next.visits);
  assert.deepEqual(publicVisits(hidden),{version:1,revision:3,visits:{PE:[2026,2027]}});
  assert.equal('city' in publicVisits(next),false);
});
test('malformed archives and unsupported future formats do not replace good data',()=>{
  for(const value of [null,[],{XX:[2026]},{PE:['2026']},{PE:[2026,2026]},{PE:[]},{PE:[1899]},{PE:[10000]}])assert.throws(()=>validVisits(value));
  assert.throws(()=>nextSharedLocation({version:3},null,'server'));
  assert.throws(()=>nextSharedLocation(null,{country:'Made up'},'server'));
});
test('clearing can be used again after success, and an unsuccessful clear preserves history and releases the button',async()=>{
  const source=await readFile(new URL('../../js/admin-live.js',import.meta.url),'utf8');
  const handler=source.split("locationClearButton.addEventListener('click', async () => {")[1].split('\n});')[0];
  for(const fail of [false,true]){
    const messages=[],button={disabled:false};let stored=nextSharedLocation(null,{country:'Peru'},'server',2026);
    const context={locationClearButton:button,locationStatus:{},locationDocument:{},db:{},window:{confirm:()=>true},serverTimestamp:()=>'server',nextSharedLocation,setStatus:(_,text)=>messages.push(text),runTransaction:async(_,action)=>{assert.equal(button.disabled,true);if(fail)throw Error('Unavailable');await action({get:async()=>({exists:()=>true,data:()=>stored}),set:(_,value)=>{stored=value;}});}};
    vm.createContext(context);await vm.runInContext('(async()=>{'+handler+'})()',context);
    assert.equal(button.disabled,false);assert.deepEqual(stored.visits,{PE:[2026]});assert.equal(stored.country,fail?'Peru':'');assert.equal(messages.length,1);
  }
});
