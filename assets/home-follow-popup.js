import {followPhase,followEligible,followEngaged,followDismissal,invitationEligible,invitationDismissal} from './home-follow-popup-model.js';

const dialog=document.getElementById('home-follow-popup');
const root=document.documentElement;
const path=location.pathname.replace(/\.html$/,'').replace(/\/$/,'')||'/';
const deepLink=Boolean(location.hash&&location.hash!=='#home');
const preview=new URLSearchParams(location.search).get('website-preview')==='1'&&parent!==window;
const copy={
  coffee:{eyebrow:'A little kindness for the road',title:'Buy Dainyel a coffee?',description:'Help keep the stories and films coming. Always optional, always appreciated.'},
  before:{eyebrow:'The next chapter',title:'Ready for the next chapter?',description:'The next journey is getting closer. Get the Postcards and follow the small moments, new stories and first updates as I share them.'},
  awaiting:{eyebrow:'The next chapter',title:'A new chapter is beginning.',description:'The planned departure day has arrived. Come along for the first departure update, new stories and little discoveries as I share them.'},
  departure:{eyebrow:'From the road',title:'We’re on the move.',description:'The journey has begun. Come along for the places, people and unexpected moments — through the Postcards and my social diary.'},
  follow:{eyebrow:'Keep a little of the journey',title:'Already coming along?',description:'Are you subscribed to the Postcards, or following the journey on social? A little curiosity goes a long way. Choose the way you like to stay in touch.'}
};
function renderCopy(phase){
  const text=copy[phase];if(!text)return false;
  const config=document.querySelector('[data-follow-config="'+phase+'"]');
  for(const key of ['title','description']){
    const source=config?.querySelector('[data-follow-copy="'+key+'"]'),target=dialog.querySelector('[data-follow-'+key+']');
    // Website text edits are rendered by the existing bounded public text renderer.
    if(source?.textContent.trim())target.replaceChildren(...[...source.childNodes].map(node=>node.cloneNode(true)));
    else target.textContent=text[key];
  }
  dialog.querySelector('[data-follow-eyebrow]').textContent=text.eyebrow;
  const coffee=phase==='coffee';
  const followActions=dialog.querySelector('[data-follow-actions]'),coffeeActions=dialog.querySelector('[data-coffee-actions]');
  if(followActions)followActions.hidden=coffee;
  if(coffeeActions)coffeeActions.hidden=!coffee;
  dialog.dataset.phase=phase;return true;
}
if(dialog&&preview){
  // Use the existing owner preview channel. A copy preview cannot subscribe,
  // navigate externally, set a dismissal or fabricate a live departure.
  let previewPhase=null,previewVersion=0;
  dialog.querySelectorAll('button').forEach(button=>button.disabled=true);
  const disablePreviewLinks=()=>dialog.querySelectorAll('a').forEach(link=>{link.removeAttribute('href');link.tabIndex=-1;link.setAttribute('aria-disabled','true');});
  disablePreviewLinks();
  const refresh=()=>{const phase=previewPhase,version=++previewVersion;if(phase)requestAnimationFrame(()=>{if(version===previewVersion&&previewPhase===phase&&renderCopy(phase)){disablePreviewLinks();dialog.hidden=false;}});};
  addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='website:preview')return;
    const config=[...document.querySelectorAll('[data-follow-config]')].find(node=>[...node.querySelectorAll('[data-site-field]')].some(field=>field.dataset.siteField.split('/')[0]===event.data.id));
    previewPhase=config?.dataset.followConfig||null;
    dialog.hidden=!previewPhase;refresh();
  });
  document.addEventListener('website:updated',refresh);
}else if(dialog&&window.top===window.self&&
  (path==='/'||path==='/index')&&!deepLink&&!new URLSearchParams(location.search).has('website-preview')){
  let trip=null,shownThisVisit=false,seenInMemory=false,returnFocus=null;
  const opened=()=>!dialog.hidden;
  let visibleMs=0,lastTick=performance.now(),lastInteraction=lastTick;
  const sessionKey=()=>trip?'dotm-home-follow-session-v1:'+trip.id:'';
  const storageKey=()=>trip?'dotm-home-follow-v1:'+trip.id:'';
  const invitationKey='dotm-home-invitation-v1',invitationSession='dotm-home-invitation-session-v1';
  const readInvitation=()=>{try{return JSON.parse(localStorage.getItem(invitationKey));}catch{return null;}};
  const seenInvitation=()=>{try{return seenInMemory||sessionStorage.getItem(invitationSession)==='shown';}catch{return seenInMemory;}};
  const rememberSession=()=>{seenInMemory=true;try{sessionStorage.setItem(invitationSession,'shown');}catch{}};
  const readRecord=()=>{try{const data=JSON.parse(localStorage.getItem(storageKey()));return data?.version===1?data:null;}catch{return null;}};
  const seenInSession=()=>{try{return seenInMemory||sessionStorage.getItem(sessionKey())==='shown';}catch{return seenInMemory;}};
  const remember=(alreadyFollowing=false)=>{
    rememberSession();
    try{localStorage.setItem(invitationKey,JSON.stringify(invitationDismissal(Date.now(),alreadyFollowing)));}catch{}
    if(trip&&dialog.dataset.phase!=='coffee'){
      try{sessionStorage.setItem(sessionKey(),'shown');}catch{}
      try{localStorage.setItem(storageKey(),JSON.stringify(followDismissal(Date.now(),alreadyFollowing)));}catch{}
    }
  };
  function blocked(){
    if(document.hidden||root.dataset.privacyChoice!=='resolved'||root.hasAttribute('data-dialog-open'))return true;
    if(document.querySelector('.site-panel.is-open,.site-links.is-open,.site-more[open],.postcards-dropdown[open]'))return true;
    if([...document.querySelectorAll('dialog[open],[aria-modal="true"]')].some(node=>node!==dialog))return true;
    if(!dialog.contains(document.activeElement)&&document.activeElement?.matches('input,textarea,select,a,button,summary,iframe,video,[contenteditable="true"]'))return true;
    return [...document.querySelectorAll('.film-player video')].some(video=>!video.paused)||Boolean(document.querySelector('.embed-slot iframe[src]'));
  }
  function close(restore=true){
    if(!opened())return;
    const ownedFocus=dialog.contains(document.activeElement);dialog.hidden=true;
    if(shownThisVisit)clearInterval(timer);
    if(restore&&ownedFocus&&root.dataset.privacyChoice==='resolved'&&!root.hasAttribute('data-dialog-open')){
      const target=returnFocus?.isConnected&&returnFocus!==document.body?returnFocus:document.elementFromPoint(innerWidth/2,Math.min(innerHeight/3,200))?.closest('section')?.querySelector('h1,h2,h3');
      if(target){if(!target.matches('a,button,input,select,textarea,[tabindex]'))target.tabIndex=-1;target.focus({preventScroll:true});}
    }
  }
  function syncSocialLinks(){
    const platforms={instagram:/(^|\.)instagram\.com$/,youtube:/(^|\.)youtube\.com$/,tiktok:/(^|\.)tiktok\.com$/};
    for(const [platform,host]of Object.entries(platforms)){
      const link=[...document.querySelectorAll('.footer-social a')].find(anchor=>{try{const url=new URL(anchor.href);return url.protocol==='https:'&&host.test(url.hostname);}catch{return false;}});
      if(link)dialog.querySelector('[data-follow-social="'+platform+'"]').href=link.href;
    }
  }
  function open(){
    const phase=dialog.querySelector('[data-coffee-actions]')?'coffee':followPhase(trip),text=copy[phase];
    if(!text||shownThisVisit||blocked())return;
    if(seenInSession()||!invitationEligible({now:Date.now(),record:readInvitation(),seenInSession:seenInvitation()})){clearInterval(timer);return;}
    if(phase!=='coffee'&&!followEligible(trip,{record:readRecord()}))return;
    // The permanent card already supplies this invitation when it is in view.
    const card=document.querySelector('[data-home-support]');
    if(phase==='coffee'&&card){const box=card.getBoundingClientRect();if(box.top<innerHeight&&box.bottom>0){shownThisVisit=true;rememberSession();clearInterval(timer);return;}}
    renderCopy(phase);syncSocialLinks();returnFocus=document.activeElement;
    // This invitation never makes the page inert or moves the visitor's focus.
    dialog.hidden=false;shownThisVisit=true;remember();
    document.querySelector('[data-follow-notice]').textContent=phase==='coffee'?'An optional coffee invitation is available near the bottom of the page.':'An invitation to follow the journey is available near the bottom of the page.';
  }
  const interacted=()=>{lastInteraction=performance.now();};
  addEventListener('scroll',interacted,{passive:true});
  for(const name of ['pointerdown','keydown','touchstart'])document.addEventListener(name,interacted,{passive:true});
  function tick(){
    const now=performance.now(),elapsed=Math.min(1500,Math.max(0,now-lastTick));lastTick=now;
    const interrupted=blocked();
    // Privacy decisions, forms and players are not time spent reading the homepage.
    if(!interrupted)visibleMs+=elapsed;
    if(opened()){if(interrupted)close(false);return;}
    if(followEngaged({visibleMs,idleMs:now-lastInteraction}))open();
  }
  document.addEventListener('visibilitychange',()=>{lastTick=performance.now();if(document.hidden)close(false);});
  document.addEventListener('site:privacy-choice-resolved',()=>{lastTick=performance.now();lastInteraction=lastTick;});
  document.addEventListener('site:privacy-choice-pending',()=>close(false));
  document.addEventListener('website:updated',()=>{if(opened())renderCopy(dialog.dataset.phase);});
  document.addEventListener('site:route-view',()=>{if(opened())close(false);});
  const observer=new MutationObserver(()=>{if(opened()&&blocked())close(false);});
  observer.observe(root,{attributes:true,attributeFilter:['data-privacy-choice','data-dialog-open']});
  dialog.querySelectorAll('[data-follow-dismiss]').forEach(button=>button.addEventListener('click',()=>{remember();close();}));
  dialog.querySelector('[data-follow-already]')?.addEventListener('click',()=>{remember(true);close();});
  dialog.querySelector('[data-invitation-quiet]')?.addEventListener('click',()=>{remember(true);close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&opened()&&!root.hasAttribute('data-dialog-open')&&root.dataset.privacyChoice==='resolved'){if(dialog.contains(document.activeElement))event.preventDefault();remember();close();}});
  dialog.querySelectorAll('[data-follow-social]').forEach(link=>link.addEventListener('click',()=>{remember();close();}));
  dialog.querySelectorAll('[data-follow-signup]').forEach(button=>button.addEventListener('click',()=>{
    remember();close(false);
    const details=document.querySelector('#follow-trip .postcards-dropdown'),summary=details?.querySelector('summary');
    if(details)details.open=true;
    location.hash='follow-trip';
    requestAnimationFrame(()=>{summary?.focus({preventScroll:true});document.getElementById('follow-trip')?.scrollIntoView({block:'start',behavior:'instant'});});
  }));
  dialog.querySelector('[data-coffee-donate]')?.addEventListener('click',()=>{remember();close();});
  addEventListener('storage',event=>{if([storageKey(),invitationKey,invitationSession].includes(event.key)&&opened())close(false);});
  addEventListener('pagehide',event=>{
    close(false);
    if(!event.persisted){clearInterval(timer);observer.disconnect();}
  });
  addEventListener('pageshow',()=>{lastTick=performance.now();lastInteraction=lastTick;});
  const timer=setInterval(tick,1000);
  window.publicTripReady?.then(value=>{trip=value;}).catch(()=>{});
}
