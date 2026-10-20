import {api,serviceAvailable} from './journey-api.js';
import {loadJourney} from './journey-model.js';
export function initChallenges(){
  const host=document.getElementById('challenges');if(!host||host.dataset.ready)return;host.dataset.ready='true';
  const status=host.querySelector('[data-challenge-status]');
  let key=crypto.randomUUID(),fingerprint='';
  serviceAvailable().then(available=>{status.textContent=available?'Suggestions are reviewed privately before publication.':'The secure suggestion service is not enabled yet. Nothing can be sent from this form.';if(!available)host.querySelectorAll('form button').forEach(button=>{button.disabled=true;button.textContent='Sending unavailable';});});
  loadJourney().then(model=>{
    const list=host.querySelector('[data-challenge-list]');if(!model.challenges.length)return;list.replaceChildren();
    for(const item of model.challenges){
      const card=document.createElement('article'),h=document.createElement('h3'),p=document.createElement('p'),meta=document.createElement('p'),link=document.createElement('a');card.className='challenge-card';card.id='challenge-'+item.id;
      h.textContent=item.title;p.textContent=item.text;meta.textContent=`${item.displayName} · ${{proposed:'Open',accepted:'Picked up',completed:'Completed',declined:'Closed'}[item.lifecycle]||'Open'}`;link.href=`qa.html#challenge-${item.id}`;link.textContent='Link to this challenge';card.append(meta,h,p,link);
      if(item.result){const result=document.createElement('p');result.textContent='Dainyel’s result: '+item.result;card.append(result);}list.append(card);
    }
  }).catch(()=>{status.textContent='Published challenges could not load. Please reload later.';});
  for(const [selector,editing]of [['[data-challenge-form]',false],['[data-challenge-edit]',true]]){
    const form=host.querySelector(selector);form.addEventListener('submit',async e=>{
      e.preventDefault();if(!form.reportValidity())return;const values=Object.fromEntries(new FormData(form)),button=form.querySelector('button');button.disabled=true;
      const body={title:values.title,text:values.text,displayName:values.displayName,...(!editing?{consent:values.consent==='on',website:values.website}:{})};
      const next=JSON.stringify(body);if(fingerprint&&next!==fingerprint)key=crypto.randomUUID();fingerprint=next;
      status.textContent='Sending for private review…';
      try{const result=await api(editing?'/api/challenges/'+values.id:'/api/challenges',{method:editing?'PATCH':'POST',body,key,editKey:values.key});status.textContent=result.message+(result.editKey?` Reference: ${result.id}. Private edit key: ${result.editKey}. Keep this key privately to edit later.`:'');form.reset();}
      catch(error){status.textContent=error.message;}finally{button.disabled=false;}
    });
  }
}
