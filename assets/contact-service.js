import {api,serviceAvailable} from './journey-api.js';
export function initContact(form){
  const status=document.getElementById('collaboration-status'),button=form.querySelector('[type=submit]');
  form.querySelector('[data-contact-fields]').disabled=false;
  let key=crypto.randomUUID(),lastFingerprint='';
  serviceAvailable().then(available=>{if(!available){form.querySelector('[data-contact-fields]').disabled=true;button.textContent='Direct sending unavailable';status.textContent='Direct sending is being set up. Please contact Dainyel by email or Instagram; this form cannot deliver a message yet.';}});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!form.reportValidity())return;
    const values=Object.fromEntries(new FormData(form));const body={...values,consent:values.consent==='on'};
    const fingerprint=JSON.stringify(body);if(lastFingerprint&&fingerprint!==lastFingerprint)key=crypto.randomUUID();lastFingerprint=fingerprint;
    button.disabled=true;status.textContent='Sending your message…';
    try{const result=await api('/api/contact',{method:'POST',body,key});status.textContent=`${result.message} Reference: ${result.reference}`;form.querySelector('[data-contact-fields]').disabled=true;}
    catch(error){status.textContent=error.message;}
    finally{button.disabled=false;}
  });
}
