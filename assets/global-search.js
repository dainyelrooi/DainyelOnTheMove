import {searchEntries} from './search-engine.js?v=clarity1';
const allowed=value=>/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)?)?(?:#[a-zA-Z0-9_-]+)?$/.test(value);
export function initSearch(){
  const dialog=document.getElementById('site-search-dialog');if(!dialog)return;
  const input=dialog.querySelector('input'),results=dialog.querySelector('#global-search-results'),count=dialog.querySelector('[role=status]');
  let entries=[],loaded=false,loading,returnFocus,oldHash='',stop;
  function render(){
    const found=searchEntries(entries,input.value);results.replaceChildren();
    count.textContent=loaded?(input.value.trim()?`${found.length}${found.length===30?'+':''} matching results`:'Explore the website, or type a place or topic.'):'Loading the public collection…';
    if(loaded&&!found.length){const p=document.createElement('p');p.textContent='No close match yet. Try a country, activity or a shorter phrase.';results.append(p);}
    for(const item of found){const article=document.createElement('article'),label=document.createElement('small'),h=document.createElement('h3'),link=document.createElement('a'),p=document.createElement('p');article.className='search-result';label.textContent=item.type;link.href=item.url;link.textContent=item.title;p.textContent=item.text;h.append(link);article.append(label,h,p);results.append(article);}
  }
  async function load(){
    if(loading)return loading;
    loading=fetch('/data/site-search.json',{cache:'no-cache'}).then(response=>{if(!response.ok)throw Error();return response.json();}).then(items=>{entries=items.filter(item=>allowed(item.url)&&typeof item.title==='string'&&typeof item.text==='string');loaded=true;render();}).catch(()=>{count.textContent='Search could not connect. You can still browse Stories, Films and the Atlas from the navigation.';loading=null;});
    return loading;
  }
  async function live(){
    try{
      const [{db},sdk,{space}]=await Promise.all([import('../js/firebase.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js'),import('./publishing-model.js')]);
      if(!dialog.open)return;
      // Search must reflect a withdrawal while open; use the existing bounded public summaries listener.
      stop=sdk.onSnapshot(sdk.query(sdk.collection(db,'cmsSpaces',space,'summaries'),sdk.orderBy('publishedAt','desc'),sdk.limit(100)),snapshot=>{
        entries=entries.filter(entry=>!entry.cms);
        for(const row of snapshot.docs){if(!/^entry-[a-f0-9]{32}$/.test(row.id))continue;const d=row.data();entries.push({cms:true,title:d.title,type:d.kind==='blog'?'Travel Story':'Field Note',text:d.excerpt,url:'/entry/'+row.id});}render();
      },()=>{});
    }catch{/* The complete static collection remains searchable. */}
  }
  async function open(trigger,update=true){
    if(dialog.open)return;returnFocus=trigger||document.activeElement;oldHash=location.hash==='#search'?'':location.hash;
    if(update)history.pushState(null,'','#search');dialog.showModal();input.focus();render();await load();if(dialog.open)live();
  }
  function close(){if(!dialog.open)return;dialog.close();}
  document.querySelectorAll('[data-open-search]').forEach(link=>link.addEventListener('click',event=>{if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();open(link);}));
  dialog.querySelector('[data-close-search]').addEventListener('click',close);
  dialog.addEventListener('click',event=>{if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)close();}});
  dialog.addEventListener('close',()=>{stop?.();stop=null;if(location.hash==='#search')history.replaceState(null,'',location.pathname+location.search+oldHash);returnFocus?.focus({preventScroll:true});});
  window.addEventListener('popstate',()=>{if(location.hash!=='#search')close();else open(null,false);});
  input.addEventListener('input',render);dialog.querySelector('form').addEventListener('submit',event=>{event.preventDefault();render();});
  if(location.hash==='#search')open(null,false);
}
