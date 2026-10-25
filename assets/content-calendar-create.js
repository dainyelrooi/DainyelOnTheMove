import {TIMEZONE,MAX_POSTS,calendarKinds,localDate,validatePlanPost,localToDate} from './content-calendar-model.js';
import {socialIcon,socialNames} from './social-icons.js';
import {confirmOwnerAction} from './owner-confirm.js';
import {calendarPhotoEditor} from './calendar-photo.js';

// One stable ID across retries, create only, and no provider/publication action.
export async function createCalendarPost(sdk,db,path,id,plan,remindersEnabled,current=()=>true){
  if(!/^plan-[a-f0-9]{32}$/.test(id)||!current())throw Error('Calendar session changed.');
  const {publishLocal,...content}=validatePlanPost(plan),payload={...content,version:1,timezone:TIMEZONE,publishAt:sdk.Timestamp.fromDate(localToDate(publishLocal)),scheduled:false,published:false,remindersEnabled:!!remindersEnabled};
  const target=sdk.doc(db,...path,id);
  await sdk.runTransaction(db,async tx=>{
    const existing=await tx.get(target);if(!current())throw Error('Calendar session changed.');
    if(existing.exists()){
      const saved=existing.data();
      if(Object.entries(payload).some(([key,value])=>key==='publishAt'?!saved[key]?.isEqual(value):JSON.stringify(saved[key])!==JSON.stringify(value)))throw Error('This calendar item already exists with different details. Reload before trying again.');
      return; // An uncertain earlier attempt may already have committed.
    }
    tx.set(target,{...payload,createdAt:sdk.serverTimestamp(),updatedAt:sdk.serverTimestamp()});
  });
  return target;
}

export function initCalendarCreate({root,state,path,sdk,current,refresh}){
  const get=key=>root.querySelector('[data-calendar-'+key+']'),form=get('new-form'),dialog=get('new-dialog'),message=get('new-status'),options={signal:state.abort.signal};
  let id='',saving=false,opener=null;
  const photo=calendarPhotoEditor(get('new-photo'),{id:'calendar-new-photo',current,onChange:()=>{state.newDirty=true;},onBusy:value=>{state.photoBusy=value;controls();},signal:state.abort.signal});
  const say=(text,error=false)=>{message.hidden=!text;message.textContent=text;message.dataset.state=error?'error':'success';};
  const platforms=get('new-platforms');
  platforms.replaceChildren();
  for(const [key,name] of Object.entries(socialNames)){
    const label=document.createElement('label'),input=document.createElement('input');label.className='calendar-platform';input.type='checkbox';input.name='platforms';input.value=key;label.append(input,socialIcon(key),document.createTextNode(name));platforms.append(label);
  }
  function kindChanged(){
    const social=form.elements.kind.value==='social';get('new-social').hidden=!social;platforms.disabled=!social;
    get('new-caption-label').textContent=social?'Caption':'Notes (optional)';form.elements.caption.required=social;
    get('new-title').textContent='New '+calendarKinds[form.elements.kind.value].toLowerCase();controls();
  }
  function controls(){
    const available=state.ready&&!state.busy&&!state.photoBusy&&!state.writes.size&&state.entries.size<MAX_POSTS&&!saving;
    for(const button of document.querySelectorAll('[data-calendar-new]'))button.disabled=!available;
    get('new-save').disabled=!available;get('new-close').disabled=saving||photo.busy;get('new-cancel').disabled=saving||photo.busy;
    for(const input of form.querySelectorAll('input,textarea,select'))input.disabled=saving||photo.busy;
    platforms.disabled=saving||form.elements.kind.value!=='social';
    for(const input of get('new-social').querySelectorAll('input,textarea'))input.disabled=saving||form.elements.kind.value!=='social';
  }
  function open(kind='social',date,source){
    if(!current()||!state.ready||state.busy||state.writes.size||state.entries.size>=MAX_POSTS)return;
    if(!Object.hasOwn(calendarKinds,kind))return;
    opener=document.activeElement;location.hash='admin-content';form.reset();id='plan-'+crypto.randomUUID().replaceAll('-','');state.newDirty=false;state.notice='';say('');
    form.elements.kind.value=kind;
    form.elements.publishLocal.value=(date||localDate())+'T12:00';
    if(source){for(const key of ['title','caption','designUrl','imageUrl','musicTitle','musicArtist','musicNote','musicUrl'])form.elements[key].value=source[key]||'';for(const input of platforms.querySelectorAll('input'))input.checked=(source.platforms||['instagram']).includes(input.value);}
    kindChanged();controls();dialog.showModal();form.elements.title.focus({preventScroll:true});dialog.scrollTop=0;
    photo.reset(source?.photo);
  }
  function restoreFocus(){(opener?.isConnected&&opener.getClientRects().length?opener:root.querySelector('[data-calendar-new="social"]'))?.focus({preventScroll:true});}
  async function close(){
    if(saving||photo.busy)return;
    if(state.newDirty&&!await confirmOwnerAction('Discard this unsaved calendar item?',options))return;
    if(current()){state.newDirty=false;dialog.close();restoreFocus();}
  }
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();},options);
  get('new-close').addEventListener('click',close,options);get('new-cancel').addEventListener('click',close,options);
  form.addEventListener('input',()=>{state.newDirty=true;},options);
  form.elements.kind.addEventListener('change',kindChanged,options);
  document.addEventListener('click',event=>{const button=event.target.closest('[data-calendar-new]');if(button&&!button.disabled)open(button.dataset.calendarNew||'social',button.dataset.calendarDate);},options);
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!current()||saving||photo.busy||!state.ready||state.busy||state.writes.size||!form.reportValidity())return;
    if(state.entries.size>=MAX_POSTS){say('Your calendar contains 200 items. No new item was saved.',true);return;}
    let plan;try{plan=validatePlanPost({...Object.fromEntries(new FormData(form)),photo:photo.value,platforms:[...platforms.querySelectorAll('input:checked')].map(input=>input.value),musicSearch:''});}catch(error){say(error.message,true);return;}
    const reminder=form.elements.remindersEnabled.checked;
    let saved=false;
    saving=true;state.busy=true;controls();refresh(state);say('Saving privately…');
    try{
      await createCalendarPost(sdk,state.db,path,id,plan,reminder,current);
      if(!current())return;
      saved=true;state.newDirty=false;dialog.close();get('month').value=plan.publishLocal.slice(0,7);get('filter').value='all';
      const target=get('status');target.hidden=false;state.notice=calendarKinds[plan.kind||'social']+' saved privately. Nothing was sent or published.';target.textContent=state.notice;target.dataset.state='success';
    }catch(error){if(current())say(error.code==='permission-denied'?'Private calendar permissions do not allow this item yet. Your text is still here.':'The save could not be confirmed. Your text is still here; try again with this same form to avoid a duplicate.',true);}
    finally{saving=false;if(current()){state.busy=false;controls();refresh(state);if(saved)restoreFocus();}}
  },options);
  controls();return {open,controls};
}
