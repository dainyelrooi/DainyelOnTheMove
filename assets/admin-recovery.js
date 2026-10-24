import {collection,doc,getDocs,query,orderBy,limit,startAfter,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {element} from './publishing-model.js';

// The immutable media documents are retained. History stores references, not
// twelve duplicated photographs on every keystroke/save.
export async function protectRevision(tx,parent,previous,next){
  const old=previous.exists()?previous.data():null;
  const oldRef=old?doc(parent,'history','r'+old.revision):null;
  const oldCopy=oldRef?await tx.get(oldRef):null;
  if(oldRef&&!oldCopy.exists())tx.set(oldRef,{version:1,content:old,savedAt:serverTimestamp()});
  tx.set(doc(parent,'history','r'+next.revision),{version:1,content:next,savedAt:serverTimestamp()});
}

export function savedVersions({host,parent,currentId,onRestore,busy,signal}){
  host.querySelector('[data-recovery-mounted]')?.remove();
  const panel=element('details',undefined,'admin-disclosure recovery-panel'),summary=element('summary','Saved versions & automatic recovery'),body=element('div',undefined,'disclosure-body');
  panel.dataset.recoveryMounted='';
  const note=element('p','Every confirmed save keeps a private version, including its photo references. Restoring opens unsaved edits; review and save them before publishing. Nothing is sent by email.','field-help');
  const load=element('button','Load saved versions','secondary-button'),older=element('button','Older versions','secondary-button'),list=element('div',undefined,'recovery-list'),status=element('p',undefined,'status');
  load.type=older.type='button';older.hidden=true;status.setAttribute('role','status');body.append(note,load,list,older,status);panel.append(summary,body);host.append(panel);
  let cursor=null,run=0,loading=false;
  const options={signal};
  async function show(more=false){
    if(loading||busy())return;const id=currentId();if(!id){status.textContent='Save a draft to start its version history.';return;}
    const request=++run;loading=true;load.disabled=older.disabled=true;status.textContent='Opening private saved versions…';
    if(!more){list.replaceChildren();cursor=null;}
    try{
      const result=await getDocs(query(collection(parent(id),'history'),orderBy('content.revision','desc'),...(more&&cursor?[startAfter(cursor)]:[]),limit(20)));
      if(signal.aborted||request!==run||currentId()!==id)return;
      for(const row of result.docs){const data=row.data().content,button=element('button',undefined,'secondary-button');button.type='button';
        const when=data.updatedAt?.toDate?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Amsterdam'}).format(data.updatedAt.toDate()):'Date unavailable';
        button.append(element('b','Version '+data.revision),element('span',when+' · restore as draft'));button.setAttribute('aria-label','Restore version '+data.revision+', saved '+when);
        button.addEventListener('click',async()=>{if(busy()||signal.aborted||currentId()!==id)return;button.disabled=true;try{const result=await onRestore(data);if(result!==false&&!signal.aborted&&currentId()===id)status.textContent='Version opened as unsaved edits. Save and preview it before publishing.';}catch{status.textContent='Could not restore this version completely. Your current form was preserved.';}finally{button.disabled=false;}},options);list.append(button);
      }
      cursor=result.docs.at(-1);older.hidden=result.size<20;status.textContent=list.children.length?'Private recovery copies. No publication or email is triggered.':'No earlier versions yet. The next confirmed save starts this history.';
    }catch{if(!signal.aborted)status.textContent='Saved versions could not be loaded. Check your connection and try again.';}
    finally{loading=false;if(!signal.aborted){load.disabled=older.disabled=false;}}
  }
  load.addEventListener('click',()=>show(),options);older.addEventListener('click',()=>show(true),options);
  return {reset(){run++;cursor=null;list.replaceChildren();status.textContent='';older.hidden=true;panel.open=false;},changed(){run++;if(panel.open){list.replaceChildren();status.textContent='A new version was saved. Choose Load saved versions to refresh.';older.hidden=true;}}};
}
