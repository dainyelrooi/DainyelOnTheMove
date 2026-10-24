// Credentials never enter the browser. Email delivery uses a fixed owner inbox.
export async function initContact(form){
  const status=document.getElementById('collaboration-status'),button=form.querySelector('[type=submit]'),fields=form.querySelector('[data-contact-fields]');
  const [{db,appCheck},sdk,check,{space}]=await Promise.all([import('../js/firebase.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-check.js'),import('./publishing-model.js')]);
  fields.disabled=false;let key=crypto.randomUUID().replaceAll('-',''),pending=false,attempt;
  if(space==='staging')status.textContent='Test website: messages are saved in the private test inbox. No email is sent from here.';
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(pending||!form.reportValidity())return;
    const data=Object.fromEntries(new FormData(form));if(String(data.website||'').trim()){status.textContent='This message could not be accepted.';return;}
    // Retain the same request after an uncertain write, rather than enqueueing a duplicate.
    if(!attempt)attempt={schemaVersion:1,name:String(data.name).trim(),email:String(data.email).trim(),topic:String(data.topic),brand:String(data.brand||'').trim(),timing:String(data.timing||'').trim(),budget:String(data.budget||'').trim(),message:String(data.message).trim(),consent:data.consent==='on',status:'queued'};
    pending=true;button.disabled=true;status.textContent='Saving your private message…';
    try{
      await check.getToken(appCheck,false);
      const gate=sdk.doc(db,'contactSpaces',space,'limits','submission'),message=sdk.doc(db,'contactSpaces',space,'messages',key);
      await sdk.runTransaction(db,async transaction=>{
        const snapshot=await transaction.get(gate),old=snapshot.exists()?snapshot.data():null;
        if(old?.lastRequest===key)return;
        const elapsed=old?.windowStart?.toMillis?.()||0,reset=Date.now()-elapsed>=86400000;
        if(old&&!reset&&(old.count>=20||Date.now()-(old.updatedAt?.toMillis?.()||0)<20000))throw Error('busy');
        transaction.set(message,{...attempt,createdAt:sdk.serverTimestamp(),updatedAt:sdk.serverTimestamp()});
        transaction.set(gate,{count:!old||reset?1:old.count+1,windowStart:!old||reset?sdk.serverTimestamp():old.windowStart,updatedAt:sdk.serverTimestamp(),lastRequest:key});
      });
      status.textContent=space==='staging'?'Saved in the private test inbox. No email sent. Reference: '+key:'Your message is saved privately. Dainyel can read it in the inbox; email delivery is queued and may take a while. Reference: '+key;
      fields.disabled=true;
    }catch(error){
      status.textContent=error.message==='busy'?'The form is busy. Please try again later or email support@dainyelonthemove.com. Your text is still here.':'Receipt could not be confirmed. Your text is still here. Retry this same request, or email support@dainyelonthemove.com and include reference '+key+'.';
    }finally{pending=false;button.disabled=false;}
  });
}
