import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const rootUrl=new URL('../../',import.meta.url);
const [source,header,css,coreSource]=await Promise.all(['assets/nav-updates.js','.github/templates/header.html','assets/journey-experience.css','assets/journey-core.js'].map(path=>readFile(new URL(path,rootUrl),'utf8')));
const {sharedPlaceLabel}=await import('data:text/javascript;base64,'+Buffer.from(coreSource).toString('base64'));
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const key='dotm.navigationUpdates.still.v1';
class Target{
  constructor(){this.events=new Map();}
  addEventListener(type,callback,options={}){const list=this.events.get(type)||[];list.push({callback,options});this.events.set(type,list);}
  emit(type,event={}){event.target??=this;for(const entry of [...(this.events.get(type)||[])]){if(entry.options.signal?.aborted)continue;entry.callback(event);if(entry.options.once)this.events.set(type,(this.events.get(type)||[]).filter(item=>item!==entry));}}
}
class Node extends Target{
  constructor(text=''){super();this.textContent=text;this.dataset={};this.hidden=false;this.open=false;this.checked=false;this.disabled=false;this.attrs=new Map();this.classes=new Set();this.classList={add:name=>this.classes.add(name),remove:name=>this.classes.delete(name),contains:name=>this.classes.has(name)};}
  getAttribute(name){return this.attrs.get(name)??null;}
  setAttribute(name,value){this.attrs.set(name,String(value));}
  removeAttribute(name){this.attrs.delete(name);if(name==='hidden')this.hidden=false;}
  closest(name){return name==='li'?this.item:null;}
}
async function fixture({trip={currentLocation:{country:'Curaçao'}},shared,reduce=false,savedStill=false,storageThrows=false,hidden=false,readyState='complete'}={}){
  const document=new Target(),window=new Target(),root=new Node(),trigger=new Node(),current=new Node('Travel updates'),locationItem=new Node(),locationLabel=new Node(),checkbox=new Node(),control=new Node(),media=new Target();
  const links=[new Node('Postcards from the road'),new Node('Stories & Field Notes')];links.forEach((link,index)=>{link.dataset.headerAnnouncement=index?'stories':'postcards';link.setAttribute('href',index?'/stories':'/postcards');link.item=new Node();});
  const selectors=new Map([['[data-nav-updates-trigger]',trigger],['[data-nav-current]',current],['[data-nav-location]',locationItem],['[data-nav-location-label]',locationLabel],['[data-nav-still]',checkbox],['[data-nav-rotation-control]',control]]);
  root.querySelector=selector=>selectors.get(selector)||null;root.querySelectorAll=selector=>selector==='[data-header-announcement]'?links:[];
  root.contains=node=>node===root||[...selectors.values(),...links].includes(node);
  trigger.focus=()=>{document.activeElement=trigger;root.emit('focusin');};
  document.hidden=hidden;document.readyState=readyState;document.activeElement=null;document.querySelector=()=>root;
  media.matches=reduce;window.matchMedia=()=>media;window.publicTripReady=trip===undefined?undefined:Promise.resolve(trip);
  if(shared!==undefined)window.siteSharedCheckin=shared;
  const storage=new Map(savedStill?[[key,'1']]:[]);window.localStorage={getItem(name){if(storageThrows)throw Error('Storage blocked');return storage.get(name)||null;},setItem(name,value){if(storageThrows)throw Error('Storage blocked');storage.set(name,value);}};
  let time=0,serial=0,loadCalls=0;const timers=new Map(),frames=[];
  const context={document,window,root,sharedPlaceLabel,URL,Promise,AbortController,
    setTimeout(callback,delay){const id=++serial;timers.set(id,{callback,time:time+delay});return id;},clearTimeout(id){timers.delete(id);},requestAnimationFrame(callback){frames.push(callback);return frames.length;}};
  const code=source.slice(0,source.indexOf('\nconst navUpdates=')).replace(/^import .*;\r?\n/m,'').replaceAll('export function ','function ');
  runInNewContext(code+'\nglobalThis.api={initNavUpdates,safeHeaderLink};',context);
  const handle=context.api.initNavUpdates(root,{loadLocation:()=>{loadCalls++;return Promise.resolve();}});await settle();
  const tick=duration=>{const until=time+duration;let count=0;for(;;){const next=[...timers.entries()].filter(([,entry])=>entry.time<=until).sort((a,b)=>a[1].time-b[1].time)[0];if(!next)break;if(++count>100)throw Error('Unbounded timer loop');time=next[1].time;timers.delete(next[0]);next[1].callback();}time=until;};
  return{document,window,root,trigger,current,locationItem,locationLabel,checkbox,control,media,links,storage,timers,handle,api:context.api,tick,frame(){for(const callback of frames.splice(0))callback();},loadCalls:()=>loadCalls};
}

