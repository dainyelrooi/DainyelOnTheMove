import {collection,doc,query,orderBy,startAfter,limit,onSnapshot,getDoc,writeBatch,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {db} from '../js/firebase.js';
import {space,kinds,newId,entryUrl,validateEntry,preparePhoto,element,renderArticle,MAX_PHOTOS} from './publishing-model.js';

let active;
const host=document.getElementById('publishing-desk');
const find=name=>host?.querySelector('[data-publishing-'+name+']');
const fields=['kind','title','excerpt','place','body','sources','videoUrl'];
const ref=(type,id)=>doc(db,'cmsSpaces',space,type,id);
export function clearPublishingDesk(){
  if(active){active.stop?.();active.abort.abort();clearTimeout(active.deadline);clearTimeout(active.writeDeadline);}active=null;
  if(!host)return;find('form').reset();find('form').dataset.dirty='';find('photos').replaceChildren();find('entries').replaceChildren();find('link').replaceChildren();find('preview-area').replaceChildren();find('preview-area').hidden=true;find('status').textContent='Sign in to open your publishing desk.';
  host.querySelectorAll('input,select,textarea,button').forEach(input=>input.disabled=true);
}
export async function initPublishingDesk(user){
  clearPublishingDesk();if(!host)return;
  const s={user,id:newId('entry'),revision:0,photos:[],ready:false,busy:false,abort:new AbortController(),rows:new Map(),published:false};active=s;
  const form=find('form'),message=find('status'),options={signal:s.abort.signal};
  const current=()=>active===s;
  const say=(text,error=false)=>{if(current()){message.textContent=text;message.dataset.state=error?'error':'success';}};
  function controls(){
    if(!current())return;const usable=s.ready&&!s.busy;
    host.querySelectorAll('input,select,textarea,button').forEach(input=>input.disabled=s.busy);
    find('save').disabled=!usable;
    find('export').disabled=false;
    find('publish').disabled=!usable||find('preview-area').hidden||!find('consent').checked;
    find('withdraw').disabled=!usable||!s.published;find('retry').disabled=s.busy;
    find('older').disabled=!usable||!s.more;find('latest').hidden=!s.cursor;
  }
  function dirty(){find('preview-area').hidden=true;find('consent').checked=false;form.dataset.dirty='true';controls();}
  function showLink(){find('link').replaceChildren();if(!s.published)return;const a=element('a','View published entry ↗');a.href=entryUrl(s.id);a.target='_blank';a.rel='noopener';find('link').append(a);}
  function drawPhotos(){
    find('photos').replaceChildren();s.photos.forEach((photo,index)=>{
      const card=element('div',undefined,'publishing-photo'),image=element('img');image.src=photo.dataUrl;image.alt=photo.alt;
      const label=element('label','Describe this photo'),input=element('input');input.maxLength=180;input.required=true;input.value=photo.alt;input.id='publishing-alt-'+photo.id;label.htmlFor=input.id;
      input.addEventListener('input',()=>{if(photo.saved&&input.value!==photo.alt){photo.id=newId('photo');photo.saved=false;}photo.alt=input.value;image.alt=input.value;dirty();},options);
      const remove=element('button','Remove photo','secondary-button');remove.type='button';remove.addEventListener('click',()=>{s.photos.splice(index,1);drawPhotos();dirty();},options);
      card.append(image,label,input,remove);
      if(index){const cover=element('button','Use as cover','secondary-button');cover.type='button';cover.addEventListener('click',()=>{s.photos.unshift(s.photos.splice(index,1)[0]);drawPhotos();dirty();},options);card.append(cover);}
      else card.append(element('p','Cover photograph','field-help'));
      find('photos').append(card);
    });
  }
  function content(complete=true){const data=Object.fromEntries(fields.map(key=>[key,form.elements[key].value.trim()]));data.photoIds=s.photos.map(p=>p.id);return validateEntry(data,{complete});}
  async function savePhotos(){
    const batch=writeBatch(db);let count=0;
    for(const photo of s.photos)if(!photo.saved){if(!photo.alt.trim())throw Error('Describe every photo before saving.');batch.set(ref('media',photo.id),{version:1,entryId:s.id,dataUrl:photo.dataUrl,alt:photo.alt.trim(),width:photo.width,height:photo.height,createdAt:serverTimestamp()});count++;}
    if(count){await batch.commit();if(!current())return;s.photos.forEach(p=>p.saved=true);}
  }
  async function write(action){
    if(!current()||s.busy||!s.ready)return;
    if(action==='publish'&&!form.reportValidity())return;
    if(!navigator.onLine){say('You are offline. Download a backup and reconnect before saving or publishing.',true);return;}
    if(action==='publish'&&(find('preview-area').hidden||!find('consent').checked))return;
    if(action==='withdraw'&&!window.confirm('Take this entry offline? Your draft and photos will remain so you can publish it again.'))return;
    let data;if(action!=='withdraw')try{data=content(action==='publish');}catch(error){say(error.message,true);return;}
    s.busy=true;controls();say(action==='publish'?'Publishing your reviewed entry…':action==='withdraw'?'Taking this entry offline…':'Saving your private draft…');
    s.writeDeadline=setTimeout(()=>say('Still waiting for storage to confirm. Keep this page open; you can download a backup while waiting. Do not repeat the publication on another device.',true),12000);
    try{
      if(action!=='withdraw')await savePhotos();if(!current())return;
      const expected=s.revision,id=s.id;
      const next=await runTransaction(db,async transaction=>{
        const draft=await transaction.get(ref('drafts',id)),published=await transaction.get(ref('published',id));
        if(!current())throw Error('Sign in again before saving.');
        if(action!=='withdraw'&&(draft.data()?.revision||0)!==expected)throw Error('This entry changed on another device. Download your text before reopening the saved version.');
        const revision=action==='withdraw'?expected:expected+1;
        if(action!=='withdraw')transaction.set(ref('drafts',id),{version:1,...data,revision,createdAt:draft.exists()?draft.data().createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
        if(action==='publish')transaction.set(ref('published',id),{version:1,...data,publishedAt:published.exists()?published.data().publishedAt:serverTimestamp(),updatedAt:serverTimestamp()});
        if(action==='publish')transaction.set(ref('summaries',id),{version:1,kind:data.kind,title:data.title,excerpt:data.excerpt,place:data.place,coverPhotoId:data.photoIds[0]||'',publishedAt:published.exists()?published.data().publishedAt:serverTimestamp(),updatedAt:serverTimestamp()});
        if(action==='withdraw'&&published.exists()){transaction.delete(ref('published',id));transaction.delete(ref('summaries',id));}
        return revision;
      });
      if(!current())return;s.revision=next;if(action!=='withdraw')form.dataset.dirty='';s.published=action==='publish'||action!=='withdraw'&&s.published;find('preview-area').hidden=true;find('consent').checked=false;showLink();
      say(action==='publish'?(space==='staging'?'Published on the test website. The live website has not changed.':'Published on your website. No email was sent.'):action==='withdraw'?'This entry is offline. Your saved draft remains; unsaved changes in this form have not been saved.':'Draft saved privately. Nothing was published.');
    }catch(error){say(error.code==='permission-denied'?'Publishing storage is not active for this environment yet. Keep your text or download a backup.':error.message?.startsWith('This entry changed')?error.message:action==='withdraw'?'Taking this entry offline was not confirmed. Check your connection and try again.':'Saving was not confirmed. Keep this form open, check your connection and try again with this same entry.',true);}
    finally{clearTimeout(s.writeDeadline);if(current()){s.busy=false;controls();}}
  }
  async function open(row){
    if(s.busy)return;if(form.dataset.dirty&&!window.confirm('Open another entry? Unsaved changes will be replaced. Download a backup first if you need to keep them.'))return;
    s.busy=true;controls();say('Opening your saved entry…');
    try{
      const saved=await getDoc(ref('drafts',row.id)),published=await getDoc(ref('published',row.id));if(!current())return;if(!saved.exists())throw Error('Entry unavailable');
      const data=saved.data(),photos=[];
      for(const id of data.photoIds){const photo=await getDoc(ref('media',id));if(!current())return;if(!photo.exists())throw Error('Photo unavailable');photos.push({...photo.data(),id,saved:true});}
      if(!current())return;s.id=row.id;s.revision=data.revision;s.photos=photos;s.published=published.exists();for(const key of fields)form.elements[key].value=data[key];form.dataset.dirty='';drawPhotos();find('preview-area').hidden=true;find('consent').checked=false;showLink();say(s.published?'Published entry loaded. Save changes as a private draft, then preview and publish to update the website.':'Private draft loaded.');
    }catch{say('This entry could not be opened completely. Your current form has been preserved.',true);}
    finally{if(current()){s.busy=false;controls();}}
  }
  function subscribe(){
    s.stop?.();s.ready=false;controls();say('Connecting to your private publishing storage…');clearTimeout(s.deadline);
    s.deadline=setTimeout(()=>{if(current()&&!s.ready){say('Publishing storage has not responded. Your text has not been replaced.',true);find('retry').hidden=false;find('retry').disabled=false;}},12000);
    // Live snapshots keep the owner's phone and desktop drafts synchronized.
    s.stop=onSnapshot(query(collection(db,'cmsSpaces',space,'drafts'),orderBy('updatedAt','desc'),...(s.cursor?[startAfter(s.cursor)]:[]),limit(50)),{includeMetadataChanges:true},snapshot=>{
      if(!current())return;s.ready=!snapshot.metadata.fromCache;if(!s.ready)return;
      clearTimeout(s.deadline);find('retry').hidden=true;find('entries').replaceChildren();s.rows=new Map(snapshot.docs.map(d=>[d.id,{...d.data(),id:d.id}]));
      s.last=snapshot.docs.at(-1);s.more=snapshot.size===50;
      for(const row of s.rows.values()){const button=element('button',(row.title||'Untitled draft')+' · '+kinds[row.kind]);button.type='button';if(row.id===s.id)button.setAttribute('aria-current','true');button.addEventListener('click',()=>open(row),options);find('entries').append(button);}
      if(!snapshot.size)find('entries').append(element('p','No saved entries yet.','field-help'));
      if(!s.busy&&!form.dataset.dirty)say(space==='staging'?'Connected to the test website. Entries published here stay on the test website.':'Connected. Write, save a private draft and preview before publishing.');controls();
    },()=>{if(current()){clearTimeout(s.deadline);s.ready=false;say('Private publishing storage is not connected. Keep your text; nothing has been published.',true);find('retry').hidden=false;find('retry').disabled=false;}});
  }
  form.addEventListener('input',event=>{if(!event.target.matches('[data-publishing-consent]'))dirty();},options);
  form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;try{renderArticle(find('preview-area'),content(),s.photos);find('preview-area').hidden=false;find('consent').checked=false;controls();say('Preview ready. Check the text, places, photographs and links, then confirm below.');}catch(error){say(error.message,true);}},options);
  find('consent').addEventListener('change',controls,options);
  for(const action of ['save','publish','withdraw'])find(action).addEventListener('click',()=>write(action),options);
  find('retry').addEventListener('click',subscribe,options);
  find('older').addEventListener('click',()=>{if(s.last){s.cursor=s.last;subscribe();}},options);
  find('latest').addEventListener('click',()=>{s.cursor=null;subscribe();},options);
  find('new').addEventListener('click',()=>{if(s.busy||form.dataset.dirty&&!window.confirm('Start a new entry? Unsaved changes will be replaced.'))return;form.reset();form.dataset.dirty='';s.id=newId('entry');s.revision=0;s.photos=[];s.published=false;drawPhotos();showLink();find('preview-area').hidden=true;say('New private entry.');controls();},options);
  find('photos').previousElementSibling.addEventListener('change',async event=>{
    if(s.busy)return;const files=[...event.target.files];event.target.value='';if(s.photos.length+files.length>MAX_PHOTOS){say('Choose up to twelve photos per entry.',true);return;}
    s.busy=true;controls();say('Resizing photographs on your device…');
    try{const prepared=[];for(const file of files){prepared.push({id:newId('photo'),...await preparePhoto(file),saved:false});if(!current())return;}s.photos.push(...prepared);drawPhotos();dirty();say('Photos prepared. Describe each photo, then save or preview.');}catch(error){say(error.message,true);}finally{if(current()){s.busy=false;controls();}}
  },options);
  find('export').addEventListener('click',()=>{const value={version:1,id:s.id,entry:Object.fromEntries(fields.map(key=>[key,form.elements[key].value])),photos:s.photos.map(({id,alt,dataUrl,width,height})=>({id,alt,dataUrl,width,height}))};const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=element('a');a.href=url;a.download=s.id+'-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},options);
  find('import').addEventListener('change',async event=>{
    const file=event.target.files[0];event.target.value='';if(!file)return;
    try{
      if(file.size>3*1024*1024)throw Error('Choose a backup smaller than 3 MB.');
      const backup=JSON.parse(await file.text());if(!current())return;
      if(backup.version!==1||!backup.entry||!Array.isArray(backup.photos)||backup.photos.length>MAX_PHOTOS)throw Error('This is not an entry backup.');
      const photos=backup.photos.map(p=>{if(typeof p.dataUrl!=='string'||p.dataUrl.length>192000||!/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(p.dataUrl)||typeof p.alt!=='string'||!p.alt.trim()||p.alt.length>180||![p.width,p.height].every(n=>Number.isInteger(n)&&n>0&&n<=1600))throw Error('A backup photo is invalid.');return {...p,id:newId('photo'),saved:false};});
      const data=Object.fromEntries(fields.map(key=>[key,backup.entry[key]]));validateEntry({...data,photoIds:photos.map(p=>p.id)},{complete:false});
      if(form.dataset.dirty&&!window.confirm('Replace the current unsaved form with this backup?'))return;
      s.id=newId('entry');s.revision=0;s.photos=photos;s.published=false;for(const key of fields)form.elements[key].value=data[key];drawPhotos();showLink();dirty();say('Backup restored as a new private copy. Review it before saving or publishing.');
    }catch(error){say(error.message||'This backup could not be opened.',true);}
  },options);
  window.addEventListener('beforeunload',event=>{if(current()&&form.dataset.dirty){event.preventDefault();event.returnValue='';}},options);
  subscribe();
}
