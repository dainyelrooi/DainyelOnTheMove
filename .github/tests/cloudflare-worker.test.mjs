import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {createWorker} from '../cloudflare/worker.mjs';

const sql=await readFile(new URL('../cloudflare/schema.sql',import.meta.url),'utf8');
const servicesSql=await readFile(new URL('../cloudflare/site-services.sql',import.meta.url),'utf8');
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
  constructor(){this.db=new DatabaseSync(':memory:');this.db.exec(sql);this.db.exec(servicesSql);this.calls=0;}
  prepare(query){
    const database=this;let args=[];
    const statement={bind(...values){args=values;return statement;},async first(column){database.calls++;const row=database.db.prepare(query).get(...args);return row?(column?row[column]:{...row}):null;},async all(){database.calls++;return{results:database.db.prepare(query).all(...args).map(row=>({...row}))};},async run(){database.calls++;const before=database.db.prepare('SELECT total_changes() AS n').get().n;database.db.prepare(query).run(...args);return{meta:{changes:Number(database.db.prepare('SELECT total_changes() AS n').get().n-before)}};}};
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
  const requests=[];const worker=createWorker({now:()=>currentTime,fetcher:async(url,options)=>{assert.equal(Object.hasOwn(options||{},'credentials'),false,'Workers reject the browser-only credentials option');assert.equal(options.redirect,'manual');requests.push(url);if(url.includes('/jwks')||url.includes('/jwk/securetoken@')||url.endsWith('/.well-known/jwks'))return new Response(JSON.stringify({keys:[jwk]}),{headers:{'cache-control':'public,max-age=300'}});if(snapshot&&url===origin+'/data/public-content/manifest.json')return Response.json(snapshot.manifest);if(snapshot&&url===origin+'/data/public-content/qa.json')return Response.json(snapshot.qa);throw Error('Unexpected remote service');}});
  async function request(path,{method='GET',body,auth=false,check=true,headers={},ip='192.0.2.1'}={}){
    return worker.fetch(new Request('https://fixture.worker.invalid'+path,{method,headers:{Origin:origin,...(method!=='GET'?{'Content-Type':'application/json'}:{}),...(check?{'X-Firebase-AppCheck':appToken}:{}),...(auth?{Authorization:'Bearer '+ownerToken}:{}),'CF-Connecting-IP':ip,...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})}),env);
  }
  return{db,env,worker,request,requests,advance(ms){currentTime+=ms;},time(){return currentTime;}};
}
const question=(suffix='1')=>({requestId:suffix.padStart(32,'0'),kind:'question',topic:'philippines',question:'A synthetic question for the isolated test.',publicationConsent:true});
async function data(response,status=200){assert.equal(response.status,status);return response.json();}

function servicesFixture(){const f=fixture();f.env.SITE_TOOLS_ENABLED='true';f.env.PUSH_VAPID_KEY='B'.repeat(87);f.db.db.prepare('INSERT INTO site_settings(name,value,updated_ms) VALUES(?,?,?)').run('push_setup_ms',JSON.stringify(time),time);return f;}
const githubClaims={iss:'https://token.actions.githubusercontent.com',aud:'https://fixture.worker.invalid',sub:'repo:dainyelrooi/DainyelOnTheMove:ref:refs/heads/staging',repository:'dainyelrooi/DainyelOnTheMove',ref:'refs/heads/staging',workflow_ref:'dainyelrooi/DainyelOnTheMove/.github/workflows/site-tools.yml@refs/heads/staging',event_name:'workflow_dispatch',iat:seconds-30,exp:seconds+270};
async function bridgeRequest(f,path,body,claims){const stamp=Math.floor(f.time()/1000);return f.request(path,{method:'POST',body,headers:{Authorization:'Bearer '+await jwt(claims||{...githubClaims,iat:stamp-10,exp:stamp+290})}});}

