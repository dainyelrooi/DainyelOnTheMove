import {collection,query,limit,onSnapshot,doc,updateDoc,setDoc,serverTimestamp,Timestamp,runTransaction} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {TIMEZONE,MAX_POSTS,localDate,localInput,localToDate,tomorrow,isDue,safeUrl,parsePlan,importId} from './content-calendar-model.js';

const root=document.querySelector('[data-content-calendar]');
const ui=key=>root?.querySelector(`[data-calendar-${key}]`);
const nav=document.querySelector('[data-calendar-nav]');
const badge=document.querySelector('[data-calendar-badge]');
const fullDate=new Intl.DateTimeFormat('en-GB',{timeZone:TIMEZONE,dateStyle:'long',timeStyle:'short'});
let active=null;
function node(tag, className, text) {const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function status(target,message,error=false) {if(!target)return;target.hidden=!message;target.textContent=message;target.dataset.state=error?'error':'success';}
function validEntry(data) {
  return data.version===1 && data.timezone===TIMEZONE && typeof data.title==='string' && typeof data.caption==='string' && data.publishAt instanceof Timestamp && ['scheduled','published','remindersEnabled'].every(k=>typeof data[k]==='boolean');
}
function dateStatus(entry) {
  if(entry.published)return ['Published','done']; if(entry.scheduled)return ['Scheduled','done'];
  if(!entry.remindersEnabled)return ['To schedule',''];
  const date=localDate(entry.publishAt.toDate()),today=localDate();
  if(date<today)return ['Overdue','due'];if(date===today)return ['Post date is today','due'];if(date===tomorrow())return ['Plan for tomorrow','due'];return ['To schedule',''];
}
function controls(state) {
  for(const [id,card] of state.cards)for(const input of card.querySelectorAll('input,textarea,button'))input.disabled=!state.ready||state.writes.has(id);
  ui('import').disabled=!state.ready||!state.pending.length||state.busy;
  ui('email').disabled=!state.settingsReady||state.settingsBusy;
}
function refresh(state) {
  if(active!==state)return;
  const entries=[...state.entries.values()];
  const due=entries.filter(e=>isDue(e));
  ui('total').textContent=String(entries.length);
  ui('scheduled').textContent=String(entries.filter(e=>e.scheduled&&!e.published).length);
  ui('published').textContent=String(entries.filter(e=>e.published).length);
  badge.hidden=!due.length;badge.textContent=String(due.length);nav.setAttribute('aria-label',due.length?`Calendar, ${due.length} posts need attention`:'Calendar');
  ui('attention').hidden=!due.length;
  ui('attention').textContent=`${due.length} ${due.length===1?'post needs':'posts need'} attention. Review the orange labels below.`;
  let shown=0;
  for(const [id,card] of state.cards) {
    const entry=state.entries.get(id), filter=ui('filter').value,month=ui('month').value;
    const match=(month==='all'||localDate(entry.publishAt.toDate()).startsWith(month)) && (filter==='all'||filter==='todo'&&!entry.scheduled&&!entry.published||filter==='scheduled'&&entry.scheduled&&!entry.published||filter==='published'&&entry.published||filter==='due'&&isDue(entry));
    card.hidden=!match;if(match)shown++;
    for(const key of ['scheduled','published','remindersEnabled']) {const input=card.querySelector(`[data-flag="${key}"]`);if(!state.writes.has(id))input.checked=entry[key];}
    const [label,tone]=dateStatus(entry);const pill=card.querySelector('.calendar-pill');pill.textContent=label;pill.dataset.tone=tone;
  }
  ui('empty').hidden=shown>0||!state.ready;
  controls(state);
}
function externalLink(label,url,kind) {
  const link=node('a','secondary-button',label);const safe=safeUrl(url,kind);if(!safe)return null;link.href=safe;link.target='_blank';link.rel='noopener noreferrer';return link;
}
async function copy(text,target) {
  try {await navigator.clipboard.writeText(text);status(target,'Copied.');}catch {status(target,'Could not copy. Select the text and copy it manually.',true);}
}
function makeCard(entry,state) {
  const id=entry.id,card=node('article','calendar-post');card.dataset.entry=id;
  const head=node('div','calendar-post-head'), date=node('div','calendar-date');
  const dateValue=entry.publishAt.toDate();
  date.append(node('span','',new Intl.DateTimeFormat('en-GB',{timeZone:TIMEZONE,month:'short'}).format(dateValue)),node('strong','',new Intl.DateTimeFormat('en-GB',{timeZone:TIMEZONE,day:'2-digit'}).format(dateValue)),node('span','',new Intl.DateTimeFormat('en-GB',{timeZone:TIMEZONE,year:'numeric'}).format(dateValue)));
  const heading=node('div','calendar-post-heading');heading.append(node('p','calendar-meta',fullDate.format(dateValue)+' · Netherlands time'),node('h3','',entry.title),node('span','calendar-pill'));
  head.append(date,heading);card.append(head);
  const checks=node('div','calendar-checks'),message=node('p','status calendar-entry-status');message.hidden=true;message.setAttribute('role','status');
  for(const [key,label] of [['scheduled','Scheduled'],['published','Published']])checks.append(flag(key,label));
  card.append(checks,message);
  const details=node('details'),summary=node('summary','','Caption, design & music'),body=node('div','calendar-post-body');details.append(summary,body);card.append(details);
  if(entry.imageUrl) {
    const figure=node('figure','calendar-visual'),image=node('img');image.alt=entry.title;image.loading='lazy';image.referrerPolicy='no-referrer';figure.append(image);body.append(figure);
    details.addEventListener('toggle',()=>{if(details.open&&!image.getAttribute('src')){try{image.src=safeUrl(entry.imageUrl,'imageUrl');}catch{figure.replaceChildren(node('p','calendar-note','Image link unavailable.'));}}});
    image.addEventListener('error',()=>{figure.replaceChildren(node('p','calendar-note','Preview unavailable. Open the design in Canva.'));},{once:true});
  }
  const links=node('div','calendar-links');if(entry.designUrl) {try{const link=externalLink('Open Canva design ↗',entry.designUrl,'designUrl');if(link)links.append(link);}catch{/* Invalid remote links remain unusable. */}}body.append(links);
  const music=node('section','calendar-music');music.append(node('h4','','Music for Instagram'),node('p','', [entry.musicArtist,entry.musicTitle].filter(Boolean).join(' — ')),node('p','',entry.musicNote||''),node('p','calendar-note',entry.musicSearch||''));
  const copyMusic=node('button','secondary-button','Copy music name');copyMusic.type='button';copyMusic.addEventListener('click',()=>copy([entry.musicArtist,entry.musicTitle].filter(Boolean).join(' — '),message));music.append(copyMusic);
  if(entry.musicUrl){try{const link=externalLink('Listen first ↗',entry.musicUrl,'musicUrl');if(link)music.append(link);}catch{/* Invalid links are never assigned. */}}
  music.append(node('p','calendar-note','Add music in Instagram. The design image does not contain music; availability depends on your music library.'));body.append(music);
  const form=node('form','calendar-editor');form.noValidate=false;
  const titleLabel=node('label','','Post title'),title=node('input');title.id=`title-${id}`;title.maxLength=160;title.required=true;title.value=entry.title;titleLabel.htmlFor=title.id;
  const captionLabel=node('label','','Caption'),caption=node('textarea');caption.id=`caption-${id}`;caption.maxLength=5000;caption.required=true;caption.value=entry.caption;captionLabel.htmlFor=caption.id;
  const publishLabel=node('label','','Post date & time · Europe/Amsterdam'),publish=node('input');publish.id=`publish-${id}`;publish.type='datetime-local';publish.required=true;publish.value=localInput(dateValue);publishLabel.htmlFor=publish.id;
  const actions=node('div','pending-actions'),save=node('button','primary-button','Save changes'),copyCaption=node('button','secondary-button','Copy caption');save.type='submit';copyCaption.type='button';actions.append(save,copyCaption);
  form.append(titleLabel,title,captionLabel,caption,publishLabel,publish,flag('remindersEnabled','Remind me if this post is not scheduled'),actions);
  form.addEventListener('input',event=>{if(!event.target.matches('[data-flag]'))form.dataset.dirty='true';});
  copyCaption.addEventListener('click',()=>copy(caption.value,message));
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!state.ready||!form.reportValidity()||active!==state||state.writes.has(id))return;
    let when;try{when=localToDate(publish.value);}catch(error){status(message,error.message,true);return;}
    const update={title:title.value.trim(),caption:caption.value.trim(),publishAt:Timestamp.fromDate(when)};
    if(!update.title||!update.caption){status(message,'A title and caption are required.',true);return;}
    state.writes.add(id);save.disabled=true;status(message,'Saving privately…');
    try {
      await updateDoc(doc(state.db,'contentCalendar',id),{...update,updatedAt:serverTimestamp()});
      if(active!==state)return;Object.assign(state.entries.get(id),update);form.dataset.dirty='';status(message,'Saved privately.');
      state.cards.delete(id);const replacement=makeCard(state.entries.get(id),state);replacement.querySelector('details').open=details.open;card.replaceWith(replacement);state.cards.set(id,replacement);replacement.querySelector('button[type="submit"]').focus({preventScroll:true});
    } catch {if(active===state)status(message,'Could not save. Your changes are still in this form; try again.',true);}
    finally {if(active===state){state.writes.delete(id);refresh(state);}}
  });
  body.append(form);return card;
  function flag(key,label) {
    const wrap=node('label','calendar-check'),input=node('input');input.type='checkbox';input.checked=entry[key];input.dataset.flag=key;wrap.append(input,node('span','',label));
    input.addEventListener('change',async()=>{
      if(!state.ready||active!==state||state.writes.has(id)){input.checked=state.entries.get(id)[key];return;}
      const next=input.checked,previous=state.entries.get(id)[key];state.writes.add(id);input.disabled=true;status(message,'Saving privately…');
      try{await updateDoc(doc(state.db,'contentCalendar',id),{[key]:next,updatedAt:serverTimestamp()});if(active===state){state.entries.get(id)[key]=next;status(message,'Saved privately.');}}
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
  if(order!==state.order){for(const row of sorted)ui('posts').append(state.cards.get(row.id));state.order=order;}
  for(const row of rows) {
    const card=state.cards.get(row.id),form=card.querySelector('form');
    if(!form.dataset.dirty&&!card.contains(document.activeElement)&&!state.writes.has(row.id)) {
      // Refresh cards changed on another device, preserving expanded details.
      const signature=JSON.stringify([row.title,row.caption,row.publishAt.toMillis(),row.imageUrl,row.designUrl,row.musicTitle,row.musicArtist,row.musicNote,row.musicSearch,row.musicUrl]);
      if(card.dataset.signature&&card.dataset.signature!==signature){const replacement=makeCard(row,state);replacement.querySelector('details').open=card.querySelector('details').open;card.replaceWith(replacement);state.cards.set(row.id,replacement);replacement.dataset.signature=signature;}else card.dataset.signature=signature;
    }
  }
  const selected=ui('month').value,months=[...new Set(sorted.map(row=>localDate(row.publishAt.toDate()).slice(0,7)))];
  ui('month').replaceChildren(new Option('Every month','all'),...months.map(month=>new Option(new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:TIMEZONE}).format(new Date(month+'-15T12:00:00Z')),month)));
  ui('month').value=months.includes(selected)?selected:'all';
  state.ready=!snapshot.metadata.fromCache;
  if(state.ready){clearTimeout(state.deadline);status(ui('status'),rows.length?rows.length>=MAX_POSTS?'Calendar limit reached (200 posts). Import is paused.':'':'Your private calendar is empty. Import your content plan to begin.');ui('retry').hidden=true;}
  else status(ui('status'),'Connecting to private storage. Checkmarks become available after the server responds.');
  refresh(state);
}
export function clearContentCalendar() {
  if(active){active.stops.forEach(stop=>stop());clearTimeout(active.deadline);clearInterval(active.timer);active.abort.abort();}active=null;
  if(!root)return;ui('posts').replaceChildren();ui('file').value='';ui('import-preview').replaceChildren();ui('import-preview').hidden=true;ui('import').hidden=true;ui('import').disabled=true;ui('import-cancel').hidden=true;ui('email').checked=false;ui('email').disabled=true;badge.hidden=true;nav.setAttribute('aria-label','Content');ui('attention').hidden=true;
  for(const name of ['total','scheduled','published'])ui(name).textContent='—';status(ui('status'),'Your private calendar will load after sign-in.');status(ui('email-status'),'Email reminder status will load after sign-in.');status(ui('import-status'),'');ui('retry').hidden=true;
}
export function initContentCalendar(db) {
  clearContentCalendar();if(!root)return;
  const state={db,entries:new Map(),cards:new Map(),pending:[],ready:false,settingsReady:false,settingsBusy:false,busy:false,writes:new Set(),stops:[],abort:new AbortController(),order:''};active=state;
  const options={signal:state.abort.signal};
  const listen=(element,event,fn)=>element.addEventListener(event,fn,options);
  function subscribe() {
    state.stops.forEach(stop=>stop());state.stops=[];state.ready=false;state.settingsReady=false;clearTimeout(state.deadline);status(ui('status'),'Loading your private content calendar…');controls(state);
    state.deadline=setTimeout(()=>{if(active===state&&!state.ready){status(ui('status'),'Private storage has not responded. Check your connection and try again.',true);ui('retry').hidden=false;}},12000);
    // Real-time snapshots are required so phone/desktop checklist changes and reminders stay in sync.
    state.stops.push(onSnapshot(query(collection(db,'contentCalendar'),limit(MAX_POSTS)),{includeMetadataChanges:true},snapshot=>render(snapshot,state),()=>{if(active!==state)return;clearTimeout(state.deadline);state.ready=false;status(ui('status'),'Private calendar storage is unavailable. The owner-only calendar permissions must be activated before importing or saving.',true);ui('retry').hidden=false;controls(state);}));
    state.stops.push(onSnapshot(doc(db,'contentCalendarSettings','reminders'),{includeMetadataChanges:true},snapshot=>{if(active!==state)return;state.settingsReady=!snapshot.metadata.fromCache;ui('email').checked=snapshot.exists()&&snapshot.data().enabled===true;status(ui('email-status'),state.settingsReady?ui('email').checked?'Day-before email reminders requested. Waiting for the automatic check to confirm they are active.':'Email reminders are off. You can enable them here; the private calendar still shows due-post alerts.':'Connecting to reminder settings…');controls(state);},()=>{if(active===state){state.settingsReady=false;status(ui('email-status'),'Email reminders are not active. Private reminder permissions need to be activated.',true);controls(state);}}));
    state.stops.push(onSnapshot(doc(db,'contentCalendarSettings','delivery'),snapshot=>{if(active!==state||!snapshot.exists())return;const data=snapshot.data();if(data.state==='needs-review')status(ui('email-status'),'An email attempt needs review. No uncertain reminder will be resent automatically.',true);else if(ui('email').checked&&data.checkedAt instanceof Timestamp)status(ui('email-status'),'Email reminders enabled. Last automatic check: '+fullDate.format(data.checkedAt.toDate())+'.');},()=>{}));
  }
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
      const refs=posts.map(post=>doc(db,'contentCalendar',post.id)),existing=[];
      for(const ref of refs)existing.push(await transaction.get(ref));let count=0;
      posts.forEach((post,index)=>{if(existing[index].exists())return;const {id,publishLocal,...content}=post;transaction.set(refs[index],{...content,version:1,timezone:TIMEZONE,publishAt:Timestamp.fromDate(localToDate(publishLocal)),scheduled:false,published:false,remindersEnabled:true,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});count++;});return count;
    });if(active!==state)return;state.pending=[];ui('file').value='';ui('import-preview').replaceChildren();ui('import-preview').hidden=true;ui('import').hidden=true;ui('import-cancel').hidden=true;status(ui('import-status'),`${added} posts saved privately. Existing posts and checkmarks were preserved.`);
    }catch{if(active===state)status(ui('import-status'),'Import could not be saved. No posts were partially imported. Retry when private storage is available.',true);}
    finally{if(active===state){state.busy=false;controls(state);}}
  });
  listen(ui('email'),'change',async()=>{
    if(!state.settingsReady||state.settingsBusy)return;const enabled=ui('email').checked;state.settingsBusy=true;controls(state);status(ui('email-status'),'Saving reminder preference…');
    try{await setDoc(doc(db,'contentCalendarSettings','reminders'),{version:1,enabled,timezone:TIMEZONE,localHour:9,updatedAt:serverTimestamp()});if(active===state)status(ui('email-status'),enabled?'Reminder preference saved. Waiting for the automatic check to confirm email reminders are active.':'Email reminders turned off.');}
    catch{if(active===state){ui('email').checked=!enabled;status(ui('email-status'),'Could not save the reminder preference. Please try again.',true);}}
    finally{if(active===state){state.settingsBusy=false;controls(state);}}
  });subscribe();
}
