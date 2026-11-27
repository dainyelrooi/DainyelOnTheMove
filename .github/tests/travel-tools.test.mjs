import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readingUrl,savedItems,updateSaved,MAX_SAVED,packingItems,premiereCalendar,foldCalendarLine} from '../../assets/travel-tools-model.js';
import {offlineRecord,OFFLINE_CSP,privateNavigation} from '../../assets/offline-policy.js';
import {measurementPage,metricValue} from '../../assets/performance-choice.js';
const at=Date.parse('2026-11-27T12:00:00Z'),entry='/entry/entry-'+'a'.repeat(32);
test('saved reading accepts only the public reading routes, never credentials, fragments or private routes',()=>{
  for(const path of ['/thailand','/bali','/note-a-public-moment','/postcard-brevo-1',entry])assert.equal(readingUrl(path),path);
  for(const path of ['/admin','/studio','/search','/thailand?token=secret','//evil.invalid','https://evil.invalid','/../admin','/entry/123','/thailand#anything','/assets/file.jpg'])assert.equal(readingUrl(path),null,path);
});
test('reading list sanitizes corruption, deduplicates and enforces a real capacity boundary',()=>{
  assert.deepEqual(savedItems('broken'),[]);const row={url:'/thailand',title:'Public story',savedAt:at};
  assert.deepEqual(savedItems(JSON.stringify({version:1,items:[row,row,{...row,url:'/admin'}]})),[row]);
  const saved=updateSaved([],{url:'/thailand',title:'Story'},true,at);assert.equal(savedItems(JSON.stringify(saved)).length,1);
  assert.deepEqual(updateSaved(saved.items,row,false).items,[]);
  const full=Array.from({length:MAX_SAVED},(_,i)=>({url:'/note-public-'+i,title:'Public '+i,savedAt:at}));assert.throws(()=>updateSaved(full,{url:'/bali',title:'Other'}),/full/);assert.equal(updateSaved(full,{url:full[0].url,title:'Updated'}).items.length,MAX_SAVED);
});
test('packing choices are local, bounded to known items and include laundry strips',()=>{
  assert.deepEqual(packingItems(JSON.stringify({version:1,checked:['laundry','laundry','invented','phone']})),['laundry','phone']);
  assert.deepEqual(packingItems('{bad'),[]);
});
test('calendar preserves the instant across winter and summer and safely escapes authored text',()=>{
  for(const time of ['2026-12-01T12:00:00Z','2027-07-01T11:00:00Z']){const value=premiereCalendar({videoId:'abcdefghijk',title:'A premiere, with; punctuation\nand a new line',startsAt:time},at);assert.match(value,/UID:youtube-abcdefghijk@dainyelonthemove.com/);assert.ok(value.includes('DTSTART:'+time.replace(/[-:]/g,'').replace('.000','')));assert.match(value,/premiere\\,/);assert.match(value,/punctuation\\nand/);assert.ok(value.endsWith('\r\n'));}
  assert.throws(()=>premiereCalendar({videoId:'abcdefghijk',title:'Past',startsAt:'2026-01-01T00:00Z'},at),/no longer/);
  assert.throws(()=>premiereCalendar({videoId:'bad\nBEGIN',title:'Bad',startsAt:'2027-01-01T00:00Z'},at));
  for(const line of foldCalendarLine('SUMMARY:'+('🌎'.repeat(80))).split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
});
test('offline copies expire within the original 24-hour window and cannot name private or remote media',()=>{
  const item={url:entry,title:'Published story',savedAt:at,expiresAt:at+3600000,images:['/assets/public-content/'+'a'.repeat(64)+'.webp']};
  assert.equal(offlineRecord(item,at),true);for(const change of [{expiresAt:at},{expiresAt:at+86400001},{savedAt:at+120000},{url:'/admin'},{images:['https://evil.invalid/a.jpg']},{images:['/assets/../private/a.jpg']}])assert.equal(offlineRecord({...item,...change},at),false);
  assert.match(OFFLINE_CSP,/script-src 'none'/);assert.match(OFFLINE_CSP,/form-action 'none'/);for(const path of ['/admin','/admin.html','/studio','/data/private.json','/__/firebase/init.json','/postcards-form'])assert.equal(privateNavigation(path),true,path);
});
test('measurement excludes test hosts, queries, fragments, forms and private pages',()=>{
  const page={hostname:'dainyelonthemove.com',pathname:'/stories',search:'',hash:''};assert.equal(measurementPage(page),true);assert.equal(measurementPage({...page,pathname:entry}),true);
  for(const change of [{hostname:'localhost'},{hostname:'dainyelonthemove-staging.web.app'},{search:'?email=private'},{hash:'#private'},{pathname:'/admin'},{pathname:'/postcards-form'},{preview:true}])assert.equal(measurementPage({...page,...change}),false);
  assert.equal(metricValue(NaN),null);assert.equal(metricValue(-1),null);assert.equal(metricValue(Infinity),null);assert.equal(metricValue(12.8),13);
});
test('notifications are gesture-only, use FID registration and do not subscribe to a topic automatically',async()=>{
  const client=await readFile(new URL('../../assets/visitor-notifications.js',import.meta.url),'utf8'),worker=await readFile(new URL('../../push-worker.js',import.meta.url),'utf8');
  assert.ok(client.indexOf("enable.addEventListener('click'")<client.indexOf('Notification.requestPermission()'));assert.match(client,/sdk\.onRegistered/);assert.match(client,/sdk\.register\(/);assert.doesNotMatch(client,/sdk\.getToken\(/);assert.match(client,/pendingRemoval/);assert.match(worker,/renotify:false/);assert.match(worker,/url\.split/);assert.doesNotMatch(worker,/importScripts|analytics|subscribeToTopic/);
});