test('new feature endpoints are optional and protected admin aggregates require existing MFA and App Check',async()=>{
  const off=fixture();assert.equal((await data(await off.request('/features'))).notifications,false);
  const f=servicesFixture();assert.equal((await data(await f.request('/features'))).notifications,true);
  await data(await f.request('/admin/services'),401);await data(await f.request('/admin/services',{auth:true,check:false}),401);
  const status=await data(await f.request('/admin/services',{auth:true}));assert.equal(status.space,'staging');assert.equal(status.brevo,null);assert.equal(status.cloudflareQuota,null);assert.equal(status.notifications.active,0);assert.ok(!JSON.stringify(status).includes('secret_sha'));
});
test('an unconnected sender stays disabled even if a public VAPID key is present',async()=>{
 const f=servicesFixture();f.db.db.prepare('DELETE FROM site_settings WHERE name=?').run('push_setup_ms');
 assert.equal((await data(await f.request('/features'))).notifications,false);
 await data(await f.request('/push/subscribe',{method:'POST',body:{fid:'c'.repeat(22),key:'a'.repeat(64),consent:true}}),503);
 assert.equal(f.db.db.prepare('SELECT count(*) AS total FROM site_push_registrations').get().total,0);
});
test('configuration is atomic and never accepts the old all-subscriber segment as a topic',async()=>{
 const f=servicesFixture(),form='a'.repeat(24);
 for(const segments of [{stories:1,films:3,tips:4},{stories:2,films:2,tips:4},{stories:2,films:3,tips:'4'}])await data(await bridgeRequest(f,'/bridge/configure',{preferencesFormId:form,webhookSecretHash:'a'.repeat(64),segments}),400);
 assert.equal(f.db.db.prepare("SELECT count(*) AS total FROM site_settings WHERE name!='push_setup_ms'").get().total,0);
 await data(await bridgeRequest(f,'/bridge/configure',{preferencesFormId:form,segments:{stories:2,films:3,tips:4}}));
 assert.equal(JSON.parse(f.db.db.prepare("SELECT value FROM site_settings WHERE name='preference_segments'").get().value).stories,2);
});
test('the unattended bridge pins the issuer, audience, repository, source branch, workflow and event',async()=>{
  const f=servicesFixture();await data(await bridgeRequest(f,'/bridge/configure',{}));
  for(const altered of [{iss:'https://evil.invalid'},{aud:'https://evil.invalid'},{repository:'other/other'},{ref:'refs/heads/main'},{workflow_ref:'dainyelrooi/DainyelOnTheMove/.github/workflows/other.yml@refs/heads/staging'},{event_name:'pull_request'},{exp:seconds+900}])await data(await bridgeRequest(f,'/bridge/configure',{}, {...githubClaims,...altered}),403);
  await data(await f.request('/bridge/configure',{method:'POST',body:{},auth:true}),403);
});
test('browser registrations require consent, App Check and their own removal capability; bad origins never write',async()=>{
  const f=servicesFixture(),body={fid:'c'+'a'.repeat(21),key:'a'.repeat(64),consent:true};
  await data(await f.request('/push/subscribe',{method:'POST',body,check:false}),401);
  await data(await f.request('/push/subscribe',{method:'POST',body:{...body,consent:false}}),400);
  await data(await f.request('/push/subscribe',{method:'POST',body,headers:{Origin:'https://evil.invalid'}}),403);
  await data(await f.request('/push/subscribe',{method:'POST',body}));assert.equal(f.db.db.prepare('SELECT count(*) n FROM site_push_registrations').get().n,1);
  await data(await f.request('/push/subscribe',{method:'POST',body:{...body,key:'b'.repeat(64)}}),403);
  await data(await f.request('/push/unsubscribe',{method:'POST',check:false,body:{fid:body.fid,key:'b'.repeat(64)}}));assert.equal(f.db.db.prepare('SELECT count(*) n FROM site_push_registrations').get().n,1);
  await data(await f.request('/push/unsubscribe',{method:'POST',check:false,body:{fid:body.fid,key:body.key}}));assert.equal(f.db.db.prepare('SELECT count(*) n FROM site_push_registrations').get().n,0);
});
test('new registrations have atomic per-address admission limits and do not overwrite another capability',async()=>{
  const f=servicesFixture();for(let i=0;i<10;i++)await data(await f.request('/push/subscribe',{method:'POST',body:{fid:'c'+String(i).padStart(21,'0'),key:'a'.repeat(64),consent:true}}));
  await data(await f.request('/push/subscribe',{method:'POST',body:{fid:'d'.repeat(22),key:'a'.repeat(64),consent:true}}),429);
  assert.equal(f.db.db.prepare('SELECT count(*) n FROM site_push_registrations').get().n,10);assert.equal(f.db.db.prepare('SELECT count(*) n FROM site_push_admissions').get().n,10);
});
test('Brevo callbacks authenticate before parsing, deduplicate and retain no addresses or mail content',async()=>{
  const f=servicesFixture(),token='a'.repeat(64),hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
  await data(await bridgeRequest(f,'/bridge/configure',{webhookSecretHash:hash}));
  const body={camp_id:123,event:'delivered',ts_event:seconds,email:'private@fixture.invalid',message:'Never retain this'};
  await data(await f.request('/hooks/brevo',{method:'POST',body}),401);
  const request=payload=>f.request('/hooks/brevo',{method:'POST',body:payload,headers:{Authorization:'Bearer '+token,Origin:''}});
  assert.equal((await data(await request(body))).accepted,1);assert.equal((await data(await request(body))).accepted,0);
  assert.equal((await data(await request({...body,event:'hardBounce',ts_event:seconds-60}))).accepted,1);
  assert.equal((await data(await request({events:[null,{...body,camp_id:124}]}))).accepted,1);
  const rows=f.db.db.prepare('SELECT * FROM site_webhook_events').all();assert.equal(rows.length,3);assert.ok(!JSON.stringify(rows).includes('private@'));assert.ok(!JSON.stringify(rows).includes('Never retain'));
  assert.equal(f.db.db.prepare('SELECT events FROM site_capacity').get().events,3);
});
test('push claims never backfill the archive or notify someone who registered after publication',async()=>{
  const f=servicesFixture();await data(await bridgeRequest(f,'/bridge/configure',{}));
  await data(await f.request('/push/subscribe',{method:'POST',body:{fid:'c'.repeat(22),key:'a'.repeat(64),consent:true}}));
  const body={entryId:'entry-'+'a'.repeat(32),title:'Safe fixture only',publishedAt:new Date(time-60000).toISOString()};
  assert.deepEqual((await data(await bridgeRequest(f,'/bridge/push/claim',body))).recipients,[]);
  f.advance(60000);body.publishedAt=new Date(time+60000).toISOString();const first=await data(await bridgeRequest(f,'/bridge/push/claim',body));assert.equal(first.recipients.length,1);
  assert.deepEqual((await data(await bridgeRequest(f,'/bridge/push/claim',body))).recipients,[]);
  const receipt={...first.recipients[0],result:'accepted'};delete receipt.title;delete receipt.url;
  await data(await bridgeRequest(f,'/bridge/push/receipt',{receipts:[receipt]}));assert.deepEqual((await data(await bridgeRequest(f,'/bridge/push/claim',body))).recipients,[]);
});
test('uncertain expired push leases are not retried; a definitive rate limit has a bounded retry',async()=>{
  const f=servicesFixture();await data(await bridgeRequest(f,'/bridge/configure',{}));await data(await f.request('/push/subscribe',{method:'POST',body:{fid:'c'.repeat(22),key:'a'.repeat(64),consent:true}}));
  const body={entryId:'entry-'+'b'.repeat(32),title:'Safe fixture',publishedAt:new Date(time).toISOString()};let rows=(await data(await bridgeRequest(f,'/bridge/push/claim',body))).recipients;assert.equal(rows.length,1);
  const {fid,entryId,lease}=rows[0];await data(await bridgeRequest(f,'/bridge/push/receipt',{receipts:[{fid,entryId,lease,result:'retry'}]}));assert.deepEqual((await data(await bridgeRequest(f,'/bridge/push/claim',body))).recipients,[]);
  f.advance(900000);rows=(await data(await bridgeRequest(f,'/bridge/push/claim',body))).recipients;assert.equal(rows.length,1);f.advance(300001);assert.deepEqual((await data(await bridgeRequest(f,'/bridge/push/claim',body))).recipients,[]);assert.equal(f.db.db.prepare('SELECT state FROM site_push_jobs').get().state,'uncertain');
});

