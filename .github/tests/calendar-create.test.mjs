import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePlanPost,localToDate,localInput,importId} from '../../assets/content-calendar-model.js';
import {createCalendarPost} from '../../assets/content-calendar-create.js';
import {calendarMoveDate,saveCalendarPost,initCalendarMove} from '../../assets/content-calendar-move.js';
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

class CalendarStamp{
 constructor(value){this.milliseconds=+new Date(value);}
 toDate(){return new Date(this.milliseconds);}
 isEqual(other){return this.milliseconds===other?.milliseconds;}
}
const movable=(date='2026-03-28T18:30:42.123Z')=>({id:'plan-'+'c'.repeat(32),kind:'social',title:'Private move fixture',publishAt:new CalendarStamp(date),updatedAt:new CalendarStamp('2026-03-01T12:00Z'),scheduled:true,published:false,remindersEnabled:false,caption:'Retain this copy',photo:{dataUrl:'fixture-photo'},platforms:['instagram']});

test('moving a private calendar date preserves Amsterdam time across DST and rejects unsafe dates/linked schedules',()=>{
 const item=movable(),moved=calendarMoveDate(item,'2026-03-29');
 assert.equal(localInput(moved.date),'2026-03-29T19:30');assert.equal(moved.date.toISOString(),'2026-03-29T17:30:42.123Z');assert.equal(moved.changed,true);
 const unchanged=calendarMoveDate(item,'2026-03-28');assert.equal(unchanged.changed,false);assert.equal(+unchanged.date,+item.publishAt.toDate());
 for(const day of ['2026-02-30','2101-01-01','2026-13-01','2026-03-29T12:00'])assert.throws(()=>calendarMoveDate(item,day));
 assert.throws(()=>calendarMoveDate(movable('2026-03-28T01:30Z'),'2026-03-29'),/does not exist/);
 assert.throws(()=>calendarMoveDate(movable('2026-10-24T00:30Z'),'2026-10-25'),/occurs twice/);
 for(const source of ['entry','mail'])assert.throws(()=>calendarMoveDate({...item,source},'2026-04-02'),/own editor/);
});

function calendarStorageFixture(item=movable()){
 const path=['calendarSpaces','staging','posts'],target=[...path,item.id].join('/'),rows=new Map([[target,{...item}]]),writes=[];let next=0,afterRead=()=>{};
 const snapshot=path=>({exists:()=>rows.has(path),data:()=>rows.get(path)});
 const sdk={doc:(db,...parts)=>parts.join('/'),serverTimestamp:()=>new CalendarStamp('2026-03-02T12:00:'+String(next++).padStart(2,'0')+'Z'),
   runTransaction:async(db,callback)=>{const pending=[];await callback({get:async path=>{const value=snapshot(path);afterRead();return value;},update:(path,patch)=>pending.push({path,patch})});for(const write of pending){writes.push(write);rows.set(write.path,{...rows.get(write.path),...write.patch});}},
   getDoc:async path=>snapshot(path)};
 return{path,target,rows,writes,sdk,afterRead(fn){afterRead=fn;}};
}
test('date moves use one revision-checked private update and retain every other calendar field',async()=>{
 const item=movable(),f=calendarStorageFixture(item),when=new CalendarStamp(calendarMoveDate(item,'2026-04-01').date);
 const updated=await saveCalendarPost(f.sdk,{},f.path,item.id,{publishAt:when},item.updatedAt);
 assert.equal(f.writes.length,1);assert.deepEqual(Object.keys(f.writes[0].patch).sort(),['publishAt','updatedAt']);
 const saved=f.rows.get(f.target);assert.equal(saved.publishAt,when);assert.equal(updated,saved.updatedAt);
 for(const key of ['title','caption','photo','platforms','scheduled','published','remindersEnabled'])assert.deepEqual(saved[key],item[key]);
 await assert.rejects(saveCalendarPost(f.sdk,{},f.path,item.id,{publishAt:item.publishAt},item.updatedAt),/calendar-conflict/);assert.equal(f.writes.length,1);
});
test('calendar move storage rejects sign-out before/inside a transaction and refuses an unconfirmed readback',async()=>{
 const item=movable(),f=calendarStorageFixture(item),when=new CalendarStamp(calendarMoveDate(item,'2026-04-01').date);
 await assert.rejects(saveCalendarPost(f.sdk,{},f.path,item.id,{publishAt:when},item.updatedAt,()=>false),/calendar-conflict/);assert.equal(f.writes.length,0);
 let current=true;f.afterRead(()=>current=false);
 await assert.rejects(saveCalendarPost(f.sdk,{},f.path,item.id,{publishAt:when},item.updatedAt,()=>current),/calendar-conflict/);assert.equal(f.writes.length,0);
 const other=calendarStorageFixture(item);other.sdk.getDoc=async()=>({exists:()=>true,data:()=>({...item,publishAt:item.publishAt})});
 await assert.rejects(saveCalendarPost(other.sdk,{},other.path,item.id,{publishAt:when},item.updatedAt),/calendar-conflict/);assert.equal(other.writes.length,1,'An uncertain committed update is never retried automatically.');
});

