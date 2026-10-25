import {collection,doc,query,orderBy,startAfter,limit,onSnapshot,getDoc,writeBatch,runTransaction,serverTimestamp,Timestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {db} from '../js/firebase.js';
import {space,kinds,newId,entryUrl,validateEntry,normaliseEntry,presentationFields,chaptersFrom,readingMinutes,preparePhoto,element,renderArticle,MAX_PHOTOS} from './publishing-model.js';
import {initPublishingReader} from './publishing-reader.js';
import {protectRevision,savedVersions} from './admin-recovery.js';
import {confirmOwnerAction} from './owner-confirm.js';
import {publicationPayload,publicationDate,deleteEntry} from './publication-schedule.js';
import {localInput} from './content-calendar-model.js';
let active;
const host=document.getElementById('publishing-desk');
const find=name=>host?.querySelector('[data-publishing-'+name+']');
const fields=['kind','title','excerpt','place','body','sources','videoUrl',...presentationFields];
const ref=(type,id)=>doc(db,'cmsSpaces',space,type,id);
export function clearPublishingDesk(){
  if(active){active.stop?.();active.stopSchedule?.();active.previewStop?.();active.abort.abort();clearTimeout(active.deadline);clearTimeout(active.writeDeadline);}active=null;
  document.querySelectorAll('[data-owner-new-entry]').forEach(button=>button.disabled=true);
  find('preview-dialog')?.close();
  if(!host)return;host.querySelector('[data-recovery-mounted]')?.remove();find('form').reset();find('form').dataset.dirty='';find('photos').replaceChildren();find('entries').replaceChildren();find('link').replaceChildren();find('preview-area').replaceChildren();find('preview-area').hidden=true;find('schedule-status').textContent='Sign in to view website schedules.';find('status').textContent='Sign in to open your publishing desk.';
  host.querySelectorAll('input,select,textarea,button').forEach(input=>input.disabled=true);
}
export async function initPublishingDesk(user){
  clearPublishingDesk();if(!host)return;
  const s={user,id:newId('entry'),revision:0,photos:[],ready:false,busy:false,abort:new AbortController(),rows:new Map(),published:false};active=s;
  const form=find('form'),message=find('status'),options={signal:s.abort.signal};
  const current=()=>active===s;
  const history=savedVersions({host,parent:id=>ref('drafts',id),currentId:()=>s.revision?s.id:null,busy:()=>s.busy||!s.ready,signal:s.abort.signal,onRestore:async raw=>{
    if(form.dataset.dirty&&!await confirmOwnerAction('Replace unsaved edits with this saved version?',options)||!current())return false;
    const id=s.id,data=normaliseEntry(raw),photos=[];
    for(const [index,key] of data.photoIds.entries()){const photo=await getDoc(ref('media',key));if(!current()||s.id!==id)return;if(!photo.exists()||photo.data().entryId!==id)throw Error('Missing photograph');photos.push({...photo.data(),id:key,placement:data.photoPlacements[index],saved:true});}
    if(!current()||s.id!==id)return;s.photos=photos;drawPhotos();for(const key of fields)form.elements[key].value=data[key];drawPositions();dirty();say('Earlier version opened as unsaved edits. Save and preview before publishing.');
  }});
  const say=(text,error=false)=>{if(current()){message.textContent=text;message.dataset.state=error?'error':'success';}};
  function controls(){
    if(!current())return;const usable=s.ready&&!s.busy;document.querySelectorAll('[data-owner-new-entry]').forEach(button=>button.disabled=!usable);
    host.querySelectorAll('input,select,textarea,button').forEach(input=>input.disabled=s.busy);
    find('save').disabled=!usable;
    find('export').disabled=false;
    find('publish').disabled=find('schedule').disabled=!usable||find('preview-area').hidden||!find('consent').checked;find('cancel-schedule').disabled=!usable||s.schedule?.status!=='queued';find('delete').disabled=!usable||!s.revision;
    find('withdraw').disabled=!usable||!s.published;find('retry').disabled=s.busy;
    find('postcard').disabled=!usable||(!s.published&&s.schedule?.status!=='queued');
    find('older').disabled=!usable||!s.more;find('older').hidden=!s.more;find('latest').hidden=!s.cursor;
  }
  function watchSchedule(){s.stopSchedule?.();const watchedId=s.id;s.schedule=null;find('schedule-status').textContent='Checking website schedule…';s.stopSchedule=onSnapshot(ref('entrySchedules',watchedId),snapshot=>{if(!current()||s.id!==watchedId)return;s.schedule=snapshot.exists()?snapshot.data():null;const plan=s.schedule;find('schedule-status').textContent=plan?({queued:'Scheduled version: '+plan.payload.title+' · '+localInput(plan.scheduledAt.toDate()).replace('T',' ')+' Europe/Amsterdam. Draft edits do not change this version.',published:'The scheduled version has been published.',cancelled:'Website schedule cancelled.',review:'Publication needs review. Nothing was automatically retried.'}[plan.status]||'Check this website schedule.'):'No website publication scheduled.';if(plan?.status==='queued')find('when').value=localInput(plan.scheduledAt.toDate());if(plan?.status==='published')s.published=true;showLink();controls();},()=>{if(current()){find('schedule-status').textContent='Website schedule unavailable. Reconnect before changing it.';find('schedule').disabled=find('cancel-schedule').disabled=true;}});}
  async function scheduleEntry(){
    if(!current()||s.busy||!s.ready||find('preview-area').hidden||!find('consent').checked)return;
    let payload,date;try{payload=publicationPayload(content());date=publicationDate(find('when').value);}catch(error){say(error.message,true);return;}
    if(!await confirmOwnerAction('Publish this reviewed version on '+find('when').value.replace('T',' ')+' Europe/Amsterdam? No email is requested by this action.',options)||!current())return;
    s.busy=true;controls();say('Saving your reviewed version and website schedule…');
    try{await savePhotos();if(!current())return;const id=s.id,expected=s.revision;const revision=await runTransaction(db,async tx=>{const old=await tx.get(ref('drafts',id)),plan=await tx.get(ref('entrySchedules',id));if(!current()||(old.data()?.revision||0)!==expected)throw Error('This entry changed. Reopen the saved version before scheduling.');const next={version:1,...payload,revision:expected+1,createdAt:old.exists()?old.data().createdAt:serverTimestamp(),updatedAt:serverTimestamp()};await protectRevision(tx,ref('drafts',id),old,next);tx.set(ref('drafts',id),next);tx.set(ref('entrySchedules',id),{version:1,entryId:id,draftRevision:expected+1,payload,scheduledAt:Timestamp.fromDate(date),status:'queued',createdAt:plan.exists()?plan.data().createdAt:serverTimestamp(),updatedAt:serverTimestamp()});return expected+1;});if(!current())return;s.revision=revision;form.dataset.dirty='';hidePreview();history.changed();say('Website publication scheduled and visible in your calendar. Prepare a Postcard separately if you want an email on that date.');window.dispatchEvent(new CustomEvent('site:scheduled-content',{detail:{date:localInput(date)}}));}
    catch(error){say(error.message?.startsWith('This entry changed')?error.message:'The schedule could not be confirmed. Your writing remains in this form; check the saved schedule before retrying.',true);}finally{if(current()){s.busy=false;controls();}}
  }
  find('schedule').addEventListener('click',scheduleEntry,options);
  find('cancel-schedule').addEventListener('click',async()=>{if(s.busy||s.schedule?.status!=='queued'||!await confirmOwnerAction('Cancel this website publication? Its linked Postcard will not be sent by this schedule.',options)||!current())return;s.busy=true;controls();try{const id=s.id;await runTransaction(db,async tx=>{const plan=await tx.get(ref('entrySchedules',id));if(!current()||plan.data()?.status!=='queued')throw Error('Schedule changed');tx.update(ref('entrySchedules',id),{status:'cancelled',updatedAt:serverTimestamp()});});if(current())say('Website schedule cancelled. The draft remains private; any current website version remains online.');}catch{say('Cancellation was not confirmed. Refresh the schedule before trying again.',true);}finally{if(current()){s.busy=false;controls();}}},options);
  find('delete').addEventListener('click',async()=>{if(s.busy||!s.revision||!await confirmOwnerAction('Delete “'+(form.elements.title.value||'Untitled entry')+'”, take it offline and remove its website schedule? Download a backup first if you need a copy. Already scheduled Brevo campaigns are separate.',options)||!current())return;s.busy=true;controls();try{await deleteEntry({doc,runTransaction},db,space,s.id,s.revision,current);if(!current())return;form.dataset.dirty='';s.busy=false;await startNew();say('Entry deleted and taken offline. No email was sent.');}catch(error){say(error.message||'Deletion was not confirmed. Reopen the saved entry before trying again.',true);}finally{if(current()){s.busy=false;controls();}}},options);
  function hidePreview(){s.previewStop?.();s.previewStop=null;find('preview-dialog').close();find('preview-area').hidden=true;find('consent').checked=false;}
  function readingEstimate(){const excerpt=form.elements.excerpt.value,body=form.elements.body.value;find('reading-estimate').textContent=excerpt.trim()||body.trim()?'Approx. '+readingMinutes({excerpt,body})+' min read · calculated automatically':'Reading time is calculated automatically at approximately 200 words per minute.';}
  function dirty(){hidePreview();form.dataset.dirty='true';readingEstimate();controls();}
  function showLink(){find('link').replaceChildren();if(!s.published)return;const a=element('a','View published entry ↗');a.href=entryUrl(s.id);a.target='_blank';a.rel='noopener';find('link').append(a);}
  function drawPhotos(){
    const banner=form.elements.heroPhotoId,value=banner.value;banner.replaceChildren(new Option('No banner photograph',''));s.photos.forEach((photo,index)=>banner.add(new Option((index+1)+'. '+photo.alt.slice(0,65),photo.id)));banner.value=s.photos.some(p=>p.id===value)?value:'';
    find('photos').replaceChildren();s.photos.forEach((photo,index)=>{
      const card=element('div',undefined,'publishing-photo'),image=element('img');image.src=photo.dataUrl;image.alt=photo.alt;
      const label=element('label','Describe this photo'),input=element('input');input.maxLength=180;input.required=true;input.value=photo.alt;input.id='publishing-alt-'+photo.id;label.htmlFor=input.id;
      input.addEventListener('input',()=>{const previous=photo.id;if(photo.saved&&input.value!==photo.alt){photo.id=newId('photo');photo.saved=false;const option=[...banner.options].find(o=>o.value===previous);if(option)option.value=photo.id;if(banner.value===previous)banner.value=photo.id;}photo.alt=input.value;image.alt=input.value;const option=[...banner.options].find(o=>o.value===photo.id);if(option)option.textContent=(index+1)+'. '+photo.alt.slice(0,65);dirty();},options);
      const remove=element('button','Remove photo','secondary-button');remove.type='button';remove.addEventListener('click',()=>{s.photos.splice(index,1);drawPhotos();dirty();},options);
      const positionLabel=element('label','Place in the story'),position=element('select');position.dataset.photoPosition=String(index);position.id='publishing-position-'+photo.id;positionLabel.htmlFor=position.id;position.addEventListener('change',()=>{photo.placement=Number(position.value);dirty();},options);
      card.append(image,label,input,positionLabel,position,remove);
      if(index){const cover=element('button','Use as cover','secondary-button');cover.type='button';cover.addEventListener('click',()=>{s.photos.unshift(s.photos.splice(index,1)[0]);drawPhotos();dirty();},options);card.append(cover);}
      else card.append(element('p','Cover photograph','field-help'));
      find('photos').append(card);
    });
    drawPositions();
  }
  function drawPositions(){const chapters=chaptersFrom(form.elements.body.value);find('photos').querySelectorAll('[data-photo-position]').forEach(select=>{const photo=s.photos[Number(select.dataset.photoPosition)],value=photo.placement??0;select.replaceChildren(new Option('Only use as cover / banner','-1'),...chapters.slice(0,25).map(c=>new Option(c.index?'After chapter '+c.index+': '+c.title:'After the opening',String(c.index))));if(value>=chapters.length)select.add(new Option('Choose a new chapter (previous chapter removed)',String(value)));select.value=String(value);});}
  function content(complete=true){const data=Object.fromEntries(fields.map(key=>[key,form.elements[key].value.trim()]));data.photoIds=s.photos.map(p=>p.id);data.photoPlacements=s.photos.map(p=>p.placement??0);return validateEntry(data,{complete});}
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
    if(action==='withdraw'&&!await confirmOwnerAction('Take this entry offline? Your draft and photos will remain so you can publish it again.',options))return;
    let data;if(action!=='withdraw')try{data=content(action==='publish');}catch(error){say(error.message,true);return;}
    s.busy=true;controls();say(action==='publish'?'Publishing your reviewed entry…':action==='withdraw'?'Taking this entry offline…':'Saving your private draft…');
    s.writeDeadline=setTimeout(()=>say('Still waiting for storage to confirm. Keep this page open; you can download a backup while waiting. Do not repeat the publication on another device.',true),12000);
    try{
      if(action!=='withdraw')await savePhotos();if(!current())return;
      const expected=s.revision,id=s.id;
      const next=await runTransaction(db,async transaction=>{
        const draft=await transaction.get(ref('drafts',id)),published=await transaction.get(ref('published',id)),schedule=await transaction.get(ref('entrySchedules',id));
        if(!current())throw Error('Sign in again before saving.');
        if(action!=='withdraw'&&(draft.data()?.revision||0)!==expected)throw Error('This entry changed on another device. Download your text before reopening the saved version.');
        const revision=action==='withdraw'?expected:expected+1;
        if(action!=='withdraw'){
          const next={version:1,...data,revision,createdAt:draft.exists()?draft.data().createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
          await protectRevision(transaction,ref('drafts',id),draft,next);transaction.set(ref('drafts',id),next);
        }
        if(action!=='save'&&schedule.data()?.status==='queued')transaction.update(ref('entrySchedules',id),{status:'cancelled',updatedAt:serverTimestamp()});
        if(action==='publish')transaction.set(ref('published',id),{version:1,...data,publishedAt:published.exists()?published.data().publishedAt:serverTimestamp(),updatedAt:serverTimestamp()});
        if(action==='publish')transaction.set(ref('summaries',id),{version:1,kind:data.kind,title:data.title,excerpt:data.excerpt,place:data.place,coverPhotoId:data.photoIds[0]||'',publishedAt:published.exists()?published.data().publishedAt:serverTimestamp(),updatedAt:serverTimestamp()});
        if(action==='withdraw'&&published.exists()){transaction.delete(ref('published',id));transaction.delete(ref('summaries',id));}
        return revision;
      });
      if(!current())return;history.changed();s.revision=next;if(action!=='withdraw')form.dataset.dirty='';s.published=action==='publish'||action!=='withdraw'&&s.published;hidePreview();showLink();
      say(action==='publish'?(space==='staging'?'Published on the test website. The live website has not changed.':'Published on your website. No email was sent.'):action==='withdraw'?'This entry is offline. Your saved draft remains; unsaved changes in this form have not been saved.':'Draft saved privately. Nothing was published.');
    }catch(error){say(error.code==='permission-denied'?'Publishing storage is not active for this environment yet. Keep your text or download a backup.':error.message?.startsWith('This entry changed')?error.message:action==='withdraw'?'Taking this entry offline was not confirmed. Check your connection and try again.':'Saving was not confirmed. Keep this form open, check your connection and try again with this same entry.',true);}
    finally{clearTimeout(s.writeDeadline);if(current()){s.busy=false;controls();}}
  }
  async function open(row){
    if(s.busy)return;if(form.dataset.dirty&&!await confirmOwnerAction('Open another entry? Unsaved changes will be replaced. Download a backup first if you need to keep them.',options))return;
    s.busy=true;controls();say('Opening your saved entry…');
    try{
      const saved=await getDoc(ref('drafts',row.id)),published=await getDoc(ref('published',row.id));if(!current())return;if(!saved.exists())throw Error('Entry unavailable');
      const data=normaliseEntry(saved.data()),photos=[];
      for(const [index,id] of data.photoIds.entries()){const photo=await getDoc(ref('media',id));if(!current())return;if(!photo.exists())throw Error('Photo unavailable');photos.push({...photo.data(),id,placement:data.photoPlacements[index],saved:true});}
      if(!current())return;history.reset();s.id=row.id;s.revision=data.revision;s.photos=photos;s.published=published.exists();drawPhotos();for(const key of fields)form.elements[key].value=data[key];form.dataset.dirty='';drawPositions();readingEstimate();hidePreview();showLink();watchSchedule();say(s.published?'Published entry loaded. Save changes as a private draft, then preview and publish to update the website.':'Private draft loaded.');
    }catch{say('This entry could not be opened completely. Your current form has been preserved.',true);}
    finally{if(current()){s.busy=false;controls();}}
  }
  function subscribe(){
    s.stop?.();s.ready=false;controls();say('Connecting to your private publishing storage…');clearTimeout(s.deadline);
    s.deadline=setTimeout(()=>{if(current()&&!s.ready){say('Publishing storage has not responded. Your text has not been replaced.',true);find('retry').hidden=false;find('retry').disabled=false;}},12000);
    // Live snapshots keep the owner's phone and desktop drafts synchronized.
    s.stop=onSnapshot(query(collection(db,'cmsSpaces',space,'drafts'),orderBy('updatedAt','desc'),...(s.cursor?[startAfter(s.cursor)]:[]),limit(50)),{includeMetadataChanges:true},snapshot=>{
      if(!current())return;const firstServerSnapshot=!s.ready;s.ready=!snapshot.metadata.fromCache;if(!s.ready)return;
      clearTimeout(s.deadline);find('retry').hidden=true;find('entries').replaceChildren();s.rows=new Map(snapshot.docs.map(d=>[d.id,{...d.data(),id:d.id}]));
      s.last=snapshot.docs.at(-1);s.more=snapshot.size===50;
      for(const row of s.rows.values()){const button=element('button',(row.title||'Untitled draft')+' · '+kinds[row.kind]);button.type='button';if(row.id===s.id)button.setAttribute('aria-current','true');button.addEventListener('click',()=>open(row),options);find('entries').append(button);}
      if(!snapshot.size)find('entries').append(element('p','No saved entries yet.','field-help'));
      if(firstServerSnapshot&&!s.busy&&!form.dataset.dirty)say(space==='staging'?'Connected to the test website. Entries published here stay on the test website.':'Connected. Write, save a private draft and preview before publishing.');controls();
    },()=>{if(current()){clearTimeout(s.deadline);s.ready=false;say('Private publishing storage is not connected. Keep your text; nothing has been published.',true);find('retry').hidden=false;find('retry').disabled=false;}});
  }
  form.addEventListener('input',event=>{if(!event.target.matches('[data-publishing-consent],[data-publishing-import]')){dirty();if(event.target===form.elements.body)drawPositions();}},options);
  form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;try{s.previewStop?.();renderArticle(find('preview-area'),content(),s.photos,{prefix:'preview-'+s.id,preview:true});find('preview-area').hidden=false;find('preview-dialog').showModal();find('preview-dialog').scrollTop=0;s.previewStop=initPublishingReader(find('preview-area'),{preview:true});find('consent').checked=false;controls();say('Preview ready. Close the preview after checking the text, banner, chapters and photographs, then confirm below.');}catch(error){say(error.message,true);}},options);
  find('preview-close').addEventListener('click',()=>find('preview-dialog').close(),options);
  find('preview-phone').addEventListener('click',()=>{const phone=find('preview-area').classList.toggle('cms-preview-phone');find('preview-phone').setAttribute('aria-pressed',String(phone));find('preview-phone').textContent=phone?'Full-width view':'Phone view';find('preview-area').dispatchEvent(new Event('cms:preview-size'));},options);
  find('add-chapter').addEventListener('click',()=>{const input=find('chapter-title'),title=input.value.trim();if(!title){input.focus();return;}insertText('\n\n## '+title+'\n\n');input.value='';},options);
  find('add-fact').addEventListener('click',()=>{const title=find('fact-title').value.trim(),text=find('fact-text').value.trim(),source=find('fact-source').value.trim();if(!title||!text||!/^https:\/\//.test(source)){say('Add the fact title, text and full HTTPS source link first.',true);return;}insertText('\n\n:::fact '+title+'\n'+text+'\nSource: '+source+'\n:::\n\n');for(const key of ['fact-title','fact-text','fact-source'])find(key).value='';},options);
  function insertText(text){const body=form.elements.body,start=body.selectionStart??body.value.length;body.setRangeText(text,start,body.selectionEnd??start,'end');dirty();drawPositions();body.focus();}
  find('consent').addEventListener('change',controls,options);
  find('postcard').addEventListener('click',async()=>{if(s.busy)return;try{const id=s.id,plan=await getDoc(ref('entrySchedules',id)),publication=await getDoc(ref('published',id));if(!current()||s.id!==id)return;const scheduled=plan.data()?.status==='queued'?plan.data():null,source=scheduled?.payload||publication.data();if(!source){say('Publish or schedule the entry before preparing its Postcard.',true);return;}const {title,excerpt}=source;window.dispatchEvent(new CustomEvent('site:prepare-postcard',{detail:{id,title,excerpt,scheduledAt:scheduled?.scheduledAt?.toDate()?.toISOString(),publicationRevision:scheduled?.draftRevision}}));}catch{say('Could not load the saved version for your Postcard. Please try again.',true);}},options);
  for(const action of ['save','publish','withdraw'])find(action).addEventListener('click',()=>write(action),options);
  find('retry').addEventListener('click',subscribe,options);
  find('older').addEventListener('click',()=>{if(s.last){s.cursor=s.last;subscribe();}},options);
  find('latest').addEventListener('click',()=>{s.cursor=null;subscribe();},options);
  async function startNew(kind='blog'){if(!Object.hasOwn(kinds,kind)||!s.ready||s.busy||form.dataset.dirty&&!await confirmOwnerAction('Start a new entry? Unsaved changes will be replaced.',options)||!current())return;history.reset();form.reset();form.elements.kind.value=kind;form.dataset.dirty='';s.id=newId('entry');s.revision=0;s.photos=[];s.published=false;drawPhotos();readingEstimate();showLink();hidePreview();watchSchedule();say('New private '+kinds[kind]+'.');controls();location.hash='admin-create';requestAnimationFrame(()=>{if(current())form.elements.title.focus({preventScroll:true});});}
  find('new').addEventListener('click',()=>startNew(),options);
  document.addEventListener('click',event=>{const button=event.target.closest('[data-owner-new-entry]');if(button&&!button.disabled)startNew(button.dataset.ownerNewEntry);},options);
  find('photos').previousElementSibling.addEventListener('change',async event=>{
    if(s.busy)return;const files=[...event.target.files];event.target.value='';if(s.photos.length+files.length>MAX_PHOTOS){say('Choose up to twelve photos per entry.',true);return;}
    s.busy=true;controls();say('Resizing photographs on your device…');
    try{const wasEmpty=!s.photos.length,prepared=[];for(const file of files){prepared.push({id:newId('photo'),...await preparePhoto(file),placement:0,saved:false});if(!current())return;}s.photos.push(...prepared);drawPhotos();if(wasEmpty&&s.photos.length)form.elements.heroPhotoId.value=s.photos[0].id;dirty();say('Photos prepared. Choose your cover, banner and chapter positions, then save or preview.');}catch(error){say(error.message,true);}finally{if(current()){s.busy=false;controls();}}
  },options);
  find('export').addEventListener('click',()=>{const value={version:2,id:s.id,entry:{...Object.fromEntries(fields.map(key=>[key,form.elements[key].value])),photoIds:s.photos.map(p=>p.id),photoPlacements:s.photos.map(p=>p.placement??0)},photos:s.photos.map(({id,alt,dataUrl,width,height})=>({id,alt,dataUrl,width,height}))};const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=element('a');a.href=url;a.download=s.id+'-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},options);
  find('import').addEventListener('change',async event=>{
    const file=event.target.files[0];event.target.value='';if(!file)return;
    try{
      if(file.size>3*1024*1024)throw Error('Choose a backup smaller than 3 MB.');
      const backup=JSON.parse(await file.text());if(!current())return;
      if(![1,2].includes(backup.version)||!backup.entry||!Array.isArray(backup.photos)||backup.photos.length>MAX_PHOTOS)throw Error('This is not an entry backup.');
      const original=normaliseEntry({...backup.entry,photoIds:backup.photos.map(p=>p.id)}),ids=new Map();
      const photos=backup.photos.map((p,index)=>{if(typeof p.dataUrl!=='string'||p.dataUrl.length>192000||!/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(p.dataUrl)||typeof p.alt!=='string'||!p.alt.trim()||p.alt.length>180||![p.width,p.height].every(n=>Number.isInteger(n)&&n>0&&n<=1600))throw Error('A backup photo is invalid.');const id=newId('photo');ids.set(p.id,id);return {id,alt:p.alt,dataUrl:p.dataUrl,width:p.width,height:p.height,placement:original.photoPlacements[index]??0,saved:false};});
      const data=Object.fromEntries(fields.map(key=>[key,original[key]]));data.heroPhotoId=ids.get(original.heroPhotoId)||'';validateEntry({...data,photoIds:photos.map(p=>p.id),photoPlacements:photos.map(p=>p.placement)},{complete:false});
      if(form.dataset.dirty&&!await confirmOwnerAction('Replace the current unsaved form with this backup?',options)||!current())return;
      s.id=newId('entry');s.revision=0;s.photos=photos;s.published=false;drawPhotos();for(const key of fields)form.elements[key].value=data[key];drawPositions();showLink();watchSchedule();dirty();say('Backup restored as a new private copy. Review it before saving or publishing.');
    }catch(error){say(error.message||'This backup could not be opened.',true);}
  },options);
  window.addEventListener('site:open-entry',event=>{const id=event.detail?.id;if(/^entry-[a-f0-9]{32}$/.test(id||''))open({id});},options);
  window.addEventListener('beforeunload',event=>{if(current()&&form.dataset.dirty&&(s.photos.length||['title','excerpt','place','body','sources','videoUrl','storyLabel','tripPeriod'].some(key=>form.elements[key].value.trim()))){event.preventDefault();event.returnValue='';}},options);
  watchSchedule();subscribe();
}