test('Postcard upload requires owner and App Check; the fixed JPEG URL is reusable by mail clients',async()=>{
  const f=fixture(),path='/admin/postcard-images';
  const jpeg=Buffer.concat([Buffer.from([255,216,255]),Buffer.alloc(110),Buffer.from([255,217])]);
  const body={jpeg:jpeg.toString('base64')};
  await data(await f.request(path,{method:'POST',body}),401);
  await data(await f.request(path,{method:'POST',body,auth:true,check:false}),401);
  await data(await f.request(path,{method:'POST',body,auth:true,headers:{Origin:'https://dainyelonthemove.com'}}),403);
  await data(await f.request(path,{method:'POST',body:{jpeg:'PGh0bWw+'},auth:true}),400);
  await data(await f.request(path,{method:'POST',body:{jpeg:'a'.repeat(192024)},auth:true}),413);
  const saved=await data(await f.request(path,{method:'POST',body,auth:true}),201);
  assert.match(saved.url,/\/postcard-images\/[a-f0-9]{64}[.]jpg$/);
  assert.deepEqual(await data(await f.request(path,{method:'POST',body,auth:true}),201),saved);
  assert.equal(f.db.db.prepare('SELECT count(*) AS n FROM postcard_images').get().n,1);
  const publicImage=await f.worker.fetch(new Request(saved.url),f.env);
  assert.equal(publicImage.headers.get('content-type'),'image/jpeg');
  assert.equal(publicImage.headers.get('x-content-type-options'),'nosniff');
  assert.deepEqual(Buffer.from(await publicImage.arrayBuffer()),jpeg);
  const head=await f.worker.fetch(new Request(saved.url,{method:'HEAD'}),f.env);
  assert.equal(head.status,200);assert.equal(await head.text(),'');
  await data(await f.worker.fetch(new Request(saved.url.replace(/[a-f0-9]{64}/,'0'.repeat(64))),f.env),404);
});

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
test('archive and restore accept trigger-inclusive D1 changes without weakening stale-revision protection',async()=>{
  const f=fixture(),payload=question(),id='cf-'+payload.requestId;
  await data(await f.request('/submissions',{method:'POST',body:payload}),201);
  const archived=await data(await f.request('/admin/submissions/'+id,{method:'PATCH',auth:true,body:{revision:1,status:'archived'}}));
  assert.equal(archived.item.status,'archived');assert.equal(archived.item.revision,2);assert.equal(f.db.db.prepare('SELECT active FROM capacity').get().active,0);
  const restored=await data(await f.request('/admin/submissions/'+id,{method:'PATCH',auth:true,body:{revision:2,status:'pending'}}));
  assert.equal(restored.item.status,'pending');assert.equal(restored.item.revision,3);assert.equal(f.db.db.prepare('SELECT active FROM capacity').get().active,1);
  await data(await f.request('/admin/submissions/'+id,{method:'PATCH',auth:true,body:{revision:2,status:'archived'}}),409);
  assert.equal(f.db.db.prepare('SELECT status FROM submissions WHERE id = ?').get(id).status,'pending');assert.equal(f.db.db.prepare('SELECT active FROM capacity').get().active,1);
});
