import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const modelSource=await readFile(new URL('../../assets/home-follow-popup-model.js',import.meta.url),'utf8');
const core=await readFile(new URL('../../assets/journey-core.js',import.meta.url),'utf8');
const coreUrl='data:text/javascript;base64,'+Buffer.from(core).toString('base64');
const model=await import('data:text/javascript;base64,'+Buffer.from(modelSource.replace("'./journey-core.js'",JSON.stringify(coreUrl))).toString('base64'));
const source=await readFile(new URL('../../assets/home-follow-popup.js',import.meta.url),'utf8');
const start=Date.parse('2026-11-26T12:00:00Z');

function fixture({privacy='resolved',seen=false,record=null,cardVisible=false,storageUnavailable=false,hash='',frame=false,preview=false}={}){
  let clock=0,tick,observer;const events={},docEvents={},local=new Map(),session=new Map(),nodes={};
  if(seen)session.set('dotm-home-invitation-session-v1','shown');
  if(record)local.set('dotm-home-invitation-v1',JSON.stringify(record));
  const element=()=>({hidden:false,dataset:{},textContent:'',isConnected:true,listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},matches(){return false;},focus(){this.focused=true;},querySelector(){return null;}});
  for(const name of ['title','description','eyebrow','dismiss','already','signup','social-instagram','social-youtube','social-tiktok','quiet','donate'])nodes[name]=element();
  const followActions=element(),coffeeActions=element(),secondSignup=element(),notice=element(),body=element();
  coffeeActions.hidden=true;
  const selects={'[data-follow-title]':nodes.title,'[data-follow-description]':nodes.description,'[data-follow-eyebrow]':nodes.eyebrow,'[data-follow-actions]':followActions,'[data-coffee-actions]':coffeeActions,'[data-follow-already]':nodes.already,'[data-invitation-quiet]':nodes.quiet,'[data-coffee-donate]':nodes.donate};
  const socials=['instagram','youtube','tiktok'].map(key=>nodes['social-'+key]);
  const popup={...element(),hidden:true,querySelector(selector){return selects[selector]||null;},querySelectorAll(selector){return selector==='[data-follow-dismiss]'?[nodes.dismiss]:selector==='[data-follow-social]'?socials:selector==='[data-follow-signup]'?[nodes.signup,secondSignup]:[];},contains(node){return Object.values(nodes).includes(node)||node===secondSignup;}};
  const root={dataset:{privacyChoice:privacy},hasAttribute(name){return name==='data-dialog-open'&&root.modal;}};
  const summary=element(),details={open:false,querySelector:()=>summary};let scrolled=false;
  const doc={documentElement:root,body,activeElement:body,hidden:false,querySelector(selector){
    if(selector==='[data-follow-notice]')return notice;
    if(selector==='[data-home-support]')return{getBoundingClientRect:()=>cardVisible?{top:100,bottom:300}:{top:2000,bottom:2400}};
    if(selector==='#follow-trip .postcards-dropdown')return details;
    return null;
  },querySelectorAll(selector){return selector==='.film-player video'&&doc.playing?[{paused:false}]:[];},getElementById(id){return id==='home-follow-popup'?popup:id==='follow-trip'?{scrollIntoView(){scrolled=true;}}:null;},elementFromPoint:()=>null,addEventListener(name,fn){docEvents[name]=fn;}};
  const win={};win.top=frame?{}:win;win.self=win;
  const location={pathname:'/',hash,origin:'https://fixture.invalid',search:preview?'?website-preview=1':''};
  const storage=map=>({getItem(key){if(storageUnavailable)throw Error('Storage unavailable');return map.get(key)??null;},setItem(key,value){if(storageUnavailable)throw Error('Storage unavailable');map.set(key,value);}});
  const context={model,document:doc,window:win,parent:frame?{}:win,location,performance:{now:()=>clock},Date:class extends Date{static now(){return start+clock;}},URL,URLSearchParams,innerHeight:800,innerWidth:390,
    localStorage:storage(local),sessionStorage:storage(session),requestAnimationFrame:fn=>fn(),addEventListener(name,fn){events[name]=fn;},setInterval(fn){tick=fn;return 1;},clearInterval(){tick=null;},MutationObserver:class{constructor(fn){observer=fn;}observe(){}disconnect(){}}};
  vm.createContext(context);vm.runInContext(source.replace(/^import[^\n]*\n/,'const {followPhase,followEligible,followEngaged,followDismissal,invitationEligible,invitationDismissal}=model;\n'),context);
  return{popup,nodes,secondSignup,followActions,coffeeActions,root,doc,events,docEvents,local,session,notice,details,summary,location,get scrolled(){return scrolled;},get running(){return!!tick;},advance(seconds){for(let i=0;i<seconds;i++){clock+=1000;tick?.();}},mutate(){observer?.();}};
}

