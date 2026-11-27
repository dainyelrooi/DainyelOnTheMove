// Private aggregate status and explicitly opted-in browser registrations.
// No contact addresses, mail contents or provider keys are retained.
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const keys=(value,allowed)=>object(value)&&Object.keys(value).every(key=>allowed.includes(key));
const events=new Set(['delivered','hardBounce','softBounce','unsubscribed','spam']);
const fid=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{22,128}$/.test(value);
const secret=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const entry=value=>typeof value==='string'&&/^entry-[a-f0-9]{32}$/.test(value);
const iso=time=>new Date(time).toISOString();
export const SERVICE_ROUTES=new Set(['/features','/hooks/brevo','/admin/services','/push/subscribe','/push/unsubscribe','/bridge/configure','/bridge/status','/bridge/preferences','/bridge/push/claim','/bridge/push/receipt']);
export function createSiteServices({now,crypto,signed,verifyApp,verifyOwner,privateAddress,jsonBody,digest,fail}){
  const setting=async(db,name)=>{const raw=await db.prepare('SELECT value FROM site_settings WHERE name=?').bind(name).first('value');if(raw===null||raw===undefined)return null;try{return JSON.parse(raw);}catch{return null;}};
  const statement=(db,name,value)=>db.prepare('INSERT INTO site_settings(name,value,updated_ms) VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value,updated_ms=excluded.updated_ms').bind(name,JSON.stringify(value),now());
  const put=(db,name,value)=>statement(db,name,value).run();
  async function bridge(request,env){
    const header=request.headers.get('authorization')||'';if(!header.startsWith('Bearer '))fail(401,'not-authorized');
    const c=await signed(header.slice(7),'https://token.actions.githubusercontent.com/.well-known/jwks'),ref='refs/heads/'+(env.SPACE==='staging'?'staging':'main');
    const checks={issuer:c.iss==='https://token.actions.githubusercontent.com',audience:c.aud===new URL(request.url).origin,repository:c.repository==='dainyelrooi/DainyelOnTheMove',branch:c.ref===ref,workflow:['dainyelrooi/DainyelOnTheMove/.github/workflows/site-tools.yml@'+ref,...(new URL(request.url).pathname==='/bridge/preferences'?['dainyelrooi/DainyelOnTheMove/.github/workflows/postcard-delivery.yml@'+ref]:[])].includes(c.workflow_ref),event:['push','workflow_dispatch','workflow_run','schedule'].includes(c.event_name),lifetime:c.exp-c.iat<=600};
    for(const [name,valid] of Object.entries(checks))if(!valid)fail(403,'bridge-'+name+'-refused');
  }
  async function configure(request,env){
    const value=await jsonBody(request,8192);if(!keys(value,['webhookSecretHash','preferencesFormId','segments'])||'webhookSecretHash'in value&&!secret(value.webhookSecretHash)||'preferencesFormId'in value&&!/^[a-f0-9]{24}$/.test(value.preferencesFormId))fail(400,'invalid-input');
    if('segments'in value&&(!keys(value.segments,['stories','films','tips'])||Object.keys(value.segments).length!==3||Object.values(value.segments).some(n=>!Number.isSafeInteger(n)||n<=1)||new Set(Object.values(value.segments)).size!==3))fail(400,'invalid-input');
    const changes=[];
    for(const [field,name] of [['webhookSecretHash','webhook_secret_sha'],['preferencesFormId','preferences_form_id'],['segments','preference_segments']])if(field in value)changes.push(statement(env.DB,name,value[field]));
    changes.push(env.DB.prepare('INSERT OR IGNORE INTO site_settings(name,value,updated_ms) VALUES(?,?,?)').bind('push_setup_ms',JSON.stringify(now()),now()));
    await env.DB.batch(changes);
    return {ok:true};
  }
  async function saveStatus(request,env){
    const value=await jsonBody(request,8192);
    if(!keys(value,['brevo'])||!keys(value.brevo,['plan','dailyLimit','remaining','checkedAt','preferencesReady','webhookReady'])||!['free','unavailable'].includes(value.brevo.plan)||value.brevo.dailyLimit!==300||value.brevo.remaining!==null&&(!Number.isSafeInteger(value.brevo.remaining)||value.brevo.remaining<0||value.brevo.remaining>300)||typeof value.brevo.preferencesReady!=='boolean'||typeof value.brevo.webhookReady!=='boolean'||!Number.isFinite(Date.parse(value.brevo.checkedAt))||Math.abs(Date.parse(value.brevo.checkedAt)-now())>300000)fail(400,'invalid-input');
    await put(env.DB,'brevo_status',value.brevo);return {ok:true};
  }
  async function webhook(request,env){
    const expected=await setting(env.DB,'webhook_secret_sha'),auth=request.headers.get('authorization')||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!secret(expected)||!secret(token)||await digest(token)!==expected)fail(401,'not-authorized');
    const body=await jsonBody(request,131072),rows=Array.isArray(body.events)?body.events:[body];if(rows.length>100)fail(413,'request-too-large');
    const stamp=now(),statements=[];
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(token),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    for(const row of rows){
      if(!object(row))continue;
      const campaign=row.camp_id??row.campaign_id,time=Number.isFinite(row.ts_event)?row.ts_event*1000:Number.isFinite(row.ts)?row.ts*1000:Date.parse(row.date);
      if(!object(row)||!events.has(row.event)||!Number.isSafeInteger(campaign)||campaign<=0||!Number.isFinite(time)||time>stamp+300000||time<stamp-14*86400000)continue;
      const identity=[campaign,row.event,Math.floor(time/1000),typeof row.email==='string'?row.email.slice(0,320).toLowerCase():String(row.id||'').slice(0,180)].join('|');
      const mac=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(identity))),n=>n.toString(16).padStart(2,'0')).join('');
      statements.push(env.DB.prepare('INSERT OR IGNORE INTO site_webhook_events(digest,campaign,event,occurred_ms,received_ms) SELECT ?,?,?,?,? WHERE (SELECT events FROM site_capacity WHERE id=1)<20000').bind(mac,campaign,row.event,time,stamp));
    }
    if(statements.length>40)fail(413,'request-too-large');
    const result=statements.length?await env.DB.batch(statements):[];await put(env.DB,'webhook_last_ms',stamp);
    return {ok:true,accepted:result.reduce((n,row)=>n+(row.meta?.changes?1:0),0)};
  }
  async function subscribe(request,env){
    await verifyApp(request,env);const value=await jsonBody(request,4096);
    if(!keys(value,['fid','key','consent'])||!fid(value.fid)||!secret(value.key)||value.consent!==true)fail(400,'invalid-input');
    if(!/^[A-Za-z0-9_-]{87}$/.test(env.PUSH_VAPID_KEY||''))fail(503,'notifications-unavailable');
    const hash=await digest(value.key),previous=await env.DB.prepare('SELECT secret_sha FROM site_push_registrations WHERE fid=?').bind(value.fid).first('secret_sha');
    if(previous&&previous!==hash)fail(403,'not-authorized');
    const ip=await privateAddress(request,env.DB),stamp=now();
    try{await env.DB.batch([env.DB.prepare('INSERT INTO site_push_admissions(id,ip_hash,created_ms) VALUES(?,?,?)').bind(crypto.randomUUID(),ip,stamp),env.DB.prepare('INSERT INTO site_push_registrations(fid,secret_sha,created_ms,updated_ms,expires_ms) VALUES(?,?,?,?,?) ON CONFLICT(fid) DO UPDATE SET updated_ms=excluded.updated_ms,expires_ms=excluded.expires_ms WHERE secret_sha=excluded.secret_sha').bind(value.fid,hash,stamp,stamp,stamp+90*86400000)]);}catch(error){if(/PUSH_(?:DAY_LIMIT|IP_LIMIT|CAPACITY)/.test(String(error)))fail(429,'notification-capacity');throw error;}
    return {ok:true,expiresAt:iso(stamp+90*86400000)};
  }
  async function unsubscribe(request,env){
    const value=await jsonBody(request,4096);if(!keys(value,['fid','key'])||!fid(value.fid)||!secret(value.key))fail(400,'invalid-input');
    const hash=await digest(value.key),found=await env.DB.prepare('SELECT fid FROM site_push_registrations WHERE fid=? AND secret_sha=?').bind(value.fid,hash).first('fid');
    if(found)await env.DB.batch([env.DB.prepare('DELETE FROM site_push_jobs WHERE fid=?').bind(value.fid),env.DB.prepare('DELETE FROM site_push_registrations WHERE fid=? AND secret_sha=?').bind(value.fid,hash)]);
    // Uniform response: no registration lookup or existence oracle.
    return {ok:true};
  }
  async function claim(request,env){
    const value=await jsonBody(request,4096),stamp=now(),published=Date.parse(value.publishedAt),setup=await setting(env.DB,'push_setup_ms');
    if(!keys(value,['entryId','title','publishedAt'])||!entry(value.entryId)||typeof value.title!=='string'||!value.title.trim()||value.title.length>140||!Number.isFinite(published)||published>stamp||published<stamp-86400000)fail(400,'invalid-input');
    if(!Number.isFinite(setup)||published<setup)return {ok:true,recipients:[]};
    await env.DB.prepare("UPDATE site_push_jobs SET state='uncertain',updated_ms=? WHERE state='reserved' AND lease_until<?").bind(stamp,stamp).run();
    const rows=(await env.DB.prepare("SELECT r.fid FROM site_push_registrations r LEFT JOIN site_push_jobs j ON j.fid=r.fid AND j.entry_id=? WHERE r.expires_ms>? AND r.created_ms<=? AND (j.entry_id IS NULL OR j.state='retrying' AND j.next_ms<=? AND j.attempts<4) ORDER BY r.created_ms LIMIT 10").bind(value.entryId,stamp,published,stamp).all()).results;
    const recipients=[];
    for(const row of rows){const lease=crypto.randomUUID(),result=await env.DB.prepare("INSERT INTO site_push_jobs(entry_id,fid,state,lease,lease_until,updated_ms) VALUES(?,?,'reserved',?,?,?) ON CONFLICT(entry_id,fid) DO UPDATE SET state='reserved',lease=excluded.lease,lease_until=excluded.lease_until,attempts=site_push_jobs.attempts+1,updated_ms=excluded.updated_ms WHERE site_push_jobs.state='retrying' AND site_push_jobs.next_ms<=? AND site_push_jobs.attempts<4").bind(value.entryId,row.fid,lease,stamp+300000,stamp,stamp).run();if(result.meta?.changes)recipients.push({fid:row.fid,entryId:value.entryId,lease,title:value.title,url:'/entry/'+value.entryId});}
    return {ok:true,recipients};
  }
  async function receipt(request,env){
    const value=await jsonBody(request,8192);if(!keys(value,['receipts'])||!Array.isArray(value.receipts)||value.receipts.length>10)fail(400,'invalid-input');let updated=0;
    for(const row of value.receipts){if(!keys(row,['entryId','fid','lease','result'])||!entry(row.entryId)||!fid(row.fid)||!/^[-a-f0-9]{36}$/.test(row.lease||'')||!['accepted','retry','uncertain','unregistered','failed'].includes(row.result))fail(400,'invalid-input');
      const result=await env.DB.prepare("UPDATE site_push_jobs SET state=?,lease_until=?,next_ms=?,updated_ms=? WHERE entry_id=? AND fid=? AND lease=? AND state='reserved'").bind(row.result==='retry'?'retrying':row.result==='unregistered'?'failed':row.result,now(),row.result==='retry'?now()+900000:0,now(),row.entryId,row.fid,row.lease).run();updated+=result.meta?.changes||0;
      if(row.result==='unregistered'&&result.meta?.changes)await env.DB.prepare('DELETE FROM site_push_registrations WHERE fid=?').bind(row.fid).run();
    }return {ok:true,updated};
  }
  async function status(request,env){
    await verifyApp(request,env);await verifyOwner(request,env);
    const [brevo,lastWebhook,counts,push,inbox,jobs]=await Promise.all([setting(env.DB,'brevo_status'),setting(env.DB,'webhook_last_ms'),env.DB.prepare('SELECT event,count(*) AS total FROM site_webhook_events WHERE received_ms>? GROUP BY event').bind(now()-7*86400000).all(),env.DB.prepare('SELECT count(*) AS total FROM site_push_registrations WHERE expires_ms>?').bind(now()).first('total'),env.DB.prepare('SELECT active FROM capacity WHERE id=1').first('active'),env.DB.prepare('SELECT state,count(*) AS total,min(CASE WHEN next_ms>0 THEN next_ms END) AS next_ms FROM site_push_jobs GROUP BY state').all()]);
    return {version:1,checkedAt:iso(now()),space:env.SPACE,brevo,webhooks:{lastAt:lastWebhook?iso(lastWebhook):null,periodDays:7,events:counts.results},notifications:{configured:/^[A-Za-z0-9_-]{87}$/.test(env.PUSH_VAPID_KEY||''),active:push,jobs:jobs.results.map(row=>({state:row.state,total:row.total,nextAt:row.next_ms?iso(row.next_ms):null}))},inbox:{active:inbox,capacity:2000},cloudflareQuota:null};
  }
  return {async handle(request,env,path){
    if(path==='/features'&&request.method==='GET')return {version:1,notifications:env.SITE_TOOLS_ENABLED==='true'&&/^[A-Za-z0-9_-]{87}$/.test(env.PUSH_VAPID_KEY||''),vapidKey:env.SITE_TOOLS_ENABLED==='true'?env.PUSH_VAPID_KEY||null:null};
    if(env.SITE_TOOLS_ENABLED!=='true')fail(503,'services-not-connected');
    if(path==='/hooks/brevo'&&request.method==='POST')return webhook(request,env);
    if(path==='/push/subscribe'&&request.method==='POST')return subscribe(request,env);
    if(path==='/push/unsubscribe'&&request.method==='POST')return unsubscribe(request,env);
    if(path==='/admin/services'&&request.method==='GET')return status(request,env);
    if(path.startsWith('/bridge/')&&request.method==='POST'){
      await bridge(request,env);
      if(path==='/bridge/configure')return configure(request,env);
      if(path==='/bridge/status')return saveStatus(request,env);
      if(path==='/bridge/preferences'){const value=await setting(env.DB,'brevo_status');return {preferencesFormId:await setting(env.DB,'preferences_form_id'),segments:await setting(env.DB,'preference_segments'),refreshDue:!value||now()-Date.parse(value.checkedAt)>900000};}
      if(path==='/bridge/push/claim')return claim(request,env);
      if(path==='/bridge/push/receipt')return receipt(request,env);
    }fail(404,'not-found');
  }};
}
