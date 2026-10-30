import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const base=new URL('../../',import.meta.url),sources=Object.fromEntries(await Promise.all(['publishing-public','publishing-model','website-public','website-model','public-snapshot'].map(async name=>[name,await readFile(new URL('assets/'+name+'.js',base),'utf8')])));
const id=n=>'entry-'+String(n).repeat(32),photo='photo-'+'a'.repeat(32),section='index-'+'a'.repeat(16),shared='shared-'+'b'.repeat(16),other='about-'+'c'.repeat(16),image='/assets/public-content/'+'a'.repeat(64)+'.webp';
const publishedAt='2026-10-25T12:00:00.000Z',generatedAt='2026-10-27T12:00:00.000Z';
const entry=(n,kind='blog',date=publishedAt)=>({id:id(n),version:1,kind,title:'Published fixture '+n,excerpt:'A synthetic published fixture for this isolated test.',body:'Opening fixture text.\n\n## Fixture chapter\n\nChapter fixture text.',place:'',sources:'',videoUrl:'',photoIds:[photo],photoPlacements:[1],heroPhotoId:photo,heroPosition:'center',heroLayout:'split',storyLabel:'',tripPeriod:'',publishedAt:date,updatedAt:date,photos:[{id:photo,src:image,alt:'Fixture image',width:640,height:420}],coverPhotoId:photo,coverPhoto:{id:photo,src:image,alt:'Fixture image',width:640,height:420}});
const cms=(entries=[entry(1)])=>({version:1,complete:true,space:'staging',generation:'a'.repeat(32),generatedAt,entries:entries.map(({coverPhotoId,coverPhoto,...row})=>row),summaries:entries.map(row=>Object.fromEntries(['id','version','kind','title','excerpt','place','coverPhotoId','publishedAt','updatedAt','coverPhoto'].map(key=>[key,row[key]])))});
const website=()=>({version:1,complete:true,space:'staging',generation:'a'.repeat(32),generatedAt,sections:[
  {id:section,pageId:'index',values:{f00:'Cached fixture heading',f01:JSON.stringify({src:photo,alt:'Cached fixture alt',position:'top'})},photoIds:[photo],media:[{id:photo,sectionId:section,src:image,alt:'Cached fixture alt',width:640,height:420}]},
  {id:shared,pageId:'shared',values:{f00:'Cached shared text'},photoIds:[],media:[]},
  {id:other,pageId:'about',values:{f00:'Wrong page text'},photoIds:[],media:[]}
]});
const pending=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};
const flush=async()=>{for(let n=0;n<8;n++)await Promise.resolve();await new Promise(resolve=>setImmediate(resolve));};
const docs=records=>records.map(record=>({id:record.id,data:()=>({...record,...Object.fromEntries(['publishedAt','updatedAt'].filter(key=>record[key]).map(key=>[key,{toDate:()=>new Date(record[key]),toMillis:()=>Date.parse(record[key])}]))})}));
const live=(records=[],fromCache=false)=>({docs:docs(records),size:records.length,metadata:{fromCache}});
const detailSnapshot=(record,fromCache=false)=>({exists:()=>Boolean(record),data:()=>docs([record])[0].data(),metadata:{fromCache}});

function dom(){
  class Node{
    constructor(tag,text=''){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs=new Map();this.style={objectPosition:''};this.listeners={};this.hidden=false;this._text='';this.className='';if(text)this.textContent=text;}
    get childNodes(){return this.children;}
    get textContent(){return this._text+this.children.map(node=>node.textContent).join('');}
    set textContent(value){this.children=[];this._text=this.tagName==='#TEXT'?String(value):'';if(this.tagName!=='#TEXT'&&value)this.append(new Node('#text',String(value)));}
    get innerText(){return this.textContent;}
    get classList(){return {add:(...names)=>{this.className=[...new Set([...this.className.split(' ').filter(Boolean),...names])].join(' ');},remove:(...names)=>{this.className=this.className.split(' ').filter(name=>!names.includes(name)).join(' ');},contains:name=>this.className.split(' ').includes(name)};}
    get isConnected(){return Boolean(this.parentNode);}
    append(...nodes){for(const node of nodes){if(node.parentNode)node.remove();node.parentNode=this;this.children.push(node);}}
    prepend(...nodes){for(const node of [...nodes].reverse()){if(node.parentNode)node.remove();node.parentNode=this;this.children.unshift(node);}}
    replaceChildren(...nodes){for(const node of this.children)node.parentNode=null;this.children=[];this._text='';this.append(...nodes);}
    remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(node=>node!==this);this.parentNode=null;}}
    after(...nodes){const parent=this.parentNode;if(!parent)return;const at=parent.children.indexOf(this)+1;for(const node of nodes)node.parentNode=parent;parent.children.splice(at,0,...nodes);}
    setAttribute(key,value){this.attrs.set(key,String(value));if(key==='class')this.className=String(value);else if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);else this[key]=String(value);}
    getAttribute(key){return this.attrs.has(key)?this.attrs.get(key):null;}
    removeAttribute(key){this.attrs.delete(key);if(key.startsWith('data-'))delete this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())];}
    hasAttribute(key){return this.attrs.has(key)||key.startsWith('data-')&&key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()) in this.dataset;}
    matches(selector){return selector.split(',').some(part=>{part=part.trim();if(part.startsWith('.'))return this.className.split(' ').includes(part.slice(1));const match=part.match(/^([a-zA-Z0-9-]+)?(?:\[([^=\]]+)(?:=["']?([^"'\]]+)["']?)?\])?$/);return Boolean(match&&(!match[1]||this.tagName===match[1].toUpperCase())&&(!match[2]||this.hasAttribute(match[2])&&(match[3]===undefined||this.getAttribute(match[2])===match[3])));});}
    querySelectorAll(selector){return this.children.flatMap(node=>[...(node.matches(selector)?[node]:[]),...node.querySelectorAll(selector)]);}
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    closest(selector){return this.matches(selector)?this:this.parentNode?.closest(selector)||null;}
    addEventListener(type,fn){this.listeners[type]=fn;}
    dispatchEvent(event){this.listeners[event.type]?.(event);}
    cloneNode(deep){const node=new Node(this.tagName,this._text);node.attrs=new Map(this.attrs);node.dataset={...this.dataset};node.className=this.className;if(deep)node.append(...this.children.map(child=>child.cloneNode(true)));return node;}
  }
  const head=new Node('head'),body=new Node('body'),html=new Node('html'),main=new Node('main');html.append(head,body);body.append(main);
  const canonical=new Node('link');canonical.setAttribute('rel','canonical');head.append(canonical);
  const document={hidden:true,head,body,title:'Original fixture title',createElement:tag=>new Node(tag),createTextNode:text=>new Node('#text',text),querySelector:selector=>html.querySelector(selector),querySelectorAll:selector=>html.querySelectorAll(selector),dispatchEvent(){},addEventListener(){}};
  return {Node,document,main,canonical};
}

