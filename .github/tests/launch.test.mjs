import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../../',import.meta.url);
const {spaceForHost}=await import(new URL('assets/site-environment.js',root));

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
