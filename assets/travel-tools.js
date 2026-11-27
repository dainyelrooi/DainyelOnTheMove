import {space} from './site-environment.js';
import {LIST_KEY,PACK_KEY,PACKING,savedItems,updateSaved,packingItems,readingUrl,premiereCalendar} from './travel-tools-model.js';
const preview=()=>window.top!==window.self||new URLSearchParams(location.search).has('website-preview')||/\/(?:admin|studio)(?:[/.]|$)/.test(location.pathname);
const node=(tag,text)=>{const item=document.createElement(tag);if(text)item.textContent=text;return item;};
const read=key=>{try{return localStorage.getItem(key);}catch{return null;}};
function store(key,value){try{const json=JSON.stringify(value);localStorage.setItem(key,json);if(localStorage.getItem(key)!==json)throw Error();}catch{throw Error('Your browser could not save this choice. Check its storage settings.');}}
const status=(selector,text)=>{const item=document.querySelector(selector);if(item)item.textContent=text;};
async function offline(){return import('./offline-reader.js');}
function drawSaved(){
  const list=document.querySelector('[data-saved-list]');if(!list)return;list.replaceChildren();const items=savedItems(read(LIST_KEY));
  status('[data-saved-status]',items.length?items.length+' saved '+(items.length===1?'article.':'articles.'):'Your list is empty. Save an article while reading.');
  for(const item of items){const li=node('li'),link=node('a',item.title),remove=node('button','Remove');link.href=item.url;remove.type='button';remove.className='secondary-button';remove.setAttribute('aria-label','Remove '+item.title+' from saved reading');remove.addEventListener('click',()=>{try{store(LIST_KEY,updateSaved(savedItems(read(LIST_KEY)),item,false));drawSaved();const feedback=document.querySelector('[data-saved-status]');feedback.tabIndex=-1;feedback.focus();}catch(error){status('[data-saved-status]',error.message);}});li.append(link,remove);list.append(li);}
}
function initPacking(){for(const root of document.querySelectorAll('[data-packing-tool]')){
  const list=root.querySelector('[data-packing-list]'),feedback=root.querySelector('[data-packing-status]');let checked=packingItems(read(PACK_KEY));
  const summary=()=>feedback.textContent=checked.length+' of '+PACKING.length+' items ticked. Saved in this browser.';
  for(const [id,title] of PACKING){const li=node('li'),label=node('label'),input=node('input');input.type='checkbox';input.checked=checked.includes(id);input.addEventListener('change',()=>{const next=input.checked?[...checked,id]:checked.filter(value=>value!==id);try{store(PACK_KEY,{version:1,checked:next});checked=next;summary();}catch(error){input.checked=checked.includes(id);feedback.textContent=error.message;}});input.dataset.packingId=id;label.append(input,node('span',title));li.append(label);list.append(li);}
  root.querySelector('[data-packing-reset]').addEventListener('click',()=>{try{store(PACK_KEY,{version:1,checked:[]});checked=[];list.querySelectorAll('input').forEach(input=>input.checked=false);summary();}catch(error){feedback.textContent=error.message;}});
  root.querySelector('[data-packing-print]').addEventListener('click',()=>{root.open=true;window.print();});summary();
}}
async function drawOffline(){
  const list=document.querySelector('[data-offline-list]');if(!list)return;
  try{const {offlineRequest}=await offline(),{items}=await offlineRequest('READING_LIST');list.replaceChildren();status('[data-offline-status]',items.length?items.length+' reading '+(items.length===1?'copy':'copies')+' saved.':'No offline copies saved yet.');
    for(const item of items){const li=node('li'),link=node('a',item.title),remove=node('button','Remove copy'),until=node('small','Available until '+new Date(item.expiresAt).toLocaleString('en-GB')+'.');link.href=item.url;remove.type='button';remove.className='secondary-button';remove.setAttribute('aria-label','Remove offline copy of '+item.title);remove.addEventListener('click',async()=>{remove.disabled=true;try{await offlineRequest('READING_REMOVE',{url:item.url});await drawOffline();}catch(error){status('[data-offline-status]',error.message);remove.disabled=false;}});li.append(link,remove,until);list.append(li);}
  }catch(error){status('[data-offline-status]',error.message);}
}
function articleActions(){
  const url=readingUrl(location.pathname),root=document.querySelector('[data-published-entry].cms-story')||document.querySelector('main');
  if(!url||!root||url.startsWith('/entry/')&&!root.matches('.cms-story')){document.querySelectorAll('[data-reading-save-actions]').forEach(item=>item.remove());return;}
  const title=root.querySelector('h1')?.textContent.trim();if(!title||root.querySelector('[data-reading-save-actions]'))return;
  const actions=node('div'),save=node('button'),offlineButton=node('button','Save offline'),feedback=node('p');actions.className='reading-save-actions';actions.dataset.readingSaveActions='';actions.dataset.editorStatic='';feedback.setAttribute('role','status');save.type=offlineButton.type='button';offlineButton.className='secondary-button';
  const draw=()=>{const saved=savedItems(read(LIST_KEY)).some(item=>item.url===url);save.textContent=saved?'Saved · remove':'Save for later';save.setAttribute('aria-pressed',String(saved));};
  save.addEventListener('click',()=>{try{const rows=savedItems(read(LIST_KEY)),wanted=!rows.some(item=>item.url===url);store(LIST_KEY,updateSaved(rows,{url,title},wanted));draw();feedback.textContent=wanted?'Saved in this browser. Find it under Travel tools in the footer.':'Removed from your reading list.';}catch(error){feedback.textContent=error.message;}});
  offlineButton.addEventListener('click',async()=>{offlineButton.disabled=true;feedback.textContent='Preparing a simple reading copy…';try{const {saveOfflineArticle}=await offline();await saveOfflineArticle({url,title,root,space});feedback.textContent='Reading copy saved. Find it under Travel tools for up to 24 hours.';}catch(error){feedback.textContent=error.message;}finally{offlineButton.disabled=false;}});
  actions.append(save,offlineButton,feedback);(root.querySelector('.byline')||root.querySelector('h1')).after(actions);draw();window.addEventListener('storage',draw);
}
function calendarActions(){for(const root of document.querySelectorAll('[data-youtube-feature]')){
  if(root.querySelector('[data-premiere-calendar]'))continue;const link=root.querySelector('[data-premiere-link]'),title=root.querySelector('h2')?.textContent.trim();let videoId;try{videoId=new URL(link.href).searchParams.get('v');}catch{continue;}
  const button=node('button','Add premiere to calendar'),feedback=node('p');button.type='button';button.className='secondary-button';button.dataset.premiereCalendar='';button.dataset.editorStatic='';feedback.setAttribute('role','status');
  const update=()=>button.hidden=Date.parse(root.dataset.premiereAt)<=Date.now()||!videoId;
  button.addEventListener('click',()=>{try{const body=premiereCalendar({videoId,title,startsAt:root.dataset.premiereAt}),url=URL.createObjectURL(new Blob([body],{type:'text/calendar;charset=utf-8'})),download=node('a');download.href=url;download.download='dainyel-premiere-'+videoId+'.ics';download.click();setTimeout(()=>URL.revokeObjectURL(url),30000);feedback.textContent='Calendar file downloaded. Imported events do not update automatically.';}catch(error){feedback.textContent=error.message;update();}});link.after(button,feedback);update();document.addEventListener('visibilitychange',update);
}}
if(!preview()&&space!=='unsupported'){
  initPacking();drawSaved();articleActions();calendarActions();
  window.addEventListener('site:article-rendered',articleActions);
  window.addEventListener('storage',event=>{if(event.key===LIST_KEY)drawSaved();});
  if(document.querySelector('[data-tools-offline]')){
    drawOffline();document.querySelector('[data-offline-clear]').addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{await(await offline()).offlineRequest('READING_CLEAR');await drawOffline();}catch(error){status('[data-offline-status]',error.message);}finally{button.disabled=false;}});
    let prompt;const install=document.querySelector('[data-app-install]');window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;install.hidden=false;});install.addEventListener('click',async()=>{if(prompt){await prompt.prompt();prompt=null;install.hidden=true;}});
    if(navigator.onLine&&!document.documentElement.hasAttribute('data-offline-tools'))import('./visitor-notifications.js').then(module=>module.initVisitorNotifications()).catch(()=>status('[data-push-status]','Browser notifications are unavailable. You can follow the journey through Postcards.'));
    else status('[data-push-status]','Reconnect to manage browser notifications. Your saved reading and packing list remain available.');
  }
}
