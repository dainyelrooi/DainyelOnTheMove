import {readPublishedCatalog,catalogFresh} from './published-catalog.js';
import {latestTravelStory} from './home-latest-model.js';

export function initHomeLatest(){
  const root=document.querySelector('[data-home-latest]');if(!root||root.dataset.ready)return;
  root.dataset.ready='true';const link=root.querySelector('a');let generatedAt=root.dataset.latestGeneratedAt,expiry,revision=0,away=false;
  function show(entry){root.hidden=!entry;if(entry){link.href='/entry/'+entry.id;link.textContent=entry.title+' →';}}
  function expire(){
    clearTimeout(expiry);
    if(!catalogFresh({generatedAt})){show(null);return;}
    if(!away)expiry=setTimeout(expire,Date.parse(generatedAt)+86400000-Date.now());
  }
  async function refresh(){
    const run=++revision;
    try{
      const value=await readPublishedCatalog();
      if(away||run!==revision||!value||!catalogFresh(value))return;
      generatedAt=value.generatedAt;show(latestTravelStory(value.entries));expire();
    }catch{/* A current server-rendered public link remains usable until expiry. */}
  }
  // The same complete, public-only copy supplies both this story and the fact.
  // No extra database subscription, filtered query or index is needed.
  expire();refresh();document.addEventListener('visibilitychange',expire);
  window.addEventListener('pagehide',()=>{away=true;++revision;clearTimeout(expiry);});
  window.addEventListener('pageshow',event=>{if(event.persisted){away=false;expire();refresh();}});
}