async function fixture({mode='detail',cache=cms(),type='all',merged=true,space='staging',connectFails=false,connectionResponse=null,preview=false,mediaResponse=null,listenThrows=false,realLoader=false,headerAnnouncement=false,now=Date.parse(generatedAt)+3600000}={}){
  const d=dom(),listeners=[],reads=[],rendered=[],readerCalls=[],mediaReads=[],timers=new Map(),events={document:new Map(),window:new Map()};let timerId=0;
  const on=(scope,type,fn)=>{if(!events[scope].has(type))events[scope].set(type,new Set());events[scope].get(type).add(fn);},off=(scope,type,fn)=>events[scope].get(type)?.delete(fn),fire=(scope,type)=>{for(const fn of [...events[scope].get(type)||[]])fn();};
  d.document.addEventListener=(type,fn)=>on('document',type,fn);d.document.removeEventListener=(type,fn)=>off('document',type,fn);
  class ClockDate extends Date{static now(){return now;}}
  const schedule=(fn,delay)=>{const key=++timerId;timers.set(key,{fn,due:now+delay});return key;},advance=(ms,runTimers=true)=>{now+=ms;if(runTimers)for(const [key,item] of [...timers])if(item.due<=now){timers.delete(key);item.fn();}};
  let root,target,original,heading,siteImage,sharedText,otherText;
  if(mode==='detail'){root=new d.Node('main');root.dataset.publishedEntry='';d.main.append(root);}
  if(mode==='list'){
    const group=new d.Node('section');group.dataset.publishedSection='';target=new d.Node('div');target.dataset.publishedList=type;if(merged)target.dataset.staticCollection='';
    original=new d.Node('a','Original static story');original.href='/original-static-story';original.dataset.staticOrder='0';original.dataset.readingKind='blog';target.append(original);group.append(target);d.main.append(group);
  }
  if(mode==='website'){
    d.document.body.dataset.sitePage='index';heading=new d.Node('h1','Original fixture heading');heading.dataset.siteField=section+'/f00';siteImage=new d.Node('img');siteImage.dataset.siteField=section+'/f01';siteImage.setAttribute('src','/assets/original.webp');siteImage.setAttribute('srcset','/assets/original.webp 640w');siteImage.setAttribute('alt','Original fixture alt');sharedText=new d.Node('p','Original shared text');sharedText.dataset.siteField=shared+'/f00';otherText=new d.Node('p','Original other page text');otherText.dataset.siteField=other+'/f00';d.main.append(heading,siteImage,sharedText,otherText);
  }
  const window={dispatchEvent(){},addEventListener:(type,fn)=>on('window',type,fn),removeEventListener:(type,fn)=>off('window',type,fn)},context=vm.createContext({document:d.document,window,parent:preview?{postMessage(){}}:window,location:{pathname:'/entry/'+id(1),hostname:'localhost',search:preview?'?website-preview=1':'',origin:'http://localhost'},URL,URLSearchParams,Intl,Date:ClockDate,Event,setTimeout:schedule,clearTimeout:key=>timers.delete(key),requestAnimationFrame:fn=>fn(),MutationObserver:class{observe(){}},fixtures:null});
  const modelSource=sources[mode==='website'?'website-model':'publishing-model'].replace(/^export \{space(?: as siteSpace)?\} from .*;\r?\n/m,'').replace(/\bexport (?=(?:const|function|async function)\b)/g,'');
  const modelContext=vm.createContext({document:d.document,URL,crypto:globalThis.crypto});
  if(headerAnnouncement){sharedText.tagName='A';sharedText.dataset.headerAnnouncement='postcards';sharedText.setAttribute('href','/postcards');}
  const model=vm.runInContext(modelSource+'\n;({'+(mode==='website'?'sectionId,photoId,safeSiteImage,safeSiteLink,safeAnnouncementLink,siteText':'kinds,validId,entryUrl,element,renderArticle')+'});',modelContext);
  const actualRender=model.renderArticle;if(actualRender)model.renderArticle=(...args)=>{rendered.push(args);actualRender(...args);};
  model.space=space;model.siteSpace=space;
  const sdk={collection:(...args)=>args,query:(...args)=>args,where:(...args)=>args,orderBy:(...args)=>args,startAfter:(...args)=>args,limit:(...args)=>args,doc:(...args)=>args,onSnapshot:(ref,options,next,error)=>{if(listenThrows)throw Error('listener unavailable');assert.equal(options.includeMetadataChanges,true);listeners.push({next,error});return ()=>{};},getDoc:async ref=>{mediaReads.push(ref);return typeof mediaResponse==='function'?await mediaResponse(ref):mediaResponse?await mediaResponse:{exists:()=>false};}};
  let snapshot={readPublicSnapshot:async(domain,options)=>{reads.push({domain,options});return await cache;},snapshotDocs:docs,publicMediaSrc:src=>typeof src==='string'&&/^\/assets\/public-content\/[a-f0-9]{64}\.webp$/.test(src)?src:null};
  if(realLoader){
    const loaderContext=vm.createContext({Date,AbortController,TextEncoder,setTimeout,clearTimeout,fetch:async path=>{
      const saved=await cache,manifest=saved&&Object.fromEntries(['version','complete','space','generation','generatedAt'].map(key=>[key,saved[key]]));if(manifest)manifest.domains={qa:'qa.json',cms:'cms.json',website:'website.json'};
      return {ok:Boolean(saved),headers:{get:()=>null},text:async()=>JSON.stringify(path.endsWith('manifest.json')?manifest:saved)};
    }}),loader=vm.runInContext(sources['public-snapshot'].replace(/\bexport (?=(?:const|function|async function)\b)/g,'')+'\n;({readPublicSnapshot,snapshotDocs,publicMediaSrc});',loaderContext);
    snapshot={...loader,readPublicSnapshot:async(domain,options)=>{reads.push({domain,options});return await loader.readPublicSnapshot(domain,options);}};
  }
  context.fixtures={model,firebase:connectionResponse||{db:{}},sdk,reader:{initPublishingReader:node=>{readerCalls.push(node);return ()=>{};}},snapshot};
  let source=sources[mode==='website'?'website-public':'publishing-public'];
  source=source.replace(/^import \{([^}]+)\} from '\.\/(publishing-model|website-model)\.js(?:\?[^']*)?';/m,'const {$1}=fixtures.model;').replace(/^import \{([^}]+)\} from '\.\/publishing-reader\.js';/m,'const {$1}=fixtures.reader;').replace(/^import \{([^}]+)\} from '\.\/public-snapshot\.js';/m,'const {$1}=fixtures.snapshot;').replaceAll("import('../js/firebase.js')",connectFails?"Promise.reject(new Error('offline'))":'Promise.resolve(fixtures.firebase)').replaceAll("import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')",'Promise.resolve(fixtures.sdk)');
  vm.runInContext(source,context);await flush();
  return {...d,root,target,original,heading,siteImage,sharedText,otherText,listeners,reads,rendered,readerCalls,mediaReads,timers,advance,fire};
}

