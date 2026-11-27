import {OFFLINE_LIFETIME,readingUrl} from './travel-tools-model.js';
let registration;
export async function offlineWorker(){
  if(!('serviceWorker'in navigator)||!isSecureContext)throw Error('Offline reading needs a supported secure browser.');
  if(!navigator.onLine){const existing=await navigator.serviceWorker.getRegistration('/');if(existing?.active&&new URL(existing.active.scriptURL).pathname==='/travel-worker.js')return existing;throw Error('Reconnect once to enable offline reading.');}
  if(!registration)registration=navigator.serviceWorker.register('/travel-worker.js',{type:'module',scope:'/',updateViaCache:'none'}).catch(error=>{registration=null;throw error;});
  const result=await registration;
  if(!result.active)await new Promise((resolve,reject)=>{const worker=result.installing||result.waiting,timer=setTimeout(()=>reject(Error('Offline reader is still installing. Try again.')),10000);if(!worker){clearTimeout(timer);resolve();return;}worker.addEventListener('statechange',()=>{if(['activated','redundant'].includes(worker.state)){clearTimeout(timer);worker.state==='activated'?resolve():reject(Error('Offline reader could not install.'));}});});
  return result;
}
export async function offlineRequest(type,body={}){
  const worker=(await offlineWorker()).active;if(!worker)throw Error('Offline reader is not ready.');
  return new Promise((resolve,reject)=>{const channel=new MessageChannel(),timer=setTimeout(()=>reject(Error('Offline reader did not respond. Try again.')),15000);channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();event.data?.ok?resolve(event.data):reject(Error(event.data?.error||'Offline reading is unavailable.'));};worker.postMessage({type,...body},[channel.port2]);});
}
const allowed=new Set(['ARTICLE','SECTION','DIV','H1','H2','H3','H4','H5','H6','P','FIGURE','FIGCAPTION','PICTURE','IMG','A','UL','OL','LI','BLOCKQUOTE','STRONG','EM','B','I','HR','BR','TIME','SMALL','SPAN']);
const blocked=new Set(['SCRIPT','STYLE','LINK','IFRAME','FORM','BUTTON','INPUT','SELECT','TEXTAREA','VIDEO','AUDIO','NOSCRIPT','SVG','DIALOG']);
export async function saveOfflineArticle({url,title,root,space}){
  if(!readingUrl(url)||!root||root.closest('dialog, [data-website-preview]'))throw Error('Open the published article first.');
  const now=Date.now();let expiresAt=now+OFFLINE_LIFETIME;
  if(url.startsWith('/entry/')){const {readPublicSnapshot}=await import('./public-snapshot.js'),copy=await readPublicSnapshot('cms',{space});if(!copy?.entries.some(row=>'/entry/'+row.id===url))throw Error('A fresh public copy is needed before saving this article offline.');expiresAt=Math.min(expiresAt,Date.parse(copy.generatedAt)+OFFLINE_LIFETIME);}
  const doc=document.implementation.createHTMLDocument(title),images=[];
  function copy(node,parent){
    if(node.nodeType===Node.TEXT_NODE){parent.append(doc.createTextNode(node.textContent));return;}
    if(node.nodeType!==Node.ELEMENT_NODE||node.hidden||node.getAttribute('aria-hidden')==='true'||blocked.has(node.tagName)||node.matches('.site-panel,.reading-rail,.reading-save-actions,[data-reading-toc],[data-cms-toc],.postcard-share'))return;
    if(!allowed.has(node.tagName)){for(const child of node.childNodes)copy(child,parent);return;}
    if(node.tagName==='IMG'){
      if(images.length>=3)return;let image;try{image=new URL(node.currentSrc||node.src,location.href);}catch{return;}
      if(image.origin!==location.origin||image.search||!/^\/assets\/[a-zA-Z0-9_./-]+\.(?:webp|jpg|jpeg|png)$/.test(image.pathname)||image.pathname.includes('..'))return;
      const fresh=doc.createElement('img');fresh.src=image.pathname;fresh.alt=(node.alt||'').slice(0,300);parent.append(fresh);images.push(image.pathname);return;
    }
    const fresh=doc.createElement(node.tagName.toLowerCase());
    if(node.tagName==='A'){try{const link=new URL(node.getAttribute('href'),location.href);if(link.protocol==='https:'&&!link.username&&!link.password&&link.href.length<=1000){fresh.href=link.href;fresh.rel='noopener noreferrer';}}catch{}}
    parent.append(fresh);for(const child of node.childNodes)copy(child,fresh);
  }
  const charset=doc.createElement('meta');charset.setAttribute('charset','utf-8');const viewport=doc.createElement('meta');viewport.name='viewport';viewport.content='width=device-width, initial-scale=1';const style=doc.createElement('style');style.textContent='body{margin:0;background:#fdf9f2;color:#0c1b25;font:1.1rem/1.7 system-ui,sans-serif}main,header{max-width:48rem;margin:auto;padding:1.25rem}header{border-bottom:1px solid #b6c7c4}img{display:block;max-width:100%;height:auto;margin:1rem auto}h1{font-family:Georgia,serif;font-size:2.2rem;line-height:1.2}h2,h3{line-height:1.3}a{color:#133c43;text-decoration:underline}figure{margin:1.5rem 0}figcaption{font-size:.9rem}';doc.head.append(charset,viewport,style);
  const header=doc.createElement('header'),label=doc.createElement('p'),back=doc.createElement('a');label.textContent='Saved reading copy · '+new Date(now).toLocaleString('en-GB')+'. Valid until '+new Date(expiresAt).toLocaleString('en-GB')+'. Reconnect for corrections.';back.href='/travel-tools';back.textContent='Your travel tools';header.append(label,back);const main=doc.createElement('main');copy(root,main);doc.body.append(header,main);
  await offlineRequest('READING_SAVE',{record:{url,title:title.slice(0,180),savedAt:now,expiresAt,images},html:'<!doctype html>'+doc.documentElement.outerHTML});
}
