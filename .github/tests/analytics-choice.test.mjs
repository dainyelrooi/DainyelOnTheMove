import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../../assets/analytics-choice.js',import.meta.url),'utf8');
const {ANALYTICS_CHOICE_KEY,CHOICE_LIFETIME,readAnalyticsChoice,initAnalyticsChoice}=await import('data:text/javascript,'+encodeURIComponent(source));
const record=(choice='accepted',decidedAt=Date.now()-100)=>({version:1,scope:'analytics-only',choice,decidedAt});

function fixture({stored=null,storageFails=false,production=true}={}){
  let raw=stored,calls=[],pending=0,message='';const events={};
  class Element{
    constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.hidden=false;this.open=false;this.isConnected=true;}
    append(...nodes){this.children.push(...nodes);}
    setAttribute(key,value){this[key]=value;}
    addEventListener(type,fn){this.listeners[type]=fn;}
    focus(){globalThis.document.activeElement=this;}
    showModal(){this.open=true;}
    close(){this.open=false;this.listeners.close?.();}
    querySelector(){return flatten(this).find(x=>x.tagName==='input');}
  }
  function flatten(e){return[e,...e.children.flatMap(flatten)];}
  globalThis.document={body:new Element('body'),createElement:tag=>new Element(tag),activeElement:new Element('button')};
  globalThis.localStorage={getItem:()=>{if(storageFails)throw Error();return raw;},setItem:(key,value)=>{assert.equal(key,ANALYTICS_CHOICE_KEY);if(storageFails)throw Error();raw=value;}};
  globalThis.window={addEventListener:(key,fn)=>{events[key]=fn;}};
  const controller=initAnalyticsChoice({production,onChoice:(accepted,options)=>calls.push({accepted,...options}),onPending:()=>pending++,status:text=>message=text});
  const find=text=>flatten(document.body).find(e=>e.tagName==='button'&&e.textContent===text);
  const banner=()=>document.body.children.find(e=>e.tagName==='section');
  return {controller,calls,events,find,banner,stored:()=>raw,pending:()=>pending,message:()=>message,all:()=>flatten(document.body)};
}

test('only a current explicit Analytics-only decision is valid',()=>{
  const now=Date.now(),valid=record('accepted',now-1);
  assert.deepEqual(readAnalyticsChoice(JSON.stringify(valid),now),valid);
  for(const raw of [null,'bad','[]','{}',JSON.stringify({...valid,scope:'advertising'}),JSON.stringify({...valid,version:2}),
    JSON.stringify({...valid,choice:true}),JSON.stringify({...valid,decidedAt:now+1}),JSON.stringify({...valid,decidedAt:now-CHOICE_LIFETIME})])assert.equal(readAnalyticsChoice(raw,now),null);
});
test('first visit remains pending with equal explicit choices and no external script element',()=>{
  const f=fixture();assert.equal(f.calls.length,0);assert.equal(f.pending(),1);assert.equal(f.banner().hidden,false);
  for(const label of ['Consent','Do not consent','Manage options'])assert.ok(f.find(label));
  assert.equal(f.all().filter(e=>e.tagName==='script').length,0);
});
test('acceptance saves the scoped choice and enables only the Analytics callback',()=>{
  const f=fixture();f.find('Consent').listeners.click();assert.equal(f.calls.at(-1).accepted,true);assert.equal(f.banner().hidden,true);
  assert.equal(readAnalyticsChoice(f.stored()).choice,'accepted');assert.match(f.message(),/Advertising remains off/);
});
test('refusal resolves privacy without granting measurement',()=>{
  const f=fixture();f.find('Do not consent').listeners.click();assert.equal(f.calls.at(-1).accepted,false);assert.equal(f.banner().hidden,true);
  assert.equal(readAnalyticsChoice(f.stored()).choice,'rejected');
});
test('valid remembered refusal does not ask again and expired acceptance does',()=>{
  const rejected=fixture({stored:JSON.stringify(record('rejected'))});assert.equal(rejected.banner().hidden,true);assert.equal(rejected.calls[0].accepted,false);
  const expired=fixture({stored:JSON.stringify(record('accepted',Date.now()-CHOICE_LIFETIME-1))});assert.equal(expired.calls.length,0);assert.equal(expired.banner().hidden,false);
});
test('settings pause first and withdrawing accepted measurement is reported exactly once',()=>{
  const f=fixture({stored:JSON.stringify(record())});assert.equal(f.calls.length,1);f.controller.openSettings();assert.equal(f.pending(),1);
  f.find('Do not consent').listeners.click();assert.equal(f.calls.length,2);assert.deepEqual(f.calls.at(-1),{accepted:false,revoked:true});
});
test('cancelling settings cannot silently accept; a known choice resumes',()=>{
  const first=fixture();first.controller.openSettings();first.find('Cancel').listeners.click();assert.equal(first.calls.length,0);assert.equal(first.banner().hidden,false);
  const known=fixture({stored:JSON.stringify(record('rejected'))});known.controller.openSettings();known.find('Cancel').listeners.click();assert.equal(known.calls.at(-1).accepted,false);
});
test('blocked storage fails closed initially and explains an unsaved explicit choice',()=>{
  const f=fixture({storageFails:true});assert.equal(f.calls.length,0);f.find('Do not consent').listeners.click();assert.equal(f.calls.at(-1).accepted,false);assert.match(f.message(),/did not allow it to be saved/);
});
test('another tab withdrawal stops the previous grant; clearing preferences returns to pending',()=>{
  const f=fixture({stored:JSON.stringify(record())});f.events.storage({key:ANALYTICS_CHOICE_KEY,newValue:JSON.stringify(record('rejected'))});assert.deepEqual(f.calls.at(-1),{accepted:false,revoked:true});
  f.events.storage({key:null,newValue:null});assert.equal(f.banner().hidden,false);assert.ok(f.pending()>0);
});