test('shared announcement hide, correction and Restore original use the same safe live section boundary',async()=>{
  const f=await fixture({mode:'website',cache:website(),headerAnnouncement:true});
  f.listeners[0].next(live([{id:shared,pageId:'shared',values:{f00:JSON.stringify({text:'',href:''})},photoIds:[]} ]));await flush();
  assert.equal(f.sharedText.hidden,true);assert.equal(f.sharedText.getAttribute('href'),null);
  f.listeners[0].next(live([{id:shared,pageId:'shared',values:{f00:JSON.stringify({text:'A fresh announcement',href:'/stories'})},photoIds:[]} ]));await flush();
  assert.equal(f.sharedText.hidden,false);assert.equal(f.sharedText.textContent,'A fresh announcement');assert.equal(f.sharedText.href,'/stories');
  f.listeners[0].next(live([{id:shared,pageId:'shared',values:{f00:JSON.stringify({text:'Unsafe',href:'javascript:alert(1)'})},photoIds:[]} ]));await flush();
  assert.equal(f.sharedText.textContent,'Original shared text');assert.equal(f.sharedText.getAttribute('href'),'/postcards');
  f.listeners[0].next(live([{id:shared,pageId:'shared',values:{f00:JSON.stringify({text:'New\nStory',href:'/stories'})},photoIds:[]} ]));await flush();assert.equal(f.sharedText.textContent,'Original shared text');
  f.listeners[0].next(live([]));await flush();assert.equal(f.sharedText.hidden,false);assert.equal(f.sharedText.textContent,'Original shared text');
});

