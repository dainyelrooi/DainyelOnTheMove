import {siteSpace,sectionId,photoId,safeSiteImage,safeSiteLink,siteText} from './website-model.js?v=website1';
const page=document.body.dataset.sitePage,originals=new Map(),pictureSources=new Map(),originalTitle=document.title;
const titleMetas=[...document.querySelectorAll('meta[property="og:title"],meta[name="twitter:title"]')].map(node=>({node,value:node.content}));
// Paint the usable static document before starting protected live enhancements.
// Two animation frames offer a paint opportunity without a timed loading delay.
const firstPaint=new Promise(resolve=>document.hidden?resolve():requestAnimationFrame(()=>requestAnimationFrame(resolve)));
for(const node of document.querySelectorAll('[data-site-field]')){
  originals.set(node,{children:[...node.childNodes].map(c=>c.cloneNode(true)),text:node.textContent,src:node.getAttribute('src'),srcset:node.getAttribute('srcset'),alt:node.getAttribute('alt'),href:node.getAttribute('href'),position:node.style.objectPosition});
  if(node.tagName==='IMG')for(const source of node.closest('picture')?.querySelectorAll('source')||[])if(!pictureSources.has(source))pictureSources.set(source,source.getAttribute('srcset'));
}
function restore(node){const old=originals.get(node);node.replaceChildren(...old.children.map(c=>c.cloneNode(true)));for(const key of ['src','srcset','alt','href'])if(old[key]===null)node.removeAttribute(key);else node.setAttribute(key,old[key]);node.style.objectPosition=old.position;if(node.tagName==='IMG'){node.closest('.photo-open')?.setAttribute('aria-label','Enlarge photo: '+node.alt);for(const source of node.closest('picture')?.querySelectorAll('source')||[]){const original=pictureSources.get(source);if(original===null)source.removeAttribute('srcset');else source.setAttribute('srcset',original);}}}
function reading(){
  const heading=[...originals.keys()].find(node=>node.tagName==='H1');if(heading){const changed=heading.textContent!==originals.get(heading).text,title=heading.innerText.replace(/\s+/g,' ').trim();document.title=changed?title+' | DainyelOnTheMove':originalTitle;for(const meta of titleMetas)meta.node.content=changed?title:meta.value;}
  const body=document.querySelector('[data-reading-body]');if(!body)return;
  const minutes=Math.max(1,Math.ceil((body.textContent.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu)||[]).length/200));
  for(const item of document.querySelectorAll('.story-meta span,.story-meta p'))if(/Approx\. \d+ min read/.test(item.textContent))item.textContent='Approx. '+minutes+' min read';
  for(const link of document.querySelectorAll('[data-reading-toc] a[href^="#"]')){const target=document.getElementById(link.hash.slice(1));const title=target?.matches('h2,h3,h4')?target:target?.querySelector('h2,h3,h4');if(title)link.textContent=title.textContent;}
}
function apply(id,values={},media={}){
  if(!sectionId(id)||!values||typeof values!=='object'||Object.keys(values).length>24)return;
  for(const [node] of originals){if(!node.dataset.siteField.startsWith(id+'/'))continue;restore(node);const key=node.dataset.siteField.split('/')[1],value=values[key];if(typeof value!=='string'||value.length>8000)continue;
    if(node.tagName==='IMG'){
      try{const image=JSON.parse(value),asset=safeSiteImage(image.src),photo=media[image.src];const src=asset||(photoId(image.src)&&photo?.sectionId===id&&/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(photo.dataUrl)&&photo.dataUrl.length<=192000?photo.dataUrl:null);
        if(!src||typeof image.alt!=='string'||image.alt.length>180||!['top','center','bottom'].includes(image.position))continue;
        node.src=src;node.removeAttribute('srcset');node.alt=image.alt;node.style.objectPosition=image.position;node.closest('.photo-open')?.setAttribute('aria-label','Enlarge photo: '+image.alt);for(const source of node.closest('picture')?.querySelectorAll('source')||[])source.removeAttribute('srcset');
      }catch{}
    }else if(node.tagName==='A'){
      try{const link=JSON.parse(value),href=safeSiteLink(link.href);if(!href||typeof link.text!=='string'||link.text.length>180)continue;node.textContent=link.text;node.href=href;}catch{}
    }else siteText(node,value);
  }
  reading();document.dispatchEvent(new Event('website:updated'));window.dispatchEvent(new Event('site:article-rendered'));
}
const preview=new URLSearchParams(location.search).get('website-preview')==='1'&&parent!==window;
let previewPayload;
if(preview){
  // Public signup/contact forms and nested provider frames must never submit
  // from a private preview, including forms initialized after this module.
  const freezeForms=()=>{for(const form of document.querySelectorAll('form'))form.inert=true;for(const frame of document.querySelectorAll('main iframe,#site-panels iframe,.site-panel iframe')){frame.inert=true;frame.tabIndex=-1;frame.style.pointerEvents='none';frame.removeAttribute('src');frame.removeAttribute('data-postcards-src');}};
  freezeForms();new MutationObserver(freezeForms).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest('a')||e.target.closest('form')){e.preventDefault();e.stopImmediatePropagation();}},true);
  document.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();},true);
  window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='website:preview')return;previewPayload=e.data;apply(e.data.id,e.data.values,e.data.media);const first=[...originals.keys()].find(n=>n.dataset.siteField.startsWith(e.data.id+'/'));first?.scrollIntoView({block:'center',behavior:'instant'});});
  parent.postMessage({type:'website:preview-ready'},location.origin);
}
if(page){
  // Realtime is required: corrections and Restore original update already-open pages.
  firstPaint.then(()=>Promise.all([import('../js/firebase.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')])).then(([firebase,sdk])=>{
    let previous=new Set(),run=0;const {collection,query,where,limit,onSnapshot,doc,getDoc}=sdk;
    onSnapshot(query(collection(firebase.db,'websiteSpaces',siteSpace,'published'),where('pageId','in',[page,'shared']),limit(100)),async snapshot=>{
      const version=++run,seen=new Set();for(const row of snapshot.docs){const data=row.data();if(!sectionId(row.id))continue;seen.add(row.id);apply(row.id,data.values);const media={};await Promise.all((data.photoIds||[]).filter(photoId).slice(0,12).map(async id=>{try{const photo=await getDoc(doc(firebase.db,'websiteSpaces',siteSpace,'media',id));if(photo.exists())media[id]=photo.data();}catch{}}));if(run!==version)return;if(Object.keys(media).length)apply(row.id,data.values,media);}
      for(const id of previous)if(!seen.has(id))apply(id);previous=seen;if(previewPayload)apply(previewPayload.id,previewPayload.values,previewPayload.media);
    },()=>{/* The original static page is always a usable fallback. */});
  }).catch(()=>{});
}
