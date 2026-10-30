import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../../',import.meta.url);
const {spaceForHost}=await import(new URL('assets/site-environment.js',root));
const {searchEntries}=await import(new URL('assets/search-engine.js',root));

test('local search recognises Dutch aliases, common spelling mistakes and no-match queries',()=>{
  const items=[{title:'Philippines island story',text:'Oslob and El Nido',url:'/philippines'},
    {title:'Thailand travel story',text:'Bangkok and Chiang Mai',url:'/thailand'}];
  for(const term of ['filipijnen','philipines','Philippines'])assert.equal(searchEntries(items,term)[0]?.url,'/philippines',term);
  assert.deepEqual(searchEntries(items,'zzznomatch987654'),[]);
});

test('storage routing recognises exact live and fixed/preview test hosts; lookalikes fail closed',()=>{
  for(const host of ['dainyelonthemove.com','www.dainyelonthemove.com','dainyelonthemove.web.app','dainyelonthemove.firebaseapp.com'])assert.equal(spaceForHost(host),'production',host);
  for(const host of ['dainyelonthemove-staging.web.app','dainyelonthemove-staging.firebaseapp.com','localhost','127.0.0.1','[::1]','dainyelonthemove-staging--pr52-a9bc.web.app'])assert.equal(spaceForHost(host),'staging',host);
  for(const host of ['',undefined,'example.com','dainyelonthemove.com.attacker.invalid','dainyelonthemove-staging--pr52.web.app.attacker.invalid','attacker-dainyelonthemove-staging.web.app'])assert.equal(spaceForHost(host),'unsupported',String(host));
});

test('all current browser storage selectors use the same host policy',async()=>{
  const publishing=await readFile(new URL('assets/publishing-model.js',root),'utf8'),website=await readFile(new URL('assets/website-model.js',root),'utf8'),calendar=await readFile(new URL('assets/content-calendar.js',root),'utf8');
  assert.match(publishing,/export \{space\} from '\.\/site-environment\.js'/);
  assert.match(website,/export \{space as siteSpace\} from '\.\/site-environment\.js'/);
  assert.match(calendar,/\['calendarSpaces',space,'posts'\]/);
});

test('private review pages are bounded, traverse older records, reject late callbacks and clean up',async()=>{
  const made=[];
  const node=()=>({children:[],listeners:{},hidden:false,disabled:false,textContent:'',append(...items){this.children.push(...items);},after(...items){this.afterItems=items;},setAttribute(){},addEventListener(name,fn){this.listeners[name]=fn;},remove(){this.removed=true;}});
  globalThis.document={createElement:()=>{const item=node();made.push(item);return item;}};
  try{
    const {watchOwnerPage,OWNER_PAGE_SIZE}=await import(new URL('assets/owner-review-pages.js',root));
    const subscriptions=[],received=[];let stopped=0;
    const sdk={query:(base,...constraints)=>({base,constraints}),limit:n=>({limit:n}),startAfter:cursor=>({after:cursor}),onSnapshot:(view,receive,fail)=>{subscriptions.push({view,receive,fail});return()=>stopped++;}};
    const list=node(),end=watchOwnerPage(sdk,'private-query',{list,label:'questions',receive:(s,page)=>received.push({s,page}),failed:()=>{}});
    assert.equal(subscriptions[0].view.constraints.at(-1).limit,OWNER_PAGE_SIZE);
    const docs=Array.from({length:OWNER_PAGE_SIZE},(_,i)=>({id:'fixture-'+i}));subscriptions[0].receive({docs,size:docs.length});
    assert.equal(received.at(-1).page.partial,true);
    const [controls,note]=list.afterItems,[first,more]=controls.children;
    more.listeners.click();assert.equal(stopped,1);assert.equal(subscriptions[1].view.constraints[0].after,docs.at(-1));
    subscriptions[0].receive({docs:[],size:0});assert.equal(received.length,1,'unsubscribed late data must not replace the new page');
    subscriptions[1].receive({docs:[{id:'fixture-older'}],size:1});assert.equal(received.at(-1).page.older,true);
    first.listeners.click();assert.equal(subscriptions[2].view.constraints.length,1,'First removes the cursor');
    subscriptions[2].receive({docs:[],size:0});assert.equal(received.at(-1).page.partial,false);assert.equal(controls.hidden,true);
    end();subscriptions[2].receive({docs,size:docs.length});assert.equal(received.length,3);assert.equal(controls.removed,true);assert.equal(note.removed,true);
  }finally{delete globalThis.document;}
});

