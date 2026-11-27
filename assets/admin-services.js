import {app} from '../js/firebase.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {cloudflareRequest} from './cloudflare-inbox.js';
const auth=getAuth(app);
const time=value=>Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Amsterdam'}).format(new Date(value)):'not confirmed';
export function serviceSummary(value,now=Date.now()){
  if(value?.version!==1||!['production','staging'].includes(value.space))throw Error('Service status could not be verified.');
  const brevo=value.brevo,age=brevo?now-Date.parse(brevo.checkedAt):Infinity,old=!Number.isFinite(age)||age>30*60000;
  const rows=[{key:'email',title:'Postcards delivery',tone:old?'warning':'ok',text:brevo?'Last provider check: '+time(brevo.checkedAt)+(old?' · status is older than 30 minutes.':'.'):'No provider check has been confirmed.',detail:brevo?.plan==='free'&&Number.isInteger(brevo.remaining)?brevo.remaining+' of '+brevo.dailyLimit+' free daily sends remained at that check.':'Current free email allowance is unavailable. No capacity has been assumed.'},
    {key:'callbacks',title:'Mail delivery feedback',tone:value.webhooks?.lastAt?'ok':'warning',text:value.webhooks?.lastAt?'Last authenticated callback: '+time(value.webhooks.lastAt)+'.':'No authenticated callback received yet.',detail:'Last seven days: '+(value.webhooks?.events||[]).filter(row=>['delivered','hardBounce','softBounce','unsubscribed','spam'].includes(row.event)&&Number.isSafeInteger(row.total)).map(row=>row.total+' '+row.event).join(', ')+'. Delivered means accepted by the receiving mail server; it does not prove inbox placement or reading.'},
    {key:'push',title:'Browser notifications',tone:value.notifications?.configured?'ok':'warning',text:value.notifications?.configured?'Connected · '+value.notifications.active+' active browser registrations.':'The browser notification connection still needs setup.',detail:'Only browsers that explicitly opted in can receive updates. Email subscriptions remain separate.'},
    {key:'capacity',title:'Free service capacity',tone:'warning',text:Number.isInteger(value.inbox?.active)?value.inbox.active+' of '+value.inbox.capacity+' inbox storage slots are in use.':'Inbox capacity is unavailable.',detail:'Account-wide Cloudflare and Firebase traffic quotas are not retrieved here. Their remaining allowance is unknown; a healthy endpoint is not proof of spare quota.'}];
  return rows;
}
export function initAdminServices({signal}={}){
  const root=document.querySelector('[data-service-health]');if(!root)return;
  const list=root.querySelector('[data-service-health-list]'),feedback=root.querySelector('[data-service-health-status]'),refresh=root.querySelector('[data-service-health-refresh]'),view=document.getElementById('admin-overview');let previous=0,loading=false;
  for(const [selector,target] of [['[data-management-publication]','[data-service-publication-target]'],['[data-management-reading]','[data-service-reading-target]']]){const item=document.querySelector(selector),destination=root.querySelector(target);if(item&&destination)destination.append(item);}
  async function load(){if(signal?.aborted||loading||view?.hidden||Date.now()-previous<60000)return;loading=true;refresh.disabled=true;feedback.textContent='Checking private service status…';
    try{if(!auth.currentUser)throw Error();const value=await cloudflareRequest('/admin/services',{user:auth.currentUser,signal});if(signal?.aborted)return;const rows=serviceSummary(value);list.replaceChildren();for(const row of rows){const card=document.createElement('article');card.className='service-health-card';card.dataset.tone=row.tone;for(const [tag,text] of [['h4',row.title],['p',row.text],['p',row.detail]]){const item=document.createElement(tag);item.textContent=text;card.append(item);}list.append(card);}previous=Date.now();feedback.textContent='Service data checked at '+time(value.checkedAt)+'. Provider data has its own timestamp.';}
    catch{if(!signal?.aborted)feedback.textContent='Private service status is unavailable. This does not prove that publishing or email has failed. Check the existing publication status below and reconnect to try again.';}
    finally{if(!signal?.aborted){loading=false;refresh.disabled=false;}}
  }
  refresh.addEventListener('click',load,{signal});const observer=new MutationObserver(()=>{if(!view.hidden)load();});observer.observe(view,{attributes:true,attributeFilter:['hidden']});signal?.addEventListener('abort',()=>{observer.disconnect();list.replaceChildren();feedback.textContent='Sign in to view private service status.';},{once:true});load();
}
