import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {createWorker} from '../cloudflare/worker.mjs';

const sql=await readFile(new URL('../cloudflare/schema.sql',import.meta.url),'utf8');
const crypto=globalThis.crypto, key=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',key.publicKey),kid:'fixture-key',alg:'RS256',use:'sig'};
const time=Date.parse('2026-10-29T12:00:00Z'),seconds=time/1000;
const project='fixture-project',number='1234567890',app='1:1234567890:web:fixture',owner='fixture-owner';
const origin='https://dainyelonthemove-staging.web.app';
const encode=value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');
async function jwt(claims,header={alg:'RS256',typ:'JWT',kid:'fixture-key'}){
  const body=encode(header)+'.'+encode(claims),signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key.privateKey,new TextEncoder().encode(body));
  return body+'.'+Buffer.from(signature).toString('base64url');
}
const appClaims={iss:'https://firebaseappcheck.googleapis.com/'+number,aud:['projects/'+number],sub:app,iat:seconds-60,exp:seconds+3600};
const ownerClaims={iss:'https://securetoken.google.com/'+project,aud:project,sub:owner,email:'owner@fixture.invalid',email_verified:true,iat:seconds-60,auth_time:seconds-100,exp:seconds+3540,firebase:{sign_in_second_factor:'totp'}};
const appToken=await jwt(appClaims),ownerToken=await jwt(ownerClaims);
class D1 {
  constructor(){this.db=new DatabaseSync(':memory:');this.db.exec(sql);this.calls=0;}
  prepare(query){
    const database=this;let args=[];
    const statement={bind(...values){args=values;return statement;},async first(column){database.calls++;const row=database.db.prepare(query).get(...args);return row?(column?row[column]:{...row}):null;},async all(){database.calls++;return{results:database.db.prepare(query).all(...args).map(row=>({...row}))};},async run(){database.calls++;const result=database.db.prepare(query).run(...args);return{meta:{changes:Number(result.changes)}};}};
    return statement;
  }
  async batch(statements){this.db.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await (/^\s*SELECT/.test(statement.query||'')?statement.all():statement.run()));this.db.exec('COMMIT');return results;}catch(error){this.db.exec('ROLLBACK');throw error;}}
}
// D1 batch returns rows for SELECT and executes every statement in one transaction.
const originalPrepare=D1.prototype.prepare;
D1.prototype.prepare=function(query){const statement=originalPrepare.call(this,query);statement.query=query;return statement;};
function fixture({snapshot=null}={}){
  const db=new D1(),env={DB:db,ENABLED:'true',SPACE:'staging',FIREBASE_PROJECT_ID:project,FIREBASE_PROJECT_NUMBER:number,FIREBASE_APP_ID:app,OWNER_UID:owner,OWNER_EMAIL:'owner@fixture.invalid'};
  let currentTime=time;
  const requests=[];const worker=createWorker({now:()=>currentTime,fetcher:async(url,options)=>{assert.equal(Object.hasOwn(options||{},'credentials'),false,'Workers reject the browser-only credentials option');assert.equal(options.redirect,'manual');requests.push(url);if(url.includes('/jwks')||url.includes('/jwk/securetoken@'))return new Response(JSON.stringify({keys:[jwk]}),{headers:{'cache-control':'public,max-age=300'}});if(snapshot&&url===origin+'/data/public-content/manifest.json')return Response.json(snapshot.manifest);if(snapshot&&url===origin+'/data/public-content/qa.json')return Response.json(snapshot.qa);throw Error('Unexpected remote service');}});
  async function request(path,{method='GET',body,auth=false,check=true,headers={},ip='192.0.2.1'}={}){
    return worker.fetch(new Request('https://fixture.worker.invalid'+path,{method,headers:{Origin:origin,...(method!=='GET'?{'Content-Type':'application/json'}:{}),...(check?{'X-Firebase-AppCheck':appToken}:{}),...(auth?{Authorization:'Bearer '+ownerToken}:{}),'CF-Connecting-IP':ip,...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})}),env);
  }
  return{db,env,worker,request,requests,advance(ms){currentTime+=ms;}};
}
const question=(suffix='1')=>({requestId:suffix.padStart(32,'0'),kind:'question',topic:'philippines',question:'A synthetic question for the isolated test.',publicationConsent:true});
async function data(response,status=200){assert.equal(response.status,status);return response.json();}

