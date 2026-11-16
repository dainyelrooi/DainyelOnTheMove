import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {searchEntries} from '../../assets/search-engine.js';
import {catalogFresh,catalogEntry} from '../../assets/published-catalog.js';
import {articleShareUrl} from '../../assets/article-share.js';
const [searchSource,shareSource]=await Promise.all(['global-search','article-share'].map(name=>readFile(new URL('../../assets/'+name+'.js',import.meta.url),'utf8')));
const flush=async()=>{for(let n=0;n<12;n++)await Promise.resolve();await new Promise(done=>setImmediate(done));};
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return{promise,resolve};};
class Node{
  constructor(tag='div'){this.tag=tag;this.children=[];this.listeners={};this.dataset={};this.disabled=false;this._text='';}
  set textContent(value){this._text=String(value);this.children=[];}get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
  append(...nodes){for(const n of nodes){n.parentNode=this;this.children.push(n);}}
  replaceChildren(...nodes){this._text='';this.children=[];this.append(...nodes);}
  addEventListener(type,fn){this.listeners[type]=fn;}setAttribute(name,value){this[name]=value;}focus(){this.focused=true;}select(){this.selected=true;}
  get isConnected(){return Boolean(this.parentNode);}after(node){this.afterNode=node;node.parentNode=this;}
}
const id='entry-'+'a'.repeat(32),stamp=new Date(Date.now()-60000).toISOString(),row={id,kind:'blog',title:'A published Curaçao fixture',excerpt:'An isolated public-summary fixture.',place:'Curaçao',publishedAt:stamp};
const saved={generatedAt:stamp,entries:[row]};
async function searchFixture({copy=Promise.resolve(saved),firebase=Promise.resolve({db:{}}),index=Promise.resolve([{url:'/thailand',title:'Thailand archive',text:'An existing static story',type:'Travel Story'}]),archive=Promise.resolve({editions:[]})}={}){
  const dialog=new Node('dialog'),input=new Node('input'),results=new Node(),count=new Node(),trigger=new Node('a'),close=new Node('button'),form=new Node('form'),listeners=[],timers=[];
  input.value='';dialog.open=false;dialog.querySelector=selector=>({'input':input,'#global-search-results':results,'[role=status]':count,'[data-close-search]':close,'form':form}[selector]);dialog.showModal=()=>dialog.open=true;dialog.close=()=>{dialog.open=false;dialog.listeners.close();};
  const location={hash:'',pathname:'/stories',search:''},history={pushState(a,b,url){location.hash=url;},replaceState(a,b,url){location.hash=url.includes('#')?url.slice(url.indexOf('#')):'';}};
  const sdk={collection:(...args)=>args,query:(...args)=>args,orderBy:(...args)=>args,limit:n=>n,onSnapshot:(ref,options,next)=>{if(typeof options==='function')next=options;const item={kind:ref.flat(Infinity).includes('cmsSpaces')?'cms':'website',next,stopped:false};listeners.push(item);return()=>item.stopped=true;}};
  const context={document:{getElementById:()=>dialog,querySelectorAll:()=>[trigger],activeElement:trigger,createElement:tag=>new Node(tag),addEventListener(){}},window:{addEventListener(){}},location,history,searchEntries,readPublishedCatalog:()=>copy,catalogFresh,catalogEntry,Date,setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimeout(){},fetch:async path=>({ok:true,json:()=>path.includes('site-search')?index:archive}),fixtures:{firebase,sdk}};
  const code=searchSource.replace(/^import .*;\r?\n/gm,'').replace('export function','function').replaceAll("import('../js/firebase.js')",'fixtures.firebase').replaceAll("import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')",'Promise.resolve(fixtures.sdk)').replaceAll("import('./publishing-model.js')","Promise.resolve({space:'production'})");
  vm.createContext(context);vm.runInContext(code+'\n;initSearch();',context);
  const open=()=>trigger.listeners.click({button:0,preventDefault(){}});open();await flush();return{dialog,input,results,count,listeners,timers,open,search(value){input.value=value;input.listeners.input();}};
}
const snapshot=(rows=[],metadata={fromCache:false})=>({metadata,docs:rows.map(row=>({id:row.id,data:()=>row}))});
test('search finds a published CMS story from the independent catalogue while the protected SDK is unavailable',async()=>{
  const f=await searchFixture({firebase:Promise.reject(Error('unavailable'))});f.search('Curaçao');assert.match(f.results.textContent,/A published Curaçao fixture/);assert.equal(f.listeners.length,0);
});
test('a stalled static index does not delay independent CMS search results',async()=>{
  const blocked=deferred(),f=await searchFixture({index:blocked.promise,firebase:Promise.reject(Error('unavailable'))});f.search('Curaçao');assert.match(f.results.textContent,/A published Curaçao fixture/);
  blocked.resolve([]);await flush();assert.match(f.results.textContent,/A published Curaçao fixture/);
});

test('a late ordinary index does not erase a newer archive-only Postcard',async()=>{
  const index=deferred(),f=await searchFixture({index:index.promise,archive:Promise.resolve({editions:[{id:'brevo-321',title:'Unique new Postcard',excerpt:'Archive fixture introduction.'}]})});
  f.search('Unique');assert.match(f.results.textContent,/Unique new Postcard/);
  index.resolve([]);await flush();f.search('Unique');assert.match(f.results.textContent,/Unique new Postcard/);
});

