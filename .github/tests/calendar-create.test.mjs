import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePlanPost,localToDate,localInput,importId} from '../../assets/content-calendar-model.js';
import {createCalendarPost} from '../../assets/content-calendar-create.js';
const plan={title:'Private calendar test',caption:'An isolated caption',publishLocal:'2026-10-28T12:00',platforms:['instagram','youtube']};
test('social channels are required; private tasks/appointments need no channel or caption',()=>{
  assert.deepEqual(validatePlanPost(plan).platforms,['instagram','youtube']);
  for(const platforms of [[],['unsupported'],null])assert.throws(()=>validatePlanPost({...plan,platforms:platforms===null?'invalid':platforms}));
  for(const kind of ['task','appointment']){const value=validatePlanPost({...plan,kind,caption:''});assert.equal(value.kind,kind);assert.equal(value.caption,'');assert.deepEqual(value.platforms,[]);}
  assert.throws(()=>validatePlanPost({...plan,kind:'other'}));
  assert.throws(()=>validatePlanPost({...plan,designUrl:'https://example.invalid/design/a'}));
});
test('calendar time rejects nonexistent and ambiguous Netherlands dates',()=>{
  assert.equal(localInput(localToDate(plan.publishLocal)),plan.publishLocal);
  for(const value of ['2026-03-29T02:30','2026-10-25T02:30','2026-02-30T12:00'])assert.throws(()=>localToDate(value));
});
test('calendar creation is private, create-only, same-ID retry-safe and session-guarded',async()=>{
  const rows=new Map(),id='plan-'+'a'.repeat(32);let writes=0;
  const sdk={doc:(db,...parts)=>parts.join('/'),Timestamp:{fromDate:date=>({milliseconds:+date,isEqual(other){return this.milliseconds===other?.milliseconds;}})},serverTimestamp:()=>({server:true}),runTransaction:async(db,callback)=>callback({get:async path=>({exists:()=>rows.has(path),data:()=>rows.get(path)}),set:(path,value)=>{writes++;rows.set(path,value);}})};
  const path=['calendarSpaces','staging','posts'];
  await createCalendarPost(sdk,{},path,id,plan,false);
  await createCalendarPost(sdk,{},path,id,plan,false);assert.equal(writes,1);
  const saved=rows.values().next().value;assert.equal(saved.scheduled,false);assert.equal(saved.published,false);assert.equal(saved.remindersEnabled,false);
  await assert.rejects(createCalendarPost(sdk,{},path,id,{...plan,title:'Changed'},false));assert.equal(writes,1);
  await assert.rejects(createCalendarPost(sdk,{},path,'plan-'+'b'.repeat(32),plan,false,()=>false));assert.equal(writes,1);
});

test('calendar import IDs distinguish a task and appointment from an existing same-title social post',async()=>{
 const ids=await Promise.all([undefined,'task','appointment'].map(kind=>importId({...plan,...(kind?{kind}:{})})));assert.equal(new Set(ids).size,3);
 assert.equal(await importId({...plan,kind:'social'}),ids[0]);
});
