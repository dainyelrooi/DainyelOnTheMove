import {test, before, after, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

// No fallback to a cloud project: every write in this suite is a disposable fixture.
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8091');
const require = createRequire(process.env.RULES_TEST_PACKAGE || import.meta.url);
const {initializeTestEnvironment, assertSucceeds, assertFails} = require('@firebase/rules-unit-testing');
const {doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch,
  query, where, orderBy, limit, startAfter, runTransaction, serverTimestamp, Timestamp} = require('firebase/firestore');
const rules = await readFile(process.env.RULES_TEST_SOURCE || new URL('../../../firestore.rules', import.meta.url), 'utf8');
// Read the owner selector from the source under test; never duplicate its address.
const ownerEmail = rules.match(/request\.auth\.token\.email == '([^']+)'/)[1];
let env, owner, visitor;
before(async () => {
  env = await initializeTestEnvironment({projectId:'demo-dotm-launch-audit', firestore:{host:'127.0.0.1',port:8091,rules}});
  owner = env.authenticatedContext('fixture-owner', {email:ownerEmail,email_verified:true,
    firebase:{sign_in_provider:'google.com',sign_in_second_factor:'totp'}}).firestore();
  visitor = env.unauthenticatedContext().firestore();
});
beforeEach(async () => env.clearFirestore());
after(async () => env?.cleanup());
const question = () => ({topic:'philippines',question:'Which island did you visit?',publicationConsent:true,status:'pending',createdAt:serverTimestamp()});
const entryId = 'entry-'+'a'.repeat(32), photoId = 'photo-'+'b'.repeat(32);
const draft = () => ({version:1,kind:'blog',title:'Isolated fixture',excerpt:'A disposable test introduction.',body:'## A chapter\nA disposable test story.',
  place:'Philippines',sources:'',videoUrl:'',photoIds:[photoId],revision:1,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
async function seed(path, data) { await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(),path),data)); }
async function saveDraft(data = draft()) {
  const b = writeBatch(owner), path = 'cmsSpaces/staging/drafts/'+entryId;
  b.set(doc(owner,path),data); b.set(doc(owner,path+'/history/r1'),{version:1,content:data,savedAt:serverTimestamp()});
  await assertSucceeds(b.commit());
}

test('public Q&A allows consented pending submissions and rejects forged publication, extra fields and oversized input', async () => {
  await assertSucceeds(setDoc(doc(visitor,'questions/fixture-good'),question()));
  for (const [id, extra] of Object.entries({published:{status:'published'},answer:{answer:'forged'},consent:{publicationConsent:false},oversized:{question:'x'.repeat(1001)}})) {
    await assertFails(setDoc(doc(visitor,'questions/fixture-'+id),{...question(),...extra}));
  }
  await assertFails(updateDoc(doc(visitor,'questions/fixture-good'),{status:'rejected',updatedAt:serverTimestamp()}));
  await assertFails(deleteDoc(doc(visitor,'questions/fixture-good')));
});

test('pending questions require verified owner AND signed second-factor claims; public queries need a publication filter', async () => {
  await seed('questions/private', {...question(),createdAt:Timestamp.now()});
  await seed('questions/public', {...question(),status:'published',answer:'Fixture answer',answeredAt:Timestamp.now(),createdAt:Timestamp.now()});
  await assertFails(getDoc(doc(visitor,'questions/private')));
  await assertSucceeds(getDoc(doc(visitor,'questions/public')));
  await assertFails(getDocs(query(collection(visitor,'questions'),limit(50))));
  assert.equal((await assertSucceeds(getDocs(query(collection(visitor,'questions'),where('status','==','published'),limit(50))))).size,1);
  for (const claims of [
    {email:'fixture@example.invalid',email_verified:true,firebase:{sign_in_second_factor:'totp'}},
    {email:ownerEmail,email_verified:false,firebase:{sign_in_second_factor:'totp'}},
    {email:ownerEmail,email_verified:true,firebase:{sign_in_provider:'google.com'}}]) {
    await assertFails(getDoc(doc(env.authenticatedContext('fixture-other',claims).firestore(),'questions/private')));
  }
  await assertSucceeds(getDoc(doc(owner,'questions/private')));
});

