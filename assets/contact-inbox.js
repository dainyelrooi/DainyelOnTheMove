import {db} from '../js/firebase.js';
import {collection,query,orderBy,limit,onSnapshot,doc,updateDoc,deleteDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {space} from './publishing-model.js';
import {setReviewCount,failReviewCount} from './admin-review-badges.js';
let stop,version=0;
export function clearContactInbox(){version++;stop?.();stop=null;document.querySelector('[data-contact-inbox]')?.replaceChildren();}
export function initContactInbox(){
  clearContactInbox();const run=version,list=document.querySelector('[data-contact-inbox]'),status=document.querySelector('[data-contact-inbox-status]');if(!list)return;
  stop=onSnapshot(query(collection(db,'contactSpaces',space,'messages'),orderBy('createdAt','desc'),limit(100)),snapshot=>{
    if(run!==version)return;list.replaceChildren();let count=0,handledCount=0;const handled=document.createElement('details'),summary=document.createElement('summary'),handledList=document.createElement('div');handled.className='admin-disclosure';summary.textContent='Handled enquiries';handled.append(summary,handledList);
    for(const item of snapshot.docs){const d=item.data(),closed=d.status==='closed';if(closed)handledCount++;else count++;
      const card=document.createElement('article');card.className='pending-card';
      const title=document.createElement('h4'),meta=document.createElement('p'),message=document.createElement('p'),reply=document.createElement('a'),close=document.createElement('button');
      title.textContent=d.topic.replaceAll('-',' ')+' · '+d.name;meta.textContent=[d.brand,d.timing,d.budget,d.status==='accepted'?'Email accepted by provider':d.status==='held'?'Email needs review; message is saved':'Saved in private inbox'].filter(Boolean).join(' · ');message.textContent=d.message;message.style.whiteSpace='pre-wrap';
      reply.textContent='Reply using email →';reply.href='mailto:'+encodeURIComponent(d.email)+'?subject='+encodeURIComponent('Re: your website enquiry');close.type='button';close.textContent='Mark handled';close.className='secondary-button';close.hidden=closed;
      close.addEventListener('click',async()=>{close.disabled=true;try{await updateDoc(doc(db,'contactSpaces',space,'messages',item.id),{status:'closed',updatedAt:serverTimestamp()});}catch{close.disabled=false;status.textContent='Could not mark handled. Please try again.';}});
      const remove=document.createElement('button');remove.type='button';remove.className='danger-button';remove.textContent='Delete permanently';remove.addEventListener('click',async()=>{if(!confirm('Permanently delete this private enquiry? This cannot be undone.'))return;remove.disabled=true;try{await deleteDoc(doc(db,'contactSpaces',space,'messages',item.id));}catch{remove.disabled=false;status.textContent='Could not delete this enquiry. Please try again.';}});
      const actions=document.createElement('div');actions.className='pending-actions';actions.append(reply,close,remove);card.append(title,meta,message,actions);(closed?handledList:list).append(card);
    }
    if(handledCount){summary.textContent=`Handled enquiries (${handledCount})`;list.append(handled);}setReviewCount('contacts',count);status.textContent=count?`${count} private ${count===1?'enquiry':'enquiries'} to handle. Showing up to 100 recent messages.`:'No new contact enquiries. Up to 100 recent handled messages remain available below.';
  },()=>{if(run===version){failReviewCount('contacts');status.textContent='The private contact inbox could not connect. Please try again later.';}});
}