test('CMS initial quota error after SDK local empty uses safe published photos and the existing reader',async()=>{
  const f=await fixture();f.listeners[0].next(detailSnapshot(null,true));await f.listeners[0].error(new Error('quota'));await flush();
  assert.equal(f.reads.length,1);assert.equal(f.root.querySelector('h1').textContent,'Published fixture 1');
  assert.equal(f.root.querySelector('h1').id,id(1)+'-title');assert.equal(f.canonical.href,'https://dainyelonthemove.com/entry/'+id(1));
  assert.match(f.root.querySelector('.story-meta').textContent,/Approx\. \d+ min read.*Published 25 Oct 2026/);
  assert.equal(f.root.querySelector('.cms-gallery').querySelector('img').src,image);assert.equal(f.readerCalls.length,1);assert.equal(f.mediaReads.length,0);
  assert.match(f.root.textContent,/cached published entry, saved 27 Oct 2026/);
});

test('CMS server withdrawal stays authoritative after a connection error',async()=>{
  const f=await fixture();f.listeners[0].next(detailSnapshot(null));await f.listeners[0].error();await flush();
  assert.equal(f.reads.length,0);assert.match(f.root.textContent,/taken offline/);assert.equal(f.rendered.length,0);
});

test('a delayed CMS cache cannot replace a newer server withdrawal',async()=>{
  const delayed=pending(),f=await fixture({cache:delayed.promise});const failure=f.listeners[0].error();f.listeners[0].next(detailSnapshot(null));delayed.resolve(cms());await failure;await flush();
  assert.equal(f.rendered.length,0);assert.match(f.root.textContent,/taken offline/);
});

test('CMS photos from an older callback cannot resurrect a withdrawn entry',async()=>{
  const media=pending(),f=await fixture({mediaResponse:media.promise}),old=f.listeners[0].next(detailSnapshot(entry(1)));
  f.listeners[0].next(detailSnapshot(null));media.resolve({exists:()=>true,data:()=>({dataUrl:'data:image/webp;base64,AAAA',alt:'Old image',width:640,height:420})});await old;
  assert.match(f.root.textContent,/taken offline/);assert.equal(f.rendered.length,1);
});

test('CMS live publication removes saved-cache feedback and a later failure keeps the live article',async()=>{
  const f=await fixture();await f.listeners[0].error();await flush();const corrected={...entry(1),title:'Corrected live fixture',photoIds:[],heroPhotoId:'',photoPlacements:[]};await f.listeners[0].next(detailSnapshot(corrected));await f.listeners[0].error();
  assert.equal(f.root.querySelector('h1').textContent,'Corrected live fixture');assert.doesNotMatch(f.root.textContent,/cached published entry/);assert.equal(f.reads.length,1);
});

test('missing or expired CMS cache retains the unavailable view, including SDK import failure',async()=>{
  const f=await fixture({cache:null,connectFails:true});await flush();assert.equal(f.rendered.length,0);assert.match(f.root.textContent,/connection is unavailable/);
});

test('CMS production requests its own namespace and the real loader rejects staging copies',async()=>{
  const cache={...cms(),space:'production',generatedAt:new Date().toISOString()},f=await fixture({space:'production',cache,realLoader:true,now:Date.now()});await f.listeners[0].error();await flush();
  assert.equal(f.reads[0].options.space,'production');assert.equal(f.root.querySelector('h1').textContent,'Published fixture 1');
  const cross=await fixture({space:'production',cache:{...cache,space:'staging'},realLoader:true});await cross.listeners[0].error();assert.match(cross.root.textContent,/connection is unavailable/);assert.equal(cross.rendered.length,0);
});

test('cached archive deduplicates IDs, sorts publication dates and preserves original static cards',async()=>{
  const one=entry(1),two=entry(2,'field-note','2026-10-26T12:00:00Z'),three=entry(3,'fact','2026-10-24T12:00:00Z'),f=await fixture({mode:'list',cache:cms([one,three,two,two])});await f.listeners[0].error();await flush();
  assert.deepEqual(f.target.children.map(node=>node.href),['/entry/'+id(2),'/entry/'+id(1),'/entry/'+id(3),'/original-static-story']);assert.ok(f.target.children.includes(f.original));assert.equal(f.mediaReads.length,0);
  assert.match(f.target.parentNode.textContent,/cached published entries/);
});

test('cached Field Notes filtering includes facts and excludes blog cards',async()=>{
  const f=await fixture({mode:'list',type:'notes',merged:false,cache:cms([entry(1),entry(2,'field-note'),entry(3,'fact')])});await f.listeners[0].error();await flush();
  assert.deepEqual(f.target.children.map(node=>node.dataset.readingKind),['field-note','fact']);
});

test('synchronous archive listener failure can still use its saved public data',async()=>{
  const f=await fixture({mode:'list',listenThrows:true});assert.equal(f.reads.length,1);assert.equal(f.target.querySelectorAll('[data-cms-card]').length,1);
});

test('authoritative empty archive clears cached cards and keeps original static cards',async()=>{
  const f=await fixture({mode:'list'});await f.listeners[0].error();await flush();f.listeners[0].next(live());await f.listeners[0].error();await flush();
  assert.deepEqual(f.target.children,[f.original]);assert.equal(f.reads.length,1);
});