test('owner moderation paging reaches 123 fixture records with at most 50 documents per query', async () => {
  await env.withSecurityRulesDisabled(async c => {
    const db=c.firestore(), b=writeBatch(db);
    for(let i=0;i<123;i++) b.set(doc(db,'questions/fixture-'+String(i).padStart(3,'0')),{...question(),createdAt:Timestamp.fromMillis(1700000000000+i)});
    await b.commit();
  });
  const base=query(collection(owner,'questions'),where('status','==','pending'),orderBy('createdAt','asc'));
  let cursor, seen=new Set(), sizes=[];
  do {
    const page=await assertSucceeds(getDocs(query(base,...(cursor?[startAfter(cursor)]:[]),limit(50))));
    sizes.push(page.size);page.docs.forEach(d=>seen.add(d.id));cursor=page.size===50?page.docs.at(-1):undefined;
  } while(cursor);
  assert.deepEqual(sizes,[50,50,23]);assert.equal(seen.size,123);
});

test('private CMS saves require immutable matching history and bounded reads', async () => {
  await assertFails(setDoc(doc(owner,'cmsSpaces/staging/drafts/'+entryId),draft()));
  await saveDraft();
  await assertFails(getDoc(doc(visitor,'cmsSpaces/staging/drafts/'+entryId)));
  await assertFails(getDocs(collection(owner,'cmsSpaces/staging/drafts')));
  await assertSucceeds(getDocs(query(collection(owner,'cmsSpaces/staging/drafts'),limit(100))));
  await assertFails(updateDoc(doc(owner,'cmsSpaces/staging/drafts/'+entryId+'/history/r1'),{version:2}));
  await assertSucceeds(deleteDoc(doc(owner,'cmsSpaces/staging/drafts/'+entryId)));
  await assertFails(setDoc(doc(owner,'cmsSpaces/unsupported/drafts/'+entryId),draft()));
});

test('CMS publication matches its draft, summary matches publication, private media is withdrawn with its parent', async () => {
  await saveDraft();
  await assertSucceeds(setDoc(doc(owner,'cmsSpaces/staging/media/'+photoId),{version:1,entryId,dataUrl:'data:image/webp;base64,AAAA',alt:'Fixture coast',width:10,height:10,createdAt:serverTimestamp()}));
  await assertFails(getDoc(doc(visitor,'cmsSpaces/staging/media/'+photoId)));
  const saved=(await getDoc(doc(owner,'cmsSpaces/staging/drafts/'+entryId))).data();
  const {revision,createdAt,...content}=saved;
  const post={...content,publishedAt:serverTimestamp(),updatedAt:serverTimestamp()};
  await assertFails(setDoc(doc(owner,'cmsSpaces/staging/published/'+entryId),{...post,title:'Unreviewed different content'}));
  const b=writeBatch(owner);
  b.set(doc(owner,'cmsSpaces/staging/published/'+entryId),post);
  b.set(doc(owner,'cmsSpaces/staging/summaries/'+entryId),{version:1,kind:saved.kind,title:saved.title,excerpt:saved.excerpt,place:saved.place,coverPhotoId:photoId,publishedAt:serverTimestamp(),updatedAt:serverTimestamp()});
  await assertSucceeds(b.commit());
  await assertSucceeds(getDoc(doc(visitor,'cmsSpaces/staging/media/'+photoId)));
  await assertFails(deleteDoc(doc(owner,'cmsSpaces/staging/summaries/'+entryId)));
  const withdrawal=writeBatch(owner);withdrawal.delete(doc(owner,'cmsSpaces/staging/published/'+entryId));withdrawal.delete(doc(owner,'cmsSpaces/staging/summaries/'+entryId));
  await assertSucceeds(withdrawal.commit());
  await assertFails(getDoc(doc(visitor,'cmsSpaces/staging/media/'+photoId)));
  await assertSucceeds(getDoc(doc(owner,'cmsSpaces/staging/media/'+photoId)));
});