test('combined owner review badge includes the independent inbox and never calls an unknown queue empty',async()=>{
  const source=await readFile(new URL('assets/admin-review-badges.js',root),'utf8');
  const nodes=new Map(),node=()=>({hidden:false,textContent:'',attributes:{},setAttribute(key,value){this.attributes[key]=value;}});
  const document={querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);}};
  const context={document};vm.createContext(context);
  vm.runInContext(source.replaceAll('export function ','function ')+'\nglobalThis.review={setReviewCount,failReviewCount,resetReviewCount};',context);
  const review=context.review,nav=nodes.get('[data-review-nav]'),badge=nodes.get('[data-review-badge]');
  for(const key of ['questions','communityThreads','replies','contacts'])review.setReviewCount(key,0);
  assert.match(nav.attributes['aria-label'],/loading/,'The independent inbox has not loaded yet.');
  review.setReviewCount('cloudflare',3);assert.equal(badge.textContent,'3');assert.match(nav.attributes['aria-label'],/3 items awaiting review/);
  review.setReviewCount('cloudflare',25,{partial:true});assert.equal(badge.textContent,'25+');assert.match(nav.attributes['aria-label'],/At least 25/);
  review.failReviewCount('cloudflare');assert.equal(badge.textContent,'!');assert.match(nav.attributes['aria-label'],/unavailable/);
  review.resetReviewCount('cloudflare');assert.match(nav.attributes['aria-label'],/loading/);
  review.setReviewCount('cloudflare',0);assert.match(nav.attributes['aria-label'],/No items awaiting review/);assert.equal(badge.hidden,true);
});

async function independentReviewFixture({configured=true,failed=false,partial=false}={}){
  const source=await readFile(new URL('assets/cloudflare-admin.js',root),'utf8');
  const node=()=>({children:[],listeners:{},dataset:{},hidden:false,disabled:false,textContent:'',value:'',append(...items){this.children.push(...items);},replaceChildren(...items){this.children=[...items];},addEventListener(name,handler){this.listeners[name]=handler;}});
  const section=node(),fields=new Map(['items','status','filter','refresh','more'].map(key=>[key,node()]));fields.get('filter').value='pending';
  section.querySelector=selector=>fields.get(/data-cloudflare-([a-z]+)/.exec(selector)?.[1]);
  const rows=Array.from({length:3},(_,index)=>({id:'cf-'+String(index+1).padStart(32,'0'),kind:'question',question:'Synthetic private review fixture.',status:'pending',revision:1}));
  const calls=[],counts=[];let failNext=failed;
  const context={AbortController,URLSearchParams,Intl,Date,window:{confirm:()=>false},document:{querySelector:()=>section,createElement:()=>node()},
    getCloudflareConfig:async()=>configured?'https://fixture.workers.dev':null,
    setReviewCount:(key,value,options={})=>counts.push({key,value,...options}),resetReviewCount:key=>counts.push({key,loading:true}),failReviewCount:key=>counts.push({key,error:true}),
    cloudflareRequest:async(path,options={})=>{calls.push({path,...options});if(failNext){failNext=false;throw Error('isolated network failure');}
      if(options.method==='PATCH'){const row=rows.find(item=>path.endsWith(item.id));row.status=options.body.status;row.revision++;return{item:{...row}};}
      const selected=new URLSearchParams(path.split('?')[1]).get('status');return{items:rows.filter(row=>row.status===selected).map(row=>({...row})),nextCursor:partial?'fixture-cursor':null};}};
  vm.createContext(context);vm.runInContext(source.replace(/^import .*;\r?\n/gm,'').replaceAll('export function ','function ').replaceAll('export async function ','async function ')+'\nglobalThis.init=initCloudflareInbox;',context);
  await context.init({});
  return{section,fields,calls,counts,rows,fail(){failNext=true;},lastCount:()=>counts.at(-1),action:async index=>fields.get('items').children[index].children.at(-1).children[0].listeners.click(),filter:async value=>{fields.get('filter').value=value;await fields.get('filter').listeners.change();}};
}

test('independent inbox reuses pending pages and owner transitions for truthful counts across filters',async()=>{
  const f=await independentReviewFixture();assert.equal(f.lastCount().value,3);
  const first=f.fields.get('items').children[0],answer=first.children.find(child=>child.id?.startsWith('cf-answer-'));answer.value='An isolated fixture answer.';
  await f.action(0);assert.equal(f.lastCount().value,2);
  await f.filter('published');assert.equal(f.lastCount().value,2,'A published-page count is not the pending count.');
  const actions=f.fields.get('items').children[0].children.at(-1);await actions.children[1].listeners.click();assert.equal(f.lastCount().value,3);
  assert.equal(f.calls.filter(call=>!call.method).length,4,'Counting does not add a second query or polling loop.');
  const partial=await independentReviewFixture({partial:true});assert.equal(partial.lastCount().value,3);assert.equal(partial.lastCount().partial,true);
});

test('disabled or failed independent inbox cannot leave a false empty review badge',async()=>{
  const disabled=await independentReviewFixture({configured:false});assert.equal(disabled.lastCount().value,0);assert.equal(disabled.calls.length,0);
  const failed=await independentReviewFixture({failed:true});assert.equal(failed.lastCount().error,true);
  const uncertain=await independentReviewFixture();const answer=uncertain.fields.get('items').children[0].children.find(child=>child.id?.startsWith('cf-answer-'));answer.value='An isolated fixture answer.';
  uncertain.fail();await uncertain.action(0);assert.equal(uncertain.lastCount().error,true,'An unconfirmed owner update invalidates the old count.');
});
