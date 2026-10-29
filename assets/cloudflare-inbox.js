import {space} from './site-environment.js';

// Only a first-party, explicitly configured Worker receives submissions.
// A failed configured request must never become a second Firestore write.
let configuration;
const attempts=new WeakMap();
const workerHost=/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.workers\.dev$/;
const cfId=/^cf-[a-f0-9]{32}$/;
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);
function problem(code,reference){const error=new Error(code);error.code=code;if(reference)error.reference=reference;return error;}
function endpoint(value){
  if(value===null)return null;
  if(!plain(value)||Object.keys(value).length!==1||typeof value.url!=='string')throw problem('cloudflare-configuration');
  const url=new URL(value.url);
  if(url.protocol!=='https:'||!workerHost.test(url.hostname)||url.port||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw problem('cloudflare-configuration');
  return url.origin;
}
async function boundedJson(response,maxBytes){
  if(Number(response.headers.get('content-length'))>maxBytes)throw problem('cloudflare-response');
  const reader=response.body?.getReader();let bytes=0,parts=[];
  if(reader){try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>maxBytes)throw problem('cloudflare-response');parts.push(value);}}finally{await reader.cancel().catch(()=>{});}
    const body=new Uint8Array(bytes);let offset=0;for(const part of parts){body.set(part,offset);offset+=part.byteLength;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body));}
  const text=await response.text();if(new TextEncoder().encode(text).byteLength>maxBytes)throw problem('cloudflare-response');return JSON.parse(text);
}
export async function getCloudflareConfig(){
  if(!['production','staging'].includes(space))return null;
  if(!configuration)configuration=(async()=>{
    const response=await fetch('/data/cloudflare.json',{cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(8000)});
    if(response.status===404)return null;
    if(!response.ok)throw problem('cloudflare-configuration');
    const value=await boundedJson(response,4096);
    if(!plain(value)||value.schemaVersion!==1||Object.keys(value).length!==3||!own(value,'staging')||!own(value,'production'))throw problem('cloudflare-configuration');
    const staging=endpoint(value.staging),production=endpoint(value.production);
    if(staging&&production&&staging===production)throw problem('cloudflare-configuration');
    return space==='production'?production:staging;
  })();
  try{return await configuration;}catch(error){configuration=undefined;throw error;}
}
export async function cloudflareRequest(path,{method='GET',body,user,signal}={}){
  const base=await getCloudflareConfig();if(!base)return null;
  if(!/^\/(?:public|submissions|admin\/submissions(?:\/cf-[a-f0-9]{32})?)(?:\?[^#]*)?$/.test(path))throw problem('cloudflare-path');
  const headers={Accept:'application/json'};
  if(method!=='GET'||path.startsWith('/admin/')){
    const [{appCheck},{getToken}]=await Promise.all([import('../js/firebase.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-check.js')]);
    headers['X-Firebase-AppCheck']=(await getToken(appCheck,false)).token;
  }
  if(path.startsWith('/admin/')){if(!user)throw problem('cloudflare-owner');headers.Authorization='Bearer '+await user.getIdToken();}
  if(body!==undefined)headers['Content-Type']='application/json';
  const response=await fetch(base+path,{method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{}),credentials:'omit',redirect:'error',cache:'no-store',signal:signal||AbortSignal.timeout(12000)});
  if(!response.ok){
    const error=problem('cloudflare-http-'+response.status);
    try{const value=await boundedJson(response,4096);if(typeof value?.error==='string'&&/^[a-z-]{1,60}$/.test(value.error))error.reason=value.error;}catch{}
    throw error;
  }
  return boundedJson(response,1024*1024);
}
function timestamp(value){const time=Date.parse(value);return typeof value==='string'&&Number.isFinite(time)&&time<=Date.now()+60000;}
function publicRecord(row,kind){
  if(!plain(row)||!cfId.test(row.id)||row.status!=='published'||row.publicationConsent!==true||!timestamp(row.createdAt))return false;
  if(kind==='reply')return typeof row.parentId==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(row.parentId)&&typeof row.displayName==='string'&&row.displayName.length>=2&&row.displayName.length<=40&&typeof row.message==='string'&&row.message.length>=10&&row.message.length<=1000;
  if(typeof row.topic!=='string'||typeof row.question!=='string'||row.question.length<10||row.question.length>1000)return false;
  if(kind==='question')return typeof row.answer==='string'&&row.answer.length>=1&&row.answer.length<=3000&&timestamp(row.answeredAt);
  return typeof row.displayName==='string'&&row.displayName.length>=2&&row.displayName.length<=40&&Array.isArray(row.replies)&&row.replies.length<=100&&row.replies.every(reply=>publicRecord({...reply,parentId:row.id},'reply'));
}
export async function readCloudflarePublic(){
  const value=await cloudflareRequest('/public');if(value===null)return null;
  if(!plain(value)||!['questions','threads','replies'].every(key=>Array.isArray(value[key])&&value[key].length<=250)||!value.questions.every(row=>publicRecord(row,'question'))||!value.threads.every(row=>publicRecord(row,'thread'))||!value.replies.every(row=>publicRecord(row,'reply')))throw problem('cloudflare-response');
  return value;
}
function release(form,attempt){for(const [field,readOnly,disabled] of attempt.fields){if('readOnly' in field)field.readOnly=readOnly;field.disabled=disabled;}attempts.delete(form);}
export async function submitCloudflareSubmission(form,payload){
  const base=await getCloudflareConfig();if(!base)return null;
  let attempt=attempts.get(form);
  if(!attempt){
    const requestId=crypto.randomUUID().replaceAll('-','');
    attempt={body:Object.freeze({...payload,requestId}),fields:[...form.querySelectorAll('input,textarea,select')].map(field=>[field,field.readOnly,field.disabled])};
    attempts.set(form,attempt);
    for(const [field]of attempt.fields){if(['checkbox','radio'].includes(field.type)||field.tagName==='SELECT')field.disabled=true;else if('readOnly'in field)field.readOnly=true;}
  }
  try{
    const result=await cloudflareRequest('/submissions',{method:'POST',body:attempt.body});
    if(!result||result.id!=='cf-'+attempt.body.requestId||result.status!=='pending')throw problem('cloudflare-response');
    if(form.dataset){delete form.dataset.cloudflareError;delete form.dataset.cloudflareReason;}
    release(form,attempt);return result;
  }catch(error){
    // A bounded diagnostic category, never the error object, token or payload.
    if(form.dataset)form.dataset.cloudflareError=/^(?:cloudflare-[a-z0-9-]+|appCheck\/[a-z0-9-]+)$/.test(error?.code||'')?error.code:'connection';
    if(form.dataset&&error.reason)form.dataset.cloudflareReason=error.reason;
    error.reference='cf-'+attempt.body.requestId;
    // Validation failures are known refusals. Uncertain writes keep the exact
    // immutable payload and ID for a deliberate same-request retry.
    if(['cloudflare-http-400','cloudflare-http-410','cloudflare-http-413','cloudflare-http-422'].includes(error.code))release(form,attempt);
    throw error;
  }
}
export function cloudflareSubmissionError(error){
  if(error?.code==='cloudflare-http-410')return 'This earlier submission has been removed. Your text is still here; you may choose to send a new question.';
  if(error?.reference)return 'Receipt could not be confirmed. Your text is still here. Retry this same request; it will not create a second submission. Reference: '+error.reference+'.';
  return 'The question service could not connect. Your text is still here. Please try again shortly.';
}