test('the advertised twelve-photo limit with chapter positions and a separate banner can be saved and published', async () => {
  const data={...draft(),photoIds:Array.from({length:12},(_,i)=>'photo-'+i.toString(16).padStart(32,'0')),
    photoPlacements:Array.from({length:12},(_,i)=>i%3),heroPhotoId:'photo-'+(11).toString(16).padStart(32,'0'),heroLayout:'wide',heroPosition:'bottom',storyLabel:'Fixture journal',tripPeriod:'August 2025'};
  await saveDraft(data);
  const {revision,createdAt,...content}=(await getDoc(doc(owner,'cmsSpaces/staging/drafts/'+entryId))).data();
  await assertSucceeds(setDoc(doc(owner,'cmsSpaces/staging/published/'+entryId),{...content,publishedAt:serverTimestamp(),updatedAt:serverTimestamp()}));
  const plan={version:1,entryId,draftRevision:1,payload:schedulePayload({...content,revision:1}),scheduledAt:Timestamp.fromMillis(Date.now()+3600000),status:'queued',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
  await assertSucceeds(setDoc(doc(owner,'cmsSpaces/staging/entrySchedules/'+entryId),plan));
});

test('contact requires an atomic gate, blocks immediate repetition and keeps personal fields private', async () => {
  const id='c'.repeat(32), path='contactSpaces/staging/messages/'+id;
  const message={schemaVersion:1,name:'STAGING FIXTURE',email:'fixture@example.invalid',topic:'website-feedback',brand:'',timing:'',budget:'',message:'Disposable isolated contact test.',consent:true,status:'queued',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
  await assertFails(setDoc(doc(visitor,path),message));
  const b=writeBatch(visitor);
  b.set(doc(visitor,path),message);
  b.set(doc(visitor,'contactSpaces/staging/limits/submission'),{count:1,windowStart:serverTimestamp(),updatedAt:serverTimestamp(),lastRequest:id});
  await assertSucceeds(b.commit());
  await assertFails(getDoc(doc(visitor,path)));
  await assertSucceeds(getDoc(doc(owner,path)));
  const again=writeBatch(visitor), next='d'.repeat(32);
  again.set(doc(visitor,'contactSpaces/staging/messages/'+next),message);
  again.update(doc(visitor,'contactSpaces/staging/limits/submission'),{count:2,updatedAt:serverTimestamp(),lastRequest:next});
  await assertFails(again.commit());
  await assertSucceeds(updateDoc(doc(owner,path),{status:'closed',updatedAt:serverTimestamp()}));
});

test('staging cannot queue email, browser cannot enable delivery or read worker outboxes', async () => {
  await seed('cmsSpaces/staging/mailSettings/delivery',{enabled:true});
  await assertFails(setDoc(doc(owner,'cmsSpaces/staging/mailJobs/mail-'+'e'.repeat(32)),{status:'queued'}));
  await assertFails(updateDoc(doc(owner,'cmsSpaces/staging/mailSettings/delivery'),{enabled:false}));
  await assertFails(getDoc(doc(visitor,'cmsSpaces/staging/mailSettings/delivery')));
  await assertFails(getDoc(doc(owner,'notificationOutbox/fixture')));
});

test('calendar accepts private social posts, tasks and appointments only for the signed MFA owner',async()=>{
  const {createCalendarPost}=await import('../../../assets/content-calendar-create.js');
  const sdk={doc,runTransaction,Timestamp,serverTimestamp},path=['calendarSpaces','staging','posts'];
  for(const [index,kind] of ['social','task','appointment'].entries()){
    const id='plan-'+String(index).repeat(32),plan={kind,title:'DISPOSABLE CALENDAR FIXTURE',caption:kind==='social'?'Isolated test caption':'',publishLocal:'2026-10-28T12:00',platforms:['instagram','youtube']};
    const target=await assertSucceeds(createCalendarPost(sdk,owner,path,id,plan,false));
    const saved=(await getDoc(target)).data();assert.equal(saved.scheduled,false);assert.equal(saved.published,false);assert.equal(saved.remindersEnabled,false);
    assert.deepEqual(saved.platforms,kind==='social'?['instagram','youtube']:[]);
    await assertSucceeds(updateDoc(target,{published:true,updatedAt:serverTimestamp()}));
    await assertFails(getDoc(doc(visitor,...path,id)));
    await assertFails(setDoc(doc(visitor,...path,'plan-'+'f'.repeat(32)),saved));
    await assertFails(updateDoc(target,{kind:'unknown',updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(target,{privateExtra:'unrecognised',updatedAt:serverTimestamp()}));
    if(kind!=='social')await assertFails(updateDoc(target,{platforms:['instagram'],updatedAt:serverTimestamp()}));
    await assertSucceeds(deleteDoc(target));
  }
  const noMfa=env.authenticatedContext('fixture-without-mfa',{email:ownerEmail,email_verified:true,firebase:{sign_in_provider:'google.com'}}).firestore();
  await assertFails(getDoc(doc(noMfa,...path,'plan-'+'0'.repeat(32))));
});

test('calendar photo create/replace/remove/delete works in both spaces and remains owner-private and bounded',async()=>{
  const {createCalendarPost}=await import('../../../assets/content-calendar-create.js');
  const photo={dataUrl:'data:image/webp;base64,AAAA',alt:'Isolated photo',width:20,height:10};
  for(const path of [['calendarSpaces','staging','posts'],['contentCalendar']]){
    const id='plan-'+'c'.repeat(32),target=await createCalendarPost({doc,runTransaction,Timestamp,serverTimestamp},owner,path,id,{title:'Disposable photo fixture',caption:'Private caption',publishLocal:'2026-11-05T12:00',platforms:['instagram'],photo},false);
    await assertFails(getDoc(doc(visitor,...path,id)));
    await assertFails(updateDoc(target,{photo:{...photo,privateExtra:'not allowed'},updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(target,{photo:{...photo,dataUrl:'x'.repeat(192001)},updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(target,{photo:{...photo,width:1601},updatedAt:serverTimestamp()}));
    await assertSucceeds(updateDoc(target,{photo:{...photo,alt:'Replaced photo'},updatedAt:serverTimestamp()}));
    await assertSucceeds(updateDoc(target,{photo:null,updatedAt:serverTimestamp()}));
    await assertFails(deleteDoc(doc(visitor,...path,id)));await assertSucceeds(deleteDoc(target));
  }
});

function schedulePayload(data){const {revision,createdAt,updatedAt,...payload}=data;return {...payload,heroPhotoId:payload.heroPhotoId||'',heroLayout:payload.heroLayout||'split',heroPosition:payload.heroPosition||'center',storyLabel:payload.storyLabel||'',tripPeriod:payload.tripPeriod||'',photoPlacements:payload.photoPlacements||payload.photoIds.map(()=>0)};}
async function seedSchedule(space='staging'){
  const data={...draft(),photoPlacements:[0],heroPhotoId:photoId,heroLayout:'wide',heroPosition:'center',storyLabel:'',tripPeriod:''};
  const b=writeBatch(owner),parent=doc(owner,'cmsSpaces',space,'drafts',entryId);
  b.set(parent,data);b.set(doc(parent,'history/r1'),{version:1,content:data,savedAt:serverTimestamp()});await assertSucceeds(b.commit());
  return {version:1,entryId,draftRevision:1,payload:schedulePayload((await getDoc(parent)).data()),scheduledAt:Timestamp.fromMillis(Date.now()+3600000),status:'queued',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
}
test('publication schedules are exact private reviewed snapshots with safe owner cancellation, rescheduling and deletion',async()=>{
  const value=await seedSchedule(),target=doc(owner,'cmsSpaces/staging/entrySchedules/'+entryId);
  await assertSucceeds(setDoc(target,value));
  await assertFails(getDoc(doc(visitor,'cmsSpaces/staging/entrySchedules/'+entryId)));
  await assertFails(getDocs(query(collection(visitor,'cmsSpaces/staging/entrySchedules'),limit(100))));
  const withoutMfa=env.authenticatedContext('fixture-schedule-no-mfa',{email:ownerEmail,email_verified:true,firebase:{sign_in_provider:'google.com'}}).firestore();
  await assertFails(getDoc(doc(withoutMfa,'cmsSpaces/staging/entrySchedules/'+entryId)));
  await assertFails(updateDoc(target,{status:'published',updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(target,{payload:{...value.payload,title:'Unreviewed'},updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(target,{scheduledAt:Timestamp.now(),updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(target,{privateExtra:'never',updatedAt:serverTimestamp()}));
  await assertFails(deleteDoc(doc(owner,'cmsSpaces/staging/drafts/'+entryId)));
  await assertSucceeds(updateDoc(target,{status:'cancelled',updatedAt:serverTimestamp()}));
  await assertSucceeds(updateDoc(target,{status:'queued',scheduledAt:Timestamp.fromMillis(Date.now()+7200000),updatedAt:serverTimestamp()}));
  const {deleteEntry}=await import('../../../assets/publication-schedule.js');await assertSucceeds(deleteEntry({doc,runTransaction},owner,'staging',entryId,1));
  assert.equal((await getDoc(target)).exists(),false);
  await assertSucceeds(getDoc(doc(owner,'cmsSpaces/staging/drafts/'+entryId+'/history/r1')));
});
test('linked Postcard must match the reviewed mail and same future story/revision, and can be cancelled/deleted without sending',async()=>{
  const plan=await seedSchedule('production'),planRef=doc(owner,'cmsSpaces/production/entrySchedules/'+entryId);await assertSucceeds(setDoc(planRef,plan));
  const id='mail-'+'d'.repeat(32),data={version:1,entryId,subject:'Disposable email',previewText:'',headline:'Fixture',body:'Isolated email test words.',ctaText:'Read story',ctaUrl:'https://dainyelonthemove.com/entry/'+entryId,imageUrl:'',revision:1,createdAt:serverTimestamp(),updatedAt:serverTimestamp()},parent=doc(owner,'cmsSpaces/production/mailDrafts/'+id),b=writeBatch(owner);b.set(parent,data);b.set(doc(parent,'history/r1'),{version:1,content:data,savedAt:serverTimestamp()});await assertSucceeds(b.commit());
  await seed('cmsSpaces/production/mailSettings/delivery',{enabled:true});
  const {version,entryId:unused,revision,createdAt,updatedAt,...payload}=data;
  const request={version:1,draftId:id,draftRevision:1,payload,action:'after-publication',entryId,publicationRevision:1,scheduledAt:plan.scheduledAt,status:'queued',createdAt:serverTimestamp(),updatedAt:serverTimestamp()},target=doc(owner,'cmsSpaces/production/mailJobs/'+id);
  await assertFails(setDoc(target,{...request,publicationRevision:2}));
  await assertFails(setDoc(target,{...request,scheduledAt:Timestamp.fromMillis(Date.now()+600000)}));
  await assertFails(setDoc(target,{...request,payload:{...payload,subject:'Unreviewed'}}));
  const {entryId:linked,publicationRevision:linkedRevision,...independent}=request;
  await assertFails(setDoc(target,{...independent,action:'send',scheduledAt:serverTimestamp()}));
  await assertFails(setDoc(target,{...independent,action:'schedule',scheduledAt:Timestamp.fromMillis(Date.now()+7200000)}));
  await assertSucceeds(setDoc(target,request));
  await assertFails(getDocs(query(collection(visitor,'cmsSpaces/production/mailJobs'),limit(100))));
  await assertSucceeds(getDocs(query(collection(owner,'cmsSpaces/production/mailJobs'),limit(100))));
  await assertFails(deleteDoc(parent));
  const {deleteMail}=await import('../../../assets/publication-schedule.js');await assertSucceeds(deleteMail({doc,runTransaction,serverTimestamp},owner,'production',id,1));
  assert.equal((await getDoc(target)).data().status,'cancelled');assert.equal((await getDoc(parent)).exists(),false);
});
