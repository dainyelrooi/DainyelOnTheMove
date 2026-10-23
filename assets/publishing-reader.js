// The same reading and photo conventions as the hand-authored journals,
// scoped to a replaceable entry so live corrections do not leak listeners.
import {element} from './publishing-model.js';

export function initPublishingReader(root,{preview=false}={}){
  const controller=new AbortController(),options={signal:controller.signal},toc=root.querySelector('[data-cms-toc]');
  const links=[...toc.querySelectorAll('a')],chapters=links.map(a=>root.querySelector('#'+CSS.escape(a.hash.slice(1)))),small=matchMedia('(max-width:900px)');
  const scrollHost=preview?root.closest('dialog'):window;
  const toggle=element('button','In this story · show chapters','toc-toggle');toggle.type='button';toggle.setAttribute('aria-expanded','false');toc.id=root.querySelector('h1').id+'-toc';toggle.setAttribute('aria-controls',toc.id);toc.before(toggle);
  const isSmall=()=>small.matches||root.classList.contains('cms-preview-phone');
  const collapse=()=>toc.dataset.collapsed=String(isSmall()&&toggle.getAttribute('aria-expanded')==='false');
  toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'In this story · hide chapters':'In this story · show chapters';collapse();},options);small.addEventListener('change',collapse,options);collapse();
  const tools=element('div',undefined,'story-mode-tools'),mode=element('button','Cinematic story mode'),chapterStatus=element('span',undefined,'story-mode-progress');mode.type='button';tools.append(mode,chapterStatus);root.querySelector('.masthead-copy').append(tools);
  const applyMode=()=>{const active=preview?root.classList.contains('cinematic-story'):new URL(location.href).searchParams.get('view')==='cinematic';root.classList.toggle('cinematic-story',active);mode.setAttribute('aria-pressed',String(active));mode.textContent=active?'Return to normal reading':'Cinematic story mode';};
  mode.addEventListener('click',()=>{if(preview)root.classList.toggle('cinematic-story');else{const url=new URL(location.href);if(url.searchParams.get('view')==='cinematic')url.searchParams.delete('view');else url.searchParams.set('view','cinematic');history.pushState(null,'',url);}applyMode();},options);window.addEventListener('popstate',applyMode,options);applyMode();
  const body=root.querySelector('[data-reading-body]'),bar=preview?scrollHost.querySelector('[data-cms-progress]'):null;
  let frame=0;
  function update(){
    frame=0;const top=preview?scrollHost.getBoundingClientRect().top+90:180;let current=0;
    chapters.forEach((chapter,index)=>{if(chapter.getBoundingClientRect().top<=top)current=index;});
    links.forEach((link,index)=>{if(index===current)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});chapterStatus.textContent='Chapter '+(current+1)+' of '+chapters.length+' · '+(links[current]?.textContent||'');
    if(bar){const bounds=body.getBoundingClientRect(),host=scrollHost.getBoundingClientRect(),fraction=Math.max(0,Math.min(1,(host.top+90-bounds.top)/Math.max(1,bounds.height-scrollHost.clientHeight+140)));bar.style.transform='scaleX('+fraction+')';}
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  scrollHost.addEventListener('scroll',schedule,{...options,passive:true});window.addEventListener('resize',schedule,options);
  root.querySelectorAll('.reading-rail a').forEach(link=>link.addEventListener('click',event=>{const target=root.querySelector('#'+CSS.escape(link.hash.slice(1)));if(!target)return;if(preview){event.preventDefault();target.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}requestAnimationFrame(()=>{const heading=target.querySelector('h2')||target;heading.tabIndex=-1;heading.focus({preventScroll:true});});if(isSmall()){toggle.setAttribute('aria-expanded','false');collapse();}},options));
  root.addEventListener('cms:preview-size',()=>{collapse();schedule();},options);
  const resize=new ResizeObserver(schedule);resize.observe(body);update();

  let dialog,active,position=0,previousFocus,previousOverflow;
  const galleries=new Map();
  function close(){if(!dialog?.open)return;dialog.close();if(!preview)document.body.style.overflow=previousOverflow||'';active=null;if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
  function show(){const gallery=galleries.get(active);if(!gallery)return;const photo=gallery.photos[position];gallery.select(position);dialog.querySelector('img').src=photo.image.src;dialog.querySelector('img').alt=photo.image.alt;dialog.querySelector('figcaption').textContent=photo.caption+' · '+(position+1)+' / '+gallery.photos.length;dialog.querySelector('[data-photo-controls]').hidden=gallery.photos.length<2;}
  function route(){const match=location.hash.match(/^#(photos-[a-zA-Z0-9_-]+)-(\d+)$/);if(!match||!galleries.has(match[1])){close();return;}const index=Number(match[2])-1;if(index<0||index>=galleries.get(match[1]).photos.length){close();return;}open(match[1],index);}
  function move(delta){const gallery=galleries.get(active);position=(position+delta+gallery.photos.length)%gallery.photos.length;if(!preview)history.replaceState(history.state,'','#'+active+'-'+(position+1));show();}
  function open(id,index){
    active=id;position=index;
    if(!dialog){
      dialog=element('dialog',undefined,'photo-viewer cms-photo-viewer');dialog.setAttribute('aria-label','Travel photographs');
      const head=element('div',undefined,'photo-viewer-bar'),closeButton=element('button','×','photo-close');closeButton.type='button';closeButton.setAttribute('aria-label','Close photo gallery');head.append(element('h2','Through my lens'),closeButton);
      const figure=element('figure',undefined,'photo-viewer-figure'),image=element('img'),caption=element('figcaption');image.decoding='async';figure.append(image,caption);
      const controls=element('div',undefined,'photo-viewer-controls'),previous=element('button','← Previous'),next=element('button','Next →');previous.type=next.type='button';controls.dataset.photoControls='';controls.append(previous,element('span','Use ← and → to explore'),next);dialog.append(head,figure,controls);document.body.append(dialog);
      const leave=()=>{if(!preview&&history.state?.cmsPhotoEntry)history.back();else{if(!preview)history.replaceState(null,'',location.pathname+location.search);close();}};
      closeButton.addEventListener('click',leave,options);dialog.addEventListener('cancel',event=>{event.preventDefault();leave();},options);dialog.addEventListener('click',event=>{if(event.target===dialog)leave();},options);previous.addEventListener('click',()=>move(-1),options);next.addEventListener('click',()=>move(1),options);
      dialog.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();move(event.key==='Home'?-position:event.key==='End'?galleries.get(active).photos.length-1-position:event.key==='ArrowRight'?1:-1);},options);
      image.addEventListener('error',()=>{caption.textContent='This photograph could not load. Try another photo or close the viewer.';},options);
    }
    if(!dialog.open){previousFocus=document.activeElement;if(!preview){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}dialog.showModal();dialog.querySelector('.photo-close').focus();}show();
  }
  for(const container of root.querySelectorAll('.cms-gallery')){
    const figures=[...container.querySelectorAll('figure')],photos=figures.map(figure=>{const image=figure.querySelector('img'),button=element('button',undefined,'photo-open'),hint=element('span','⤢','photo-zoom');button.type='button';button.setAttribute('aria-label','Enlarge photo: '+image.alt);hint.setAttribute('aria-hidden','true');image.before(button);button.append(image,hint);return {image,button,caption:figure.querySelector('figcaption').textContent};}),id='photos-'+container.id;let current=0;
    function select(index){const focused=figures[current]?.contains(document.activeElement);current=(index+photos.length)%photos.length;figures.forEach((figure,n)=>figure.hidden=n!==current);const count=container.querySelector('.slideshow-counter');if(count)count.textContent=(current+1)+' / '+photos.length;if(focused)photos[current].button.focus({preventScroll:true});}
    galleries.set(id,{photos,select});container.classList.add('slideshow-ready');container.setAttribute('role','region');container.setAttribute('aria-roledescription','carousel');container.setAttribute('aria-label','Photographs from '+container.closest('section').querySelector('h2').textContent);
    if(photos.length>1){const controls=element('div',undefined,'slideshow-controls'),previous=element('button','←'),next=element('button','→'),count=element('span',undefined,'slideshow-counter');previous.type=next.type='button';previous.setAttribute('aria-label','Previous photo');next.setAttribute('aria-label','Next photo');count.setAttribute('aria-live','polite');controls.append(previous,count,next);container.append(controls);previous.addEventListener('click',()=>select(current-1),options);next.addEventListener('click',()=>select(current+1),options);}
    photos.forEach((photo,index)=>photo.button.addEventListener('click',()=>{if(preview)open(id,index);else{history.pushState({cmsPhotoEntry:true},'','#'+id+'-'+(index+1));route();}},options));
    container.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey)return;event.preventDefault();select(event.key==='Home'?0:event.key==='End'?photos.length-1:current+(event.key==='ArrowRight'?1:-1));},options);select(0);
  }
  if(!preview){window.addEventListener('hashchange',route,options);window.addEventListener('popstate',route,options);route();if(location.hash&&!location.hash.startsWith('#photos-'))root.querySelector('#'+CSS.escape(location.hash.slice(1)))?.scrollIntoView({block:'start'});window.dispatchEvent(new Event('site:article-rendered'));}
  return ()=>{controller.abort();resize.disconnect();cancelAnimationFrame(frame);close();dialog?.remove();};
}
