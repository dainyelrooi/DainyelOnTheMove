import test from 'node:test';
import assert from 'node:assert/strict';
import {premierePhase,initYouTubeFeature} from '../../assets/youtube-feature.js';
const start='2026-11-16T12:00:00Z',until='2026-11-18T12:00:00Z';
test('the approved 13:00 Netherlands premiere uses an absolute instant in every visitor timezone',()=>{
  assert.equal(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Amsterdam',hour:'2-digit',minute:'2-digit'}).format(new Date(start)),'13:00');
  assert.equal(new Intl.DateTimeFormat('en-GB',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit'}).format(new Date(start)),'07:00');
  assert.equal(premierePhase(Date.parse(start)-1,start,until),'scheduled');
  assert.equal(premierePhase(Date.parse(start),start,until),'watch');
  assert.equal(premierePhase(Date.parse(until),start,until),'expired');
});
test('invalid windows fail closed and an absent feature needs no browser services',()=>{
  for(const [at,end] of [['bad',until],[start,'bad'],[start,start],[until,start]])assert.equal(premierePhase(Date.now(),at,end),'expired');
  assert.equal(premierePhase(NaN,start,until),'expired');assert.equal(typeof initYouTubeFeature(null),'function');
});
test('an already-open page changes its reminder at the planned instant, expires, and cleans up its clock',()=>{
  const before={document:globalThis.document,window:globalThis.window,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,now:Date.now};
  let now=Date.parse(start)-1000,serial=0;const timers=new Map(),events=new Map(),label={},link={};
  const root={dataset:{premiereAt:start,featureUntil:until},querySelector:s=>s==='[data-premiere-status]'?label:link};
  const surface={hidden:false,addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
  try{
    globalThis.document=surface;globalThis.window=surface;Date.now=()=>now;
    globalThis.setTimeout=(fn,delay)=>{assert.ok(delay>0&&delay<=2147483647);timers.set(++serial,fn);return serial;};globalThis.clearTimeout=id=>timers.delete(id);
    const cleanup=initYouTubeFeature(root);assert.equal(root.hidden,false);assert.match(link.textContent,/reminder/);
    now=Date.parse(start);[...timers.values()][0]();assert.match(link.textContent,/Open the video/);assert.doesNotMatch(label.textContent,/live|published/i);
    now=Date.parse(until);[...timers.values()][0]();assert.equal(root.hidden,true);assert.equal(timers.size,0);
    cleanup();assert.equal(events.size,0);
  }finally{Date.now=before.now;for(const key of ['document','window','setTimeout','clearTimeout']){if(before[key]===undefined)delete globalThis[key];else globalThis[key]=before[key];}}
});
