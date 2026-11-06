import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {mergeDestinations,publicVisits,validVisits} from '../../assets/visited-model.js';
const original=await readFile(new URL('../../assets/visited-data.js',import.meta.url),'utf8');
const source=original.replace(/^import .*;\r?\n/gm,'').replace(/export /g,'').replace("await import('./travel-data.js?v=visits1')",'await Promise.resolve()').replace("import('../js/location-live.js')",'Promise.resolve()');
const base=JSON.parse(await readFile(new URL('../../data/journey.json',import.meta.url),'utf8')).destinations.filter(place=>place.id!=='peru');
function fixture(fetch,space='production'){
  const counter={textContent:''},context={window:{travelData:{visitedDestinations:base}},space,fetch,mergeDestinations,publicVisits,validVisits,document:{querySelectorAll:()=>[counter]}};
  vm.createContext(context);vm.runInContext(source,context);return{...context,counter};
}
test('the public country/year reserve works without Firebase and ignores other namespaces',async()=>{
  for(const space of ['production','staging']){
    const f=fixture(async()=>({ok:true,json:async()=>({version:1,space,revision:1,visits:{PE:[2026]}})}));
    const result=await f.getDestinationArchive();assert.equal(result.length,base.length+(space==='production'?1:0));assert.equal(f.counter.textContent,String(result.length));
  }
});
test('a server-confirmed ledger beats a slow cached response and repeated snapshots do not redraw',async()=>{
  let resolve;const response=new Promise(done=>resolve=done);
  const f=fixture(()=>response);const received=[];f.watchDestinations(value=>received.push(value.length));
  const value={version:2,revision:2,visits:{PE:[2026]}};
  f.receiveSharedVisits(value);resolve({ok:true,json:async()=>({version:1,space:'production',revision:0,visits:{}})});
  await f.getDestinationArchive();await new Promise(done=>setImmediate(done));
  assert.equal(f.counter.textContent,String(base.length+1));const before=received.length;
  f.receiveSharedVisits(value);await new Promise(done=>setImmediate(done));assert.equal(received.length,before);
});
test('an unavailable or malformed copy keeps the authored fallback, without inventing a visit',async()=>{
  for(const fetch of [async()=>{throw Error('Offline');},async()=>({ok:true,json:async()=>({version:1,space:'production',revision:1,visits:{PE:['bad']}})})]){
    const f=fixture(fetch);assert.equal((await f.getDestinationArchive()).length,base.length);
  }
});