test('healthy empty archive and delayed-error race never resurrect cached cards',async()=>{
  const first=await fixture({mode:'list'});first.listeners[0].next(live());await first.listeners[0].error();assert.equal(first.reads.length,0);
  const delayed=pending(),f=await fixture({mode:'list',cache:delayed.promise});const error=f.listeners[0].error();f.listeners[0].next(live());delayed.resolve(cms());await error;assert.deepEqual(f.target.children,[f.original]);
});

test('unavailable archive cache preserves static originals and reports unavailable for separate lists',async()=>{
  const merged=await fixture({mode:'list',cache:null});await merged.listeners[0].error();assert.deepEqual(merged.target.children,[merged.original]);
  const separate=await fixture({mode:'list',merged:false,cache:null});await separate.listeners[0].error();assert.match(separate.target.textContent,/temporarily unavailable/);assert.equal(separate.target.parentNode.hidden,false);
});

test('website fallback applies only current/shared sections through safe existing field paths',async()=>{
  const f=await fixture({mode:'website',cache:website()});f.listeners[0].next(live([],true));await f.listeners[0].error();await flush();
  assert.equal(f.heading.textContent,'Cached fixture heading');assert.equal(f.siteImage.src,image);assert.equal(f.siteImage.alt,'Cached fixture alt');assert.equal(f.sharedText.textContent,'Cached shared text');assert.equal(f.otherText.textContent,'Original other page text');assert.equal(f.mediaReads.length,0);assert.match(f.main.textContent,/cached published page updates, saved 27 Oct 2026/);
});

test('website server Restore original clears saved fields and cache feedback',async()=>{
  const f=await fixture({mode:'website',cache:website()});await f.listeners[0].error();await flush();await f.listeners[0].next(live());await f.listeners[0].error();
  assert.equal(f.heading.textContent,'Original fixture heading');assert.equal(f.siteImage.src,'/assets/original.webp');assert.equal(f.siteImage.srcset,'/assets/original.webp 640w');assert.equal(f.siteImage.alt,'Original fixture alt');assert.doesNotMatch(f.main.textContent,/cached published page updates/);assert.equal(f.reads.length,1);
});

test('website healthy empty and delayed-error race keep original fields authoritative',async()=>{
  const first=await fixture({mode:'website',cache:website()});await first.listeners[0].next(live());await first.listeners[0].error();assert.equal(first.reads.length,0);
  const delayed=pending(),f=await fixture({mode:'website',cache:delayed.promise});const failure=f.listeners[0].error();await f.listeners[0].next(live());delayed.resolve(website());await failure;
  assert.equal(f.heading.textContent,'Original fixture heading');assert.doesNotMatch(f.main.textContent,/cached published page updates/);
});

test('website media from an older callback cannot override a newer Restore original',async()=>{
  const media=pending(),f=await fixture({mode:'website',cache:website(),mediaResponse:media.promise}),row=website().sections[0];
  const old=f.listeners[0].next(live([row]));await f.listeners[0].next(live());media.resolve({exists:()=>true,data:()=>({sectionId:section,dataUrl:'data:image/webp;base64,AAAA',alt:'Old image'})});await old;
  assert.equal(f.heading.textContent,'Original fixture heading');assert.equal(f.siteImage.src,'/assets/original.webp');assert.equal(f.reads.length,0);
});

test('website rejects foreign-section/unsafe cached photo paths and retains originals when cache expires',async()=>{
  const cache=website();cache.sections[0].media[0].src='https://invalid.example/image.webp';const bad=await fixture({mode:'website',cache});await bad.listeners[0].error();assert.equal(bad.siteImage.src,'/assets/original.webp');
  cache.sections[0].media[0]={...cache.sections[0].media[0],src:image,sectionId:other};const foreign=await fixture({mode:'website',cache});await foreign.listeners[0].error();assert.equal(foreign.siteImage.src,'/assets/original.webp');
  const expired=await fixture({mode:'website',cache:null,connectFails:true});assert.equal(expired.heading.textContent,'Original fixture heading');assert.doesNotMatch(expired.main.textContent,/cached published page updates/);
});

test('production website requests its own namespace and the real loader rejects staging copies',async()=>{
  const cache={...website(),space:'production',generatedAt:new Date().toISOString()},f=await fixture({mode:'website',space:'production',cache,realLoader:true,now:Date.now()});await f.listeners[0].error();
  assert.equal(f.reads[0].options.space,'production');assert.equal(f.heading.textContent,'Cached fixture heading');assert.equal(f.siteImage.src,image);
  const cross=await fixture({mode:'website',space:'production',cache:{...cache,space:'staging'},realLoader:true});await cross.listeners[0].error();assert.equal(cross.heading.textContent,'Original fixture heading');assert.doesNotMatch(cross.main.textContent,/cached published page updates/);
});

test('private website preview never consults public snapshots',async()=>{
  const f=await fixture({mode:'website',cache:website(),preview:true});await f.listeners[0].error();assert.equal(f.reads.length,0);assert.equal(f.heading.textContent,'Original fixture heading');
});

