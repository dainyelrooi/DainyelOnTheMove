const calendarId=/^(?:mail-mail-|entry-entry-)[a-f0-9]{32}$/;
export function calendarHiddenIds(data){
  if(!data)return [];
  const ids=data.hiddenIds;
  if(data.version!==1||!Array.isArray(ids)||ids.length>500||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!calendarId.test(id)))throw Error('calendar-visibility-invalid');
  return ids;
}
export async function saveCalendarVisibility(sdk,db,space,id,hidden,current=()=>true){
  if(!['staging','production'].includes(space)||!calendarId.test(id)||typeof hidden!=='boolean')throw Error('calendar-visibility-invalid');
  if(!current())throw Error('calendar-session-changed');
  const ref=sdk.doc(db,'calendarSpaces',space,'preferences','visibility');
  return sdk.runTransaction(db,async tx=>{
    const previous=await tx.get(ref);
    if(!current())throw Error('calendar-session-changed');
    const ids=new Set(calendarHiddenIds(previous.exists()?previous.data():null));
    if(hidden)ids.add(id);else ids.delete(id);
    if(ids.size>500)throw Error('Restore an older removed item before removing another.');
    const hiddenIds=[...ids];
    tx.set(ref,{version:1,hiddenIds,updatedAt:sdk.serverTimestamp()});
    return hiddenIds;
  });
}
