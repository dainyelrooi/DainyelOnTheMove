import {readPublishedCatalog,catalogFresh} from './published-catalog.js';
import {publishedFacts} from './fact-discovery-model.js';
import {factCard} from './fact-discovery-view.js';
import {initFactList} from './fact-list.js';
const hub=document.querySelector('[data-facts-hub]'),preview=document.querySelector('[data-home-fact]');
if(hub||preview){
  const generatedAt=(hub||preview).dataset.factGeneratedAt;
  let copy=generatedAt?{generatedAt}:null,timer,request=0,away=false;const list=hub?.querySelector('[data-facts-list]'),status=hub?.querySelector('[data-facts-status]'),browser=hub?initFactList(hub):null;
  function render(){
    const facts=publishedFacts(copy.entries);
    if(hub){
      list.replaceChildren(...facts.map(e=>factCard(e)));browser.refresh({reset:true});
    }
    if(preview){const target=preview.querySelector('[data-home-fact-card]');target.replaceChildren(...facts.slice(0,1).map(e=>factCard(e,{compact:true})));preview.hidden=!facts.length;}
  }
  function expire(){clearTimeout(timer);if(!copy)return;if(!catalogFresh(copy)){browser?.clear();if(status)status.textContent='The discoveries are temporarily unavailable. Please refresh to try again.';if(preview)preview.hidden=true;return;}timer=setTimeout(expire,Date.parse(copy.generatedAt)+86400000-Date.now());}
  async function load(){const run=++request;const next=await readPublishedCatalog();if(away||run!==request)return;if(!next){expire();return;}copy=next;render();expire();}
  window.addEventListener('popstate',()=>{if(copy&&catalogFresh(copy))browser?.refresh({reset:true,fromUrl:true});});
  document.addEventListener('visibilitychange',expire);window.addEventListener('pagehide',()=>{away=true;++request;clearTimeout(timer);});window.addEventListener('pageshow',event=>{if(event.persisted){away=false;expire();load();}});expire();if(copy&&catalogFresh(copy))browser?.refresh();load();
}

