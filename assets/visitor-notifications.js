import {getCloudflareConfig,cloudflareRequest} from './cloudflare-inbox.js';
const KEY='dotm-browser-notifications-v1';
let sdk,messaging;
function saved(){try{const value=JSON.parse(localStorage.getItem(KEY));return value?.version===1&&/^[A-Za-z0-9_-]{22,128}$/.test(value.fid)&&/^[a-f0-9]{64}$/.test(value.key)?value:null;}catch{return null;}}
function write(value){try{value?localStorage.setItem(KEY,JSON.stringify(value)):localStorage.removeItem(KEY);}catch{throw Error('Your browser cannot store notification settings.');}}
async function firebaseMessaging(){
  if(messaging)return messaging;
  // Explicitly requested registration needs existing App Check as well.
  const firebase=await import('../js/firebase.js');sdk=await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging.js');
  if(!await sdk.isSupported())throw Error('This browser does not support these notifications.');
  if(!sdk.register||!sdk.onRegistered||!sdk.unregister)throw Error('Notification support needs an updated browser service.');
  messaging=sdk.getMessaging(firebase.app);return messaging;
}
export async function initVisitorNotifications(){
  const feedback=document.querySelector('[data-push-status]'),enable=document.querySelector('[data-push-enable]'),disable=document.querySelector('[data-push-disable]');if(!feedback||!enable||!disable)return;
  const current=saved(),supported='Notification'in window&&'serviceWorker'in navigator&&isSecureContext;
  if(!supported){feedback.textContent='This browser does not support notifications. You can follow the journey through Postcards.';return;}
  const base=await getCloudflareConfig();if(!base){feedback.textContent='Notifications are not connected on this website yet.';return;}
  async function removeServer(value){const response=await fetch(base+'/push/unsubscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fid:value.fid,key:value.key}),credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Reconnect to finish removing the server registration.');}
  if(current?.pendingRemoval){try{await removeServer(current);write(null);}catch{feedback.textContent='Notifications are off in this browser. Reconnect here to finish removing its server registration.';}}
  let state=saved();
  if(state&&!state.pendingRemoval&&Notification.permission!=='granted'){try{await removeServer(state);write(null);state=null;}catch{write({...state,pendingRemoval:true});state=saved();}}
  disable.hidden=!state;
  let features;try{features=await cloudflareRequest('/features');}catch{}
  const available=features?.notifications===true&&/^[A-Za-z0-9_-]{87}$/.test(features.vapidKey||'');
  enable.hidden=!available||!!state&&!state.pendingRemoval;
  if(!state?.pendingRemoval)feedback.textContent=state?'Notifications are enabled for this browser.':available?'Notifications are off. Enable them only if you would like new-story updates.':'Notifications are not connected on this website yet. Postcards remain available.';
  if(state&&!state.pendingRemoval&&Notification.permission==='granted'&&Date.now()-(state.renewedAt||0)>30*86400000){try{const result=await cloudflareRequest('/push/subscribe',{method:'POST',body:{fid:state.fid,key:state.key,consent:true}});if(result?.ok)write({...state,renewedAt:Date.now()});}catch{feedback.textContent='Your browser still allows notifications, but this website registration needs reconnection. Use Disable and Enable to reconnect.';}}
  enable.addEventListener('click',async()=>{
    enable.disabled=true;
    try{
      // Request permission only in this direct user gesture, never on page load.
      const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Notifications were not enabled. You can change this later in your browser settings.');
      const value=saved(),secret=value?.key||Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
      const client=await firebaseMessaging(),registration=await navigator.serviceWorker.register('/push-worker.js',{scope:'/notifications/',updateViaCache:'none'});
      const fid=await new Promise((resolve,reject)=>{let stop;const timer=setTimeout(()=>{stop?.();reject(Error('Notification registration timed out. Try again.'));},12000);stop=sdk.onRegistered(client,value=>{clearTimeout(timer);stop?.();resolve(value);});sdk.register(client,{vapidKey:features.vapidKey,serviceWorkerRegistration:registration}).catch(error=>{clearTimeout(timer);stop?.();reject(error);});});
      if(!/^[A-Za-z0-9_-]{22,128}$/.test(fid))throw Error('Notification registration could not be verified.');
      write({version:1,fid,key:secret,renewedAt:Date.now()});
      try{const result=await cloudflareRequest('/push/subscribe',{method:'POST',body:{fid,key:secret,consent:true}});if(!result?.ok)throw Error('Registration could not be confirmed.');}
      catch(error){try{await sdk.unregister(client);write(null);}catch{}throw error;}
      enable.hidden=true;disable.hidden=false;feedback.textContent='New-story notifications are enabled for this browser. Email subscriptions are unchanged.';
    }catch(error){feedback.textContent=/^Notifications were not enabled|^This browser|^Your browser|^Notification registration/.test(error.message)?error.message:'Notifications could not be enabled. Try again later or use Postcards.';}finally{enable.disabled=false;}
  });
  disable.addEventListener('click',async()=>{
    disable.disabled=true;const value=saved();if(!value){disable.hidden=true;return;}
    try{write({...value,pendingRemoval:true});const registration=await navigator.serviceWorker.getRegistration('/notifications/');const subscription=await registration?.pushManager.getSubscription();if(subscription)await subscription.unsubscribe();
      try{await removeServer(value);write(null);disable.hidden=true;feedback.textContent='Notifications are off and the website registration has been removed.';}catch(error){feedback.textContent='Notifications are off in this browser. Reconnect here to finish removing its server registration.';}
      enable.hidden=!available;
    }catch{feedback.textContent='Notifications could not be switched off here. Block this website in your browser’s notification settings and try again.';}finally{disable.disabled=false;}
  });
}
