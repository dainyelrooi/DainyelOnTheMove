import {space} from './site-environment.js';
const MAX_AGE=86400000;
let pending,saved;
export const catalogFresh=(value,now=Date.now())=>Number.isFinite(Date.parse(value?.generatedAt))&&Date.parse(value.generatedAt)<=now+300000&&now-Date.parse(value.generatedAt)<MAX_AGE;
export function catalogEntry(value){
  if(!value||!/^entry-[a-f0-9]{32}$/.test(value.id)||!['blog','field-note','fact'].includes(value.kind))return null;
  for(const [key,max]of [['title',140],['excerpt',320],['place',100]])if(typeof value[key]!=='string'||value[key].length>max||key!=='place'&&!value[key].trim())return null;
  let at;try{at=typeof value.publishedAt==='string'?value.publishedAt:value.publishedAt?.toDate?.().toISOString();}catch{return null;}
  if(!Number.isFinite(Date.parse(at)))return null;
  // Project only the public fields this interface actually needs.
  const photo=value.coverPhoto;
  const cover=photo&&typeof photo.src==='string'&&/^\/assets\/public-content\/[a-f0-9]{64}\.webp$/.test(photo.src)&&typeof photo.alt==='string'&&photo.alt.length<=300?{coverPhoto:{src:photo.src,alt:photo.alt}}:{};
  return{id:value.id,kind:value.kind,title:value.title,excerpt:value.excerpt,place:value.place,publishedAt:at,...cover};
}
export function parsePublishedCatalog(value,expectedSpace,now=Date.now()){
  if(!['production','staging'].includes(expectedSpace)||value?.version!==1||value.space!==expectedSpace||!catalogFresh(value,now)||!Array.isArray(value.entries)||value.entries.length>500)return null;
  const entries=value.entries.map(catalogEntry);
  if(entries.some(row=>!row)||new Set(entries.map(row=>row.id)).size!==entries.length)return null;
  return{generatedAt:value.generatedAt,entries:entries.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||a.id.localeCompare(b.id))};
}
export async function readPublishedCatalog(){
  if(saved&&catalogFresh(saved))return saved;
  if(!pending)pending=(async()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);
    try{
      const response=await fetch('/data/public-content/catalog.json',{cache:'no-cache',credentials:'omit',redirect:'error',signal:controller.signal});
      if(!response.ok||Number(response.headers?.get('content-length')||0)>2097152)return null;
      const text=await response.text();if(new TextEncoder().encode(text).byteLength>2097152)return null;
      saved=parsePublishedCatalog(JSON.parse(text),space);return saved;
    }catch{return null;}finally{clearTimeout(timer);pending=null;}
  })();
  return pending;
}
