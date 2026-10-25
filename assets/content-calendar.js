import {collection,query,limit,onSnapshot,doc,getDoc,setDoc,serverTimestamp,Timestamp,runTransaction} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {space} from './publishing-model.js';
import {confirmOwnerAction} from './owner-confirm.js';
import {socialIcon,socialNames} from './social-icons.js';
import {TIMEZONE,MAX_POSTS,calendarKinds,localDate,localInput,localToDate,tomorrow,isDue,safeUrl,parsePlan,importId,validatePlanPost} from './content-calendar-model.js';

import {initCalendarCreate} from './content-calendar-create.js';

const testCalendar=space!=='production';
const postsPath=testCalendar?['calendarSpaces',space,'posts']:['contentCalendar'];
const postRef=(db,id)=>doc(db,...postsPath,id);
const root=document.querySelector('[data-content-calendar]');
const ui=key=>root?.querySelector(`[data-calendar-${key}]`);
const nav=document.querySelector('[data-calendar-nav]');
const badge=document.querySelector('[data-calendar-badge]');
const fullDate=new Intl.DateTimeFormat('en-GB',{timeZone:TIMEZONE,dateStyle:'long',timeStyle:'short'});
let active=null;
function node(tag, className, text) {const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function status(target,message,error=false) {if(!target)return;target.hidden=!message;target.textContent=message;target.dataset.state=error?'error':'success';}
function validEntry(data) {
  return Object.hasOwn(calendarKinds,data.kind||'social') && data.version===1 && data.timezone===TIMEZONE && typeof data.title==='string' && typeof data.caption==='string' && data.publishAt instanceof Timestamp && (!data.platforms||Array.isArray(data.platforms)&&(data.platforms.length>0||data.kind&&data.kind!=='social')&&data.platforms.length<=6&&data.platforms.every(key=>Object.hasOwn(socialNames,key))) && ['scheduled','published','remindersEnabled'].every(k=>typeof data[k]==='boolean');
}
function dateStatus(entry) {
  if(entry.published)return [entry.kind&&entry.kind!=='social'?'Done':'Published','done']; if(entry.scheduled)return [entry.kind&&entry.kind!=='social'?'Planned':'Scheduled','done'];
  if(!entry.remindersEnabled)return [entry.kind&&entry.kind!=='social'?'To do':'To schedule',''];
  const date=localDate(entry.publishAt.toDate()),today=localDate();
  if(date<today)return ['Overdue','due'];if(date===today)return ['Due today','due'];if(date===tomorrow())return ['Plan for tomorrow','due'];return ['To schedule',''];
}
function controls(state) {
  for(const [id,card] of state.cards)for(const input of card.querySelectorAll('input,textarea,button,select'))input.disabled=!state.ready||state.writes.has(id);
  state.creator?.controls();
  ui('import').disabled=!state.ready||!state.pending.length||state.busy;
  ui('email').disabled=testCalendar||!state.settingsReady||state.settingsBusy;
}
function refresh(state) {
  if(active!==state)return;
  const entries=[...state.entries.values()];
  const due=entries.filter(e=>isDue(e));
  ui('total').textContent=String(entries.length);
  ui('scheduled').textContent=String(entries.filter(e=>e.scheduled&&!e.published).length);
  ui('published').textContent=String(entries.filter(e=>e.published).length);
  badge.hidden=!due.length;badge.textContent=String(due.length);nav.setAttribute('aria-label',due.length?`Calendar, ${due.length} items need attention`:'Calendar');
  ui('attention').hidden=!due.length;
  ui('attention').textContent=`${due.length} ${due.length===1?'item needs':'items need'} attention. Review the orange labels below.`;
  let shown=0;
  for(const [id,card] of state.cards) {
    const entry=state.entries.get(id), filter=ui('filter').value,month=ui('month').value;
    const match=(!month||localDate(entry.publishAt.toDate()).startsWith(month)) && (filter==='all'||filter==='todo'&&!entry.scheduled&&!entry.published||filter==='scheduled'&&entry.scheduled&&!entry.published||filter==='published'&&entry.published||filter==='due'&&isDue(entry));
    card.hidden=card.parentElement===ui('dialog-body')?false:!match;if(match)shown++;
    for(const key of ['scheduled','published','remindersEnabled']) {const input=card.querySelector(`[data-flag="${key}"]`);if(!state.writes.has(id))input.checked=entry[key];}
    const [label,tone]=dateStatus(entry);const pill=card.querySelector('.calendar-pill');pill.textContent=label;pill.dataset.tone=tone;
  }
  ui('empty').hidden=shown>0||!state.ready||state.view==='calendar';
  ui('posts').hidden=state.view==='calendar';ui('grid-wrap').hidden=state.view!=='calendar';
  for(const button of root.querySelectorAll('[data-calendar-view]'))button.setAttribute('aria-pressed',String(button.dataset.calendarView===state.view));
  drawMonth(state);
  controls(state);
}
function externalLink(label,url,kind) {
  const link=node('a','secondary-button',label);const safe=safeUrl(url,kind);if(!safe)return null;link.href=safe;link.target='_blank';link.rel='noopener noreferrer';return link;
}
async function copy(text,target) {
  try {await navigator.clipboard.writeText(text);status(target,'Copied.');}catch {status(target,'Could not copy. Select the text and copy it manually.',true);}
}
function makeCard(entry,state) {
  const social=!entry.kind||entry.kind==='social';
  const id=entry.id,card=node('article','calendar-post');card.dataset.entry=id;
  const head=node('div','calendar-post-head'), date=node('div','calendar-date');
  const dateValue=entry.publishAt.toDate();
  date.append(node('span','',new Intl.DateTimeFormat('en-GB',{timeZone:TIMEZONE,month:'short'}).format(dateValue)),node('strong','',new Intl.DateTimeFormat('en-GB',{timeZone:TIMEZONE,day:'2-digit'}).format(dateValue)),node('span','',new Intl.DateTimeFormat('en-GB',{timeZone:TIMEZONE,year:'numeric'}).format(dateValue)));
  const heading=node('div','calendar-post-heading');heading.append(node('p','calendar-meta',fullDate.format(dateValue)+' · Netherlands time'),node('h3','',entry.title),node('span','calendar-pill'));
  head.append(date,heading);card.append(head);
  const checks=node('div','calendar-checks'),message=node('p','status calendar-entry-status');message.hidden=true;message.setAttribute('role','status');
  for(const [key,label] of [['scheduled',social?'Scheduled':'Planned'],['published',social?'Published':'Done']])checks.append(flag(key,label));
  card.append(checks,message);
  const details=node('details'),summary=node('summary','',social?'Caption, design & music':'Notes & checklist'),body=node('div','calendar-post-body');details.append(summary,body);card.append(details);
  if(entry.imageUrl) {
    const figure=node('figure','calendar-visual'),image=node('img');image.alt=entry.title;image.loading='lazy';image.referrerPolicy='no-referrer';figure.append(image);body.append(figure);
    details.addEventListener('toggle',()=>{if(details.open&&!image.getAttribute('src')){try{image.src=safeUrl(entry.imageUrl,'imageUrl');}catch{figure.replaceChildren(node('p','calendar-note','Image link unavailable.'));}}});
    image.addEventListener('error',()=>{figure.replaceChildren(node('p','calendar-note','Preview unavailable. Open the design in Canva.'));},{once:true});
  }
  const links=node('div','calendar-links');if(entry.designUrl) {try{const link=externalLink('Open Canva design ↗',entry.designUrl,'designUrl');if(link)links.append(link);}catch{/* Invalid remote links remain unusable. */}}body.append(links);
  const music=node('section','calendar-music');music.hidden=!social;music.append(node('h4','','Music for Instagram'),node('p','', [entry.musicArtist,entry.musicTitle].filter(Boolean).join(' — ')),node('p','',entry.musicNote||''),node('p','calendar-note',entry.musicSearch||''));
  const copyMusic=node('button','secondary-button','Copy music name');copyMusic.type='button';copyMusic.addEventListener('click',()=>copy([entry.musicArtist,entry.musicTitle].filter(Boolean).join(' — '),message));music.append(copyMusic);
  if(entry.musicUrl){try{const link=externalLink('Listen first ↗',entry.musicUrl,'musicUrl');if(link)music.append(link);}catch{/* Invalid links are never assigned. */}}
  music.append(node('p','calendar-note','Add music in Instagram. The design image does not contain music; availability depends on your music library.'));body.append(music);
  const form=node('form','calendar-editor');
  const platforms=node('fieldset','calendar-platforms');platforms.append(node('legend','','Where will this post appear?'));platforms.hidden=!social;
  for(const [key,name] of Object.entries(socialNames)){const label=node('label','calendar-platform'),input=node('input');input.type='checkbox';input.value=key;input.dataset.platform=key;input.checked=(entry.platforms||['instagram']).includes(key);label.append(input,socialIcon(key),node('span','',name));platforms.append(label);}
  form.append(platforms);form.noValidate=false;
  const extra=node('details','calendar-edit-extras');extra.hidden=!social;extra.append(node('summary','','Edit design & music links'));
  const extraFields={};for(const [key,label,maximum] of [['designUrl','Canva design link',1200],['imageUrl','Metricool planner image link',1200],['musicTitle','Music title',160],['musicArtist','Artist',160],['musicNote','Music notes',800],['musicUrl','Music link',1200]]){const wrap=node('label','',label),input=node(key==='musicNote'?'textarea':'input');input.id=key+'-'+id;input.maxLength=maximum;input.value=entry[key]||'';if(key.endsWith('Url'))input.type='url';wrap.htmlFor=input.id;extra.append(wrap,input);extraFields[key]=input;}
  form.append(extra);
  const titleLabel=node('label','',social?'Post title':'Title'),title=node('input');title.id=`title-${id}`;title.maxLength=160;title.required=true;title.value=entry.title;titleLabel.htmlFor=title.id;
  const captionLabel=node('label','',social?'Caption':'Notes (optional)'),caption=node('textarea');caption.id=`caption-${id}`;caption.maxLength=5000;caption.required=social;caption.value=entry.caption;captionLabel.htmlFor=caption.id;
  const publishLabel=node('label','',social?'Post date & time · Europe/Amsterdam':'Date & time · Europe/Amsterdam'),publish=node('input');publish.id=`publish-${id}`;publish.type='datetime-local';publish.required=true;publish.value=localInput(dateValue);publishLabel.htmlFor=publish.id;
  const actions=node('div','pending-actions'),save=node('button','primary-button','Save changes'),copyCaption=node('button','secondary-button',social?'Copy caption':'Copy notes');save.type='submit';copyCaption.type='button';actions.append(save,copyCaption);
  form.append(titleLabel,title,captionLabel,caption,publishLabel,publish,flag('remindersEnabled',social?'Remind me if this post is not scheduled':'Highlight this item from the day before'),actions);
  form.addEventListener('input',event=>{if(!event.target.matches('[data-flag]'))form.dataset.dirty='true';});
  copyCaption.addEventListener('click',()=>copy(caption.value,message));
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!state.ready||!form.reportValidity()||active!==state||state.writes.has(id))return;
    let when;try{when=localToDate(publish.value);}catch(error){status(message,error.message,true);return;}
    const selected=[...platforms.querySelectorAll('input:checked')].map(input=>input.value);
    if(social&&!selected.length){status(message,'Choose at least one social platform.',true);return;}
    const update={title:title.value.trim(),caption:caption.value.trim(),publishAt:Timestamp.fromDate(when),platforms:social?selected:[]};
    try{const checked=validatePlanPost({...entry,...update,publishLocal:publish.value,...Object.fromEntries(Object.entries(extraFields).map(([key,input])=>[key,input.value]))});for(const key of Object.keys(extraFields))update[key]=checked[key];}catch(error){status(message,error.message,true);return;}
    if(!update.title||social&&!update.caption){status(message,'A title and caption are required.',true);return;}
    state.writes.add(id);save.disabled=true;status(message,'Saving privately…');
    try {
      const savedTime=await savePost(state,id,update,entry.updatedAt);entry.updatedAt=savedTime;
      if(active!==state)return;Object.assign(state.entries.get(id),update,{updatedAt:entry.updatedAt});form.dataset.dirty='';status(message,'Saved privately.');
      state.cards.delete(id);const replacement=makeCard(state.entries.get(id),state);replacement.querySelector('details').open=details.open;card.replaceWith(replacement);state.cards.set(id,replacement);status(replacement.querySelector('.calendar-entry-status'),'Saved privately.');replacement.querySelector('button[type="submit"]').focus({preventScroll:true});
    } catch(error) {if(active===state)status(message,error.message==='calendar-conflict'?'This post changed on another device. Copy your unsaved caption before reloading the calendar.':'Could not save. Your changes are still in this form; try again.',true);}
    finally {if(active===state){state.writes.delete(id);refresh(state);}}
  });
  body.append(form);return card;
  function flag(key,label) {
    const wrap=node('label','calendar-check'),input=node('input');input.type='checkbox';input.checked=entry[key];input.dataset.flag=key;wrap.append(input,node('span','',label));
    input.addEventListener('change',async()=>{
      if(!state.ready||active!==state||state.writes.has(id)){input.checked=state.entries.get(id)[key];return;}
      const next=input.checked,previous=state.entries.get(id)[key];state.writes.add(id);input.disabled=true;status(message,'Saving privately…');
      try{entry.updatedAt=await savePost(state,id,{[key]:next},entry.updatedAt);if(active===state){state.entries.get(id)[key]=next;state.entries.get(id).updatedAt=entry.updatedAt;status(message,'Saved privately.');}}
      catch{if(active===state){input.checked=previous;status(message,'Could not save this checkmark. Please try again.',true);}}
      finally{if(active===state){state.writes.delete(id);refresh(state);}}
    });return wrap;
  }
}
function render(snapshot,state) {
  if(active!==state)return;
  const rows=snapshot.docs.map(item=>({...item.data(),id:item.id}));
  if(rows.some(row=>!validEntry(row))){state.ready=false;status(ui('status'),'Some calendar data could not be read. Nothing has been replaced.',true);controls(state);return;}
  state.entries=new Map(rows.map(row=>[row.id,row]));
  for(const [id,card] of state.cards)if(!state.entries.has(id)){card.remove();state.cards.delete(id);}
  const sorted=[...rows].sort((a,b)=>a.publishAt.toMillis()-b.publishAt.toMillis()||a.id.localeCompare(b.id));
  for(const row of sorted)if(!state.cards.has(row.id)){const card=makeCard(row,state);state.cards.set(row.id,card);ui('posts').append(card);}
  const order=sorted.map(row=>row.id).join(',');
  if(order!==state.order){for(const row of sorted){const card=state.cards.get(row.id);if(card.parentElement!==ui('dialog-body'))ui('posts').append(card);}state.order=order;}
  for(const row of rows) {
    const card=state.cards.get(row.id),form=card.querySelector('form');
    if(!form.dataset.dirty&&!card.contains(document.activeElement)&&!state.writes.has(row.id)) {
      // Refresh cards changed on another device, preserving expanded details.
      const signature=JSON.stringify([row.title,row.caption,row.publishAt.toMillis(),row.imageUrl,row.designUrl,row.musicTitle,row.musicArtist,row.musicNote,row.musicSearch,row.musicUrl,row.platforms,row.kind]);
      if(card.dataset.signature&&card.dataset.signature!==signature){const replacement=makeCard(row,state);replacement.querySelector('details').open=card.querySelector('details').open;card.replaceWith(replacement);state.cards.set(row.id,replacement);replacement.dataset.signature=signature;}else card.dataset.signature=signature;
    }
  }
  state.ready=!snapshot.metadata.fromCache;
  if(state.ready){clearTimeout(state.deadline);status(ui('status'),rows.length?rows.length>=MAX_POSTS?'Calendar limit reached (200 items). Adding and importing are paused.':state.notice||'':'Your private calendar is empty. Add a social post, task or appointment to begin.');ui('retry').hidden=true;}
  else status(ui('status'),'Connecting to private storage. Checkmarks become available after the server responds.');
  refresh(state);
}
export function clearContentCalendar() {
  if(active){ui('new-dialog')?.close();ui('new-form')?.reset();document.querySelectorAll('[data-calendar-new]').forEach(button=>button.disabled=true);ui('dialog')?.close();active.stops.forEach(stop=>stop());clearTimeout(active.deadline);clearInterval(active.timer);active.abort.abort();}active=null;
  if(!root)return;ui('posts').replaceChildren();ui('file').value='';ui('import-preview').replaceChildren();ui('import-preview').hidden=true;ui('import').hidden=true;ui('import').disabled=true;ui('import-cancel').hidden=true;ui('email').checked=false;ui('email').disabled=true;badge.hidden=true;nav.setAttribute('aria-label','Calendar');ui('grid').replaceChildren();ui('dialog-body').replaceChildren();ui('attention').hidden=true;
  for(const name of ['total','scheduled','published'])ui(name).textContent='—';status(ui('status'),'Your private calendar will load after sign-in.');status(ui('email-status'),'Email reminder status will load after sign-in.');status(ui('import-status'),'');ui('retry').hidden=true;
}
export function initContentCalendar(db) {
  clearContentCalendar();if(!root)return;
  const state={db,entries:new Map(),cards:new Map(),pending:[],ready:false,settingsReady:false,settingsBusy:false,busy:false,writes:new Set(),stops:[],abort:new AbortController(),order:'',view:'calendar'};active=state;
  state.creator=initCalendarCreate({root,state,path:postsPath,sdk:{doc,runTransaction,Timestamp,serverTimestamp},current:()=>active===state,refresh});
  const options={signal:state.abort.signal};ui('month').value=localDate().slice(0,7);
  function closePost(){if(state.writes.size)return;const dirty=[...ui('dialog-body').querySelectorAll('form')].some(form=>form.dataset.dirty);if(dirty){confirmOwnerAction('Close this post and discard unsaved edits? Copy your caption first if needed.',options).then(ok=>{if(ok&&active===state){const card=ui('dialog-body').firstElementChild;if(card){const replacement=makeCard(state.entries.get(card.dataset.entry),state);card.replaceWith(replacement);state.cards.set(card.dataset.entry,replacement);}ui('dialog').close();refresh(state);}});}else{ui('dialog').close();refresh(state);}}
  ui('dialog').addEventListener('cancel',event=>{event.preventDefault();closePost();},options);
  ui('close').addEventListener('click',closePost,options);
  ui('dialog').addEventListener('close',()=>{const card=ui('dialog-body').firstElementChild;if(card){ui('posts').append(card);ui('dialog-body').replaceChildren();}state.order='';for(const row of [...state.entries.values()].sort((a,b)=>a.publishAt.toMillis()-b.publishAt.toMillis()))ui('posts').append(state.cards.get(row.id));refresh(state);if(state.lastEntry)ui('grid').querySelector('[data-calendar-event="'+state.lastEntry+'"]')?.focus({preventScroll:true});},options);
  for(const button of root.querySelectorAll('[data-calendar-view]'))button.addEventListener('click',()=>{state.view=button.dataset.calendarView;refresh(state);},options);
  function monthMove(amount){const date=new Date((ui('month').value||localDate().slice(0,7))+'-15T12:00:00Z');date.setUTCMonth(date.getUTCMonth()+amount);const value=date.toISOString().slice(0,7);if(value<'2020-01'||value>'2100-12')return;ui('month').value=value;refresh(state);}
  ui('prev').addEventListener('click',()=>monthMove(-1),options);ui('next').addEventListener('click',()=>monthMove(1),options);ui('today').addEventListener('click',()=>{ui('month').value=localDate().slice(0,7);refresh(state);},options);
  window.addEventListener('beforeunload',event=>{if(active===state&&(state.newDirty||[...state.cards.values()].some(card=>card.querySelector('form')?.dataset.dirty))){event.preventDefault();event.returnValue='';}},options);
  const listen=(element,event,fn)=>element.addEventListener(event,fn,options);
  function subscribe() {
    state.stops.forEach(stop=>stop());state.stops=[];state.ready=false;state.settingsReady=false;clearTimeout(state.deadline);status(ui('status'),'Loading your private content calendar…');controls(state);
    state.deadline=setTimeout(()=>{if(active===state&&!state.ready){status(ui('status'),'Private storage has not responded. Check your connection and try again.',true);ui('retry').hidden=false;}},12000);
    // Real-time snapshots are required so phone/desktop checklist changes and reminders stay in sync.
    state.stops.push(onSnapshot(query(collection(db,...postsPath),limit(MAX_POSTS)),{includeMetadataChanges:true},snapshot=>render(snapshot,state),()=>{if(active!==state)return;clearTimeout(state.deadline);state.ready=false;status(ui('status'),'Private calendar storage is unavailable. The owner-only calendar permissions must be activated before importing or saving.',true);ui('retry').hidden=false;controls(state);}));
    if(!testCalendar)state.stops.push(onSnapshot(doc(db,'contentCalendarSettings','reminders'),{includeMetadataChanges:true},snapshot=>{if(active!==state)return;state.settingsReady=!snapshot.metadata.fromCache;ui('email').checked=snapshot.exists()&&snapshot.data().enabled===true;status(ui('email-status'),state.settingsReady?ui('email').checked?'Day-before email reminders requested. Waiting for the automatic check to confirm they are active.':'Email reminders are off. You can enable them here; the private calendar still shows due-post alerts.':'Connecting to reminder settings…');controls(state);},()=>{if(active===state){state.settingsReady=false;status(ui('email-status'),'Email reminders are not active. Private reminder permissions need to be activated.',true);controls(state);}}));
    if(!testCalendar)state.stops.push(onSnapshot(doc(db,'contentCalendarSettings','delivery'),snapshot=>{if(active!==state||!snapshot.exists())return;const data=snapshot.data();if(data.state==='needs-review')status(ui('email-status'),'An email attempt needs review. No uncertain reminder will be resent automatically.',true);else if(ui('email').checked&&data.checkedAt instanceof Timestamp)status(ui('email-status'),'Email reminders enabled. Last automatic check: '+fullDate.format(data.checkedAt.toDate())+'.');},()=>{}));
  }
  if(testCalendar)status(ui('email-status'),'Test calendar: reminder emails are disabled. Your live calendar and its reminder preference stay unchanged.');
  listen(ui('retry'),'click',subscribe);listen(ui('filter'),'change',()=>refresh(state));listen(ui('month'),'change',()=>refresh(state));
  listen(document,'visibilitychange',()=>{if(!document.hidden)refresh(state);});state.timer=setInterval(()=>{if(!document.hidden)refresh(state);},60000);
  listen(ui('file'),'change',async()=>{
    const file=ui('file').files[0];state.pending=[];ui('import-preview').hidden=true;ui('import').hidden=true;ui('import-cancel').hidden=true;if(!file)return;
    try{if(file.size>2*1024*1024)throw new Error('Choose a file smaller than 2 MB.');const posts=parsePlan(await file.text(),file.name);if(active!==state)return;state.pending=await Promise.all(posts.map(async post=>({...post,id:await importId(post)})));if(active!==state)return;
      const list=node('ol','calendar-import-list');for(const post of state.pending)list.append(node('li','',post.title+' · '+fullDate.format(localToDate(post.publishLocal))));ui('import-preview').replaceChildren(node('p','calendar-note',`${posts.length} posts ready. Their checkboxes start unticked; review your existing Metricool/Instagram plans first.`),list);ui('import-preview').hidden=false;ui('import').hidden=false;ui('import-cancel').hidden=false;status(ui('import-status'),state.ready?'Review the posts, then save them privately.':'Preview only. Private storage must be connected before these posts can be imported.');controls(state);
    }catch(error){if(active===state)status(ui('import-status'),error.message||'This plan could not be read.',true);}
  });
  listen(ui('import-cancel'),'click',()=>{state.pending=[];ui('file').value='';ui('import-preview').replaceChildren();ui('import-preview').hidden=true;ui('import').hidden=true;ui('import-cancel').hidden=true;status(ui('import-status'),'');});
  listen(ui('import'),'click',async()=>{
    if(!state.ready||!state.pending.length||state.busy)return;
    const posts=[...new Map(state.pending.map(post=>[post.id,post])).values()];
    if(state.entries.size+posts.filter(post=>!state.entries.has(post.id)).length>MAX_POSTS){status(ui('import-status'),'This import would exceed the private calendar limit of 200 posts.',true);return;}
    state.busy=true;controls(state);status(ui('import-status'),'Saving posts privately…');
    try{const added=await runTransaction(db,async transaction=>{
      const refs=posts.map(post=>postRef(db,post.id)),existing=[];
      for(const ref of refs)existing.push(await transaction.get(ref));let count=0;
      posts.forEach((post,index)=>{if(existing[index].exists())return;const {id,publishLocal,...content}=post;transaction.set(refs[index],{...content,...(testCalendar?{platforms:post.platforms||['instagram']}:{ }),version:1,timezone:TIMEZONE,publishAt:Timestamp.fromDate(localToDate(publishLocal)),scheduled:false,published:false,remindersEnabled:true,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});count++;});return count;
    });if(active!==state)return;state.pending=[];ui('file').value='';ui('import-preview').replaceChildren();ui('import-preview').hidden=true;ui('import').hidden=true;ui('import-cancel').hidden=true;status(ui('import-status'),`${added} posts saved privately. Existing posts and checkmarks were preserved.`);
    }catch{if(active===state)status(ui('import-status'),'Import could not be saved. No posts were partially imported. Retry when private storage is available.',true);}
    finally{if(active===state){state.busy=false;controls(state);}}
  });
  listen(ui('email'),'change',async()=>{
    if(testCalendar||!state.settingsReady||state.settingsBusy)return;const enabled=ui('email').checked;state.settingsBusy=true;controls(state);status(ui('email-status'),'Saving reminder preference…');
    try{await setDoc(doc(db,'contentCalendarSettings','reminders'),{version:1,enabled,timezone:TIMEZONE,localHour:9,updatedAt:serverTimestamp()});if(active===state)status(ui('email-status'),enabled?'Reminder preference saved. Waiting for the automatic check to confirm email reminders are active.':'Email reminders turned off.');}
    catch{if(active===state){ui('email').checked=!enabled;status(ui('email-status'),'Could not save the reminder preference. Please try again.',true);}}
    finally{if(active===state){state.settingsBusy=false;controls(state);}}
  });subscribe();
}

