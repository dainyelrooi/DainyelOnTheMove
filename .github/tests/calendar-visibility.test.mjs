import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarHiddenIds,saveCalendarVisibility} from '../../assets/calendar-visibility.js';
import {postcardCalendarRow} from '../../assets/postcard-status.js';

const mail='mail-mail-'+'a'.repeat(32),entry='entry-entry-'+'b'.repeat(32);
function fixture(initial=null){
 const rows=new Map(),writes=[];
 if(initial)rows.set('calendarSpaces/staging/preferences/visibility',structuredClone(initial));
 const sdk={doc:(db,...parts)=>parts.join('/'),serverTimestamp:()=>({server:true}),runTransaction:async(db,fn)=>{
  const pending=[];const result=await fn({get:async path=>({exists:()=>rows.has(path),data:()=>rows.get(path)}),set:(path,data)=>pending.push([path,data])});
  for(const [path,data] of pending){rows.set(path,data);writes.push([path,data]);}return result;
 }};return{sdk,rows,writes};
}
test('calendar removal is reversible and touches only private visibility, never provider jobs or stories',async()=>{
 const f=fixture();
 assert.deepEqual(await saveCalendarVisibility(f.sdk,{},'staging',mail,true),[mail]);
 assert.deepEqual(await saveCalendarVisibility(f.sdk,{},'staging',entry,true),[mail,entry]);
 assert.deepEqual(await saveCalendarVisibility(f.sdk,{},'staging',mail,true),[mail,entry]);
 assert.deepEqual(await saveCalendarVisibility(f.sdk,{},'staging',mail,false),[entry]);
 assert.equal(f.rows.size,1);assert.ok(f.writes.every(([path])=>path==='calendarSpaces/staging/preferences/visibility'));
 assert.deepEqual(calendarHiddenIds(f.rows.values().next().value),[entry]);
});
test('malformed, duplicate, oversized and unsupported removals fail closed',async()=>{
 assert.deepEqual(calendarHiddenIds(null),[]);
 for(const value of [{version:2,hiddenIds:[]},{version:1,hiddenIds:[mail,mail]},{version:1,hiddenIds:['unknown']},{version:1,hiddenIds:[{}]},{version:1,hiddenIds:'not-list'}])assert.throws(()=>calendarHiddenIds(value));
 const f=fixture();
 for(const [space,id,hidden] of [['unknown',mail,true],['staging','plan-'+'a'.repeat(32),true],['staging',mail,1]])await assert.rejects(saveCalendarVisibility(f.sdk,{},space,id,hidden));
 const full=Array.from({length:500},(_,i)=>'mail-mail-'+i.toString(16).padStart(32,'0')),bounded=fixture({version:1,hiddenIds:full});
 await assert.rejects(saveCalendarVisibility(bounded.sdk,{},'staging',entry,true),/Restore an older/);assert.equal(bounded.writes.length,0);
 assert.equal((await saveCalendarVisibility(bounded.sdk,{},'staging',full[0],false)).length,499);
 assert.equal(f.writes.length,0);
});
test('sign-out before or during the read prevents a visibility write',async()=>{
 const f=fixture();await assert.rejects(saveCalendarVisibility(f.sdk,{},'staging',mail,true,()=>false),/session-changed/);
 let reads=0;await assert.rejects(saveCalendarVisibility(f.sdk,{},'staging',mail,true,()=>++reads<2),/session-changed/);
 assert.equal(f.writes.length,0);
});
test('the existing calendar presenter removes only the explicitly cancelled receipt, preserving failed and scheduled neighbours',()=>{
 const job={status:'review',campaignId:101,payload:{subject:'Disposable fixture'},provider:{state:'failed',calendarAt:'2026-11-14T09:24:00Z',scheduledAt:'2026-11-14T09:24:00Z',error:'provider-suspended'}},stamp=date=>({toDate:()=>date});
 assert.ok(postcardCalendarRow('mail-'+'a'.repeat(32),job,stamp));
 assert.equal(postcardCalendarRow('mail-'+'a'.repeat(32),{...job,status:'cancelled'},stamp),null);
 assert.ok(postcardCalendarRow('mail-'+'b'.repeat(32),job,stamp));
});
