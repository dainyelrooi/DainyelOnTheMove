import {readPublishedCatalog,catalogFresh} from './published-catalog.js';
import {publishedTips} from './fact-discovery-model.js';
import {factCard} from './fact-discovery-view.js';
import {initFactList} from './fact-list.js';

const hub=document.querySelector('[data-tips-hub]'),preview=document.querySelector('[data-home-tip]');
if(hub||preview){
  const generatedAt=(hub||preview).dataset.tipGeneratedAt;
  let copy=generatedAt?{generatedAt}:null,timer,request=0,away=false;
  const list=hub?.querySelector('[data-facts-list]'),status=hub?.querySelector('[data-facts-status]');
  const browser=hub?initFactList(hub,{noun:'tip',plural:'tips',empty:'The first tips are on their way. New advice appears when published.'}):null;
  function render(){
    const tips=publishedTips(copy.entries);
    if(hub){list.replaceChildren(...tips.map(entry=>factCard(entry)));browser.refresh({reset:true});}
    if(preview){preview.querySelector('[data-home-tip-card]').replaceChildren(...tips.slice(0,1).map(entry=>factCard(entry,{compact:true})));preview.hidden=!tips.length;}
  }
  function expire(){
    clearTimeout(timer);if(!copy)return;
    if(!catalogFresh(copy)){browser?.clear();if(status)status.textContent='The tips are temporarily unavailable. Please refresh to try again.';if(preview)preview.hidden=true;return;}
    timer=setTimeout(expire,Date.parse(copy.generatedAt)+86400000-Date.now());
  }
  async function load(){const run=++request,next=await readPublishedCatalog();if(away||run!==request)return;if(!next){expire();return;}copy=next;render();expire();}
  window.addEventListener('popstate',()=>{if(copy&&catalogFresh(copy))browser?.refresh({reset:true,fromUrl:true});});
  document.addEventListener('visibilitychange',expire);
  window.addEventListener('pagehide',()=>{away=true;++request;clearTimeout(timer);});
  window.addEventListener('pageshow',event=>{if(event.persisted){away=false;expire();load();}});
  expire();if(copy&&catalogFresh(copy))browser?.refresh();load();
}