test('pending intake is private, server dated, idempotent and rejects a changed payload',async()=>{
  const f=fixture(),payload=question();const accepted=await data(await f.request('/submissions',{method:'POST',body:payload}),201);
  assert.equal(accepted.status,'pending');assert.deepEqual(await data(await f.request('/public')),{questions:[],threads:[],replies:[]});
  assert.equal((await data(await f.request('/submissions',{method:'POST',body:payload}))).replayed,true);
  await data(await f.request('/submissions',{method:'POST',body:{...payload,question:'A changed synthetic question with the same id.'}}),409);
  const list=await data(await f.request('/admin/submissions',{auth:true}));assert.equal(list.items.length,1);assert.equal(list.items[0].createdAt,new Date(time).toISOString());assert.equal(f.db.db.prepare('SELECT count(*) AS n FROM admissions').get().n,1);
});
test('owner moderation verifies MFA, uses revisions, publishes and withdraws without database-origin reads',async()=>{
  const f=fixture(),payload=question();await f.request('/submissions',{method:'POST',body:payload});const id='cf-'+payload.requestId;
  await data(await f.request('/admin/submissions'),401);
  await data(await f.request('/admin/submissions/'+id,{method:'PATCH',auth:true,body:{revision:1,status:'published',answer:'Isolated fixture answer.'}}));
  const published=await data(await f.request('/public'));assert.equal(published.questions.length,1);assert.equal(published.questions[0].answer,'Isolated fixture answer.');assert.equal('payload_hash' in published.questions[0],false);assert.equal('displayName' in published.questions[0],false);
  await data(await f.request('/admin/submissions/'+id,{method:'PATCH',auth:true,body:{revision:1,status:'archived'}}),409);
  await data(await f.request('/admin/submissions/'+id,{method:'PATCH',auth:true,body:{revision:2,status:'pending'}}));assert.equal((await data(await f.request('/public'))).questions.length,0);
  assert.ok(f.requests.every(url=>url.includes('/jwk')));
});
test('forged, expired, wrong-project, wrong-app and missing-MFA tokens fail before storage',async()=>{
  for(const claims of [{...appClaims,sub:'another-app'},{...appClaims,aud:['projects/999999999']},{...appClaims,exp:seconds-1},{...appClaims,iat:seconds+1}]){
    const f=fixture();await data(await f.request('/submissions',{method:'POST',body:question(),headers:{'X-Firebase-AppCheck':await jwt(claims)}}),claims.exp<=seconds||claims.iat>seconds?401:403);assert.equal(f.db.calls,0);
  }
  const forged=appToken.slice(0,-4)+'AAAA',f=fixture();await data(await f.request('/submissions',{method:'POST',body:question(),headers:{'X-Firebase-AppCheck':forged}}),401);assert.equal(f.db.calls,0);
  for(const claims of [{...ownerClaims,firebase:{}},{...ownerClaims,sub:'another-owner'},{...ownerClaims,email_verified:false},{...ownerClaims,aud:'another-project'}]){
    const f=fixture();await data(await f.request('/admin/submissions',{headers:{Authorization:'Bearer '+await jwt(claims)}}),403);assert.equal(f.db.calls,0);
  }
});
test('strict origins, preflights, consent, schemas and byte bounds fail closed',async()=>{
  const f=fixture();await data(await f.request('/submissions',{method:'POST',body:question(),headers:{Origin:'https://dainyelonthemove.com'}}),403);
  await data(await f.request('/submissions',{method:'POST',check:false,body:question()}),401);
  for(const body of [{...question(),publicationConsent:false},{...question(),status:'published'},{...question(),question:'short'},{...question(),topic:'unrecognised'},{...question(),question:'x'.repeat(9000)}])await data(await f.request('/submissions',{method:'POST',body}),body.question.length>8192?413:400);
  const good=await f.request('/submissions',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,x-firebase-appcheck'}});assert.equal(good.status,204);assert.equal(good.headers.get('access-control-allow-origin'),origin);assert.equal(good.headers.get('access-control-allow-credentials'),null);
  await data(await f.request('/submissions',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'DELETE'}}),403);
});
test('atomic admission enforces per-address and global limits without orphan rows or counters',async()=>{
  const f=fixture();for(let i=1;i<=5;i++)await data(await f.request('/submissions',{method:'POST',body:question(i.toString(16))}),201);
  await data(await f.request('/submissions',{method:'POST',body:question('6')}),429);assert.equal(f.db.db.prepare('SELECT count(*) AS n FROM admissions').get().n,5);assert.equal(f.db.db.prepare('SELECT count(*) AS n FROM submissions').get().n,5);
  for(let i=6;i<=100;i++)await data(await f.request('/submissions',{method:'POST',body:question(i.toString(16)),ip:'192.0.2.'+i}),201);
  await data(await f.request('/submissions',{method:'POST',body:question('aaa'),ip:'192.0.2.200'}),429);assert.equal(f.db.db.prepare('SELECT count(*) AS n FROM submissions').get().n,100);
});
test('replies stay private and vanish when their Cloudflare parent is withdrawn',async()=>{
  const f=fixture(),thread={...question(),kind:'thread',topic:'general',displayName:'Fixture user'};await data(await f.request('/submissions',{method:'POST',body:thread}),201);const parentId='cf-'+thread.requestId;
  const reply={requestId:'2'.padStart(32,'0'),kind:'reply',parentId,displayName:'Fixture reply',message:'A synthetic reply for local testing.',publicationConsent:true};
  await data(await f.request('/submissions',{method:'POST',body:reply}),409);
  await data(await f.request('/admin/submissions/'+parentId,{method:'PATCH',auth:true,body:{revision:1,status:'published'}}));
  await data(await f.request('/submissions',{method:'POST',body:reply}),201);assert.equal((await data(await f.request('/public'))).threads[0].replies.length,0);
  const review=await data(await f.request('/admin/submissions',{auth:true}));assert.equal(review.items.find(row=>row.kind==='reply').parentQuestion,thread.question);
  await data(await f.request('/admin/submissions/cf-'+reply.requestId,{method:'PATCH',auth:true,body:{revision:1,status:'published'}}));assert.equal((await data(await f.request('/public'))).threads[0].replies.length,1);
  await data(await f.request('/admin/submissions/'+parentId,{method:'PATCH',auth:true,body:{revision:2,status:'archived'}}));assert.equal((await data(await f.request('/public'))).threads.length,0);
});
test('legacy reply context requires a matching fresh public reserve, including after cache expiry',async()=>{
  const envelope={version:1,complete:true,space:'staging',generation:'a'.repeat(32),generatedAt:new Date(time-86400000+15000).toISOString()};
  const thread={id:'legacy-fixture-thread',status:'published',topic:'general',question:'An original synthetic community question.',displayName:'Fixture author',createdAt:new Date(time-86400000).toISOString(),replies:[]};
  const snapshot={manifest:{...envelope,domains:{qa:'qa.json',cms:'cms.json',website:'website.json'}},qa:{...envelope,questions:[],threads:[thread]}};
  const f=fixture({snapshot}),reply={requestId:'b'.repeat(32),kind:'reply',parentId:thread.id,displayName:'Fixture reply',message:'A synthetic legacy conversation reply.',publicationConsent:true};
  await data(await f.request('/submissions',{method:'POST',body:reply}),201);
  const review=await data(await f.request('/admin/submissions',{auth:true}));assert.equal(review.items[0].parentQuestion,thread.question);
  await data(await f.request('/admin/submissions/cf-'+reply.requestId,{method:'PATCH',auth:true,body:{revision:1,status:'published'}}));
  assert.equal((await data(await f.request('/public'))).replies.length,1);
  f.advance(31000);
  assert.equal((await data(await f.request('/public'))).replies.length,0);
  const expiredReview=await data(await f.request('/admin/submissions?status=published',{auth:true}));assert.equal(Object.hasOwn(expiredReview.items[0],'parentQuestion'),false);
  await data(await f.request('/submissions',{method:'POST',body:{...reply,requestId:'c'.repeat(32)}}),503);
  await data(await f.request('/admin/submissions/cf-'+reply.requestId,{method:'PATCH',auth:true,body:{revision:2,status:'pending'}}));
  await data(await f.request('/admin/submissions/cf-'+reply.requestId,{method:'PATCH',auth:true,body:{revision:3,status:'published'}}),503);
});
test('private pagination is bounded and storage exceptions do not disclose data',async()=>{
  const f=fixture();for(let i=1;i<=30;i++)await f.request('/submissions',{method:'POST',body:question(i.toString(16)),ip:'192.0.2.'+i});
  const first=await data(await f.request('/admin/submissions',{auth:true}));assert.equal(first.items.length,25);assert.ok(first.nextCursor);
  const second=await data(await f.request('/admin/submissions?cursor='+first.nextCursor,{auth:true}));assert.equal(second.items.length,5);assert.equal(second.nextCursor,null);assert.ok(!second.items.some(row=>first.items.some(old=>old.id===row.id)));
  f.env.DB={prepare(){throw Error('PRIVATE PAYLOAD MUST NOT LEAK');}};const result=await data(await f.request('/public'),503);assert.deepEqual(result,{error:'storage-unavailable'});
});
test('erasure requires archived current revision and delayed retry cannot restore removed text',async()=>{
  const f=fixture(),payload=question();await f.request('/submissions',{method:'POST',body:payload});const id='cf-'+payload.requestId;
  await data(await f.request('/admin/submissions/'+id,{method:'DELETE',auth:true,body:{revision:1}}),409);
  await data(await f.request('/admin/submissions/'+id,{method:'PATCH',auth:true,body:{revision:1,status:'archived'}}));
  await data(await f.request('/admin/submissions/'+id,{method:'DELETE',auth:true,body:{revision:1}}),409);
  const removed=await data(await f.request('/admin/submissions/'+id,{method:'DELETE',auth:true,body:{revision:2}}));assert.equal(removed.removed,true);
  assert.equal(f.db.db.prepare('SELECT count(*) AS n FROM submissions').get().n,0);assert.equal(f.db.db.prepare('SELECT count(*) AS n FROM removals').get().n,1);
  await data(await f.request('/submissions',{method:'POST',body:payload}),410);
});