test('metadata-only server acknowledgements set authority without rereading media or resetting content',async()=>{
  const article=await fixture();await article.listeners[0].next(detailSnapshot(entry(1),true));await article.listeners[0].next(detailSnapshot(entry(1)));await article.listeners[0].error();
  assert.equal(article.rendered.length,1);assert.equal(article.mediaReads.length,1);assert.equal(article.reads.length,0);
  const archive=await fixture({mode:'list'});archive.listeners[0].next(live([entry(1)],true));archive.listeners[0].next(live([entry(1)]));await archive.listeners[0].error();assert.equal(archive.reads.length,0);
  const page=await fixture({mode:'website',cache:website()}),row=website().sections[0];await page.listeners[0].next(live([row],true));await page.listeners[0].next(live([row]));await page.listeners[0].error();assert.equal(page.mediaReads.length,1);assert.equal(page.reads.length,0);
});

test('rendered cached article expires exactly at generatedAt plus 24 hours',async()=>{
  const f=await fixture({now:Date.parse(generatedAt)+24*3600000-1000});await f.listeners[0].error();f.advance(999);assert.equal(f.root.querySelector('h1').textContent,'Published fixture 1');f.advance(1);
  assert.match(f.root.textContent,/saved published copy has expired/);assert.equal(f.root.querySelector('.cms-gallery'),null);
});

test('rendered cached archive expires without removing original static cards',async()=>{
  const f=await fixture({mode:'list',now:Date.parse(generatedAt)+24*3600000-1000});await f.listeners[0].error();f.advance(1000);
  assert.deepEqual(f.target.children,[f.original]);assert.equal(f.target.parentNode.querySelector('.pending-actions').querySelector('p').hidden,true);
});

test('rendered cached Website overrides expire back to original fields and metadata',async()=>{
  const f=await fixture({mode:'website',cache:website(),now:Date.parse(generatedAt)+24*3600000-1000});await f.listeners[0].error();f.advance(1000);
  assert.equal(f.heading.textContent,'Original fixture heading');assert.equal(f.siteImage.src,'/assets/original.webp');assert.equal(f.document.title,'Original fixture title');assert.doesNotMatch(f.main.textContent,/cached published page updates/);
});

test('background and restored-page checks remove expired cache even when timers were throttled',async()=>{
  for(const mode of ['detail','list','website'])for(const [scope,event] of [['document','visibilitychange'],['window','pageshow']]){
    const f=await fixture({mode,cache:mode==='website'?website():cms(),now:Date.parse(generatedAt)+24*3600000-1000});await f.listeners[0].error();f.advance(1000,false);f.fire(scope,event);
    if(mode==='detail')assert.match(f.root.textContent,/saved published copy has expired/);else if(mode==='list')assert.deepEqual(f.target.children,[f.original]);else assert.equal(f.heading.textContent,'Original fixture heading');
  }
});

test('expiry never overwrites a newer live callback, and live rendering can follow expiry',async()=>{
  for(const expireFirst of [false,true])for(const mode of ['detail','list','website']){
    const f=await fixture({mode,cache:mode==='website'?website():cms(),now:Date.parse(generatedAt)+24*3600000-1000});await f.listeners[0].error();if(expireFirst)f.advance(1000);
    if(mode==='detail'){await f.listeners[0].next(detailSnapshot({...entry(1),title:'New live fixture',photoIds:[],photoPlacements:[],heroPhotoId:''}));f.advance(1000);assert.equal(f.root.querySelector('h1').textContent,'New live fixture');}
    else if(mode==='list'){f.listeners[0].next(live([entry(2)]));f.advance(1000);assert.equal(f.target.children[0].href,'/entry/'+id(2));}
    else{await f.listeners[0].next(live([{...website().sections[0],values:{f00:'New live fixture'},photoIds:[]} ]));f.advance(1000);assert.equal(f.heading.textContent,'New live fixture');}
  }
});

test('failed CMS media can use immutable current photos while keeping newer live text and its expiry',async()=>{
  const delayed=pending(),f=await fixture({cache:delayed.promise,now:Date.parse(generatedAt)+24*3600000-1000,mediaResponse:async()=>{throw Error('media permission failure');}}),current={...entry(1),title:'New live title',body:'New live body with current wording.\n\n## Current live chapter\n\nUpdated live chapter text.',updatedAt:'2026-10-27T12:30:00Z'};
  const update=f.listeners[0].next(detailSnapshot(current));await flush();assert.equal(f.root.querySelector('h1').textContent,'New live title');assert.match(f.root.textContent,/New live body/);assert.equal(f.root.querySelector('.cms-gallery'),null);
  delayed.resolve(cms());await update;assert.equal(f.root.querySelector('h1').textContent,'New live title');assert.equal(f.root.querySelector('.cms-gallery').querySelector('img').src,image);assert.match(f.root.textContent,/Some photographs use the cached published copy/);assert.doesNotMatch(f.root.textContent,/Opening fixture text/);
  f.advance(1000);assert.equal(f.root.querySelector('h1').textContent,'New live title');assert.equal(f.root.querySelector('.cms-gallery'),null);assert.doesNotMatch(f.root.textContent,/cached published copy/);assert.match(f.root.textContent,/New live body/);
});