function calendarMoveUiFixture({fail=false,view='calendar'}={}){
 const node=()=>({listeners:{},dataset:{},disabled:false,hidden:false,open:false,textContent:'',value:'',isConnected:true,addEventListener(name,handler){this.listeners[name]=handler;},focus(){this.focused=true;},showModal(){this.open=true;},close(){this.open=false;},reportValidity:()=>true});
 const fields=new Map(['dialog','form','date','status','close','cancel','save','title','from','time'].map(key=>[key,node()]));fields.get('form').querySelectorAll=()=>['date','cancel','save'].map(key=>fields.get(key));
 const notice=node(),item=movable(),state={abort:new AbortController(),ready:true,busy:false,view,writes:new Set(),entries:new Map([[item.id,item]]),cards:new Map()};
 let current=true,dirty=false,saves=0,saved=null,target=null;const targets=[];
 const redraw=()=>{if(target)target.isConnected=false;target=node();target.dataset.calendarEvent=item.id;targets.push(target);state.cards.set(item.id,{querySelector:selector=>selector==='.calendar-move-button'?target:null});};redraw();
 const root={querySelector(selector){const key=/^\[data-calendar-move-([a-z]+)\]$/.exec(selector)?.[1];return key?fields.get(key):selector==='[data-calendar-status]'?notice:dirty?{}:null;},querySelectorAll:selector=>selector==='[data-calendar-event]'&&state.view==='calendar'?[target]:[]};
 const mover=initCalendarMove({root,state,current:()=>current,save:async(id,date,expected)=>{saves++;assert.equal(id,item.id);assert.equal(expected,item.updatedAt);if(fail)throw Error('calendar-conflict');return new CalendarStamp('2026-03-02T12:00Z');},onSaved:(entry,date,updatedAt)=>{saved={entry,date,updatedAt};},onBusy:redraw});
 const opener=node();return{fields,item,state,mover,notice,opener,targets,target:()=>target,saves:()=>saves,saved:()=>saved,dirty(value){dirty=value;},signOut(){current=false;state.abort.abort();},submit:()=>fields.get('form').listeners.submit({preventDefault(){}})};
}
test('move picker cancellation, same-date save and unsaved/source guards never write',async()=>{
 const f=calendarMoveUiFixture();assert.equal(f.mover.open(f.item.id,null,f.opener),true);
 f.fields.get('date').value='2026-04-01';f.fields.get('cancel').listeners.click();assert.equal(f.fields.get('dialog').open,false);assert.equal(f.saves(),0);assert.equal(f.opener.focused,true);
 assert.equal(f.mover.open(f.item.id,null,f.opener),true);await f.submit();assert.equal(f.saves(),0);assert.match(f.fields.get('status').textContent,/Nothing was changed/);
 f.fields.get('close').listeners.click();f.dirty(true);assert.equal(f.mover.open(f.item.id,'2026-04-01',f.opener),false);assert.match(f.notice.textContent,/unsaved/);assert.equal(f.saves(),0);
 f.dirty(false);assert.equal(f.mover.open(f.item.id,'2026-04-01',f.opener,new CalendarStamp('2020-01-01')),false);assert.equal(f.saves(),0);
 f.state.entries.set('entry-linked',{...f.item,id:'entry-linked',source:'entry'});assert.equal(f.mover.open('entry-linked','2026-04-01',f.opener),false);
});
test('move picker saves only after confirmation and an uncertain save cannot be submitted twice',async()=>{
 const f=calendarMoveUiFixture();f.mover.open(f.item.id,'2026-04-01',f.opener);assert.equal(f.saves(),0);await f.submit();assert.equal(f.saves(),1);assert.equal(localInput(f.saved().date),'2026-04-01T19:30');assert.equal(f.fields.get('dialog').open,false);assert.equal(f.state.writes.size,0);
 const failed=calendarMoveUiFixture({fail:true});failed.mover.open(failed.item.id,'2026-04-01',failed.opener);await failed.submit();assert.equal(failed.saves(),1);assert.equal(failed.fields.get('dialog').open,true);assert.equal(failed.fields.get('save').disabled,true);await failed.submit();assert.equal(failed.saves(),1);
 const signedOut=calendarMoveUiFixture();signedOut.mover.open(signedOut.item.id,'2026-04-01',signedOut.opener);signedOut.signOut();await signedOut.submit();assert.equal(signedOut.saves(),0);assert.equal(signedOut.fields.get('dialog').open,false);assert.equal(signedOut.fields.get('date').value,'');assert.equal(signedOut.fields.get('title').textContent,'Move calendar item');
});

test('confirmed calendar moves restore focus after the final grid redraw or to the visible replacement list control',async()=>{
 for(const view of ['calendar','list']){
  const f=calendarMoveUiFixture({view});f.mover.open(f.item.id,'2026-04-01',f.opener);await f.submit();
  assert.equal(f.saves(),1);assert.equal(f.fields.get('dialog').open,false);assert.equal(f.state.writes.size,0);
  assert.equal(f.target().focused,true,'The control created by the final refresh receives focus.');
  assert.equal(f.opener.focused,undefined,'A completed move must not focus its replaced opener.');
  assert.ok(f.targets.slice(0,-1).every(target=>!target.focused),'No earlier control is focused and then removed by refresh.');
 }
});