test('approved broad location and announcements rotate as whole messages with a stable accessible trigger',async()=>{
  const f=await fixture();assert.equal(f.current.textContent,'Shared · Curaçao');assert.equal(f.locationLabel.textContent,'Curaçao');assert.equal(f.locationItem.hidden,false);
  f.tick(6500);assert.equal(f.root.classes.has('is-changing'),true);assert.equal(f.current.textContent,'Shared · Curaçao');f.tick(140);assert.equal(f.current.textContent,'Postcards from the road');
  f.tick(6640);assert.equal(f.current.textContent,'Stories & Field Notes');f.tick(6640);assert.equal(f.current.textContent,'Shared · Curaçao');
  assert.match(header,/data-nav-updates-trigger aria-label="Location and updates"/);assert.match(header,/data-nav-current aria-hidden="true"/);assert.doesNotMatch(header,/aria-live=/);assert.match(css,/\.nav-updates \[hidden\]\{display:none!important\}/);
});

test('hover, focus, open panel, hidden page and BFCache cancel fades and resume with one full interval',async()=>{
  const f=await fixture();f.tick(6500);f.root.emit('pointerenter',{pointerType:'mouse'});assert.equal(f.timers.size,0);assert.equal(f.root.classes.has('is-changing'),false);f.tick(10000);assert.equal(f.current.textContent,'Shared · Curaçao');
  f.root.emit('pointerleave');assert.equal(f.timers.size,1);f.tick(6640);assert.equal(f.current.textContent,'Postcards from the road');
  for(const [freeze,resume]of [
    [()=>f.root.emit('focusin'),()=>f.root.emit('focusout',{relatedTarget:null})],
    [()=>{f.root.open=true;f.root.emit('toggle');},()=>{f.root.open=false;f.root.emit('toggle');}],
    [()=>{f.document.hidden=true;f.document.emit('visibilitychange');},()=>{f.document.hidden=false;f.document.emit('visibilitychange');}],
    [()=>f.window.emit('pagehide'),()=>f.window.emit('pageshow')]
  ]){freeze();assert.equal(f.timers.size,0);f.tick(20000);assert.equal(f.current.textContent,'Postcards from the road');resume();assert.equal(f.timers.size,1);}
  f.window.emit('pageshow');assert.equal(f.timers.size,1);f.tick(6499);assert.equal(f.current.textContent,'Postcards from the road');
  f.handle.destroy();assert.equal(f.timers.size,0);f.document.emit('site:check-in',{detail:{country:'Another fixture'}});assert.equal(f.locationLabel.textContent,'Curaçao');
});

test('persistent still choice, cross-tab changes and reduced motion stop rotation without requiring focus',async()=>{
  const f=await fixture({savedStill:true});assert.equal(f.checkbox.checked,true);assert.equal(f.timers.size,0);
  f.checkbox.checked=false;f.checkbox.emit('change');assert.equal(f.storage.get(key),'0');assert.equal(f.timers.size,1);
  f.window.emit('storage',{key,newValue:'1'});assert.equal(f.checkbox.checked,true);assert.equal(f.timers.size,0);
  f.window.emit('storage',{key:null,newValue:null});assert.equal(f.checkbox.checked,false);assert.equal(f.timers.size,1);
  f.media.matches=true;f.media.emit('change');assert.equal(f.checkbox.checked,true);assert.equal(f.checkbox.disabled,true);assert.equal(f.timers.size,0);
  f.media.matches=false;f.media.emit('change');assert.equal(f.checkbox.checked,false);assert.equal(f.checkbox.disabled,false);assert.equal(f.timers.size,1);
  const blocked=await fixture({storageThrows:true});blocked.checkbox.checked=true;blocked.checkbox.emit('change');assert.equal(blocked.timers.size,0);assert.equal(blocked.checkbox.checked,true);
});

