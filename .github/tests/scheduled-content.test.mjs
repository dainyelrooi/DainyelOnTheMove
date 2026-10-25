import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePlanPost,safeUrl,calendarValueEqual} from '../../assets/content-calendar-model.js';
import {validateCalendarPhoto} from '../../assets/calendar-photo.js';
import {publicationPayload,publicationDate,deleteEntry,deleteMail} from '../../assets/publication-schedule.js';
const photo={dataUrl:'data:image/webp;base64,AAAA',alt:'Private fixture coast',width:20,height:10};
test('Firestore map key ordering cannot turn a confirmed photo save into a conflict',()=>{
  assert.equal(calendarValueEqual(photo,{height:10,width:20,alt:photo.alt,dataUrl:photo.dataUrl}),true);
  assert.equal(calendarValueEqual(photo,{...photo,alt:'Other photo'}),false);
  assert.equal(calendarValueEqual(['instagram','youtube'],['youtube','instagram']),false);
});
test('calendar URLs are optional, spaces clear them and supported scheme-less links normalize',()=>{
  const value=validatePlanPost({title:'Fixture',caption:'Private test',publishLocal:'2026-11-05T12:00',platforms:['instagram'],designUrl:' ',imageUrl:'',musicUrl:''});
  assert.equal(value.designUrl,'');assert.equal(value.imageUrl,'');assert.equal(value.photo,null);
  assert.equal(safeUrl('www.canva.com/design/fixture','designUrl'),'https://www.canva.com/design/fixture');
  assert.throws(()=>safeUrl('www.dainyelonthemove.com','designUrl'),/optional/);
});
test('calendar photograph is optional and bounded; script URLs, metadata, malformed image and oversized fields fail',()=>{
  assert.deepEqual(validateCalendarPhoto(photo),photo);
  for(const bad of [{...photo,dataUrl:'javascript:alert(1)'},{...photo,gps:'private'},{...photo,alt:''},{...photo,width:1601},{...photo,dataUrl:'data:image/webp;base64,'+'A'.repeat(192001)}])assert.throws(()=>validateCalendarPhoto(bad));
});
test('publication dates use Amsterdam, reject DST ambiguity and limit the scheduling window',()=>{
  const now=Date.parse('2026-10-25T12:00Z');assert.equal(publicationDate('2026-11-05T12:00',now).toISOString(),'2026-11-05T11:00:00.000Z');
  for(const value of ['2026-10-25T02:30','2026-10-25T12:59','2027-05-01T12:00'])assert.throws(()=>publicationDate(value,now));
});
test('reviewed publication snapshot includes exact editorial content and excludes private draft metadata',()=>{
  const payload=publicationPayload({kind:'blog',title:'Fixture',excerpt:'An isolated introduction',body:'## Chapter\nIsolated words',place:'',sources:'',videoUrl:'',photoIds:[],privateField:'never',revision:12});
  assert.equal(payload.version,1);assert.equal(payload.heroLayout,'split');assert.equal(payload.privateField,undefined);assert.equal(payload.revision,undefined);
});
function fixture(rows){const writes=[];return {writes,sdk:{doc:(db,...path)=>path.join('/'),serverTimestamp:()=>({server:true}),runTransaction:async(db,callback)=>callback({get:async path=>({exists:()=>rows.has(path),data:()=>rows.get(path)}),delete:path=>writes.push(['delete',path]),update:(path,data)=>writes.push(['update',path,data])})}};}
test('entry deletion checks revision then removes public version and schedule in the same transaction',async()=>{
  const id='entry-'+'a'.repeat(32),base='cmsSpaces/staging/',rows=new Map([['drafts',{revision:3}],['published',{}],['entrySchedules',{status:'queued'}]].map(([kind,v])=>[base+kind+'/'+id,v])),f=fixture(rows);
  await assert.rejects(deleteEntry(f.sdk,{},'staging',id,2));assert.equal(f.writes.length,0);
  await deleteEntry(f.sdk,{},'staging',id,3);assert.deepEqual(f.writes.map(w=>w[1]),['published','summaries','entrySchedules','drafts'].map(kind=>base+kind+'/'+id));
});
test('deleting a queued Postcard cancels delivery; processing and uncertain jobs cannot lose their draft',async()=>{
  const id='mail-'+'b'.repeat(32),base='cmsSpaces/production/',rows=new Map([[base+'mailDrafts/'+id,{revision:2}],[base+'mailJobs/'+id,{status:'queued'}]]),f=fixture(rows);
  await deleteMail(f.sdk,{},'production',id,2);assert.equal(f.writes[0][2].status,'cancelled');assert.equal(f.writes[1][0],'delete');
  for(const status of ['processing','review']){rows.set(base+'mailJobs/'+id,{status});const other=fixture(rows);await assert.rejects(deleteMail(other.sdk,{},'production',id,2));assert.equal(other.writes.length,0);}
});
