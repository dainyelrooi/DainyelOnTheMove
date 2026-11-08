import {searchEntries} from './search-engine.js?v=clarity1';
import {readPublishedCatalog,catalogFresh,catalogEntry} from './published-catalog.js';
const allowed=value=>/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)?)?(?:#[a-zA-Z0-9_-]+)?$/.test(value);
export function initSearch(){
  const dialog=document.getElementById('site-search-dialog');if(!dialog)return;
  const input=dialog.querySelector('input'),results=dialog.querySelector('#global-search-results'),count=dialog.querySelector('[role=status]');
  let entries=[],loaded=false,loading,returnFocus,oldHash='',stop,stopWebsite,run=0,cmsAuthoritative=false,catalogTimer,staticUnavailable=false;
  const searchRow=row=>({cms:true,title:row.title,type:row.kind==='blog'?'Travel Story':'Field Note',text:row.excerpt,url:'/entry/'+row.id,publishedTime:Date.parse(row.publishedAt)});
  function render(){
    entries=entries.filter(entry=>!entry.catalogSavedAt||catalogFresh({generatedAt:entry.catalogSavedAt}));
    const found=searchEntries(entries,input.value);results.replaceChildren();
    count.textContent=loaded?(input.value.trim()?`${found.length}${found.length===30?'+':''} matching results`:'Explore the website, or type a place or topic.'):'Loading the public collection…';
    if(loaded&&staticUnavailable)count.textContent+=' Some pages are temporarily unavailable.';
    if(loaded&&!found.length){const p=document.createElement('p');p.textContent='No close match yet. Try a country, activity or a shorter phrase.';results.append(p);}
    for(const item of found){const article=document.createElement('article'),label=document.createElement('small'),h=document.createElement('h3'),link=document.createElement('a'),p=document.createElement('p');article.className='search-result';label.textContent=item.type;link.href=item.url;link.textContent=item.title;p.textContent=item.text;h.append(link);article.append(label,h,p);results.append(article);}
  }
  async function load(){
    if(loading)return loading;
    const pages=fetch('/data/site-search.json',{cache:'no-cache'}).then(response=>{if(!response.ok)throw Error();return response.json();}).then(items=>{
      entries=[...items.filter(item=>allowed(item.url)&&typeof item.title==='string'&&typeof item.text==='string'),...entries.filter(item=>item.cms)];loaded=true;render();
    }).catch(()=>{staticUnavailable=true;if(loaded)render();});
    loading=Promise.allSettled([pages,readPublishedCatalog().then(value=>{
        if(!value||cmsAuthoritative)return;entries=entries.filter(entry=>!entry.cms);entries.push(...value.entries.map(row=>({...searchRow(row),catalogSavedAt:value.generatedAt})));loaded=true;render();
        clearTimeout(catalogTimer);catalogTimer=setTimeout(()=>{if(dialog.open)render();},Math.max(0,Date.parse(value.generatedAt)+86400000-Date.now()));
      }),(async()=>{const response=await fetch('/data/postcards/index.json',{cache:'no-cache'});if(!response.ok)return;const archive=await response.json();
        for(const item of archive.editions||[])if(/^brevo-[1-9][0-9]{0,12}$/.test(item.id)&&!entries.some(entry=>entry.title.toLowerCase()===item.title.toLowerCase()))entries.push({title:item.title,type:'Postcard',text:item.excerpt,url:'/postcards#edition-'+item.id});
        render();
      })()]).then(()=>{if(!loaded){count.textContent='Search could not connect. You can still browse Stories, Films and the Atlas from the navigation.';loading=null;}});
    return loading;
  }
  async function live(currentRun){
    try{
      const [{db},sdk,{space}]=await Promise.all([import('../js/firebase.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js'),import('./publishing-model.js')]);
      if(!dialog.open||currentRun!==run)return;
      // Search must reflect a withdrawal while open; use the existing bounded public summaries listener.
      stop=sdk.onSnapshot(sdk.query(sdk.collection(db,'cmsSpaces',space,'summaries'),sdk.orderBy('publishedAt','desc'),sdk.limit(100)),{includeMetadataChanges:true},snapshot=>{
        if(currentRun!==run||!dialog.open||snapshot.metadata?.fromCache===true||snapshot.metadata?.hasPendingWrites===true)return;
        cmsAuthoritative=true;loaded=true;clearTimeout(catalogTimer);
        entries=entries.filter(entry=>!entry.cms);
        for(const row of snapshot.docs){const data=catalogEntry({...row.data(),id:row.id});if(data)entries.push(searchRow(data));}render();
      },()=>{});
      stopWebsite=sdk.onSnapshot(sdk.query(sdk.collection(db,'websiteSpaces',space,'search'),sdk.limit(100)),snapshot=>{
        if(currentRun!==run||!dialog.open)return;
        for(const item of entries)if(item.websiteOriginal!==undefined){item.keywords=item.websiteOriginal;delete item.websiteOriginal;}
        const groups=new Map();for(const row of snapshot.docs){const d=row.data();if(d.pageId==='shared'||typeof d.text!=='string'||d.text.length>12000)continue;const url=d.pageId==='index'?'/':'/'+d.pageId;if(!allowed(url))continue;groups.set(url,(groups.get(url)||'')+' '+d.text);}
        for(const item of entries)if(groups.has(item.url)){item.websiteOriginal=item.keywords||'';item.keywords=item.websiteOriginal+' '+groups.get(item.url);}render();
      },()=>{});
    }catch{/* The complete static collection remains searchable. */}
  }
  async function open(trigger,update=true){
    if(dialog.open)return;returnFocus=trigger||document.activeElement;oldHash=location.hash==='#search'?'':location.hash;
    const currentRun=++run;
    if(update)history.pushState(null,'','#search');dialog.showModal();input.focus();render();const initial=load();live(currentRun);await initial;
  }
  function close(){if(!dialog.open)return;dialog.close();}
  document.querySelectorAll('[data-open-search]').forEach(link=>link.addEventListener('click',event=>{if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();open(link);}));
  dialog.querySelector('[data-close-search]').addEventListener('click',close);
  // Search inputs may consume Escape to clear their value. Close the modal
  // first so keyboard users have the same exit as in the other viewers.
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}},true);
  dialog.addEventListener('click',event=>{if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)close();}});
  dialog.addEventListener('close',()=>{++run;stop?.();stop=null;stopWebsite?.();stopWebsite=null;if(location.hash==='#search')history.replaceState(null,'',location.pathname+location.search+oldHash);returnFocus?.focus({preventScroll:true});});
  document.addEventListener('visibilitychange',()=>{if(dialog.open)render();});
  window.addEventListener('popstate',()=>{if(location.hash!=='#search')close();else open(null,false);});
  input.addEventListener('input',render);dialog.querySelector('form').addEventListener('submit',event=>{event.preventDefault();render();});
  if(location.hash==='#search')open(null,false);
}
