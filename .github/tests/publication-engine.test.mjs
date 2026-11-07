import test from 'node:test';
import assert from 'node:assert/strict';
import {ROOT,pack,data,reconcileManual} from '../cloudflare/publication-engine.mjs';
const NOW=Date.parse('2026-11-07T17:00:00Z'),id='entry-'+'a'.repeat(32),base=ROOT+'/cmsSpaces/staging';
const payload={version:1,kind:'blog',title:'ISOLATED CLOCK TEST',excerpt:'Synthetic scheduled publication.',body:'## A chapter\nSafe test words.',place:'',sources:'',videoUrl:'',photoIds:[],photoPlacements:[],heroPhotoId:'',heroLayout:'split',heroPosition:'center',storyLabel:'',tripPeriod:''};
const doc=(name,value,version='v1')=>({name,fields:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,pack(v)])),updateTime:version});
function fixture(extra={}){
  const plan=doc(base+'/entrySchedules/'+id,{version:1,entryId:id,draftRevision:2,status:'queued',scheduledAt:new Date(NOW).toISOString(),payload:{...payload,...extra}});
  const rows=new Map([[plan.name,structuredClone(plan)],[base+'/drafts/'+id,doc(base+'/drafts/'+id,{revision:3,body:'Unreviewed later private edits'})]]),commits=[];let sequence=1;
  const adapter={get:async path=>structuredClone(rows.get(path)||null),commit:async writes=>{
    for(const write of writes){const old=rows.get(write.update.name),guard=write.currentDocument;if(guard?.updateTime&&guard.updateTime!==old?.updateTime||guard?.exists===false&&old){const e=Error('conflict');e.status=412;throw e;}}
    const results=[];for(const write of writes){const fields=structuredClone(write.update.fields);for(const transform of write.updateTransforms||[])fields[transform.fieldPath]={timestampValue:new Date(NOW).toISOString()};const updateTime='v'+(++sequence);rows.set(write.update.name,{name:write.update.name,fields,updateTime});results.push({updateTime});}commits.push(writes);return{writeResults:results};
  }};return{plan,rows,commits,adapter};
}
test('cancelled/manual completion is recognised only for identical content and the same publication timestamp',async()=>{
  const f=fixture(),at=new Date(NOW).toISOString(),plan=doc(f.plan.name,{...data(f.plan),status:'cancelled',updatedAt:at});
  const published=doc(base+'/published/'+id,{...payload,publishedAt:at,updatedAt:at});f.rows.set(plan.name,plan);f.rows.set(published.name,published);
  assert.equal(await reconcileManual(f.adapter,plan,published),true);assert.equal(data(f.rows.get(plan.name)).draftRevision,2);
  assert.equal(await reconcileManual(f.adapter,{...plan,fields:{...plan.fields,updatedAt:pack(new Date(NOW+1).toISOString())}},published),false);
});
