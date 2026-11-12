// Focused test for the additive staging overlay, never a cloud project.
import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8091');
const require=createRequire(import.meta.url);
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,collection,getDoc,getDocs,setDoc,updateDoc,query,limit,serverTimestamp,Timestamp}=require('firebase/firestore');
const rules=await readFile(process.env.RULES_TEST_SOURCE,'utf8');
assert.ok(rules.includes('// BEGIN private Postcard staging extension'));
const email=rules.match(/request\.auth\.token\.email == '([^']+)'/)[1];
let env,owner,visitor,noMfa;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-dotm-launch-audit',firestore:{host:'127.0.0.1',port:8091,rules}});owner=env.authenticatedContext('fixture-owner',{email,email_verified:true,firebase:{sign_in_provider:'google.com',sign_in_second_factor:'totp'}}).firestore();visitor=env.unauthenticatedContext().firestore();noMfa=env.authenticatedContext('fixture-no-mfa',{email,email_verified:true,firebase:{sign_in_provider:'google.com'}}).firestore();});
beforeEach(async()=>env.clearFirestore());after(async()=>env?.cleanup());
const id='mail-'+'a'.repeat(32),root='cmsSpaces/staging',path=root+'/mailLinks/'+id;
const request=()=>({version:1,draftId:id,draftRevision:1,campaignId:101,revision:1,approvedScheduledAt:Timestamp.fromMillis(Date.now()+7200000),updatedAt:serverTimestamp()});
const seed=(path,data)=>env.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),path),data));
test('only the existing verified TOTP owner can save and read a staging campaign link',async()=>{
 await seed(root+'/mailDrafts/'+id,{revision:1});
 await assertFails(setDoc(doc(visitor,path),request()));await assertFails(setDoc(doc(noMfa,path),request()));
 await assertSucceeds(setDoc(doc(owner,path),request()));await assertSucceeds(getDoc(doc(owner,path)));
 await assertFails(getDoc(doc(visitor,path)));await assertFails(getDoc(doc(noMfa,path)));
});
test('staging link revision and saved-draft checks cannot forge a provider confirmation',async()=>{
 await seed(root+'/mailDrafts/'+id,{revision:1});
 await assertFails(setDoc(doc(owner,path),{...request(),draftRevision:2}));
 await assertFails(setDoc(doc(owner,path),{...request(),status:'sent'}));
 await assertSucceeds(setDoc(doc(owner,path),request()));
 await assertFails(updateDoc(doc(owner,path),{revision:3,updatedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(doc(owner,path),{revision:2,updatedAt:serverTimestamp()}));
});
test('provider history is private, bounded and server-written on staging',async()=>{
 const parent=root+'/mailJobs/'+id+'/providerHistory';await seed(parent+'/fixture',{state:'scheduled'});
 await assertSucceeds(getDocs(query(collection(owner,parent),limit(20))));
 await assertFails(getDocs(query(collection(owner,parent),limit(21))));
 await assertFails(getDoc(doc(visitor,parent+'/fixture')));await assertFails(setDoc(doc(owner,parent+'/forged'),{state:'sent'}));
});
test('the overlay opens no new production path or visitor controller status',async()=>{
 await seed('cmsSpaces/production/mailDrafts/'+id,{revision:1});
 await assertFails(setDoc(doc(owner,'cmsSpaces/production/mailLinks/'+id),request()));
 await assertFails(getDoc(doc(owner,'cmsSpaces/production/mailLinks/'+id)));
 await assertFails(getDoc(doc(owner,'cmsSpaces/production/mailJobs/'+id+'/providerHistory/fixture')));
 await assertFails(getDoc(doc(owner,'adminOperations/production/status/postcards')));
 await assertSucceeds(getDoc(doc(owner,'adminOperations/staging/status/postcards')));
 await assertFails(getDoc(doc(visitor,'adminOperations/staging/status/postcards')));
});