async function savePost(state,id,patch,expected){
  await runTransaction(state.db,async tx=>{const target=postRef(state.db,id),saved=await tx.get(target);if(active!==state||!saved.exists()||!expected?.isEqual(saved.data().updatedAt))throw Error('calendar-conflict');tx.update(target,{...patch,updatedAt:serverTimestamp()});});
  // The next snapshot supplies server time. Fetching this exact document makes
  // consecutive local edits conflict-safe even before that listener runs.
  const actual=(await getDoc(postRef(state.db,id))).data();
  if(Object.entries(patch).some(([key,value])=>key==='publishAt'?!actual[key].isEqual(value):JSON.stringify(actual[key])!==JSON.stringify(value)))throw Error('calendar-conflict');
  return actual.updatedAt;
}
function matches(entry,state){const filter=ui('filter').value;return filter==='all'||filter==='todo'&&!entry.scheduled&&!entry.published||filter==='scheduled'&&entry.scheduled&&!entry.published||filter==='published'&&entry.published||filter==='due'&&isDue(entry);}
function drawMonth(state){
  if(state.view!=='calendar')return;const month=ui('month').value||localDate().slice(0,7),first=new Date(month+'-01T12:00:00Z');
  ui('month-title').textContent=new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:TIMEZONE}).format(first);
  const offset=(first.getUTCDay()+6)%7,start=new Date(first);start.setUTCDate(1-offset);
  const days=new Date(first.getUTCFullYear(),first.getUTCMonth()+1,0).getDate(),cells=Math.ceil((offset+days)/7)*7,grid=ui('grid');grid.replaceChildren();
  const rows=[...state.entries.values()].filter(entry=>matches(entry,state)).sort((a,b)=>a.publishAt.toMillis()-b.publishAt.toMillis()||a.id.localeCompare(b.id));
  for(let index=0;index<cells;index++){
    const date=new Date(start);date.setUTCDate(date.getUTCDate()+index);const day=date.toISOString().slice(0,10),cell=node('li','calendar-day'),time=node('time','calendar-day-number',String(date.getUTCDate()));time.dateTime=day;
    cell.dataset.outside=String(!day.startsWith(month));if(day===localDate()){time.setAttribute('aria-current','date');cell.classList.add('calendar-day-today');}cell.append(time);
    if(testCalendar){const add=node('button','calendar-day-add','+');add.type='button';add.dataset.calendarNew='social';add.dataset.calendarDate=day;add.disabled=!state.ready||state.busy||state.writes.size>0||state.entries.size>=MAX_POSTS;add.setAttribute('aria-label','Add an item on '+day);cell.append(add);}
    for(const entry of rows.filter(entry=>localDate(entry.publishAt.toDate())===day)){
      const [label,tone]=dateStatus(entry),button=node('button','calendar-event');button.type='button';button.dataset.tone=tone;
      const icons=node('span','calendar-event-icons');if(entry.kind&&entry.kind!=='social')icons.append(node('span','calendar-kind-icon',entry.kind==='task'?'✓':'◷'));else for(const platform of entry.platforms||['instagram'])icons.append(socialIcon(platform));
      const hour=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:TIMEZONE}).format(entry.publishAt.toDate());
      button.append(icons,node('span','calendar-event-time',hour),node('span','calendar-event-title',entry.title),node('span','calendar-event-status',label));
      button.setAttribute('aria-label',(entry.kind&&entry.kind!=='social'?calendarKinds[entry.kind]:(entry.platforms||['instagram']).map(key=>socialNames[key]).join(', '))+' · '+entry.title+' · '+fullDate.format(entry.publishAt.toDate())+' · '+label);button.title=entry.title+' · '+hour+' · '+label;
      button.dataset.calendarEvent=entry.id;
      button.addEventListener('click',()=>{if(!state.ready||state.writes.size)return;state.lastEntry=entry.id;const card=state.cards.get(entry.id);ui('dialog-body').replaceChildren(card);card.hidden=false;card.querySelector('details').open=true;ui('dialog').showModal();ui('dialog').scrollTop=0;});cell.append(button);
    }
    grid.append(cell);
  }
  const count=rows.filter(entry=>localDate(entry.publishAt.toDate()).startsWith(month)).length;ui('month-count').textContent=count+' '+(count===1?'item':'items')+' in this view. All dates and times use Europe/Amsterdam.';
}
