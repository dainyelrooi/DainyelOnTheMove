import {readPublishedCatalog,catalogFresh,catalogEntry} from './published-catalog.js';
import {space} from './site-environment.js';
import {publicLoadReady} from './public-load.js';
export function initHomeLatest(){
  const root=document.querySelector('[data-home-latest]');if(!root||root.dataset.ready)return;
  root.dataset.ready='true';const link=root.querySelector('a');let authoritative=false,saved,expiry,stop,revision=0;
  function show(entry){root.hidden=!entry;if(entry){link.href='/entry/'+entry.id;link.textContent=entry.title+' →';}}
  function expire(){clearTimeout(expiry);if(authoritative||!saved)return;if(!catalogFresh(saved)){show(null);return;}expiry=setTimeout(expire,Date.parse(saved.generatedAt)+86400000-Date.now());}
  readPublishedCatalog().then(value=>{if(authoritative||!value)return;saved=value;show(value.entries[0]);expire();});
  async function connect(){
    const run=++revision;
    try{
      await publicLoadReady();if(space==='unsupported')return;
      const [{db},sdk]=await Promise.all([import('../js/firebase.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')]);
      if(run!==revision)return;
      stop?.();stop=sdk.onSnapshot(sdk.query(sdk.collection(db,'cmsSpaces',space,'summaries'),sdk.orderBy('publishedAt','desc'),sdk.limit(1)),{includeMetadataChanges:true},snapshot=>{
        if(run!==revision||snapshot.metadata?.fromCache===true||snapshot.metadata?.hasPendingWrites===true)return;
        authoritative=true;clearTimeout(expiry);show(snapshot.docs.length?catalogEntry({...snapshot.docs[0].data(),id:snapshot.docs[0].id}):null);
      },()=>{});
    }catch{/* A fresh approved catalogue still works while the live service is unavailable. */}
  }
  connect();document.addEventListener('visibilitychange',expire);
  window.addEventListener('pagehide',()=>{++revision;stop?.();stop=null;clearTimeout(expiry);});
  window.addEventListener('pageshow',event=>{if(event.persisted){expire();connect();}});
}
