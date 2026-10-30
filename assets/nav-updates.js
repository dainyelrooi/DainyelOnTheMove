import {sharedPlaceLabel} from './journey-core.js';

const STILL_KEY='dotm.navigationUpdates.still.v1';
const PERIOD=6500,FADE=140;

export function safeHeaderLink(value){
  if(typeof value!=='string'||!value||value.length>1200||/[\u0000-\u0020\\]/.test(value)||value.startsWith('//'))return null;
  if(/^#[A-Za-z0-9_-]+$/.test(value))return value;
  if(/^\/(?!\/)[A-Za-z0-9_/#?=&.%+-]*$/.test(value)&&!value.includes('..')&&!/^\/(admin|studio)(?:[/.?#]|$)/i.test(value))return value;
  try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password)return url.href;}catch{}
  return null;
}

export function initNavUpdates(root,{loadLocation=()=>import('../js/location-live.js')}={}){
  if(!root||root.dataset.navReady)return null;
  const trigger=root.querySelector('[data-nav-updates-trigger]'),current=root.querySelector('[data-nav-current]'),locationItem=root.querySelector('[data-nav-location]'),locationLabel=root.querySelector('[data-nav-location-label]'),stillControl=root.querySelector('[data-nav-still]');
  if(!trigger||!current||!locationItem||!locationLabel||!stillControl)return null;
  root.dataset.navReady='true';
  const lifetime=new AbortController(),signal=lifetime.signal,media=window.matchMedia('(prefers-reduced-motion: reduce)');
  let stopped=false,away=false,hovered=false,focused=root.contains(document.activeElement),rotationTimer,fadeTimer,index=0,items=[],tripPromise;
  let authoritative=window.siteSharedCheckin?.known===true;
  let locationValue=authoritative?window.siteSharedCheckin.value:null;
  let still=false;
  try{still=window.localStorage.getItem(STILL_KEY)==='1';}catch{}
  const listen=(target,event,handler,options={})=>target.addEventListener(event,handler,{...options,signal});
  function stopTimers(){clearTimeout(rotationTimer);clearTimeout(fadeTimer);rotationTimer=fadeTimer=null;root.classList.remove('is-changing');}
  function canRotate(){return !stopped&&!away&&!document.hidden&&!root.open&&!hovered&&!focused&&!still&&!media.matches&&items.length>1;}
  function schedule(){stopTimers();if(canRotate())rotationTimer=setTimeout(advance,PERIOD);}
  function advance(){
    rotationTimer=null;if(!canRotate())return;
    root.classList.add('is-changing');
    fadeTimer=setTimeout(()=>{
      fadeTimer=null;if(!canRotate()){root.classList.remove('is-changing');return;}
      index=(index+1)%items.length;current.textContent=items[index].label;root.classList.remove('is-changing');schedule();
    },FADE);
  }
  function preference(){stillControl.checked=still||media.matches;stillControl.disabled=media.matches;schedule();}
  function rebuild(preferLocation=false){
    if(stopped)return;
    const previous=items[index]?.key,next=[];
    const place=sharedPlaceLabel(locationValue);
    const shared=place&&!/[\u0000-\u001f\u007f]/.test(place)?place:'';
    locationItem.hidden=!shared;locationLabel.textContent=shared;
    if(shared)next.push({key:'location',label:'Shared · '+shared});
    for(const anchor of root.querySelectorAll('[data-header-announcement]')){
      const raw=anchor.textContent,label=raw.trim().replace(/\s+/g,' '),href=safeHeaderLink(anchor.getAttribute('href'));
      const valid=!anchor.hidden&&label.length>0&&label.length<=60&&!/[\u0000-\u001f\u007f]/.test(raw)&&!!href;
      const item=anchor.closest('li');if(item)item.hidden=!valid;
      if(!href)anchor.removeAttribute('href');
      if(valid)next.push({key:'announcement:'+anchor.dataset.headerAnnouncement,label});
    }
    items=next;
    const preserved=preferLocation&&shared?0:items.findIndex(item=>item.key===previous);
    index=preserved<0?0:preserved;current.textContent=items[index]?.label||'Travel updates';schedule();
  }
  function checkin(event){authoritative=true;locationValue=event.detail;rebuild(true);}
  function connectTrip(){
    const ready=window.publicTripReady;if(!ready||typeof ready.then!=='function'||ready===tripPromise)return;tripPromise=ready;
    ready.then(trip=>{
      if(stopped)return;
      // A delayed static trip must not resurrect a withdrawn live check-in.
      if(window.siteSharedCheckin?.known===true){authoritative=true;locationValue=window.siteSharedCheckin.value;}
      else if(!authoritative)locationValue=trip?.currentLocation||null;
      rebuild(true);
    }).catch(()=>{});
  }
  listen(root,'pointerenter',event=>{if(event.pointerType==='touch')return;hovered=true;schedule();});
  listen(root,'pointerleave',()=>{hovered=false;schedule();});
  listen(root,'focusin',()=>{focused=true;schedule();});
  listen(root,'focusout',event=>{focused=!!event.relatedTarget&&root.contains(event.relatedTarget);schedule();});
  listen(root,'toggle',schedule);
  listen(stillControl,'change',()=>{still=stillControl.checked;try{window.localStorage.setItem(STILL_KEY,still?'1':'0');}catch{}preference();});
  listen(document,'site:check-in',checkin);
  listen(document,'website:updated',()=>rebuild());
  listen(document,'visibilitychange',schedule);
  listen(document,'click',event=>{if(root.open&&!root.contains(event.target)){root.open=false;schedule();}});
  listen(document,'keydown',event=>{
    if(event.key!=='Escape'||!root.open)return;
    root.open=false;event.preventDefault();event.stopPropagation();trigger.focus();schedule();
  },{capture:true});
  listen(window,'storage',event=>{if(event.key===STILL_KEY||event.key===null){still=event.newValue==='1';preference();}});
  listen(window,'pagehide',()=>{away=true;stopTimers();});
  listen(window,'pageshow',()=>{away=false;schedule();});
  const motionChange=()=>preference();
  if(media.addEventListener)listen(media,'change',motionChange);else media.addListener(motionChange);
  root.querySelector('[data-nav-rotation-control]')?.removeAttribute('hidden');
  connectTrip();if(document.readyState!=='complete')listen(document,'DOMContentLoaded',connectTrip,{once:true});
  rebuild(true);preference();
  const firstPaint=document.hidden?Promise.resolve():new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  firstPaint.then(()=>{if(!stopped)loadLocation().catch(()=>{});});
  return{destroy(){if(stopped)return;stopped=true;stopTimers();lifetime.abort();if(!media.addEventListener)media.removeListener(motionChange);delete root.dataset.navReady;}};
}

const navUpdates=document.querySelector('[data-nav-updates]');
if(navUpdates)initNavUpdates(navUpdates);
