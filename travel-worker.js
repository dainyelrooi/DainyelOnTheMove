// Only explicitly saved, public reading copies. No runtime tracking or Firebase.
import {readingUrl} from './assets/travel-tools-model.js';
import {OFFLINE_CACHE,OFFLINE_META,OFFLINE_LIMIT,OFFLINE_CSP,offlineRecord,privateNavigation} from './assets/offline-policy.js';
const SHELL='dotm-offline-shell-v1';
const shellPaths=['/travel-tools','/travel.webmanifest','/assets/travel-tools.css','/assets/travel-tools-model.js','/assets/travel-tools.js','/assets/offline-policy.js','/assets/offline-reader.js','/assets/site-environment.js','/assets/favicon.svg'];
const key=path=>new URL(path,self.location.origin).href;
async function smallImage(response){
  if(!response.ok||!/^image\/(?:webp|jpeg|png)/.test(response.headers.get('content-type')||'')||Number(response.headers.get('content-length')||0)>900000){await response.body?.cancel();return null;}
  const reader=response.body?.getReader();if(!reader)return null;const chunks=[];let total=0;
  try{for(;;){const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>900000){await reader.cancel();return null;}chunks.push(part.value);}}finally{reader.releaseLock();}
  return new Blob(chunks,{type:response.headers.get('content-type')});
}
async function shellCopy(response,path){
  if(path!=='/travel-tools')return response;
  const html=await response.text(),main=/<main\b[^>]*>[\s\S]*?<\/main>/.exec(html)?.[0];
  if(!main||!main.includes('data-tools-saved'))throw Error('Unexpected tools document.');
  const body='<!doctype html><html lang="en-GB" data-offline-tools><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Your saved travel tools | DainyelOnTheMove</title><link rel="stylesheet" href="/assets/travel-tools.css"><link rel="manifest" href="/travel.webmanifest"><style>body{margin:0;background:#f4eadd;color:#0c1b25;font:1rem/1.7 system-ui,sans-serif}header{padding:1rem 1.25rem;background:#0c1b25;color:#fdf9f2}header a{color:#e9b96e}a{color:#133c43}h1,h2{font-family:Georgia,serif}button{font:inherit}.travel-tools-main{padding-top:2rem}</style></head><body><header><a href="/">DainyelOnTheMove</a><p>Saved travel tools · reconnect for the live website.</p></header>'+main.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')+'<script type="module" src="/assets/travel-tools.js"></script></body></html>';
  return new Response(body,{headers:{'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex, noarchive','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'"}});
}
async function records(){
  const meta=await caches.open(OFFLINE_META),content=await caches.open(OFFLINE_CACHE),result=[];
  for(const request of await meta.keys()){
    let item;try{item=await(await meta.match(request)).json();}catch{}
    if(!offlineRecord(item)){await meta.delete(request);if(item?.url&&readingUrl(item.url))await content.delete(key(item.url));continue;}
    result.push(item);
  }
  const used=new Set(result.flatMap(item=>item.images));
  for(const request of await content.keys()){const path=new URL(request.url).pathname;if(path.startsWith('/assets/')&&!used.has(path))await content.delete(request);}
  return result.slice(0,OFFLINE_LIMIT);
}
async function remove(path){const meta=await caches.open(OFFLINE_META),content=await caches.open(OFFLINE_CACHE);await meta.delete(key(path));await content.delete(key(path));await records();}
async function message(event){
  const port=event.ports?.[0];if(!port||!event.source?.id)return;
  try{
    const source=await self.clients.get(event.source.id),url=new URL(source.url);
    if(url.origin!==self.location.origin||url.search||!(['/travel-tools','/travel-tips'].includes(url.pathname)||readingUrl(url.pathname)))throw Error('Unsupported page.');
    const value=event.data,rows=await records();
    if(value?.type==='READING_LIST')return port.postMessage({ok:true,items:rows});
    if(value?.type==='READING_REMOVE'&&readingUrl(value.url)){await remove(value.url);return port.postMessage({ok:true});}
    if(value?.type==='READING_CLEAR'){await caches.delete(OFFLINE_META);await caches.delete(OFFLINE_CACHE);return port.postMessage({ok:true});}
    if(value?.type!=='READING_SAVE'||!offlineRecord(value.record)||typeof value.html!=='string'||new TextEncoder().encode(value.html).length>250000)throw Error('Invalid reading copy.');
    if(value.record.url!==url.pathname)throw Error('Save the article you are currently reading.');
    if(rows.length>=OFFLINE_LIMIT&&!rows.some(row=>row.url===value.record.url))throw Error('Eight offline copies are already saved. Remove one first.');
    const verified=await fetch(key(value.record.url),{cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(8000)});
    if(!verified.ok||!verified.headers.get('content-type')?.includes('text/html'))throw Error('The public article could not be verified.');
    const content=await caches.open(OFFLINE_CACHE);
    for(const path of value.record.images){try{const blob=await smallImage(await fetch(key(path),{credentials:'omit',redirect:'error',cache:'no-cache',signal:AbortSignal.timeout(8000)}));if(blob)await content.put(key(path),new Response(blob,{headers:{'Content-Type':blob.type}}));}catch{}}
    await content.put(key(value.record.url),new Response(value.html,{headers:{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':OFFLINE_CSP,'X-Robots-Tag':'noindex, noarchive','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}}));
    await(await caches.open(OFFLINE_META)).put(key(value.record.url),Response.json(value.record));
    port.postMessage({ok:true});
  }catch(error){port.postMessage({ok:false,error:['Eight offline copies are already saved. Remove one first.','Save the article you are currently reading.','The public article could not be verified.'].includes(error.message)?error.message:'The offline copy could not be saved. Keep the online link and try again.'});}
}
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(SHELL);for(const path of shellPaths){try{const response=await fetch(path,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(8000)});if(response.ok)await cache.put(key(path),await shellCopy(response,path));}catch{}}})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(/^dotm-offline-/.test(name)&&![SHELL,OFFLINE_CACHE,OFFLINE_META].includes(name))await caches.delete(name);await records();await self.clients.claim();})()));
self.addEventListener('message',event=>event.waitUntil(message(event)));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url),versionedAsset=shellPaths.includes(url.pathname)&&url.pathname.startsWith('/assets/')&&/^\?v=[a-f0-9]{12}$/.test(url.search);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.search&&!versionedAsset||privateNavigation(url.pathname))return;
  if(!readingUrl(url.pathname)&&!shellPaths.includes(url.pathname)&&!/^\/assets\/[a-zA-Z0-9_./-]+\.(?:webp|jpg|jpeg|png)$/.test(url.pathname))return;
  event.respondWith((async()=>{
    try{const fresh=await fetch(request,{signal:AbortSignal.timeout(6000)});if(fresh.status===404||fresh.status===410||fresh.status===403)await remove(url.pathname);if(fresh.ok&&shellPaths.includes(url.pathname))await(await caches.open(SHELL)).put(key(url.pathname),await shellCopy(fresh.clone(),url.pathname));if(fresh.ok||fresh.status<500&&![408,429].includes(fresh.status))return fresh;}catch{}
    const rows=await records(),content=await caches.open(OFFLINE_CACHE);
    if(rows.some(row=>row.url===url.pathname||row.images.includes(url.pathname))){const saved=await content.match(key(url.pathname));if(saved)return saved;}
    if(shellPaths.includes(url.pathname)){const saved=await(await caches.open(SHELL)).match(key(url.pathname));if(saved)return saved;}
    return new Response('This page is not available offline. Reconnect to read the latest version.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
  })());
});