test('archive-only search is usable without static/CMS access and malformed records cannot create blank cards',async()=>{
  const f=await searchFixture({index:Promise.reject(Error('offline')),copy:Promise.resolve(null),firebase:Promise.reject(Error('offline')),archive:Promise.resolve({editions:[null,{id:'brevo-1'},{id:'brevo-2',title:'',excerpt:''},{id:'brevo-3',title:'Usable letter',excerpt:'A synthetic published letter.'}]})});
  f.search('Usable');assert.match(f.results.textContent,/Usable letter/);assert.match(f.count.textContent,/matching results/);assert.equal(f.results.children.length,1);
});

test('facts have their own search label and duplicate letter titles render once in either loading order',async()=>{
  const f=await searchFixture({copy:Promise.resolve({...saved,entries:[{...row,kind:'fact'}]})});f.search('Curaçao');assert.match(f.results.textContent,/Did you know\?/);assert.doesNotMatch(f.results.textContent,/Field Note/);f.search('weetjes');assert.match(f.results.textContent,/Did you know\?/);
  const index=deferred(),letter={id:'brevo-321',title:'Unique letter',excerpt:'Archive fixture.'},g=await searchFixture({index:index.promise,archive:Promise.resolve({editions:[letter]})});
  index.resolve([{title:letter.title,text:letter.excerpt,type:'Postcard',url:'/postcard-brevo-321'}]);await flush();g.search('Unique');assert.equal(g.results.children.length,1);
});
test('a server withdrawal wins late catalogue/static responses and local-cache emptiness is ignored',async()=>{
  const copy=deferred(),index=deferred(),f=await searchFixture({copy:copy.promise,index:index.promise});
  const cms=f.listeners.find(n=>n.kind==='cms');cms.next(snapshot([row]));cms.next(snapshot([],{fromCache:true}));assert.match(f.results.textContent,/A published Curaçao fixture/);
  cms.next(snapshot([]));copy.resolve(saved);index.resolve([]);await flush();assert.doesNotMatch(f.results.textContent,/A published Curaçao fixture/);
});
test('rapid search close/reopen cannot attach duplicate stale subscriptions or update a closed dialog',async()=>{
  const wait=deferred(),f=await searchFixture({firebase:wait.promise});f.dialog.close();f.open();await flush();wait.resolve({db:{}});await flush();assert.equal(f.listeners.length,2);
  f.dialog.close();for(const sub of f.listeners)assert.equal(sub.stopped,true);f.listeners.find(n=>n.kind==='cms').next(snapshot([row]));f.search('Curaçao');assert.match(f.results.textContent,/A published Curaçao fixture/); // original saved copy only
  f.listeners.find(n=>n.kind==='cms').next(snapshot([{...row,title:'Stale callback must be ignored'}]));assert.doesNotMatch(f.results.textContent,/Stale callback/);
});
test('search expires saved metadata while keeping matching ordinary public pages available',async()=>{
  const f=await searchFixture({copy:Promise.resolve({...saved,generatedAt:new Date(Date.now()-86400001).toISOString()}),firebase:Promise.reject(Error('unavailable'))});f.search('Curaçao');assert.doesNotMatch(f.results.textContent,/A published Curaçao fixture/);f.search('Thailand');assert.match(f.results.textContent,/Thailand archive/);
});
test('share URLs strip tracking/chapters and reject unpublished, admin, credentials and off-site routes',()=>{
  assert.equal(articleShareUrl('https://dainyelonthemove.com/bali.html?utm_source=x#chapter'),'https://dainyelonthemove.com/bali');assert.equal(articleShareUrl('https://dainyelonthemove.com/entry/'+id),'https://dainyelonthemove.com/entry/'+id);
  for(const url of ['https://dainyelonthemove.com/admin','https://dainyelonthemove.com/entry','https://dainyelonthemove-staging.web.app/bali','https://other.example/bali','https://user:pass@dainyelonthemove.com/bali','javascript:alert(1)'])assert.equal(articleShareUrl(url),null);
});
function sharingFixture(navigator={},framed=false){
  const ending=new Node(),heading={textContent:'A public story'},window={};window.parent=framed?{}:window;
  const document={createElement:tag=>new Node(tag),querySelector:selector=>selector==='link[rel=canonical]'?{href:'https://dainyelonthemove.com/bali?utm_source=fixture'}:selector==='main h1'?heading:selector==='[data-article-share]'?ending.children[0]:selector==='.journal-next .wrap'?ending:null};
  const context={document,window,location:{pathname:'/bali'},navigator,URL};vm.createContext(context);vm.runInContext(shareSource.replaceAll('export function','function')+'\n;initArticleSharing();initArticleSharing();',context);
  const group=ending.children[0];return{group,button:group?.children[0],status:group?.children[1],ending};
}
test('sharing copies a clean link only after a click and does not duplicate controls',async()=>{
  const copied=[],f=sharingFixture({clipboard:{writeText:async value=>copied.push(value)}});assert.equal(f.ending.children.length,1);assert.equal(copied.length,0);await f.button.listeners.click();assert.deepEqual(copied,['https://dainyelonthemove.com/bali']);assert.match(f.status.textContent,/copied/);
});
test('native share cancellation is quiet; denied clipboard offers a selectable manual link',async()=>{
  let calls=0;const native=sharingFixture({share:async()=>{calls++;throw{name:'AbortError'};}});await native.button.listeners.click();assert.equal(calls,1);assert.equal(native.status.textContent,'');assert.equal(native.button.disabled,false);
  const fallback=sharingFixture({clipboard:{writeText:async()=>{throw Error('denied');}}});await fallback.button.listeners.click();const field=fallback.status.children[0].children[0];assert.equal(field.value,'https://dainyelonthemove.com/bali');assert.equal(field.readOnly,true);assert.equal(field.selected,true);
  assert.equal(sharingFixture({},true).group,undefined);
});
