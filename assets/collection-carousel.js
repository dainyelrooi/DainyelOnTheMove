// One scrollable collection; no clones, hidden copies or timed player changes.
const active=new WeakMap();
export function initCarousels(scope=document){
  for(const track of scope.querySelectorAll('[data-card-carousel]')){
    if(active.has(track))continue;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const controls=document.createElement('div');controls.className='collection-controls';controls.hidden=true;
    const previous=document.createElement('button'),next=document.createElement('button'),rotation=document.createElement('button'),count=document.createElement('span');
    previous.type=next.type=rotation.type='button';previous.textContent='←';next.textContent='→';
    previous.setAttribute('aria-label','Previous cards');next.setAttribute('aria-label','Next cards');count.className='collection-count';
    controls.append(previous,count,next,rotation);track.after(controls);
    track.setAttribute('aria-label',track.dataset.cardCarousel||'Browse the collection');
    let timer,visible=false,userPaused=reduced.matches,hover=false,focused=false,position=0;
    const cards=()=>[...track.children].filter(card=>!card.hidden&&!card.classList.contains('video-filtered-out'));
    const step=()=>{const first=cards()[0];return first?first.getBoundingClientRect().width+(parseFloat(getComputedStyle(track).columnGap)||0):1;};
    const overflow=()=>track.scrollWidth>track.clientWidth+8;
    function paint(){
      const items=cards(),unit=step(),per=Math.max(1,Math.round((track.clientWidth+24)/unit));
      position=Math.max(0,Math.min(items.length-1,Math.round(track.scrollLeft/unit)));
      controls.hidden=!overflow();previous.disabled=track.scrollLeft<4;next.disabled=track.scrollLeft>=track.scrollWidth-track.clientWidth-4;
      count.textContent=items.length?`${position+1}–${Math.min(items.length,position+per)} of ${items.length}`:'No entries';
      rotation.textContent=userPaused?'Play slideshow':'Pause slideshow';rotation.setAttribute('aria-pressed',String(!userPaused));
    }
    function plan(){
      clearTimeout(timer);paint();
      if(userPaused||reduced.matches||!visible||hover||focused||document.hidden||!overflow()||document.querySelector('dialog[open],.site-panel.is-open:not(#film-library)'))return;
      timer=setTimeout(()=>{
        if([...document.querySelectorAll('video[controls]')].some(video=>!video.paused))return plan();
        const end=track.scrollLeft>=track.scrollWidth-track.clientWidth-8;
        track.scrollTo({left:end?0:track.scrollLeft+step(),behavior:'smooth'});plan();
      },5000);
    }
    function move(direction){userPaused=true;track.scrollBy({left:direction*step(),behavior:reduced.matches?'instant':'smooth'});plan();}
    previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
    rotation.addEventListener('click',()=>{userPaused=!userPaused;plan();});
    track.addEventListener('scroll',paint,{passive:true});
    track.addEventListener('pointerdown',()=>{userPaused=true;plan();});
    track.addEventListener('keydown',()=>{userPaused=true;plan();});
    const region=track.parentElement;
    region.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hover=true;plan();}});
    region.addEventListener('pointerleave',()=>{hover=false;plan();});
    region.addEventListener('focusin',()=>{focused=track.contains(document.activeElement);plan();});
    region.addEventListener('focusout',()=>queueMicrotask(()=>{focused=track.contains(document.activeElement);plan();}));
    function refresh(){track.scrollLeft=0;plan();}
    track.addEventListener('collection:changed',refresh);
    new MutationObserver(refresh).observe(track,{childList:true});
    new ResizeObserver(plan).observe(track);
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;plan();},{threshold:.2}).observe(track);
    document.addEventListener('visibilitychange',plan);window.addEventListener('pageshow',plan);window.addEventListener('pagehide',()=>clearTimeout(timer));reduced.addEventListener('change',()=>{if(reduced.matches)userPaused=true;plan();});
    active.set(track,{refresh});plan();
  }
}
