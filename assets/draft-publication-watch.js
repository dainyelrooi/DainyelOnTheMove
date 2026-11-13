import {collection,doc,query,where,documentId,limit,onSnapshot} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
// One bounded query per ten visible drafts, rather than a database-wide scan.
export function watchDraftPublications(db,space,ids,onChange){
  let active=true;const rows=new Map(),ready=new Set(),stops=[],chunks=[];
  for(let i=0;i<ids.length;i+=10)chunks.push(ids.slice(i,i+10));
  if(!chunks.length)onChange(rows,true);
  chunks.forEach((group,index)=>stops.push(onSnapshot(query(collection(db,'cmsSpaces',space,'published'),where(documentId(),'in',group),limit(10)),{includeMetadataChanges:true},snapshot=>{
    if(!active)return;if(snapshot.metadata.fromCache){ready.delete(index);onChange(rows,false);return;}
    for(const id of group)rows.delete(id);for(const row of snapshot.docs)rows.set(row.id,row.data());ready.add(index);onChange(rows,ready.size===chunks.length);
  },()=>{if(active){ready.delete(index);onChange(rows,false);}})));
  return()=>{active=false;stops.forEach(stop=>stop());rows.clear();};
}
export function watchPublicationProof(db,space,onChange){return onSnapshot(doc(db,'adminOperations',space,'status','publicReading'),{includeMetadataChanges:true},snapshot=>onChange(snapshot.metadata.fromCache?null:snapshot.data()||null),()=>onChange(null));}
