import {space,kinds,validId,entryUrl,element,renderArticle} from './publishing-model.js';
import {initPublishingReader} from './publishing-reader.js';
import {readPublicSnapshot,snapshotDocs,publicMediaSrc} from './public-snapshot.js';

let connection;
const firstPaint=new Promise(resolve=>document.hidden?resolve():requestAnimationFrame(()=>requestAnimationFrame(resolve)));
async function connect(){
  await firstPaint;
  if(!connection)connection=Promise.all([import('../js/firebase.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')]).then(([firebase,sdk])=>({db:firebase.db,...sdk}));return connection;
}
function cachedPublished(){return readPublicSnapshot('cms',{space});}
function savedDate(snapshot){return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(snapshot.generatedAt));}
function expirePublishedCopy(copy,onExpire){
  const expires=Date.parse(copy.generatedAt)+24*60*60*1000;let timer,stopped=false;
  function stop(){stopped=true;clearTimeout(timer);document.removeEventListener('visibilitychange',check);window.removeEventListener('pageshow',check);}
  function check(){if(stopped)return;clearTimeout(timer);const remaining=expires-Date.now();if(remaining<=0){stop();onExpire();}else timer=setTimeout(check,remaining);}
  document.addEventListener('visibilitychange',check);window.addEventListener('pageshow',check);check();return stop;
}
const root=document.querySelector('[data-published-entry]');
let stopReader;
function setMeta(name,value,property=false){let node=document.querySelector('meta['+(property?'property':'name')+'="'+name+'"]');if(!node){node=element('meta');node.setAttribute(property?'property':'name',name);document.head.append(node);}node.content=value;}
function noEntry(message){stopReader?.();stopReader=null;root.classList.remove('cms-story','article-page');root.replaceChildren(element('h1','This entry is not available.'),element('p',message));const a=element('a','Explore the stories →','text-link');a.href='/stories';root.append(a);setMeta('robots','noindex,nofollow');window.dispatchEvent(new Event('site:article-rendered'));}
function showEntry(id,entry,photos,cached,photosOnly=false){
  stopReader?.();renderArticle(root,entry,photos,{prefix:id});stopReader=initPublishingReader(root);
  document.title=entry.title+' | Dainyel on the Move';setMeta('description',entry.excerpt);setMeta('robots',space==='staging'?'noindex,nofollow':'index,follow,max-image-preview:large');setMeta('og:title',entry.title,true);setMeta('og:description',entry.excerpt,true);
  const canonical='https://dainyelonthemove.com'+entryUrl(id);document.querySelector('link[rel=canonical]').href=canonical;setMeta('og:url',canonical,true);
  const published=entry.publishedAt?.toDate?.();if(published)root.querySelector('.story-meta')?.append(element('span','Published '+new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(published)));
  if(cached){const notice=element('p',(photosOnly?'Some photographs use the cached published copy, saved ':'Showing a cached published entry, saved ')+savedDate(cached)+(photosOnly?'. Live photographs are temporarily unavailable.':'. Live updates are temporarily unavailable.'),'search-help');notice.setAttribute('role','status');root.querySelector('.masthead-copy')?.append(notice);}
}
async function detail(){
  const id=location.pathname.match(/^\/entry\/(entry-[a-f0-9]{32})\/?$/)?.[1];
  if(!validId(id)){noEntry('Choose a published entry from the journal.');return;}
  let version=0,authoritative=false,fallbackStarted=false,cacheVisible=false,photoVisible=false,lastSignature,clearExpiry=()=>{};
  const clearCached=()=>{cacheVisible=false;photoVisible=false;clearExpiry();};
  const deadline=setTimeout(()=>unavailable(),12000);
  const unavailable=async()=>{
    clearTimeout(deadline);if(authoritative||fallbackStarted)return;fallbackStarted=true;const run=++version;
    let cached;try{cached=await cachedPublished();}catch{}if(authoritative||run!==version)return;
    const record=cached?.entries.find(item=>item.id===id);
    if(!record){noEntry('The connection is unavailable. Please try again later.');return;}
    const entry=snapshotDocs([record])[0].data(),photos=(record.photos||[]).flatMap(photo=>{const src=publicMediaSrc(photo.src);return src?[{...photo,dataUrl:src}]:[];});
    showEntry(id,entry,photos,cached);cacheVisible=true;clearExpiry=expirePublishedCopy(cached,()=>{if(cacheVisible){cacheVisible=false;noEntry('The saved published copy has expired. Refresh to try the live connection again.');}});
  };
  try{
    const {db,doc,onSnapshot,getDoc}=await connect();
    // Only a server snapshot can make a withdrawal authoritative. The SDK may
    // emit an empty local-cache snapshot before reporting a connection failure.
    onSnapshot(doc(db,'cmsSpaces',space,'published',id),{includeMetadataChanges:true},async snapshot=>{
      if(snapshot.metadata?.fromCache!==true){authoritative=true;clearTimeout(deadline);}else if(fallbackStarted)return;
      const exists=snapshot.exists(),entry=exists?snapshot.data():null,signature=JSON.stringify([exists,entry,entry?.publishedAt?.toMillis?.(),entry?.updatedAt?.toMillis?.()]);if(lastSignature===signature&&!cacheVisible)return;lastSignature=signature;const run=++version;
      if(!exists){clearCached();noEntry('It may be a private draft or have been taken offline.');return;}
      // A successful live text read remains authoritative even if media fails.
      clearCached();showEntry(id,entry,[]);
      const results=await Promise.all(entry.photoIds.map(async photoId=>{try{const image=await getDoc(doc(db,'cmsSpaces',space,'media',photoId));return {photo:image.exists()?{...image.data(),id:photoId}:null};}catch{return {failed:photoId};}}));
      if(run!==version)return;const livePhotos=results.map(result=>result.photo).filter(Boolean),failed=new Set(results.map(result=>result.failed).filter(Boolean));if(livePhotos.length)showEntry(id,entry,livePhotos);
      if(!failed.size)return;let cached;try{cached=await cachedPublished();}catch{}if(run!==version||!cached||Date.parse(cached.generatedAt)+24*60*60*1000<=Date.now())return;
      // Media IDs are immutable in Rules. Reuse only photographs still named
      // by this live entry and owned by the same entry in the public copy.
      const saved=cached.entries.find(row=>row.id===id),photos=(saved?.photos||[]).flatMap(photo=>{const src=publicMediaSrc(photo.src);return failed.has(photo.id)&&entry.photoIds.includes(photo.id)&&saved.photoIds.includes(photo.id)&&src?[{...photo,dataUrl:src}]:[];});
      if(!photos.length)return;showEntry(id,entry,[...livePhotos,...photos],cached,true);photoVisible=true;clearExpiry=expirePublishedCopy(cached,()=>{if(photoVisible){photoVisible=false;showEntry(id,entry,livePhotos);}});
    },unavailable);
  }catch{await unavailable();}
}
function matchesKind(type,entry){return type==='all'||type==='notes'&&entry.kind!=='blog'||entry.kind===type;}
async function lists(){
  const targets=[...document.querySelectorAll('[data-published-list]')];if(!targets.length)return;
  const api=connect();
  for(const target of targets){
    let sdk;
    const section=target.closest('[data-published-section]'),type=target.dataset.publishedList,merged=target.hasAttribute('data-static-collection');
    const navigation=element('div',undefined,'pending-actions'),older=element('button','Older entries','secondary-button'),latest=element('button','Latest entries','secondary-button'),status=element('p',undefined,'search-help');older.type=latest.type='button';older.hidden=latest.hidden=status.hidden=true;status.setAttribute('role','status');navigation.append(older,latest,status);target.after(navigation);
    let cursor,last,stop,version=0,authoritative=false,fallbackStarted=false,cacheVisible=false,lastSignature,clearExpiry=()=>{};
    function render(rows,cached){
      if(merged)target.querySelectorAll('[data-cms-card]').forEach(card=>card.remove());else target.replaceChildren();
      for(const row of rows){const entry=row.data(),card=element('a',undefined,'publishing-card');card.href=entryUrl(row.id);card.dataset.cmsCard='';card.dataset.readingKind=entry.kind;card.dataset.publishedTime=String(entry.publishedAt?.toMillis?.()||0);
        if(entry.coverPhotoId){const image=element('img');image.alt='';image.loading='lazy';image.width=640;image.height=420;
          if(cached){const src=publicMediaSrc(entry.coverPhoto?.src);if(src){image.src=src;image.alt=entry.coverPhoto.alt;card.append(image);}}
          else{card.append(image);const {db,getDoc,doc}=sdk;
            const load=async()=>{try{const data=await getDoc(doc(db,'cmsSpaces',space,'media',entry.coverPhotoId));if(image.isConnected&&data.exists()){image.src=data.data().dataUrl;image.alt=data.data().alt;}}catch{image.remove();}};
            if('IntersectionObserver' in window){const observer=new IntersectionObserver(items=>{if(items.some(item=>item.isIntersecting)){observer.disconnect();load();}},{rootMargin:'160px'});observer.observe(image);}else load();
          }
        }
        card.append(element('small',[kinds[entry.kind],entry.place].filter(Boolean).join(' · ')),element('h3',entry.title),element('p',entry.excerpt),element('span','Read the entry →'));target.append(card);
      }
      if(merged){const cards=[...target.children].sort((a,b)=>Number(b.dataset.publishedTime||0)-Number(a.dataset.publishedTime||0)||Number(a.dataset.staticOrder||0)-Number(b.dataset.staticOrder||0));target.append(...cards);target.dispatchEvent(new Event('collection:updated'));}
    }
    const unavailable=async()=>{
      clearTimeout(deadline);older.disabled=true;if(authoritative||fallbackStarted)return;fallbackStarted=true;const run=++version;
      let cached;try{cached=await cachedPublished();}catch{}if(authoritative||run!==version)return;
      if(!cached){section.hidden=false;if(!merged)target.replaceChildren(element('p','Recent entries are temporarily unavailable. The archive below is still available.'));return;}
      const unique=new Map(cached.summaries.filter(row=>validId(row.id)).map(row=>[row.id,row])),rows=snapshotDocs([...unique.values()]).filter(row=>matchesKind(type,row.data())).sort((a,b)=>b.data().publishedAt.toMillis()-a.data().publishedAt.toMillis()||a.id.localeCompare(b.id));
      render(rows,true);section.hidden=false;older.hidden=latest.hidden=true;status.hidden=false;status.textContent='Showing cached published entries, saved '+savedDate(cached)+'. Live updates are temporarily unavailable.';
      if(!merged&&!rows.length)target.append(element('p','No matching entries in the saved published archive.'));
      cacheVisible=true;clearExpiry=expirePublishedCopy(cached,()=>{if(!cacheVisible)return;cacheVisible=false;status.hidden=true;if(merged){target.querySelectorAll('[data-cms-card]').forEach(card=>card.remove());target.dispatchEvent(new Event('collection:updated'));}else target.replaceChildren(element('p','Recent entries are temporarily unavailable. The saved published copy has expired.'));section.hidden=false;});
    };
    const deadline=setTimeout(()=>unavailable(),12000);
    // Live publication and withdrawal must update an already-open archive.
    const subscribe=()=>{
      stop?.();older.disabled=true;if(!sdk){unavailable();return;}const {db,collection,query,orderBy,startAfter,limit,onSnapshot}=sdk;
      try{stop=onSnapshot(query(collection(db,'cmsSpaces',space,'summaries'),orderBy('publishedAt','desc'),...(cursor?[startAfter(cursor)]:[]),limit(100)),{includeMetadataChanges:true},snapshot=>{
        if(snapshot.metadata?.fromCache!==true){authoritative=true;clearTimeout(deadline);}else if(fallbackStarted)return;const signature=JSON.stringify(snapshot.docs.map(row=>{const data=row.data();return [row.id,data,data.publishedAt?.toMillis?.(),data.updatedAt?.toMillis?.()];}));if(lastSignature===signature&&!cacheVisible)return;lastSignature=signature;
        ++version;cacheVisible=false;clearExpiry();status.hidden=true;const rows=snapshot.docs.filter(row=>matchesKind(type,row.data()));render(rows);
        last=snapshot.docs.at(-1);older.hidden=snapshot.size<100;older.disabled=false;latest.hidden=!cursor;
        section.hidden=!merged&&!rows.length&&!cursor&&snapshot.size<100;
        if(!merged&&!rows.length&&!section.hidden)target.append(element('p','No matching entries in this group. Browse older entries or return to the latest.'));
      },unavailable);}catch{unavailable();}
    };
    older.addEventListener('click',()=>{cursor=last;subscribe();});latest.addEventListener('click',()=>{cursor=null;subscribe();});api.then(value=>{sdk=value;subscribe();},unavailable);
  }
}
if(root)detail().catch(()=>noEntry('The connection is unavailable. Please try again later.'));else lists().catch(()=>{for(const node of document.querySelectorAll('[data-published-section]'))if(!node.querySelector('[data-static-collection]'))node.hidden=true;});