test('one coordinated coffee invitation appears after ten quiet visible seconds and never opens a second Postcards popup',()=>{
  const f=fixture();f.advance(9);assert.equal(f.popup.hidden,true);f.advance(1);
  assert.equal(f.popup.hidden,false);assert.equal(f.popup.dataset.phase,'coffee');assert.equal(f.followActions.hidden,true);assert.equal(f.coffeeActions.hidden,false);
  assert.equal(f.doc.activeElement,f.doc.body,'automatic invitation must not steal focus');
  f.nodes.dismiss.listeners.click();assert.equal(f.popup.hidden,true);assert.equal(f.running,false);f.advance(30);assert.equal(f.popup.hidden,true);
  const saved=JSON.parse(f.local.get('dotm-home-invitation-v1'));assert.equal(saved.dismissedUntil-saved.shownAt,model.INVITATION_COOLDOWN_MS);
  assert.equal(f.session.get('dotm-home-invitation-session-v1'),'shown');
});
test('privacy decisions, hidden pages, modal controls and typing do not count toward the ten seconds',()=>{
  for(const busy of ['privacy','hidden','modal','input','video']){
    const f=fixture({privacy:busy==='privacy'?'pending':'resolved'});
    if(busy==='hidden')f.doc.hidden=true;if(busy==='modal')f.root.modal=true;if(busy==='input')f.doc.activeElement={matches:()=>true};
    if(busy==='video')f.doc.playing=true;
    f.advance(20);assert.equal(f.popup.hidden,true,busy);
    f.root.dataset.privacyChoice='resolved';f.doc.hidden=false;f.root.modal=false;f.doc.activeElement=f.doc.body;f.doc.playing=false;
    f.advance(9);assert.equal(f.popup.hidden,true,busy);f.advance(1);assert.equal(f.popup.hidden,false,busy);
  }
});
test('inline support visibility and previous invitation preferences suppress the automatic popup',()=>{
  for(const options of [{seen:true},{record:model.invitationDismissal(start)},{cardVisible:true}]){const f=fixture(options);f.advance(15);assert.equal(f.popup.hidden,true);assert.equal(f.running,false);}
  for(const options of [{hash:'#follow-trip'},{frame:true},{preview:true}]){const f=fixture(options);f.advance(30);assert.equal(f.popup.hidden,true);}
});
test('coffee Postcards action still opens the real signup, rather than sending or subscribing automatically',()=>{
  const f=fixture();f.advance(10);f.nodes.signup.listeners.click();assert.equal(f.popup.hidden,true);
  assert.equal(f.details.open,true);assert.equal(f.location.hash,'follow-trip');assert.equal(f.summary.focused,true);assert.equal(f.scrolled,true);
});
test('Escape, cross-tab dismissal, thirty-day quiet choice and unavailable storage remain safe',()=>{
  const escaped=fixture();escaped.advance(10);escaped.docEvents.keydown({key:'Escape',preventDefault(){}});assert.equal(escaped.popup.hidden,true);
  const quiet=fixture();quiet.advance(10);quiet.nodes.quiet.listeners.click();const saved=JSON.parse(quiet.local.get('dotm-home-invitation-v1'));assert.equal(saved.dismissedUntil-saved.shownAt,model.FOLLOW_ALREADY_MS);
  const other=fixture();other.advance(10);other.events.storage({key:'dotm-home-invitation-v1'});assert.equal(other.popup.hidden,true);
  const blocked=fixture({storageUnavailable:true});blocked.advance(10);assert.equal(blocked.popup.hidden,false);blocked.nodes.dismiss.listeners.click();blocked.advance(30);assert.equal(blocked.popup.hidden,true);
});
test('invitation cooldown observes the exact boundary and a clock moved backwards',()=>{
  const record=model.invitationDismissal(start);
  assert.equal(model.invitationEligible({now:start-1,record}),false);
  assert.equal(model.invitationEligible({now:start+model.INVITATION_COOLDOWN_MS-1,record}),false);
  assert.equal(model.invitationEligible({now:start+model.INVITATION_COOLDOWN_MS,record}),true);
});
