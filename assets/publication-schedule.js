import {validateEntry,presentationFields} from './publishing-model.js';
import {localToDate} from './content-calendar-model.js';
export const scheduleFields=['kind','title','excerpt','place','body','sources','videoUrl','photoIds','photoPlacements',...presentationFields];
export function publicationPayload(entry){const checked=validateEntry(entry);return {version:1,...Object.fromEntries(scheduleFields.map(key=>[key,checked[key]]))};}
export function publicationDate(value,now=Date.now()){
  const date=localToDate(value);
  if(date.getTime()<now+5*60000||date.getTime()>now+90*86400000)throw Error('Choose a publication time between five minutes and 90 days ahead, in Europe/Amsterdam.');
  return date;
}
export function sameSchedule(a,b){return a?.draftRevision===b?.draftRevision&&a?.scheduledAt?.isEqual(b?.scheduledAt)&&JSON.stringify(a?.payload)===JSON.stringify(b?.payload);}

export async function deleteEntry(sdk,db,space,id,expected,current=()=>true){
  if(!/^entry-[a-f0-9]{32}$/.test(id))throw Error('Entry unavailable.');
  const ref=kind=>sdk.doc(db,'cmsSpaces',space,kind,id);
  await sdk.runTransaction(db,async tx=>{
    const draft=await tx.get(ref('drafts')),published=await tx.get(ref('published')),schedule=await tx.get(ref('entrySchedules'));
    if(!current()||!draft.exists()||draft.data().revision!==expected)throw Error('The saved entry changed. Reopen it before deleting.');
    if(published.exists()){tx.delete(ref('published'));tx.delete(ref('summaries'));if(sdk.serverTimestamp)tx.set(sdk.doc(db,'cmsSpaces',space,'siteChanges','current'),{version:1,updatedAt:sdk.serverTimestamp()});}
    if(schedule.exists())tx.delete(ref('entrySchedules'));
    tx.delete(ref('drafts'));
  });
}

export async function deleteMail(sdk,db,space,id,expected,current=()=>true){
  if(!/^mail-[a-f0-9]{32}$/.test(id))throw Error('Postcard unavailable.');
  const ref=kind=>sdk.doc(db,'cmsSpaces',space,kind,id);
  await sdk.runTransaction(db,async tx=>{
    const draft=await tx.get(ref('mailDrafts')),job=await tx.get(ref('mailJobs')),link=await tx.get(ref('mailLinks'));
    if(!current()||!draft.exists()||draft.data().revision!==expected)throw Error('The saved Postcard changed. Reopen it before deleting.');
    if(link.exists()||job.data()?.campaignId||job.data()?.providerOnly||job.data()?.status==='processing'||job.data()?.status==='review')throw Error('This Postcard has provider history or needs review. Keep its record and open it from the calendar.');
    if(job.data()?.status==='queued')tx.update(ref('mailJobs'),{status:'cancelled',updatedAt:sdk.serverTimestamp()});
    tx.delete(ref('mailDrafts'));
  });
}
