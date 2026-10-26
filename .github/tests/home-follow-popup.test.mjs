import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../../assets/home-follow-popup-model.js',import.meta.url),'utf8');
const core=await readFile(new URL('../../assets/journey-core.js',import.meta.url),'utf8');
const url='data:text/javascript;base64,'+Buffer.from(core).toString('base64');
const {followPhase,followEligible,followEngaged,followDismissal,FOLLOW_COOLDOWN_MS,FOLLOW_ALREADY_MS}=await import('data:text/javascript;base64,'+Buffer.from(source.replace("'./journey-core.js'",JSON.stringify(url))).toString('base64'));
const planned='2026-10-28T00:00:00+01:00';
const trip={id:'fixture-trip',departureAt:planned,timeZone:'Europe/Amsterdam',confirmedDepartureAt:null,endedAt:null};
const at=value=>Date.parse(value);

test('predeparture invitation never invents a confirmed departure',()=>{
  assert.equal(followPhase(trip,at(planned)-1),'before');
  assert.equal(followPhase(trip,at(planned)),'awaiting');
  assert.equal(followPhase(trip,at('2026-10-30T23:59:59+01:00')),'awaiting');
  assert.equal(followPhase(trip,at('2026-10-31T00:00:00+01:00')),'follow');
});
test('launch invitation follows the actual confirmed reporting days, not the planned clock',()=>{
  const actual={...trip,confirmedDepartureAt:'2026-10-29T20:00:00+01:00'};
  assert.equal(followPhase(actual,at('2026-10-29T19:59:59+01:00')),'awaiting');
  assert.equal(followPhase(actual,at('2026-10-29T20:00:00+01:00')),'departure');
  assert.equal(followPhase(actual,at('2026-10-31T23:59:59+01:00')),'departure');
  assert.equal(followPhase(actual,at('2026-11-01T00:00:00+01:00')),'follow');
});
test('ended and invalid journeys never create a misleading travel popup',()=>{
  assert.equal(followPhase({...trip,confirmedDepartureAt:planned,endedAt:'2026-10-29T23:00:00+01:00'},at('2026-10-30')),null);
  for(const bad of [null,{}, {...trip,id:''},{...trip,departureAt:'bad'},{...trip,timeZone:'invalid-zone'}])assert.equal(followPhase(bad,at('2026-11-02')),null);
});
test('an invitation requires visible reading time and a quiet moment, with no scrolling prerequisite',()=>{
  assert.equal(followEngaged({visibleMs:9999,idleMs:5000}),false);
  assert.equal(followEngaged({visibleMs:10000,idleMs:1799}),false);
  assert.equal(followEngaged({visibleMs:10000,idleMs:1800}),true);
  assert.equal(followEngaged({visibleMs:10000,scrollProgress:0,idleMs:1800}),true);
  assert.equal(followEngaged({visibleMs:NaN,idleMs:1800}),false);
  assert.equal(followEngaged({visibleMs:10000,idleMs:Infinity}),false);
});
test('dismissal and session caps prevent repeat invitations and cross-clock nags',()=>{
  const now=at('2026-10-26T15:00:00Z'),record=followDismissal(now);
  assert.equal(followEligible(trip,{now}),true);
  assert.equal(followEligible(trip,{now,seenInSession:true}),false);
  assert.equal(followEligible(trip,{now:now-1000,record}),false);
  assert.equal(followEligible(trip,{now:now+FOLLOW_COOLDOWN_MS-1,record}),false);
  assert.equal(followEligible(trip,{now:now+FOLLOW_COOLDOWN_MS,record}),true);
});
test('already-following is an explicit local preference with a longer quiet period',()=>{
  const now=at('2026-10-26T15:00:00Z'),record=followDismissal(now,true);
  assert.equal(record.dismissedUntil-now,FOLLOW_ALREADY_MS);
  assert.equal(followEligible(trip,{now:now+FOLLOW_ALREADY_MS-1,record}),false);
  assert.equal(followEligible(trip,{now:now+FOLLOW_ALREADY_MS,record}),true);
});
