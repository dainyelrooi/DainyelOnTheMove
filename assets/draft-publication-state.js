// Completed writing stays recoverable; only its active-draft classification changes.
import {entryContentKey} from './publishing-model.js';
import {samePublication} from './publication-state.js';
import {confirmedPostcard} from './postcard-status.js';
import {mailFields} from './postcard-model.js';
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
export const pageContentKey=value=>JSON.stringify([1,value?.pageId,stable(value?.values||{}),value?.photoIds||[]]);
export const contentDigest=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');
export function confirmedMailDraft(draft,job){return !!(draft&&confirmedPostcard(job)&&draft.revision===job.draftRevision&&mailFields.every(key=>(draft[key]||'')===(job.payload?.[key]||'')));}
export function validPublicationProof(proof,space,now=Date.now()){
  const at=Date.parse(proof?.checkedAt||'');return proof?.version===1&&proof.source==='public-cdn'&&proof.space===space&&['complete','partial'].includes(proof.state)&&Number.isFinite(at)&&at<=now+300000&&now-at<86400000&&/^[a-f0-9]{16,64}$/.test(proof.generation||'');
}
export async function draftPublicationState(kind,id,draft,published,proof,{space,now=Date.now()}={}){
  if(kind==='mail')return confirmedMailDraft(draft,published)?'completed':'draft';
  if(!published)return 'draft';
  const same=kind==='entries'?samePublication(draft,published):pageContentKey(draft)===pageContentKey(published);
  if(!same)return 'changed';
  if(!validPublicationProof(proof,space,now))return 'verifying';
  const digest=await contentDigest(kind==='entries'?entryContentKey(published):pageContentKey(published));
  return proof[kind]?.[id]===digest?'completed':'verifying';
}
