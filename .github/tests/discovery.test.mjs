import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {parsePublishedCatalog,catalogFresh,catalogEntry} from '../../assets/published-catalog.js';
import {searchEntries} from '../../assets/search-engine.js';
import {latestTravelStory} from '../../assets/home-latest-model.js';
const now=Date.now(),stamp=new Date(now-60000).toISOString(),id='entry-'+'a'.repeat(32);
const entry={id,kind:'blog',title:'Published local fixture',excerpt:'An approved synthetic fixture for isolated checks.',place:'',publishedAt:stamp};
const catalog={version:1,space:'production',generatedAt:stamp,entries:[entry]};
const flush=async()=>{for(let n=0;n<8;n++)await Promise.resolve();await new Promise(done=>setImmediate(done));};
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return{promise,resolve};};
test('discovery accepts only a fresh same-space bounded published catalogue and projects public summary fields',()=>{
  const result=parsePublishedCatalog({...catalog,entries:[{...entry,privateNote:'never displayed',body:'not needed'}]},'production',now);
  assert.deepEqual(result.entries,[entry]);assert.equal(catalogFresh(result,now),true);
  for(const value of [{...catalog,space:'staging'},{...catalog,generatedAt:new Date(now-86400000).toISOString()},{...catalog,generatedAt:new Date(now+300001).toISOString()},{...catalog,entries:[entry,entry]},{...catalog,entries:[{...entry,id:'private-draft'}]},{...catalog,entries:[{...entry,publishedAt:'unknown'}]}])assert.equal(parsePublishedCatalog(value,'production',now),null);
  assert.equal(catalogEntry({...entry,publishedAt:{toDate:()=>new Date('invalid')}}),null);
  assert.equal(parsePublishedCatalog(catalog,'unsupported',now),null);
});
test('empty search starts with current stories and useful collections; privacy pages remain searchable by name',()=>{
  const rows=[{title:'Cookies and privacy',text:'Your cookie choices',type:'Page',url:'/cookies'},{title:'Old story',text:'An older journey',type:'Travel Story',url:'/bali'},{...entry,type:'Travel Story',text:entry.excerpt,url:'/entry/'+id,cms:true,publishedTime:now},{title:'Explore stories',text:'The archive',type:'Page',url:'/stories'}];
  assert.deepEqual(searchEntries(rows,'').slice(0,2).map(row=>row.url),['/entry/'+id,'/stories']);assert.equal(searchEntries(rows,'cookies')[0].url,'/cookies');
});
test('a destination in an entry introduction ranks above incidental mentions in onward-reading keywords',()=>{
  const related={title:'Bali story',text:'Study life in Indonesia',keywords:'Also read the Philippines story',url:'/bali'},specific={title:'More from the road',text:'Philippines · an island journey',url:'/note-more'};
  assert.deepEqual(searchEntries([related,specific],'filipijnen').map(row=>row.url),['/note-more','/bali']);
});
const source=await readFile(new URL('../../assets/home-latest.js',import.meta.url),'utf8');
async function home({copy=Promise.resolve(parsePublishedCatalog(catalog,'production')),clock=now,serverAt,serverLink}={}){
  const events={},windowEvents={},link={href:serverLink||'',textContent:'Server-rendered story'},root={dataset:{...(serverAt?{latestGeneratedAt:serverAt}:{})},hidden:!serverAt,querySelector:()=>link},timers=new Map();let serial=0,reads=0;
  class ClockDate extends Date{static now(){return clock;}}
  const context={root,Date:ClockDate,window:{addEventListener:(type,fn)=>windowEvents[type]=fn},document:{querySelector:()=>root,addEventListener:(type,fn)=>events[type]=fn},readPublishedCatalog:()=>{reads++;return typeof copy==='function'?copy():copy;},catalogFresh:value=>catalogFresh(value,clock),latestTravelStory:rows=>latestTravelStory(rows,clock),setTimeout:(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;},clearTimeout:n=>timers.delete(n)};
  const script=source.replace(/^import .*;\r?\n/gm,'').replace('export function','function');
  vm.createContext(context);vm.runInContext(script+'\n;initHomeLatest();',context);await flush();return{root,link,events,windowEvents,timers,reads:()=>reads,advance(ms){clock+=ms;}};
}

test('the newest travel story is independent of newer facts, notes, future dates and invalid entries',()=>{
  const older={...entry,publishedAt:new Date(now-3600000).toISOString()},newer={...entry,id:'entry-'+'b'.repeat(32)};
  const rows=[{...entry,kind:'fact',publishedAt:new Date(now-1).toISOString()},{...entry,kind:'field-note'},older,{...newer,id:'private-draft'},{...newer,id:'entry-'+'c'.repeat(32),publishedAt:new Date(now+60000).toISOString()},newer];
  assert.equal(latestTravelStory(rows,now).id,newer.id);
  assert.equal(latestTravelStory(rows.filter(r=>r.kind!=='blog'),now),null);
});

test('the homepage uses the public story copy even when a fact is newer, with no protected SDK dependency',async()=>{
  const fact={...entry,id:'entry-'+'c'.repeat(32),kind:'fact',publishedAt:new Date(now-1).toISOString()};
  const f=await home({copy:Promise.resolve({...catalog,entries:[fact,entry]})});
  assert.equal(f.root.hidden,false);assert.equal(f.link.href,'/entry/'+id);assert.match(f.link.textContent,/Published local fixture/);assert.equal(f.reads(),1);
  f.advance(86400000);f.events.visibilitychange();assert.equal(f.root.hidden,true);
});

test('a fresh initial HTML story survives a failed public request, but an authoritative empty copy clears it',async()=>{
  const f=await home({copy:Promise.reject(Error('offline')),serverAt:stamp,serverLink:'/entry/'+id});
  assert.equal(f.root.hidden,false);assert.equal(f.link.href,'/entry/'+id);
  f.advance(86400000);f.events.visibilitychange();assert.equal(f.root.hidden,true);
  const empty=await home({copy:Promise.resolve({...catalog,entries:[]}),serverAt:stamp,serverLink:'/entry/'+id});assert.equal(empty.root.hidden,true);
  const stale=await home({copy:Promise.resolve(null),serverAt:new Date(now-86400000).toISOString(),serverLink:'/entry/'+id});assert.equal(stale.root.hidden,true);
});

test('pagehide rejects a late catalogue and a browser-back restore refreshes the story safely',async()=>{
  const delayed=deferred();let calls=0;
  const f=await home({copy:()=>++calls===1?delayed.promise:Promise.resolve(catalog)});
  f.windowEvents.pagehide();delayed.resolve(catalog);await flush();assert.equal(f.root.hidden,true);assert.equal(f.timers.size,0);
  f.windowEvents.pageshow({persisted:true});await flush();assert.equal(f.root.hidden,false);assert.equal(f.link.href,'/entry/'+id);assert.equal(f.reads(),2);assert.equal(f.timers.size,1);
});
