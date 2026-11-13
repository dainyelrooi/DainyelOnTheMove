// Optional real-browser fixture: all Firebase traffic is replaced, all external
// requests are blocked. No owner session, production data or provider is used.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=new URL('../../',import.meta.url),html=(await readFile(new URL('admin.html',root),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const server=createServer(async(req,res)=>{
 try{const path=new URL(req.url,'http://fixture').pathname;if(path==='/admin'){res.setHeader('Content-Type','text/html');res.end(html);return;}
  if(!/^\/assets\/[a-z0-9-]+\.(?:js|css|svg|woff2)$/.test(path)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'image/svg+xml');res.end(await readFile(new URL('.'+path,root)));
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
function sdkFixture(){
 class Timestamp{constructor(date){this.ms=+date;}static fromDate(date){return new Timestamp(date);}toDate(){return new Date(this.ms);}toMillis(){return this.ms;}isEqual(other){return this.ms===other?.ms;}}
 const stamp=()=>Timestamp.fromDate(new Date('2026-11-01T10:00Z')),mail='mail-'+'a'.repeat(32),plan='plan-'+'b'.repeat(32),entry='entry-'+'c'.repeat(32),rows=new Map(),listeners=[];
 const payload={subject:'ISOLATED planned email',body:'Retained test copy'},provider={state:'scheduled',status:'queued',identity:'managed-id',lastSuccessAt:'2026-11-12T10:00:00Z',scheduledAt:'2026-11-15T10:00:00Z',calendarAt:'2026-11-15T10:00:00Z',error:''};
 rows.set('cmsSpaces/staging/mailJobs/'+mail,{status:'scheduled',campaignId:101,payload,provider});
 rows.set('calendarSpaces/staging/posts/'+plan,{version:1,kind:'task',title:'ISOLATED editing task',caption:'Private fixture',platforms:[],publishAt:Timestamp.fromDate(new Date('2026-11-14T11:00Z')),updatedAt:stamp(),timezone:'Europe/Amsterdam',scheduled:false,published:false,remindersEnabled:false});
 rows.set('cmsSpaces/staging/entrySchedules/'+entry,{status:'queued',payload:{title:'ISOLATED website story'},scheduledAt:Timestamp.fromDate(new Date('2026-11-16T11:00Z'))});
 const prefs=JSON.parse(localStorage.getItem('fixture-visibility')||'null');if(prefs)rows.set('calendarSpaces/staging/preferences/visibility',prefs);
 const doc=(db,...parts)=>parts.join('/'),collection=doc,query=(path,...clauses)=>({path,clauses}),where=(...args)=>args,orderBy=(...args)=>args,limit=(...args)=>args;
 const snapshot=target=>typeof target==='string'?{exists:()=>rows.has(target),data:()=>rows.get(target),metadata:{fromCache:false}}:{docs:[...rows].filter(([path])=>path.startsWith(target.path+'/')).map(([path,data])=>({id:path.split('/').at(-1),data:()=>data})),metadata:{fromCache:false},size:[...rows].filter(([path])=>path.startsWith(target.path+'/')).length};
 function notify(){for(const item of listeners)if(item.active)item.next(snapshot(item.target));}
 function onSnapshot(target,options,next){if(typeof options==='function')next=options;const item={target,next,active:true};listeners.push(item);queueMicrotask(()=>{if(item.active)next(snapshot(target));});return()=>item.active=false;}
 async function runTransaction(db,callback){const pending=[];const result=await callback({get:async target=>snapshot(target),set:(path,data)=>pending.push({path,data}),update:(path,data)=>pending.push({path,data:{...rows.get(path),...data}}),delete:path=>pending.push({path,remove:true})});for(const op of pending){if(op.remove)rows.delete(op.path);else rows.set(op.path,op.data);if(op.path.endsWith('/preferences/visibility'))localStorage.setItem('fixture-visibility',JSON.stringify(op.data));}notify();return result;}
 const getDoc=async target=>snapshot(target),setDoc=async(path,data)=>{rows.set(path,data);notify();},serverTimestamp=stamp;
 window.fixture={rows,mail,plan,entry,before:JSON.stringify(rows.get('cmsSpaces/staging/mailJobs/'+mail))};
 return {Timestamp,doc,collection,query,where,orderBy,limit,onSnapshot,runTransaction,getDoc,setDoc,serverTimestamp};
}
const sdk='const sdk=('+sdkFixture.toString()+')();export const {Timestamp,doc,collection,query,where,orderBy,limit,onSnapshot,runTransaction,getDoc,setDoc,serverTimestamp}=sdk;';
try{
 for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.request().url()==='https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js'?route.fulfill({contentType:'text/javascript',body:sdk}):route.abort());
  async function load(total=3){await page.goto(base+'/admin?fixture='+Date.now()+'#admin-content');await page.evaluate(async()=>{
   document.querySelector('#dashboard').hidden=false;document.querySelector('#auth-panel').hidden=true;document.querySelector('#auth-loading').hidden=true;
   await import('/assets/admin-desk.js');window.calendar=await import('/assets/content-calendar.js');window.calendar.initContentCalendar({});
  });try{await page.locator('[data-calendar-total]').filter({hasText:String(total)}).waitFor({timeout:5000});}catch(error){console.error(await page.evaluate(()=>({total:document.querySelector('[data-calendar-total]').textContent,prefs:localStorage.getItem('fixture-visibility'),status:document.querySelector('[data-calendar-visibility-status]').textContent,calendar:document.querySelector('[data-calendar-status]').textContent})),errors);throw error;}await page.locator('[data-calendar-month]').fill('2026-11');}
  await load();
  assert.equal(await page.locator('[data-desk-nav]>a').count(),5);assert.equal(await page.locator('.desk-nav-group[open]').count(),0);
  await page.evaluate(()=>location.hash='admin-location');await page.locator('.desk-nav-group[open]').waitFor();assert.equal(await page.locator('#admin-location').isVisible(),true);
  await page.locator('[data-calendar-nav]').click();await page.locator('[data-calendar-view=list]').click();
  const task=page.locator('.calendar-post').filter({hasText:'ISOLATED editing task'});assert.equal(await task.locator(':scope>details').getAttribute('open'),null);
  await task.getByRole('button',{name:'Delete calendar item',exact:true}).click();await page.locator('.owner-confirm').getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await task.count(),1);
  await task.getByRole('button',{name:'Delete calendar item',exact:true}).click();await page.locator('.owner-confirm').getByRole('button',{name:'Confirm',exact:true}).click();await task.waitFor({state:'detached'});
  const mailCard=()=>page.locator('.calendar-linked-post').filter({hasText:'ISOLATED planned email'});
  await mailCard().getByRole('button',{name:'Remove from calendar',exact:true}).click();assert.match(await page.locator('.owner-confirm').innerText(),/delivery continues in Brevo/);
  await page.locator('.owner-confirm').getByRole('button',{name:'Confirm',exact:true}).click();await mailCard().waitFor({state:'detached'});
  assert.equal(await page.locator('.calendar-linked-post').filter({hasText:'ISOLATED website story'}).count(),1);
  assert.equal(await page.evaluate(()=>JSON.stringify(fixture.rows.get('cmsSpaces/staging/mailJobs/'+fixture.mail))===fixture.before),true);
  await page.locator('[data-calendar-removed]').click();await mailCard().waitFor();
  await mailCard().getByRole('button',{name:'Restore to calendar',exact:true}).click();await page.locator('.owner-confirm').getByRole('button',{name:'Confirm',exact:true}).click();
  await page.locator('[data-calendar-removed]').click();await mailCard().waitFor();
  await mailCard().getByRole('button',{name:'Remove from calendar',exact:true}).click();await page.locator('.owner-confirm').getByRole('button',{name:'Confirm',exact:true}).click();await mailCard().waitFor({state:'detached'});
  await load(2);await page.locator('[data-calendar-view=list]').click();assert.equal(await mailCard().count(),0);await page.locator('[data-calendar-removed]').click();await mailCard().waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal page overflow');
  await page.evaluate(()=>window.calendar.clearContentCalendar());assert.equal(await page.locator('[data-calendar-removed]').isDisabled(),true);assert.equal(await page.locator('.calendar-linked-post').count(),0);
  assert.deepEqual(errors,[]);console.log(width+'px: grouped menu, visible delete/cancel, linked remove/restore/reload and sign-out passed; provider unchanged');await context.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