test('CMS photo fallback preserves independently successful images and drops only expired copied photos',async()=>{
  const second='photo-'+'b'.repeat(32),secondImage='/assets/public-content/'+'b'.repeat(64)+'.webp',current={...entry(1),photoIds:[photo,second],photoPlacements:[1,1]},saved={...current,photos:[...current.photos,{id:second,src:secondImage,alt:'Second fixture image',width:640,height:420}]};
  const f=await fixture({cache:cms([saved]),now:Date.parse(generatedAt)+24*3600000-1000,mediaResponse:async ref=>{if(ref.at(-1)===second)throw Error('quota');return {exists:()=>true,data:()=>({dataUrl:'data:image/webp;base64,AAAA',alt:'Live first image',width:640,height:420})};}});await f.listeners[0].next(detailSnapshot(current));
  assert.deepEqual(f.root.querySelector('.cms-gallery').querySelectorAll('img').map(node=>node.src),['data:image/webp;base64,AAAA',secondImage]);f.advance(1000);assert.deepEqual(f.root.querySelector('.cms-gallery').querySelectorAll('img').map(node=>node.src),['data:image/webp;base64,AAAA']);
});

test('CMS media fallback requires the same owner entry and exact current photo ID',async()=>{
  for(const cache of [cms([entry(2)]),cms([{...entry(1),photoIds:['photo-'+'b'.repeat(32)],photos:[{...entry(1).photos[0],id:'photo-'+'b'.repeat(32)}]}])]){
    const f=await fixture({cache,mediaResponse:async()=>{throw Error('quota');}});await f.listeners[0].next(detailSnapshot(entry(1)));assert.equal(f.root.querySelector('.cms-gallery'),null);assert.doesNotMatch(f.root.textContent,/Some photographs use/);
  }
});

test('a delayed CMS photo copy cannot override a live withdrawal or a new live revision',async()=>{
  const delayed=pending(),f=await fixture({cache:delayed.promise,mediaResponse:async()=>{throw Error('quota');}}),old=f.listeners[0].next(detailSnapshot(entry(1)));await flush();await f.listeners[0].next(detailSnapshot(null));delayed.resolve(cms());await old;assert.match(f.root.textContent,/taken offline/);
  const next=await fixture({now:Date.parse(generatedAt)+24*3600000-1000,mediaResponse:async()=>{throw Error('quota');}});await next.listeners[0].next(detailSnapshot(entry(1)));await next.listeners[0].next(detailSnapshot({...entry(1),title:'Latest text',photoIds:[],photoPlacements:[],heroPhotoId:''}));next.advance(1000);assert.equal(next.root.querySelector('h1').textContent,'Latest text');assert.equal(next.root.querySelector('.cms-gallery'),null);
});

test('CMS explicitly missing media does not revive an older photo copy',async()=>{
  const f=await fixture();await f.listeners[0].next(detailSnapshot(entry(1)));assert.equal(f.reads.length,0);assert.equal(f.root.querySelector('.cms-gallery'),null);
});

test('Website photo-only fallback keeps live fields, alt text and crop until copied images expire',async()=>{
  const f=await fixture({mode:'website',cache:website(),now:Date.parse(generatedAt)+24*3600000-1000,mediaResponse:async()=>{throw Error('media permission failure');}}),row={...website().sections[0],values:{f00:'Current live heading',f01:JSON.stringify({src:photo,alt:'Current live alt',position:'bottom'})}};
  await f.listeners[0].next(live([row]));assert.equal(f.heading.textContent,'Current live heading');assert.equal(f.siteImage.src,image);assert.equal(f.siteImage.alt,'Current live alt');assert.equal(f.siteImage.style.objectPosition,'bottom');assert.match(f.main.textContent,/Some photographs use the cached published copy/);assert.doesNotMatch(f.main.textContent,/Showing cached published page updates/);
  f.advance(1000,false);f.fire('window','pageshow');assert.equal(f.heading.textContent,'Current live heading');assert.equal(f.siteImage.src,'/assets/original.webp');assert.doesNotMatch(f.main.textContent,/cached published copy/);
});

test('Website photo-only fallback rejects another section or a photo no longer in the live section',async()=>{
  const bad=website();bad.sections[0].media[0].sectionId=other;
  for(const [cache,row] of [[bad,website().sections[0]],[website(),{...website().sections[0],photoIds:['photo-'+'b'.repeat(32)]}]]){
    const f=await fixture({mode:'website',cache,mediaResponse:async()=>{throw Error('quota');}});await f.listeners[0].next(live([row]));assert.equal(f.siteImage.src,'/assets/original.webp');assert.doesNotMatch(f.main.textContent,/Some photographs use/);
  }
});

test('a delayed Website photo copy cannot override Restore original and newer live changes beat expiry',async()=>{
  const delayed=pending(),f=await fixture({mode:'website',cache:delayed.promise,mediaResponse:async()=>{throw Error('quota');}}),old=f.listeners[0].next(live([website().sections[0]]));await flush();await f.listeners[0].next(live());delayed.resolve(website());await old;assert.equal(f.heading.textContent,'Original fixture heading');assert.equal(f.siteImage.src,'/assets/original.webp');
  const next=await fixture({mode:'website',cache:website(),now:Date.parse(generatedAt)+24*3600000-1000,mediaResponse:async()=>{throw Error('quota');}});await next.listeners[0].next(live([website().sections[0]]));await next.listeners[0].next(live([{...website().sections[0],values:{f00:'Newest live heading'},photoIds:[]} ]));next.advance(1000);assert.equal(next.heading.textContent,'Newest live heading');assert.doesNotMatch(next.main.textContent,/cached published copy/);
});

