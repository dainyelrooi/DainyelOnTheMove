import {calendarKinds,calendarValueEqual,localDate,localInput,localToDate,TIMEZONE} from './content-calendar-model.js';

// A calendar move changes its date, never its Amsterdam wall-clock time or flags.
export function calendarMoveDate(entry,day){
  if(!entry||entry.source||!Object.hasOwn(calendarKinds,entry.kind||'social')||typeof entry.publishAt?.toDate!=='function')throw Error('Open this website publication or Postcard in its own editor to change its schedule.');
  if(typeof day!=='string'||!/^\d{4}-\d\d-\d\d$/.test(day))throw Error('Choose a valid date.');
  const original=entry.publishAt.toDate(),minute=localToDate(day+localInput(original).slice(10)),date=new Date(+minute+original.getUTCSeconds()*1000+original.getUTCMilliseconds());
  return{date,changed:day!==localDate(original)};
}

// Same signed-owner transaction boundary as other private calendar edits.
export async function saveCalendarPost(sdk,db,path,id,patch,expected,current=()=>true){
  if(!current())throw Error('calendar-conflict');
  const target=sdk.doc(db,...path,id);
  await sdk.runTransaction(db,async tx=>{
    const saved=await tx.get(target);
    if(!current()||!saved.exists()||!expected?.isEqual(saved.data().updatedAt))throw Error('calendar-conflict');
    tx.update(target,{...patch,updatedAt:sdk.serverTimestamp()});
  });
  if(!current())throw Error('calendar-conflict');
  const saved=await sdk.getDoc(target),actual=saved.data();
  if(!current()||!saved.exists()||Object.entries(patch).some(([key,value])=>key==='publishAt'?!actual[key]?.isEqual?.(value):!calendarValueEqual(actual[key],value)))throw Error('calendar-conflict');
  return actual.updatedAt;
}

export function initCalendarMove({root,state,current,save,onSaved,onBusy}){
  const get=key=>root.querySelector('[data-calendar-move-'+key+']'),dialog=get('dialog'),form=get('form'),date=get('date'),message=get('status'),options={signal:state.abort.signal};
  const format=new Intl.DateTimeFormat('en-GB',{timeZone:TIMEZONE,dateStyle:'long',timeStyle:'short'});
  let snapshot=null,opener=null,saving=false,unconfirmed=false;
  const say=(text,error=false)=>{message.hidden=!text;message.textContent=text;message.dataset.state=error?'error':'success';};
  function controls(){for(const input of form.querySelectorAll('input,button'))input.disabled=saving||!state.ready;get('save').disabled=saving||!state.ready||unconfirmed;get('close').disabled=saving;}
  function focusBack(){if(state.abort.signal.aborted)return;const target=opener?.isConnected?opener:[...root.querySelectorAll('[data-calendar-event]')].find(button=>button.dataset.calendarEvent===snapshot?.id);target?.focus({preventScroll:true});}
  function close(){if(saving)return;dialog.close();focusBack();snapshot=null;}
  function open(id,day,source,expected){
    if(!current()||!state.ready||state.busy||state.writes.size||state.photoBusy||saving)return false;
    const entry=state.entries.get(id);
    if(!entry||entry.source)return false;
    const notice=root.querySelector('[data-calendar-status]');
    const warn=text=>{for(const target of [notice,state.cards.get(id)?.querySelector('.calendar-entry-status')])if(target){target.hidden=false;target.dataset.state='error';target.textContent=text;}return false;};
    if(state.newDirty||root.querySelector('form[data-dirty="true"],[data-photo-busy="true"]'))return warn('Save or discard your unsaved calendar edits before moving an item.');
    if(expected&&!expected.isEqual(entry.updatedAt))return warn('This item changed while it was being dragged. Reopen it before moving.');
    try{calendarMoveDate(entry,day||localDate(entry.publishAt.toDate()));}catch(error){return warn(error.message);}
    snapshot={...entry};opener=source||document.activeElement;date.value=day||localDate(entry.publishAt.toDate());
    get('title').textContent='Move “'+entry.title+'”';get('from').textContent='Currently '+format.format(entry.publishAt.toDate())+' · Europe/Amsterdam';
    get('time').textContent='The time stays '+localInput(entry.publishAt.toDate()).slice(11)+' in Europe/Amsterdam. Only your private calendar changes. Any post already scheduled on a social platform must be moved there separately.';
    unconfirmed=false;say('');controls();dialog.showModal();date.focus({preventScroll:true});return true;
  }
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();},options);
  get('close').addEventListener('click',close,options);get('cancel').addEventListener('click',close,options);
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!current()||saving||unconfirmed||!state.ready||state.busy||state.writes.size||!snapshot||!form.reportValidity())return;
    let move;try{move=calendarMoveDate(snapshot,date.value);}catch(error){say(error.message,true);return;}
    if(!move.changed){say('This item is already on this date. Nothing was changed.');return;}
    const item=snapshot;saving=true;state.writes.add(item.id);controls();onBusy();say('Moving privately…');
    try{
      const updatedAt=await save(item.id,move.date,item.updatedAt);
      if(!current())return;
      onSaved(item,move.date,updatedAt);saving=false;dialog.close();focusBack();snapshot=null;
    }catch(error){if(current()){unconfirmed=true;say(error.message==='calendar-conflict'?'The move was not confirmed. This item may have changed on another device. Close this window and reload the calendar before retrying.':'The move could not be confirmed. Keep your chosen date here and reload the calendar before retrying.',true);}}
    finally{if(current()){saving=false;state.writes.delete(item.id);controls();onBusy();}}
  },options);
  state.abort.signal.addEventListener('abort',()=>{dialog.close();snapshot=null;opener=null;date.value='';get('title').textContent='Move calendar item';get('from').textContent='';get('time').textContent='';say('');},{once:true});
  return{open,controls};
}
