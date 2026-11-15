// Reuse the published Atlas album, including its approved page/photo edits.
// Nothing is fetched until the reader opens the notebook. No database access.
import {element} from './publishing-model.js';
const sectionIds=new Set(['peru-lima','peru-cusco','peru-inca-trail','peru-machu-picchu']);
const imagePath=/^\/assets\/(?:optimized\/peru\/[a-z0-9-]+|public-content\/[a-f0-9]{64})\.webp$/;
let current;
async function readAlbum(){
  if(current&&Date.now()-current.time<300000)return current.promise;
  const promise=(async()=>{
    const response=await fetch('/atlas',{credentials:'omit',redirect:'error',cache:'no-cache',signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error('Album unavailable');
    const text=await response.text();if(text.length>1024*1024)throw Error('Album too large');
    const fragment=text.match(/<details\b[^>]*\bid="peru-photos"[^>]*>[\s\S]*?<\/details>/i)?.[0];
    if(!fragment||/<(?:script|iframe|object|embed|link|style|audio|video|source)\b/i.test(fragment))throw Error('Album unavailable');
    // Inert parsing must not request even an image before its path is checked.
    const inert=fragment.replace(/<img\b[^>]*>/gi,tag=>tag.replace(/\s(src|srcset)\s*=/gi,(_,name)=>' data-notebook-'+name.toLowerCase()+'='));
    const page=new DOMParser().parseFromString(inert,'text/html'),album=page.querySelector('#peru-photos');if(!album)throw Error('Album unavailable');
    const groups=new Map();
    for(const id of sectionIds){
      const section=album.querySelector('#'+id),title=section?.querySelector('h3')?.textContent.trim();if(!title||title.length>180)throw Error('Incomplete album');
      const figures=[...section.querySelectorAll('.story-gallery figure')];if(!figures.length||figures.length>40)throw Error('Incomplete album');
      const photos=figures.map(figure=>{const image=figure.querySelector('img'),url=new URL(image?.getAttribute('data-notebook-src')||'',location.origin),caption=(figure.querySelector('figcaption')?.textContent||image?.alt||'').trim(),width=Number(image?.getAttribute('width')),height=Number(image?.getAttribute('height'));
        if(url.origin!==location.origin||url.search||url.hash||!imagePath.test(url.pathname)||!caption||caption.length>1000||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>8000||height>8000)throw Error('Incomplete photograph');
        return{src:url.pathname,alt:image.alt||caption,caption,width,height};});
      groups.set(id,{id,title,photos});
    }
    return groups;
  })();current={time:Date.now(),promise};promise.catch(()=>{if(current?.promise===promise)current=null;});return promise;
}
export function initStoryPhotoNotebooks(root,{signal,onGallery,onReady}){
  for(const notebook of root.querySelectorAll('[data-story-photo-notebook]')){
    const selected=notebook.dataset.storyPhotoNotebook.split(' ');if(!selected.length||selected.some(id=>!sectionIds.has(id)))continue;
    const content=notebook.querySelector('.notebook-content'),status=content.querySelector('[role=status]'),fallback=content.querySelector('.notebook-fallback'),prefix=notebook.dataset.notebookPrefix;let pending=false,loaded=false;fallback.hidden=true;
    async function load(){
      if(loaded||pending||signal.aborted)return;pending=true;content.setAttribute('aria-busy','true');status.textContent='Loading the photographs…';
      try{
        const groups=await readAlbum();if(signal.aborted||!notebook.isConnected)return;
        const sections=selected.map(id=>{const group=groups.get(id),section=element('section',undefined,'notebook-group'),heading=element('h3',group.title),gallery=element('div',undefined,'story-gallery cms-gallery');
          heading.id=prefix+'-'+id+'-title';section.setAttribute('aria-labelledby',heading.id);gallery.id=prefix+'-'+id;gallery.setAttribute('aria-label',group.title+' — photographs');
          for(const photo of group.photos){const figure=element('figure'),image=element('img');image.dataset.albumSrc=photo.src;image.alt=photo.alt;image.width=photo.width;image.height=photo.height;image.loading='lazy';image.decoding='async';figure.append(image,element('figcaption',photo.caption));gallery.append(figure);}
          section.append(heading,gallery);return section;});
        status.textContent='Browse with the arrows, or tap a photograph to enlarge it.';content.append(...sections);for(const section of sections)onGallery(section.querySelector('.cms-gallery'));
        notebook.querySelector('.notebook-meta').textContent=selected.reduce((total,id)=>total+groups.get(id).photos.length,0)+' photographs · Browse the album';loaded=true;onReady();
      }catch{
        if(signal.aborted||!notebook.isConnected)return;status.textContent='The album could not load. You can try again.';
        fallback.hidden=false;const retry=element('button','Load photographs again','secondary-button');retry.type='button';content.append(retry);retry.addEventListener('click',()=>{retry.remove();fallback.hidden=true;load();},{once:true,signal});
      }finally{pending=false;content.removeAttribute('aria-busy');}
    }
    notebook.addEventListener('toggle',()=>{if(notebook.open)load();},{signal});
    if(location.hash.startsWith('#photos-'+prefix+'-')){notebook.open=true;load();}
  }
}
