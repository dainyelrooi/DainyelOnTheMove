/* Independent text-only inbox. Existing Firebase signs identity/App Check;
 * private pending content lives in D1 and is never automatically published.
 * No Firestore requests, service account, mail provider or media storage. */
const APP_KEYS='https://firebaseappcheck.googleapis.com/v1/jwks';
const AUTH_KEYS='https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const QUESTION_TOPICS=new Set(['thailand-exchange','thailand-solo','bali','philippines','another-destination','culture','video-gear','life-on-the-move','something-else']);
const THREAD_TOPICS=new Set(['thailand','bali','philippines','solo-travel','budget','culture','video-gear','general']);
const ORIGINS={production:['https://dainyelonthemove.com','https://www.dainyelonthemove.com'],staging:['https://dainyelonthemove-staging.web.app','https://dainyelonthemove-staging.firebaseapp.com']};
const HOSTS={production:'https://dainyelonthemove.com',staging:'https://dainyelonthemove-staging.web.app'};
const ID=/^cf-[a-f0-9]{32}$/;
const PARENT=/^[A-Za-z0-9_-]{1,80}$/;
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const keys=(value,allowed)=>object(value)&&Object.keys(value).every(key=>allowed.includes(key));
const iso=value=>new Date(value).toISOString();
const bytes=new TextEncoder();
class Failure extends Error {constructor(status,code){super(code);this.status=status;this.code=code;}}
const fail=(status,code)=>{throw new Failure(status,code);};
function text(value,min,max){if(typeof value!=='string')fail(400,'invalid-input');const result=value.trim();if(result.length<min||result.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(result))fail(400,'invalid-input');return result;}
function configuration(env){
  if(!Object.hasOwn(ORIGINS,env.SPACE)||!env.DB||typeof env.DB.prepare!=='function'||
    !/^[a-z][a-z0-9-]{4,29}$/.test(env.FIREBASE_PROJECT_ID||'')||!/^\d{6,20}$/.test(env.FIREBASE_PROJECT_NUMBER||'')||
    !/^[A-Za-z0-9:._-]{5,200}$/.test(env.FIREBASE_APP_ID||'')||typeof env.OWNER_UID!=='string'||!env.OWNER_UID||env.OWNER_UID.length>128||
    typeof env.OWNER_EMAIL!=='string'||!/^\S+@\S+\.\S+$/.test(env.OWNER_EMAIL))fail(503,'not-configured');
}
async function boundedText(source,max){
  const declared=Number(source.headers.get('content-length')||0);if(!Number.isFinite(declared)||declared>max)fail(413,'request-too-large');
  if(!source.body)return '';
  const reader=source.body.getReader(),parts=[];let total=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>max){await reader.cancel();fail(413,'request-too-large');}parts.push(value);}}
  finally{reader.releaseLock();}
  const joined=new Uint8Array(total);let offset=0;for(const part of parts){joined.set(part,offset);offset+=part.byteLength;}
  try{return new TextDecoder('utf-8',{fatal:true}).decode(joined);}catch{fail(400,'invalid-input');}
}
async function jsonBody(request){
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type')||''))fail(415,'json-required');
  try{const value=JSON.parse(await boundedText(request,8192));if(!object(value))fail(400,'invalid-input');return value;}
  catch(error){if(error instanceof Failure)throw error;fail(400,'invalid-input');}
}
function decode64(value){
  if(typeof value!=='string'||!value||!/^[A-Za-z0-9_-]+$/.test(value))fail(401,'not-authorized');
  try{return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),char=>char.charCodeAt(0));}catch{fail(401,'not-authorized');}
}
function parsePart(value){try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decode64(value)));}catch{fail(401,'not-authorized');}}
function cursorEncode(value){return btoa(JSON.stringify(value)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
function cursorDecode(value){
  if(!value)return null;if(value.length>240)fail(400,'invalid-cursor');
  let result;try{result=JSON.parse(new TextDecoder().decode(decode64(value)));}catch{fail(400,'invalid-cursor');}
  if(!keys(result,['time','id'])||!Number.isSafeInteger(result.time)||result.time<=0||!ID.test(result.id))fail(400,'invalid-cursor');return result;
}
function submission(value){
  if(!keys(value,['requestId','kind','topic','question','displayName','message','parentId','publicationConsent'])||!/^[a-f0-9]{32}$/.test(value.requestId||'')||value.publicationConsent!==true||!['question','thread','reply'].includes(value.kind))fail(400,'invalid-input');
  const out={id:'cf-'+value.requestId,kind:value.kind,topic:'',question:'',displayName:'',message:'',parentId:'',publicationConsent:true};
  out.displayName=text(value.displayName??'',value.kind==='question'?0:2,40);
  if(value.kind==='reply'){
    if(Object.hasOwn(value,'topic')||Object.hasOwn(value,'question')||!PARENT.test(value.parentId||''))fail(400,'invalid-input');
    out.parentId=value.parentId;out.message=text(value.message,10,1000);
  }else{
    if(Object.hasOwn(value,'message')||Object.hasOwn(value,'parentId'))fail(400,'invalid-input');
    const topics=value.kind==='question'?QUESTION_TOPICS:THREAD_TOPICS;
    if(!topics.has(value.topic))fail(400,'invalid-input');out.topic=value.topic;out.question=text(value.question,10,1000);
  }
  return out;
}
function adminRow(row){return {id:row.id,kind:row.kind,topic:row.topic,question:row.question,displayName:row.display_name,message:row.message,parentId:row.parent_id,status:row.status,revision:row.revision,answer:row.answer,createdAt:iso(row.created_ms),updatedAt:iso(row.updated_ms),publishedAt:row.published_ms?iso(row.published_ms):null};}
function publicReply(row){return{id:row.id,parentId:row.parent_id,displayName:row.display_name,message:row.message,status:'published',publicationConsent:true,createdAt:iso(row.created_ms)};}
function validSnapshot(manifest,qa,space,now){
  const base=['version','complete','space','generation','generatedAt'];
  const envelope=value=>object(value)&&value.version===1&&value.complete===true&&value.space===space&&/^[a-f0-9]{16,64}$/.test(value.generation||'')&&typeof value.generatedAt==='string'&&Number.isFinite(Date.parse(value.generatedAt))&&Date.parse(value.generatedAt)<=now+300000&&now-Date.parse(value.generatedAt)<=86400000;
  const stamp=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value)&&Number.isFinite(Date.parse(value))&&Date.parse(value)<=now+300000;
  const rowId=value=>typeof value==='string'&&PARENT.test(value);
  const bounded=(value,min,max)=>typeof value==='string'&&value.length>=min&&value.length<=max;
  const rows=value=>Array.isArray(value)&&value.length<=500;
  const reply=value=>keys(value,['id','status','displayName','message','createdAt'])&&rowId(value.id)&&value.status==='published'&&bounded(value.displayName,2,40)&&bounded(value.message,10,1000)&&stamp(value.createdAt);
  const thread=value=>keys(value,['id','status','topic','question','displayName','createdAt','replies'])&&rowId(value.id)&&value.status==='published'&&THREAD_TOPICS.has(value.topic)&&bounded(value.question,10,1000)&&bounded(value.displayName,2,40)&&stamp(value.createdAt)&&rows(value.replies)&&value.replies.every(reply);
  const question=value=>keys(value,['id','status','topic','question','answer','createdAt','answeredAt','publicationConsent'])&&rowId(value.id)&&value.status==='published'&&value.publicationConsent===true&&QUESTION_TOPICS.has(value.topic)&&bounded(value.question,10,1000)&&bounded(value.answer,1,3000)&&stamp(value.createdAt)&&stamp(value.answeredAt);
  return keys(manifest,[...base,'domains'])&&envelope(manifest)&&keys(manifest.domains,['qa','cms','website'])&&manifest.domains.qa==='qa.json'&&manifest.domains.cms==='cms.json'&&manifest.domains.website==='website.json'&&keys(qa,[...base,'questions','threads'])&&envelope(qa)&&qa.generation===manifest.generation&&qa.generatedAt===manifest.generatedAt&&rows(qa.questions)&&qa.questions.every(question)&&rows(qa.threads)&&qa.threads.every(thread);
}

export function createWorker({fetcher=(...args)=>fetch(...args),now=()=>Date.now(),cryptography=globalThis.crypto}={}){
  const keyCache=new Map(),parentCache=new Map();
  async function remoteJson(url,max){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4000);
    try{const response=await fetcher(url,{headers:{Accept:'application/json','User-Agent':'DainyelOnTheMove/1.0 (public signing-key verification)'},redirect:'error',credentials:'omit',signal:controller.signal});if(!response.ok)fail(503,'verification-unavailable');return{value:JSON.parse(await boundedText(response,max)),headers:response.headers};}
    catch(error){if(error instanceof Failure)throw error;fail(503,'verification-unavailable');}finally{clearTimeout(timer);}
  }
  async function signed(token,endpoint){
    if(typeof token!=='string'||token.length>16384)fail(401,'not-authorized');
    const parts=token.split('.');if(parts.length!==3)fail(401,'not-authorized');const header=parsePart(parts[0]),claims=parsePart(parts[1]);
    if(!object(header)||!object(claims)||header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>160||!header.kid||header.crit!==undefined||header.jku!==undefined||header.x5u!==undefined)fail(401,'not-authorized');
    if(endpoint===APP_KEYS&&header.typ!=='JWT')fail(401,'not-authorized');
    let saved=keyCache.get(endpoint);
    if(!saved||saved.expires<=now()){
      const {value,headers}=await remoteJson(endpoint,65536);
      if(!object(value)||!Array.isArray(value.keys)||value.keys.length>20)fail(503,'verification-unavailable');
      const lifetime=Math.min(3600,Math.max(60,Number(/(?:^|,)\s*max-age=(\d+)/i.exec(headers.get('cache-control')||'')?.[1]||300)));
      saved={expires:now()+lifetime*1000,keys:new Map()};
      for(const jwk of value.keys){if(!object(jwk)||jwk.kty!=='RSA'||typeof jwk.kid!=='string'||typeof jwk.n!=='string'||typeof jwk.e!=='string'||jwk.d!==undefined||jwk.alg&&jwk.alg!=='RS256'||jwk.use&&jwk.use!=='sig')continue;
        try{saved.keys.set(jwk.kid,await cryptography.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']));}catch{}}
      if(!saved.keys.size)fail(503,'verification-unavailable');keyCache.set(endpoint,saved);
    }
    const key=saved.keys.get(header.kid);if(!key)fail(401,'not-authorized');
    let verified=false;try{verified=await cryptography.subtle.verify('RSASSA-PKCS1-v1_5',key,decode64(parts[2]),bytes.encode(parts[0]+'.'+parts[1]));}catch{}
    const seconds=now()/1000;
    if(!verified||!Number.isSafeInteger(claims.exp)||!Number.isSafeInteger(claims.iat)||claims.exp<=seconds||claims.iat>seconds||claims.iat<=0||claims.exp<=claims.iat||claims.exp-claims.iat>86400||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>200)fail(401,'not-authorized');return claims;
  }
  async function verifyApp(request,env){
    const claims=await signed(request.headers.get('x-firebase-appcheck'),APP_KEYS);
    if(claims.iss!=='https://firebaseappcheck.googleapis.com/'+env.FIREBASE_PROJECT_NUMBER||!Array.isArray(claims.aud)||!claims.aud.includes('projects/'+env.FIREBASE_PROJECT_NUMBER)||claims.sub!==env.FIREBASE_APP_ID)fail(403,'app-verification-required');
  }
  async function verifyOwner(request,env){
    const match=/^Bearer ([A-Za-z0-9_.-]+)$/.exec(request.headers.get('authorization')||'');if(!match)fail(401,'owner-sign-in-required');
    const claims=await signed(match[1],AUTH_KEYS),seconds=now()/1000;
    if(claims.iss!=='https://securetoken.google.com/'+env.FIREBASE_PROJECT_ID||claims.aud!==env.FIREBASE_PROJECT_ID||claims.sub!==env.OWNER_UID||claims.email!==env.OWNER_EMAIL||claims.email_verified!==true||!Number.isSafeInteger(claims.auth_time)||claims.auth_time<=0||claims.auth_time>seconds||claims.exp-claims.iat>3600||claims.firebase?.sign_in_second_factor!=='totp')fail(403,'owner-two-step-required');
  }
  async function digest(value){return Array.from(new Uint8Array(await cryptography.subtle.digest('SHA-256',bytes.encode(value))),v=>v.toString(16).padStart(2,'0')).join('');}
  async function privateAddress(request,db){
    const ip=request.headers.get('cf-connecting-ip');if(typeof ip!=='string'||ip.length>64||!/^[0-9a-fA-F:.]+$/.test(ip))fail(403,'verification-unavailable');
    const salt=await db.prepare("SELECT value FROM settings WHERE name = 'rate_salt'").first('value');if(typeof salt!=='string'||!/^[a-f0-9]{64}$/.test(salt))fail(503,'not-configured');
    const key=await cryptography.subtle.importKey('raw',bytes.encode(salt),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    return Array.from(new Uint8Array(await cryptography.subtle.sign('HMAC',key,bytes.encode(ip.toLowerCase()))),v=>v.toString(16).padStart(2,'0')).join('');
  }
  async function legacyParents(space){
    const cached=parentCache.get(space);if(cached&&cached.until>now()&&cached.expires>now())return cached.ids;
    const base=HOSTS[space]+'/data/public-content/';
    const {value:manifest}=await remoteJson(base+'manifest.json',16384),{value:qa}=await remoteJson(base+'qa.json',4*1024*1024);
    if(!validSnapshot(manifest,qa,space,now()))fail(503,'conversation-unavailable');
    const ids=new Set(qa.threads.map(row=>row.id));parentCache.set(space,{ids,until:now()+30000,expires:Date.parse(qa.generatedAt)+86400000});return ids;
  }
  async function parentPublished(parentId,env){
    if(ID.test(parentId)){const row=await env.DB.prepare("SELECT id FROM submissions WHERE id = ? AND kind = 'thread' AND status = 'published'").bind(parentId).first();return!!row;}
    return (await legacyParents(env.SPACE)).has(parentId);
  }
  async function accept(request,env){
    const value=submission(await jsonBody(request));await verifyApp(request,env);
    const hash=await digest(JSON.stringify(value)),db=env.DB;
    if(await db.prepare('SELECT id FROM removals WHERE id = ?').bind(value.id).first())fail(410,'submission-removed');
    function replay(row){if(row.payload_hash!==hash)fail(409,'request-id-conflict');return{status:200,body:{id:row.id,status:'pending',revision:1,replayed:true}};}
    const existing=await db.prepare('SELECT id,payload_hash FROM submissions WHERE id = ?').bind(value.id).first();if(existing)return replay(existing);
    if(value.kind==='reply'&&!await parentPublished(value.parentId,env))fail(409,'conversation-unavailable');
    const stamp=now(),ipHash=await privateAddress(request,db);
    try{await db.batch([
      db.prepare('DELETE FROM admissions WHERE id IN (SELECT id FROM admissions WHERE created_ms < ? ORDER BY created_ms LIMIT 100)').bind(stamp-86400000),
      db.prepare('INSERT INTO admissions(id,ip_hash,created_ms) VALUES (?,?,?)').bind(value.id,ipHash,stamp),
      db.prepare("INSERT INTO submissions(id,payload_hash,kind,topic,question,display_name,message,parent_id,publication_consent,status,revision,created_ms,updated_ms) VALUES (?,?,?,?,?,?,?,?,1,'pending',1,?,?)").bind(value.id,hash,value.kind,value.topic,value.question,value.displayName,value.message,value.parentId,stamp,stamp)
    ]);}catch(error){
      // A concurrent retry may have won. The immutable payload proves identity;
      // no provider write is retried and failed admission counters roll back.
      const raced=await db.prepare('SELECT id,payload_hash FROM submissions WHERE id = ?').bind(value.id).first();if(raced)return replay(raced);
      const code=String(error?.message||'');if(code.includes('INBOX_DAY_LIMIT')||code.includes('INBOX_IP_LIMIT'))fail(429,'submission-limit');if(code.includes('INBOX_CAPACITY'))fail(503,'inbox-full');if(code.includes('INBOX_PARENT'))fail(409,'conversation-unavailable');throw error;
    }
    const saved=await db.prepare('SELECT id FROM submissions WHERE id = ?').bind(value.id).first();if(!saved)fail(409,'conversation-unavailable');
    return{status:201,body:{id:value.id,status:'pending',revision:1,replayed:false}};
  }
  async function publicData(env){
    const results=await env.DB.batch([
      env.DB.prepare("SELECT * FROM submissions WHERE kind = 'question' AND status = 'published' ORDER BY published_ms DESC,id DESC LIMIT 100"),
      env.DB.prepare("SELECT * FROM submissions WHERE kind = 'thread' AND status = 'published' ORDER BY published_ms DESC,id DESC LIMIT 100"),
      env.DB.prepare("SELECT r.*,p.status AS parent_status,p.kind AS parent_kind FROM submissions r LEFT JOIN submissions p ON p.id = r.parent_id WHERE r.kind = 'reply' AND r.status = 'published' ORDER BY r.published_ms DESC,r.id DESC LIMIT 250")
    ]);
    const questions=results[0].results.map(row=>({id:row.id,status:'published',publicationConsent:true,topic:row.topic,question:row.question,answer:row.answer,createdAt:iso(row.created_ms),answeredAt:iso(row.published_ms)}));
    const threads=results[1].results.map(row=>({id:row.id,status:'published',publicationConsent:true,topic:row.topic,question:row.question,displayName:row.display_name,createdAt:iso(row.created_ms),replies:[]})),byId=new Map(threads.map(row=>[row.id,row])),replies=[];
    const source=results[2].results;let parents=new Set();if(source.some(row=>!ID.test(row.parent_id))){try{parents=await legacyParents(env.SPACE);}catch{/* A missing legacy copy never exposes unverified replies. */}}
    for(const row of source){const reply=publicReply(row);if(ID.test(row.parent_id)){const parent=byId.get(row.parent_id);if(row.parent_status==='published'&&row.parent_kind==='thread'&&parent&&parent.replies.length<50)parent.replies.push(reply);}else if(parents.has(row.parent_id)&&replies.length<100)replies.push(reply);}
    return{questions,threads,replies};
  }
  async function listAdmin(url,env){
    if([...url.searchParams.keys()].some(key=>!['status','cursor'].includes(key)))fail(400,'invalid-input');
    const status=url.searchParams.get('status')||'pending';if(!['pending','published','archived'].includes(status))fail(400,'invalid-input');
    const cursor=cursorDecode(url.searchParams.get('cursor'));
    const statement=env.DB.prepare('SELECT * FROM submissions WHERE status = ?'+(cursor?' AND (created_ms < ? OR (created_ms = ? AND id < ?))':'')+' ORDER BY created_ms DESC,id DESC LIMIT 26');
    const {results}=await statement.bind(...(cursor?[status,cursor.time,cursor.time,cursor.id]:[status])).all(),items=results.slice(0,25),last=items.at(-1);
    return{items:items.map(adminRow),nextCursor:results.length>25?cursorEncode({time:last.created_ms,id:last.id}):null};
  }
  async function moderate(request,id,env){
    const value=await jsonBody(request);if(!keys(value,['revision','status','answer'])||!Number.isSafeInteger(value.revision)||value.revision<1||!['pending','published','archived'].includes(value.status))fail(400,'invalid-input');
    const db=env.DB,row=await db.prepare('SELECT * FROM submissions WHERE id = ?').bind(id).first();if(!row)fail(404,'not-found');if(row.revision!==value.revision)fail(409,'revision-conflict');
    if(row.kind!=='question'&&Object.hasOwn(value,'answer'))fail(400,'invalid-input');const answer=Object.hasOwn(value,'answer')?text(value.answer,0,3000):row.answer;
    if(value.status==='published'&&row.kind==='question'&&!answer)fail(400,'answer-required');
    if(value.status==='published'&&row.kind==='reply'&&!await parentPublished(row.parent_id,env))fail(409,'conversation-unavailable');
    const stamp=now();let result;
    try{result=await db.prepare("UPDATE submissions SET status = ?,answer = ?,revision = revision + 1,updated_ms = ?,published_ms = ? WHERE id = ? AND revision = ? AND (? = 0 OR EXISTS (SELECT 1 FROM submissions p WHERE p.id = submissions.parent_id AND p.kind = 'thread' AND p.status = 'published'))").bind(value.status,answer,stamp,value.status==='published'?stamp:row.published_ms,id,value.revision,value.status==='published'&&row.kind==='reply'&&ID.test(row.parent_id)?1:0).run();}
    catch(error){if(String(error?.message||'').includes('INBOX_CAPACITY'))fail(503,'inbox-full');throw error;}
    if(result.meta.changes!==1)fail(409,'revision-conflict');return{item:adminRow(await db.prepare('SELECT * FROM submissions WHERE id = ?').bind(id).first())};
  }
  async function remove(request,id,env){
    const value=await jsonBody(request);
    if(!keys(value,['revision'])||!Number.isSafeInteger(value.revision)||value.revision<1)fail(400,'invalid-input');
    const result=await env.DB.batch([
      env.DB.prepare("INSERT INTO removals(id,removed_ms) SELECT id,? FROM submissions WHERE id = ? AND revision = ? AND status = 'archived'").bind(now(),id,value.revision),
      env.DB.prepare("DELETE FROM submissions WHERE id = ? AND revision = ? AND status = 'archived' AND EXISTS (SELECT 1 FROM removals WHERE id = ?)").bind(id,value.revision,id)
    ]);
    if(result[1].meta.changes!==1)fail(409,'revision-conflict');
    return{removed:true,id};
  }
  return{async fetch(request,env){
    const origin=request.headers.get('origin'),allowed=ORIGINS[env.SPACE]?.includes(origin),headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin'};
    if(allowed)headers['Access-Control-Allow-Origin']=origin;
    const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
    try{
      const url=new URL(request.url),path=url.pathname;
      if(path==='/health'&&request.method==='GET')return response({ok:true,enabled:env.ENABLED==='true',space:Object.hasOwn(ORIGINS,env.SPACE)?env.SPACE:null});
      if(!allowed)fail(403,'origin-not-allowed');
      if(request.method==='OPTIONS'){
        const method=request.headers.get('access-control-request-method'),requested=(request.headers.get('access-control-request-headers')||'').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
        const routeMethods=path==='/submissions'?['POST']:path==='/public'||path==='/admin/submissions'?['GET']:/^\/admin\/submissions\/cf-[a-f0-9]{32}$/.test(path)?['PATCH','DELETE']:[];
        if(!routeMethods.includes(method)||requested.some(name=>!['authorization','content-type','x-firebase-appcheck'].includes(name)))fail(403,'origin-not-allowed');
        return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':routeMethods.join(', '),'Access-Control-Allow-Headers':'Authorization, Content-Type, X-Firebase-AppCheck','Access-Control-Max-Age':'300'}});
      }
      if(env.ENABLED!=='true')fail(503,'not-configured');configuration(env);
      if(path==='/submissions'&&request.method==='POST'&&!url.search){const accepted=await accept(request,env);return response(accepted.body,accepted.status);}
      if(path==='/public'&&request.method==='GET'&&!url.search)return response(await publicData(env));
      if(path.startsWith('/admin/')){await verifyApp(request,env);await verifyOwner(request,env);
        if(path==='/admin/submissions'&&request.method==='GET')return response(await listAdmin(url,env));
        const match=/^\/admin\/submissions\/(cf-[a-f0-9]{32})$/.exec(path);if(match&&request.method==='PATCH'&&!url.search)return response(await moderate(request,match[1],env));
        if(match&&request.method==='DELETE'&&!url.search)return response(await remove(request,match[1],env));
      }
      fail(404,'not-found');
    }catch(error){
      // Never echo provider/database details, bodies, identities, addresses or tokens.
      if(error instanceof Failure){if(error.status===429)headers['Retry-After']='900';return response({error:error.code},error.status);}
      return response({error:'storage-unavailable'},503);
    }
  }};
}
const runtime=createWorker();
// One private dashboard setting avoids putting owner account identifiers into
// the public repository. It can never replace the actual D1 binding.
function runtimeSettings(env){
  if(!env.INBOX_CONFIG)return env;
  const value=typeof env.INBOX_CONFIG==='string'?JSON.parse(env.INBOX_CONFIG):env.INBOX_CONFIG;
  if(!keys(value,['ENABLED','SPACE','FIREBASE_PROJECT_ID','FIREBASE_PROJECT_NUMBER','FIREBASE_APP_ID','OWNER_UID','OWNER_EMAIL']))throw Error('invalid-configuration');
  return{...value,DB:env.DB};
}
export default {
  async fetch(request,env){
    try{return await runtime.fetch(request,runtimeSettings(env));}
    catch{return new Response(JSON.stringify({error:'not-configured'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}
  },
  async scheduled(event,env){
    // Only technical admission counters expire automatically, never visitor
    // contributions. No personal text, raw address or token is in this table.
    const settings=runtimeSettings(env);if(settings.ENABLED!=='true')return;
    configuration(settings);
    await settings.DB.prepare('DELETE FROM admissions WHERE created_ms < ?').bind(Date.now()-86400000).run();
  }
};
