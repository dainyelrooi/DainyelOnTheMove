import {readPublishedCatalog,catalogFresh} from './published-catalog.js';
import {publishedFacts} from './fact-discovery-model.js';
import {factCard} from './fact-discovery-view.js';
const hub=document.querySelector('[data-facts-hub]'),preview=document.querySelector('[data-home-fact]');
if(hub||preview){
  const generatedAt=(hub||preview).dataset.factGeneratedAt;
  let copy=generatedAt?{generatedAt}:null,timer;const select=hub?.querySelector('[data-fact-filter]'),list=hub?.querySelector('[data-facts-list]'),status=hub?.querySelector('[data-facts-status]');
  let chosen=new URLSearchParams(location.search).get('country')||'';
  function render(){
    const facts=publishedFacts(copy.entries);
    if(hub){
      const options=new Map(facts.filter(e=>e.country).map(e=>[e.country,e.countryName]));select.replaceChildren(new Option('All places',''),...[...options].sort((a,b)=>a[1].localeCompare(b[1])).map(([code,name])=>new Option(name,code)));select.value=options.has(chosen)?chosen:'';
      const shown=publishedFacts(copy.entries,{country:select.value});list.replaceChildren(...shown.map(e=>factCard(e)));status.textContent=shown.length?shown.length+' '+(shown.length===1?'discovery':'discoveries')+(select.value?' from '+options.get(select.value):' from the road')+'.':'New discoveries will appear here when published.';hub.querySelector('[data-fact-filters]').hidden=facts.length===0;
    }
    if(preview){const target=preview.querySelector('[data-home-fact-card]');target.replaceChildren(...facts.slice(0,1).map(e=>factCard(e,{compact:true})));preview.hidden=!facts.length;}
  }
  function expire(){clearTimeout(timer);if(!copy)return;if(!catalogFresh(copy)){if(list)list.replaceChildren();if(status)status.textContent='The discoveries are temporarily unavailable. Please refresh to try again.';if(preview)preview.hidden=true;if(hub)hub.querySelector('[data-fact-filters]').hidden=true;return;}timer=setTimeout(expire,Date.parse(copy.generatedAt)+86400000-Date.now());}
  async function load(){const next=await readPublishedCatalog();if(!next){expire();return;}copy=next;render();expire();}
  select?.addEventListener('change',()=>{chosen=select.value;const url=new URL(location.href);if(chosen)url.searchParams.set('country',chosen);else url.searchParams.delete('country');history.replaceState(null,'',url.pathname+url.search+url.hash);render();});
  window.addEventListener('popstate',()=>{if(!copy?.entries)return;chosen=new URLSearchParams(location.search).get('country')||'';render();});
  document.addEventListener('visibilitychange',expire);window.addEventListener('pagehide',()=>clearTimeout(timer));window.addEventListener('pageshow',event=>{if(event.persisted){expire();load();}});expire();load();
}