test('authoritative empty or invalid check-in cannot be resurrected by delayed static trip data',async()=>{
  let resolve;const ready=new Promise(done=>{resolve=done;}),f=await fixture({trip:ready});
  f.document.emit('site:check-in',{detail:null});resolve({currentLocation:{country:'Curaçao'}});await settle();assert.equal(f.locationItem.hidden,true);assert.equal(f.current.textContent,'Postcards from the road');
  const known=await fixture({shared:{known:true,value:null}});assert.equal(known.locationItem.hidden,true);
  known.document.emit('site:check-in',{detail:{country:'Owner-shared country'}});assert.equal(known.locationLabel.textContent,'Owner-shared country');
  known.document.emit('site:check-in',{detail:{city:'Private incomplete city'}});assert.equal(known.locationItem.hidden,true);assert.equal(known.locationLabel.textContent,'');
  const late=await fixture({trip:ready,shared:{known:true,value:{country:'A newer shared country'}}});assert.equal(late.locationLabel.textContent,'A newer shared country');
});

test('updated shared announcements hide invalid panel links and recover without replacing editor-owned nodes',async()=>{
  const f=await fixture({trip:null});f.links[0].hidden=true;f.links[1].setAttribute('href','mailto:owner@example.invalid');f.document.emit('website:updated');
  assert.equal(f.links[0].item.hidden,true);assert.equal(f.links[1].item.hidden,true);assert.equal(f.links[1].getAttribute('href'),null);assert.equal(f.current.textContent,'Travel updates');assert.equal(f.timers.size,0);
  const original=f.links[0];original.hidden=false;original.textContent='<A plain label, never HTML>';original.setAttribute('href','/stories#field-notes');f.document.emit('website:updated');assert.equal(f.links[0],original);assert.equal(original.item.hidden,false);assert.equal(f.current.textContent,'<A plain label, never HTML>');
  original.textContent='x'.repeat(61);f.document.emit('website:updated');assert.equal(original.item.hidden,true);assert.equal(f.current.textContent,'Travel updates');
  original.textContent='x'.repeat(60);f.document.emit('website:updated');assert.equal(original.item.hidden,false);assert.equal(f.current.textContent.length,60);
});

test('header links reject script, mail, protocol-relative, credential and malformed targets',async()=>{
  const f=await fixture();
  for(const value of ['/stories#field-notes','/#next-chapter','#chapter','https://example.org/story?part=2#read'])assert.ok(f.api.safeHeaderLink(value));
  for(const value of ['',null,'about','javascript:alert(1)','mailto:owner@example.invalid','data:text/html,x','http://example.org','//example.org','https://user:pass@example.org','/admin','/studio#write','/../private','/stories\\x','https://example.org/\nwrong'])assert.equal(f.api.safeHeaderLink(value),null);
});

test('Escape closes only the updates panel and returns focus; outside clicks close without changing a destination',async()=>{
  const f=await fixture(),event={key:'Escape',preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}};
  f.root.open=true;f.root.emit('toggle');f.document.emit('keydown',event);assert.equal(f.root.open,false);assert.equal(event.prevented,true);assert.equal(event.stopped,true);assert.equal(f.document.activeElement,f.trigger);assert.equal(f.timers.size,0);assert.equal(f.document.events.get('keydown')[0].options.capture,true);
  f.root.emit('focusout',{relatedTarget:null});f.root.open=true;f.root.emit('toggle');f.document.emit('click',{target:{}});assert.equal(f.root.open,false);assert.equal(f.timers.size,1);assert.equal(f.trigger.getAttribute('href'),null);
});

test('bootstrap waits for two paint frames, handles later defer trip bootstrap and does not initialize twice',async()=>{
  const f=await fixture({readyState:'interactive',trip:null});assert.equal(f.loadCalls(),0);f.frame();await settle();assert.equal(f.loadCalls(),0);f.frame();await settle();assert.equal(f.loadCalls(),1);
  f.window.publicTripReady=Promise.resolve({currentLocation:{country:'Country from later bootstrap'}});f.document.emit('DOMContentLoaded');await settle();assert.equal(f.locationLabel.textContent,'Country from later bootstrap');
  assert.equal(f.api.initNavUpdates(f.root),null);assert.equal(f.timers.size,1);
});