test('metadata acknowledgement keeps the photo-copy deadline without repeating failed media reads',async()=>{
  const f=await fixture({mode:'website',cache:website(),now:Date.parse(generatedAt)+24*3600000-1000,mediaResponse:async()=>{throw Error('quota');}}),row=website().sections[0];await f.listeners[0].next(live([row],true));await f.listeners[0].next(live([row]));assert.equal(f.mediaReads.length,1);assert.equal(f.reads.length,1);f.advance(1000);assert.equal(f.siteImage.src,'/assets/original.webp');assert.equal(f.heading.textContent,'Cached fixture heading');
});

test('photo-only fallback stays disabled in private previews and on unsupported namespaces',async()=>{
  const preview=await fixture({mode:'website',cache:website(),preview:true,mediaResponse:async()=>{throw Error('quota');}});await preview.listeners[0].next(live([website().sections[0]]));assert.equal(preview.reads.length,0);assert.equal(preview.siteImage.src,'/assets/original.webp');
  for(const mode of ['detail','website']){const f=await fixture({mode,space:'unsupported',cache:mode==='website'?website():cms(),realLoader:true});await f.listeners[0].error();if(mode==='detail')assert.match(f.root.textContent,/connection is unavailable/);else assert.equal(f.heading.textContent,'Original fixture heading');}
});

test('silent initial server waits use reserve at 12 seconds even after a cache-only empty callback',async()=>{
  for(const mode of ['detail','list','website'])for(const cacheFirst of [false,true]){
    const f=await fixture({mode,cache:mode==='website'?website():cms()});if(cacheFirst)await f.listeners[0].next(mode==='detail'?detailSnapshot(null,true):live([],true));
    f.advance(11999);await flush();assert.equal(f.reads.length,0);f.advance(1);await flush();assert.equal(f.reads.length,1);
    if(mode==='detail')assert.equal(f.root.querySelector('h1').textContent,'Published fixture 1');else if(mode==='list')assert.equal(f.target.querySelectorAll('[data-cms-card]').length,1);else assert.equal(f.heading.textContent,'Cached fixture heading');
    // SDK cache notifications arriving after timeout cannot erase the reserve.
    await f.listeners[0].next(mode==='detail'?detailSnapshot(null,true):live([],true));
    if(mode==='detail')assert.equal(f.root.querySelector('h1').textContent,'Published fixture 1');else if(mode==='list')assert.equal(f.target.querySelectorAll('[data-cms-card]').length,1);else assert.equal(f.heading.textContent,'Cached fixture heading');
  }
});

test('authoritative server empty before the initial deadline never loads reserve',async()=>{
  for(const mode of ['detail','list','website']){
    const f=await fixture({mode,cache:mode==='website'?website():cms()});await f.listeners[0].next(mode==='detail'?detailSnapshot(null):live());f.advance(12000);await flush();assert.equal(f.reads.length,0);
    if(mode==='detail')assert.match(f.root.textContent,/taken offline/);else if(mode==='list')assert.deepEqual(f.target.children,[f.original]);else assert.equal(f.heading.textContent,'Original fixture heading');
  }
});

test('server withdrawal wins a delayed timeout reserve without requiring an SDK error',async()=>{
  for(const mode of ['detail','list','website']){
    const delayed=pending(),f=await fixture({mode,cache:delayed.promise});f.advance(12000);await flush();assert.equal(f.reads.length,1);
    await f.listeners[0].next(mode==='detail'?detailSnapshot(null):live());delayed.resolve(mode==='website'?website():cms());await flush();
    if(mode==='detail')assert.match(f.root.textContent,/taken offline/);else if(mode==='list')assert.deepEqual(f.target.children,[f.original]);else assert.equal(f.heading.textContent,'Original fixture heading');
  }
});

test('the initial deadline includes delayed SDK loading and later server results still win',async()=>{
  for(const mode of ['detail','list','website']){
    const connection=pending(),f=await fixture({mode,connectionResponse:connection.promise,cache:mode==='website'?website():cms()});assert.equal(f.listeners.length,0);f.advance(12000);await flush();assert.equal(f.reads.length,1);
    if(mode==='detail')assert.equal(f.root.querySelector('h1').textContent,'Published fixture 1');else if(mode==='list')assert.equal(f.target.querySelectorAll('[data-cms-card]').length,1);else assert.equal(f.heading.textContent,'Cached fixture heading');
    connection.resolve({db:{}});await flush();assert.equal(f.listeners.length,1);await f.listeners[0].next(mode==='detail'?detailSnapshot(null):live());
    if(mode==='detail')assert.match(f.root.textContent,/taken offline/);else if(mode==='list')assert.deepEqual(f.target.children,[f.original]);else assert.equal(f.heading.textContent,'Original fixture heading');
  }
});

test('timeout without a fresh reserve remains unavailable or uses original static content',async()=>{
  for(const mode of ['detail','list','website']){
    const f=await fixture({mode,cache:null});f.advance(12000);await flush();
    if(mode==='detail')assert.match(f.root.textContent,/connection is unavailable/);else if(mode==='list')assert.deepEqual(f.target.children,[f.original]);else assert.equal(f.heading.textContent,'Original fixture heading');
  }
});
