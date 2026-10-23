import {space,kinds,validId,entryUrl,element,renderArticle} from './publishing-model.js';
import {initPublishingReader} from './publishing-reader.js';

let connection;
async function connect(){
  if(!connection)connection=Promise.all([import('../js/firebase.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')]).then(([firebase,sdk])=>({db:firebase.db,...sdk}));return connection;
}
const root=document.querySelector('[data-published-entry]');
let stopReader;
function setMeta(name,value,property=false){let node=document.querySelector('meta['+(property?'property':'name')+'="'+name+'"]');if(!node){node=element('meta');node.setAttribute(property?'property':'name',name);document.head.append(node);}node.content=value;}
function noEntry(message){stopReader?.();stopReader=null;root.classList.remove('cms-story','article-page');root.replaceChildren(element('h1','This entry is not available.'),element('p',message));const a=element('a','Explore the stories →','text-link');a.href='/stories';root.append(a);setMeta('robots','noindex,nofollow');window.dispatchEvent(new Event('site:article-rendered'));}
async function detail(){
  const id=location.pathname.match(/^\/entry\/(entry-[a-f0-9]{32})\/?$/)?.[1];
  if(!validId(id)){noEntry('Choose a published entry from the journal.');return;}
  const {db,doc,onSnapshot,getDoc}=await connect();let version=0;
  const deadline=setTimeout(()=>{if(!version)noEntry('Loading is taking longer than expected. Refresh to try again.');},12000);
  // A published entry can be corrected or withdrawn while a visitor has it open.
  onSnapshot(doc(db,'cmsSpaces',space,'published',id),async snapshot=>{
    clearTimeout(deadline);const run=++version;
    if(!snapshot.exists()){noEntry('It may be a private draft or have been taken offline.');return;}
    const entry=snapshot.data();let photos=[];
    try{photos=await Promise.all(entry.photoIds.map(async photoId=>{const image=await getDoc(doc(db,'cmsSpaces',space,'media',photoId));return image.exists()?{...image.data(),id:photoId}:null;}));}catch{/* The text remains available when a photograph cannot load. */}
    if(run!==version)return;stopReader?.();renderArticle(root,entry,photos.filter(Boolean),{prefix:id});stopReader=initPublishingReader(root);
    document.title=entry.title+' | Dainyel on the Move';setMeta('description',entry.excerpt);setMeta('robots','index,follow,max-image-preview:large');setMeta('og:title',entry.title,true);setMeta('og:description',entry.excerpt,true);
    const canonical='https://dainyelonthemove.com'+entryUrl(id);document.querySelector('link[rel=canonical]').href=canonical;setMeta('og:url',canonical,true);
    const published=entry.publishedAt?.toDate?.();if(published)root.querySelector('.story-meta')?.append(element('span','Published '+new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(published)));
  },()=>{clearTimeout(deadline);noEntry('The connection is unavailable. Please try again later.');});
}
async function lists(){
  const targets=[...document.querySelectorAll('[data-published-list]')];if(!targets.length)return;
  const {db,collection,query,orderBy,startAfter,limit,onSnapshot,doc,getDoc}=await connect();
  for(const target of targets){
    const section=target.closest('[data-published-section]'),type=target.dataset.publishedList;
    const navigation=element('div',undefined,'pending-actions'),older=element('button','Older entries','secondary-button'),latest=element('button','Latest entries','secondary-button');older.type=latest.type='button';navigation.append(older,latest);target.after(navigation);
    let cursor,last,stop;
    // Live publication and withdrawal must update an already-open archive.
    const subscribe=()=>{stop?.();older.disabled=true;stop=onSnapshot(query(collection(db,'cmsSpaces',space,'summaries'),orderBy('publishedAt','desc'),...(cursor?[startAfter(cursor)]:[]),limit(100)),snapshot=>{
      target.replaceChildren();const rows=snapshot.docs.filter(d=>type==='all'||type==='notes'&&d.data().kind!=='blog'||d.data().kind===type);
      last=snapshot.docs.at(-1);older.hidden=snapshot.size<100;older.disabled=false;latest.hidden=!cursor;
      section.hidden=!rows.length&&!cursor&&snapshot.size<100;
      if(!rows.length&&!section.hidden)target.append(element('p','No matching entries in this group. Browse older entries or return to the latest.'));
      for(const row of rows){const entry=row.data(),card=element('a',undefined,'publishing-card');card.href=entryUrl(row.id);
        if(entry.coverPhotoId){const image=element('img');image.alt='';image.loading='lazy';image.width=640;image.height=420;card.append(image);
          const load=async()=>{try{const data=await getDoc(doc(db,'cmsSpaces',space,'media',entry.coverPhotoId));if(image.isConnected&&data.exists()){image.src=data.data().dataUrl;image.alt=data.data().alt;}}catch{image.remove();}};
          if('IntersectionObserver' in window){const observer=new IntersectionObserver(items=>{if(items.some(item=>item.isIntersecting)){observer.disconnect();load();}},{rootMargin:'160px'});observer.observe(image);}else load();
        }
        card.append(element('small',[kinds[entry.kind],entry.place].filter(Boolean).join(' · ')),element('h3',entry.title),element('p',entry.excerpt),element('span','Read the entry →'));target.append(card);
      }
    },()=>{section.hidden=false;older.disabled=true;target.replaceChildren(element('p','Recent entries are temporarily unavailable. The archive below is still available.'));});};
    older.addEventListener('click',()=>{cursor=last;subscribe();});latest.addEventListener('click',()=>{cursor=null;subscribe();});subscribe();
  }
}
if(root)detail().catch(()=>noEntry('The connection is unavailable. Please try again later.'));else lists().catch(()=>{for(const node of document.querySelectorAll('[data-published-section]'))node.hidden=true;});
