// Optional headless owner-UI fixture. No real identity, database or email access.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),root=new URL('../../',import.meta.url);
const html=(await readFile(new URL('admin.html',root),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const pageCatalogue=JSON.parse(await readFile(new URL('data/website-editor/about.json',root),'utf8')),section=pageCatalogue.groups[0].id;
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://fixture').pathname;
 if(path==='/admin'){res.setHeader('Content-Type','text/html');res.end(html);return;}
 if(!/^\/(?:assets\/[a-z0-9-]+\.(?:js|css)|data\/website-editor\/[a-z0-9-]+\.json)$/.test(path)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'application/json');res.end(await readFile(new URL('.'+path,root)));
}catch{res.writeHead(404).end();}});await new Promise(done=>server.listen(0,'127.0.0.1',done));const base='http://127.0.0.1:'+server.address().port;
async function sdkFactory(section){
 const {contentDigest,pageContentKey}=await import(location.origin+'/assets/draft-publication-state.js'),{entryContentKey}=await import(location.origin+'/assets/publishing-model.js');
 class Timestamp{constructor(date){this.ms=+date;}static fromDate(date){return new Timestamp(date);}toDate(){return new Date(this.ms);}toMillis(){return this.ms;}isEqual(other){return this.ms===other?.ms;}}
 const stamp=()=>Timestamp.fromDate(new Date()),rows=new Map(),listeners=[];let fail=false;
 const path=(kind,id)=>'cmsSpaces/staging/'+kind+'/'+id,ids=Array.from({length:6},(_,n)=>'entry-'+String(n+1).repeat(32));
 const payload=(title,kind='blog')=>({version:1,kind,title,excerpt:'Isolated fixture introduction.',body:'An isolated saved story.',place:'',sources:'',videoUrl:'',photoIds:[],photoPlacements:[],heroPhotoId:'',heroLayout:'split',heroPosition:'center',storyLabel:'',tripPeriod:''});
 for(let n=0;n<ids.length;n++){
  const data=payload(['Verified story','Verified Field Note','Verified fact','Future scheduled draft','Newer private changes','Public check pending'][n],['blog','field-note','fact','blog','blog','fact'][n]);
  rows.set(path('drafts',ids[n]),{...data,revision:1,createdAt:stamp(),updatedAt:stamp()});
  if(n!==3)rows.set(path('published',ids[n]),{...data,publishedAt:stamp(),updatedAt:stamp()});
 }
 rows.get(path('drafts',ids[4])).body='Private revised words.';
 rows.set(path('entrySchedules',ids[3]),{status:'queued',payload:payload('Future scheduled draft'),scheduledAt:Timestamp.fromDate(new Date(Date.now()+86400000))});
 const web={version:1,pageId:'about',values:{},photoIds:[],revision:1,createdAt:stamp(),updatedAt:stamp(),publishedAt:stamp()};
 rows.set('websiteSpaces/staging/drafts/'+section,{...web});rows.set('websiteSpaces/staging/published/'+section,{...web});
 const mail='mail-'+'a'.repeat(32),mailDraft={version:1,revision:1,subject:'Verified fixture Postcard',previewText:'',headline:'Fixture',body:'Isolated fixture email.',ctaText:'Read',ctaUrl:'https://dainyelonthemove.com/stories',imageUrl:'',createdAt:stamp(),updatedAt:stamp()};
 rows.set(path('mailDrafts',mail),mailDraft);rows.set(path('mailJobs',mail),{status:'sent',draftRevision:1,payload:{...mailDraft},campaignId:101,provider:{state:'sent',identity:'managed-id',lastSuccessAt:new Date().toISOString(),sentAt:'2026-11-10T10:00:00Z',calendarAt:'2026-11-10T10:00:00Z',error:''}});
 const doc=(db,...parts)=>(typeof db==='string'?[db,...parts]:parts).join('/'),collection=doc,where=(...args)=>args,documentId=()=>'__name__',orderBy=(...args)=>args,startAfter=(...args)=>args,limit=n=>({limit:n}),query=(path,...clauses)=>({path,clauses});
 const snapshot=target=>{if(typeof target==='string')return{exists:()=>rows.has(target),data:()=>rows.get(target),metadata:{fromCache:false}};let values=[...rows].filter(([path])=>path.startsWith(target.path+'/')&&path.split('/').length===target.path.split('/').length+1);for(const clause of target.clauses)if(Array.isArray(clause)&&clause[0]==='__name__')values=values.filter(([path])=>clause[2].includes(path.split('/').at(-1)));values=values.slice(0,target.clauses.find(c=>c?.limit)?.limit||100);return{docs:values.map(([path,data])=>({id:path.split('/').at(-1),data:()=>data})),size:values.length,metadata:{fromCache:false}};};
 function emit(item){if(!item.active)return;if(fail&&item.target.path?.endsWith('/published'))item.error?.(Error('isolated failure'));else item.next(snapshot(item.target));}
 const notify=()=>listeners.forEach(emit);
 function onSnapshot(target,options,next,error){if(typeof options==='function'){error=next;next=options;}const item={target,next,error,active:true};listeners.push(item);queueMicrotask(()=>emit(item));return()=>item.active=false;}
 const getDoc=async ref=>snapshot(ref),getDocFromServer=getDoc,getDocs=getDoc,serverTimestamp=stamp;
 async function runTransaction(db,callback){const writes=[];const result=await callback({get:getDoc,set:(ref,value)=>writes.push([ref,value]),delete:ref=>writes.push([ref,null]),update:(ref,value)=>writes.push([ref,{...rows.get(ref),...value}])});for(const [ref,value] of writes)if(value)rows.set(ref,value);else rows.delete(ref);notify();return result;}
 const writeBatch=()=>({set(){},commit:async()=>{}});
 window.fixture={ids,rows,section,fail(value){fail=value;notify();},async confirm(){const proof={version:1,source:'public-cdn',space:'staging',state:'partial',generation:'a'.repeat(32),checkedAt:new Date().toISOString(),entries:{},pages:{}};for(const id of ids.slice(0,3))proof.entries[id]=await contentDigest(entryContentKey(rows.get(path('published',id))));proof.entries[ids[4]]=await contentDigest(entryContentKey(rows.get(path('published',ids[4]))));proof.pages[section]=await contentDigest(pageContentKey(web));rows.set('adminOperations/staging/status/publicReading',proof);notify();}};
 return{Timestamp,doc,collection,where,documentId,orderBy,startAfter,limit,query,onSnapshot,getDoc,getDocs,getDocFromServer,serverTimestamp,runTransaction,writeBatch};
}
const sdk='const sdk=await ('+sdkFactory.toString()+')('+JSON.stringify(section)+');export const {Timestamp,doc,collection,where,documentId,orderBy,startAfter,limit,query,onSnapshot,getDoc,getDocs,getDocFromServer,serverTimestamp,runTransaction,writeBatch}=sdk;';
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
try{for(const width of [1280,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url().endsWith('/js/firebase.js')?route.fulfill({contentType:'text/javascript',body:'export const db={};'}):route.request().url()==='https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js'?route.fulfill({contentType:'text/javascript',body:sdk}):route.request().url().startsWith(base)?route.continue():route.abort());
 await page.goto(base+'/admin#admin-create');await page.evaluate(async()=>{document.querySelector('#dashboard').hidden=false;document.querySelector('#auth-panel').hidden=true;document.querySelector('#auth-loading').hidden=true;await import('/assets/admin-desk.js');window.desk=await import('/assets/publishing-desk.js');await desk.initPublishingDesk({});});
 await page.waitForFunction(()=>document.querySelectorAll('[data-publishing-entries] button').length===6);
 await page.evaluate(()=>fixture.confirm());await page.waitForFunction(()=>document.querySelectorAll('[data-publishing-entries] button').length===3);
 assert.match(await page.locator('[data-publishing-entries]').innerText(),/Future scheduled draft/);assert.match(await page.locator('[data-publishing-entries]').innerText(),/Newer private changes/);assert.match(await page.locator('[data-publishing-entries]').innerText(),/Public check pending/);
 await page.locator('[data-publishing-scope]').selectOption('published');await page.waitForFunction(()=>document.querySelectorAll('[data-publishing-entries] button').length===5);
 await page.locator('[data-publishing-entries]').getByRole('button',{name:/Verified story/}).click();await page.locator('[data-publishing-form] [name=body]').fill('A newer private revision, not yet published.');await page.locator('[data-publishing-save]').click();await page.locator('[data-publishing-scope]').selectOption('active');await page.waitForFunction(()=>document.querySelectorAll('[data-publishing-entries] button').length===4);
 await page.evaluate(()=>fixture.fail(true));await page.waitForFunction(()=>document.querySelectorAll('[data-publishing-entries] button').length===6);await page.evaluate(()=>fixture.fail(false));await page.waitForFunction(()=>document.querySelectorAll('[data-publishing-entries] button').length===4);
 await page.evaluate(async()=>{location.hash='admin-overview';await new Promise(done=>setTimeout(done,0));window.overview=await import('/assets/admin-overview.js');overview.initAdminOverview();});
 await page.waitForFunction(()=>document.querySelectorAll('[data-management-list] article').length===4);
 await page.locator('[data-management-kind]').selectOption('pages');await page.waitForFunction(()=>document.querySelector('[data-management-list]').textContent.includes('No saved items'));
 await page.locator('[data-management-filter]').selectOption('published');await page.waitForFunction(()=>document.querySelectorAll('[data-management-list] article').length===1);
 await page.locator('[data-management-kind]').selectOption('mail');await page.waitForFunction(()=>document.querySelector('[data-management-list]').textContent.includes('Verified fixture Postcard'));await page.locator('[data-management-filter]').selectOption('active');await page.waitForFunction(()=>document.querySelector('[data-management-list]').textContent.includes('No saved items'));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.evaluate(()=>{desk.clearPublishingDesk();overview.clearAdminOverview();});assert.equal(await page.locator('[data-publishing-entries] button').count(),0);assert.deepEqual(errors,[]);
 console.log(width+'px: all content kinds, scheduled/unverified/private edits retained, confirmed history, reopen/edit, unavailable reads, overview pages/Postcards and sign-out passed');await context.close();
}}finally{await browser.close();await new Promise(done=>server.close(done));}
