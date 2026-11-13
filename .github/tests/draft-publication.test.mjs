import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {contentDigest,pageContentKey,draftPublicationState,confirmedMailDraft,validPublicationProof} from '../../assets/draft-publication-state.js';
import {entryContentKey} from '../../assets/publishing-model.js';
const now=Date.parse('2026-11-12T14:00Z'),id='entry-'+'a'.repeat(32),section='about-'+'b'.repeat(16);
const entry=()=>({version:1,kind:'blog',title:'ISOLATED writing',excerpt:'An isolated test introduction.',body:'A saved fixture story.',place:'',sources:'',videoUrl:'',photoIds:[],photoPlacements:[],heroPhotoId:'',heroLayout:'split',heroPosition:'center',storyLabel:'',tripPeriod:'',publishedAt:'2026-11-12T12:00:00.123456Z',updatedAt:'2026-11-12T12:00:00.123456Z'});
const proof=()=>({version:1,source:'public-cdn',space:'staging',state:'complete',generation:'a'.repeat(32),checkedAt:new Date(now).toISOString(),entries:{},pages:{}});
test('all story, Field Note and fact types leave active drafts only after exact independent public evidence',async()=>{
 for(const kind of ['blog','field-note','fact']){
  const published={...entry(),kind},draft={...published,revision:4},p=proof();p.entries[id]=await contentDigest(entryContentKey(published));
  assert.equal(await draftPublicationState('entries',id,draft,published,p,{space:'staging',now}),'completed');
  for(const changed of [{body:'Newer private writing'},{photoIds:['photo-'+'b'.repeat(32)],photoPlacements:[0]},{heroLayout:'wide'},{title:'Changed title'}])assert.equal(await draftPublicationState('entries',id,{...draft,...changed},published,p,{space:'staging',now}),'changed');
  assert.equal(await draftPublicationState('entries',id,draft,null,p,{space:'staging',now}),'draft');
  assert.equal(await draftPublicationState('entries',id,draft,published,null,{space:'staging',now}),'verifying');
  assert.equal(await draftPublicationState('entries',id,draft,{...published,updatedAt:'2026-11-12T12:01:00Z'},p,{space:'staging',now}),'verifying');
 }
});
test('website overrides use exact text, links and photo selection; original/published pages stay editable',async()=>{
 const published={version:1,pageId:'about',values:{f01:'A saved link',f00:'Saved text'},photoIds:[]},p=proof();p.pages[section]=await contentDigest(pageContentKey(published));
 assert.equal(await draftPublicationState('pages',section,{...published,revision:2,values:{f00:'Saved text',f01:'A saved link'}},published,p,{space:'staging',now}),'completed');
 assert.equal(await draftPublicationState('pages',section,{...published,values:{f00:'Private change'}},published,p,{space:'staging',now}),'changed');
 assert.equal(await draftPublicationState('pages',section,published,null,p,{space:'staging',now}),'draft');
});
test('old, wrong-environment, malformed or unconfirmed proofs keep matching drafts visible',async()=>{
 const e=entry(),p=proof();p.entries[id]=await contentDigest(entryContentKey(e));
 for(const change of [{space:'production'},{checkedAt:'invalid'},{checkedAt:new Date(now-86400000).toISOString()},{checkedAt:new Date(now+600000).toISOString()},{state:'processing'},{generation:''},{source:'browser'},{entries:{[id]:'wrong'}}])assert.equal(await draftPublicationState('entries',id,e,e,{...p,...change},{space:'staging',now}),'verifying');
 assert.equal(validPublicationProof({...p,state:'partial'},'staging',now),true,'A failed neighbour cannot invalidate an independently verified entry.');
});
test('Postcard completion requires the same immutable revision and exact approved copy',()=>{
 const draft={revision:2,subject:'Fixture',previewText:'',headline:'Fixture',body:'Saved fixture copy.',ctaText:'Read',ctaUrl:'https://dainyelonthemove.com/stories',imageUrl:''};
 const job={status:'scheduled',draftRevision:2,payload:{...draft},campaignId:101,provider:{state:'scheduled',identity:'managed-id',lastSuccessAt:new Date(now).toISOString(),scheduledAt:new Date(now+3600000).toISOString(),calendarAt:new Date(now+3600000).toISOString(),error:''}};
 assert.equal(confirmedMailDraft(draft,job),true);
 for(const change of [{revision:3},{body:'New private writing'},{imageUrl:'https://dainyelonthemove.com/assets/different.webp'}])assert.equal(confirmedMailDraft({...draft,...change},job),false);
 for(const status of ['queued','processing','review','cancelled'])assert.equal(confirmedMailDraft(draft,{...job,status}),false);
});
test('bounded live publication joins require every server response and stop on cache, errors and sign-out',async()=>{
 const source=(await readFile(new URL('../../assets/draft-publication-watch.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/,'').replaceAll('export function','function');
 const listeners=[],states=[],ids=Array.from({length:11},(_,n)=>'entry-'+n.toString(16).padStart(32,'0'));
 const context={Map,Set,collection:(db,...parts)=>parts.join('/'),doc:(db,...parts)=>parts.join('/'),query:(...parts)=>parts,where:(...parts)=>parts,documentId:()=>'id',limit:n=>n,onSnapshot:(target,options,next,error)=>{const item={target,next,error};listeners.push(item);return()=>item.stopped=true;}};
 vm.createContext(context);vm.runInContext(source,context);
 const stop=context.watchDraftPublications({},'staging',ids,(rows,ready)=>states.push({size:rows.size,ready}));assert.equal(listeners.length,2);assert.equal(listeners[0].target[1][2].length,10);assert.equal(listeners[1].target[1][2].length,1);
 const snap=(id,cached=false)=>({metadata:{fromCache:cached},docs:[{id,data:()=>({title:'Isolated fixture'})}]});
 listeners[0].next(snap(ids[0]));assert.equal(states.at(-1).ready,false);listeners[1].next(snap(ids[10]));assert.equal(states.at(-1).ready,true);
 listeners[0].next(snap(ids[0],true));assert.equal(states.at(-1).ready,false);listeners[0].next(snap(ids[0]));assert.equal(states.at(-1).ready,true);listeners[1].error();assert.equal(states.at(-1).ready,false);
 const count=states.length;stop();listeners[1].next(snap(ids[10]));assert.equal(states.length,count);assert.ok(listeners.every(item=>item.stopped));
});
