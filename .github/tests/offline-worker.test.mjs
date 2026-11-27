import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {readingUrl} from '../../assets/travel-tools-model.js';
import {OFFLINE_CACHE,OFFLINE_META,OFFLINE_LIMIT,OFFLINE_CSP,offlineRecord,privateNavigation} from '../../assets/offline-policy.js';
const source=(await readFile(new URL('../../travel-worker.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'');
const origin='https://dainyelonthemove-staging.web.app';
function fixture(){
 let now=Date.now(),sourcePath='/thailand',network=200;const stores=new Map(),handlers=new Map(),calls=[];
 const address=value=>typeof value==='string'?new URL(value,origin).href:value.url;
 const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const rows=stores.get(name);return {async put(key,value){rows.set(address(key),value.clone());},async match(key){return rows.get(address(key))?.clone();},async delete(key){return rows.delete(address(key));},async keys(){return [...rows.keys()].map(url=>new Request(url));}};},async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}};
 const self={location:{origin},clients:{get:async()=>({url:origin+sourcePath}),claim:async()=>{}},addEventListener:(type,fn)=>handlers.set(type,fn)};
 const fetch=async request=>{const url=address(request);calls.push(url);if(network==='offline')throw Error('Synthetic disconnected network');return new Response(url.endsWith('/travel-tools')?'<main data-tools-saved><script src="https://unwanted.invalid"></script><p>Public fixture</p></main>':url.includes('/assets/')?'public asset':'<main>Current online story</main>',{status:network,headers:{'Content-Type':url.endsWith('.webp')?'image/webp':url.endsWith('.js')?'text/javascript':'text/html'}});};
 vm.runInNewContext(source,{self,caches,fetch,URL,Request,Response,TextEncoder,Blob,AbortSignal,readingUrl,OFFLINE_CACHE,OFFLINE_META,OFFLINE_LIMIT,OFFLINE_CSP,privateNavigation,offlineRecord:value=>offlineRecord(value,now),Date:class extends Date{static now(){return now;}}});
 const message=async(type,body={})=>{let promise,result;handlers.get('message')({source:{id:'fixture-browser'},data:{type,...body},ports:[{postMessage:value=>result=value}],waitUntil:value=>promise=value});await promise;return JSON.parse(JSON.stringify(result));};
 const request=async path=>{let response;handlers.get('fetch')({request:new Request(origin+path),respondWith:value=>response=value});return response?await response:null;};
 const save=async(path='/thailand',images=[])=>{sourcePath=path;return message('READING_SAVE',{record:{url:path,title:'Public fixture',savedAt:now,expiresAt:now+3600000,images},html:'<!doctype html><main>Saved safe fixture</main>'});};
 const install=async()=>{let promise;handlers.get('install')({waitUntil:value=>promise=value});await promise;};
 return {stores,calls,message,request,save,install,network:value=>network=value,advance:ms=>now+=ms,source:value=>sourcePath=value};
}
test('a requested public story is saved, available during a disconnection, and contains no active code',async()=>{
 const f=fixture();assert.equal((await f.save()).ok,true);f.network('offline');const response=await f.request('/thailand');assert.equal(response.status,200);assert.match(await response.text(),/Saved safe fixture/);assert.equal(response.headers.get('Content-Security-Policy'),OFFLINE_CSP);
 const list=await f.message('READING_LIST');assert.equal(list.items.length,1);await f.message('READING_REMOVE',{url:'/thailand'});assert.equal((await f.request('/thailand')).status,503);
});
test('a definitive withdrawal purges the reading copy and its photographs',async()=>{
 const f=fixture(),photo='/assets/fixture.webp';await f.save('/thailand',[photo]);f.network(410);assert.equal((await f.request('/thailand')).status,410);f.network('offline');assert.equal((await f.request('/thailand')).status,503);assert.equal((await f.request(photo)).status,503);assert.equal((await f.message('READING_LIST')).items.length,0);
});
test('temporary server failures use an unexpired copy, but expiry removes both article and photo',async()=>{
 const f=fixture(),photo='/assets/fixture.webp';await f.save('/thailand',[photo]);f.network(429);assert.equal((await f.request('/thailand')).status,200);f.advance(3600001);f.network('offline');assert.equal((await f.request('/thailand')).status,503);assert.equal((await f.request(photo)).status,503);
});
test('admin, personal queries, private data and remote navigation are never intercepted',async()=>{
 const f=fixture();await f.save();f.network('offline');for(const path of ['/admin','/admin.html','/studio','/data/public-content/cms.json','/__/firebase/init.json','/thailand?preview=private','/search'])assert.equal(await f.request(path),null,path);
 f.source('/admin');assert.equal((await f.message('READING_LIST')).ok,false);f.source('/bali');assert.equal((await f.message('READING_SAVE',{record:{url:'/thailand'},html:'test'})).ok,false);
});
test('offline storage is capped at eight deliberate copies and clearing preserves unrelated caches',async()=>{
 const f=fixture();for(let i=0;i<8;i++)assert.equal((await f.save('/note-public-fixture-'+i)).ok,true);assert.equal((await f.save('/note-public-fixture-9')).ok,false);f.source('/travel-tools');f.stores.set('unrelated-cache',new Map());await f.message('READING_CLEAR');assert.equal((await f.message('READING_LIST')).items.length,0);assert.equal(f.stores.has('unrelated-cache'),true);
});
test('the offline tools shell strips third-party scripts and supports current versioned local assets',async()=>{
 const f=fixture();await f.install();f.network('offline');const shell=await f.request('/travel-tools'),html=await shell.text();assert.match(html,/data-offline-tools/);assert.doesNotMatch(html,/unwanted.invalid|privacy-consent|firebase/);assert.match(shell.headers.get('Content-Security-Policy'),/connect-src 'self'/);assert.equal((await f.request('/assets/travel-tools.js?v=abcdef012345')).status,200);assert.equal(await f.request('/assets/travel-tools.js?private=value'),null);
});
