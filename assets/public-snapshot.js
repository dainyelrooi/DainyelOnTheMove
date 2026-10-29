/* Last approved public copies only. Missing/partial/expired data is unavailable,
 * never an invented empty feed. No private data or browser persistence. */
const MAX_AGE=24*60*60*1000,MAX_ROWS=500;
const names={qa:'qa.json',cms:'cms.json',website:'website.json'};
const loads=new Map();
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const keys=(value,allowed)=>object(value)&&Object.keys(value).every(key=>allowed.includes(key));
const text=(value,max=6000)=>typeof value==='string'&&value.length<=max;
const identifier=value=>text(value,80)&&/^[A-Za-z0-9_-]+$/.test(value);
const timestamp=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value)&&Number.isFinite(Date.parse(value));
const rows=value=>Array.isArray(value)&&value.length<=MAX_ROWS;
const dates=value=>['createdAt','answeredAt','publishedAt','updatedAt'].every(key=>!own(value,key)||timestamp(value[key]));
export function publicMediaSrc(value){return typeof value==='string'&&/^\/assets\/public-content\/[a-f0-9]{64}\.webp$/.test(value)?value:null;}
const photo=value=>keys(value,['id','src','alt','width','height'])&&/^photo-[a-f0-9]{32}$/.test(value.id)&&publicMediaSrc(value.src)&&text(value.alt,300)&&Number.isInteger(value.width)&&value.width>0&&value.width<=2400&&Number.isInteger(value.height)&&value.height>0&&value.height<=2400;
function envelope(value,space,now){
  return object(value)&&value.version===1&&value.complete===true&&value.space===space&&/^[a-f0-9]{16,64}$/.test(value.generation)&&timestamp(value.generatedAt)&&Date.parse(value.generatedAt)<=now+300000&&now-Date.parse(value.generatedAt)<=MAX_AGE;
}
function question(value){return keys(value,['id','status','topic','question','answer','createdAt','answeredAt','publicationConsent'])&&identifier(value.id)&&value.status==='published'&&value.publicationConsent===true&&text(value.topic,80)&&text(value.question,6000)&&text(value.answer,12000)&&dates(value);}
function reply(value){return keys(value,['id','status','displayName','message','createdAt'])&&identifier(value.id)&&value.status==='published'&&text(value.displayName,80)&&text(value.message,6000)&&dates(value);}
function thread(value){return keys(value,['id','status','topic','question','displayName','createdAt','replies'])&&identifier(value.id)&&value.status==='published'&&text(value.topic,80)&&text(value.question,6000)&&text(value.displayName,80)&&dates(value)&&rows(value.replies)&&value.replies.every(reply);}
const entryFields=['id','version','kind','title','excerpt','body','place','sources','videoUrl','photoIds','photoPlacements','heroPhotoId','heroLayout','heroPosition','storyLabel','tripPeriod','publishedAt','updatedAt','photos'];
function entry(value){return keys(value,entryFields)&&/^entry-[a-f0-9]{32}$/.test(value.id)&&value.version===1&&['blog','field-note','fact'].includes(value.kind)&&text(value.title,140)&&text(value.excerpt,320)&&text(value.body,60000)&&text(value.place,100)&&text(value.sources,3000)&&text(value.videoUrl,500)&&text(value.storyLabel,120)&&text(value.tripPeriod,80)&&['split','wide'].includes(value.heroLayout)&&['top','center','bottom'].includes(value.heroPosition)&&rows(value.photoIds)&&value.photoIds.length<=12&&new Set(value.photoIds).size===value.photoIds.length&&value.photoIds.every(id=>/^photo-[a-f0-9]{32}$/.test(id))&&Array.isArray(value.photoPlacements)&&value.photoPlacements.length===value.photoIds.length&&value.photoPlacements.every(n=>Number.isInteger(n)&&n>=-1&&n<=24)&&text(value.heroPhotoId,38)&&(!value.heroPhotoId||value.photoIds.includes(value.heroPhotoId))&&rows(value.photos)&&value.photos.length===value.photoIds.length&&new Set(value.photos.map(item=>item.id)).size===value.photos.length&&value.photos.every(photo)&&value.photos.every(item=>value.photoIds.includes(item.id))&&timestamp(value.publishedAt)&&dates(value);}
function summary(value){return keys(value,['id','version','kind','title','excerpt','place','coverPhotoId','publishedAt','updatedAt','coverPhoto'])&&/^entry-[a-f0-9]{32}$/.test(value.id)&&value.version===1&&['blog','field-note','fact'].includes(value.kind)&&text(value.title,140)&&text(value.excerpt,320)&&timestamp(value.publishedAt)&&dates(value)&&(!value.coverPhoto||photo(value.coverPhoto)&&value.coverPhoto.id===value.coverPhotoId);}
function section(value){return keys(value,['id','pageId','values','photoIds','media'])&&identifier(value.id)&&identifier(value.pageId)&&object(value.values)&&Object.keys(value.values).length<=40&&Object.entries(value.values).every(([key,item])=>identifier(key)&&text(item,12000))&&rows(value.photoIds)&&value.photoIds.length<=12&&rows(value.media)&&value.media.length<=12&&value.media.every(item=>keys(item,['id','sectionId','src','alt','width','height'])&&item.sectionId===value.id&&photo(Object.fromEntries(Object.entries(item).filter(([key])=>key!=='sectionId')))&&value.photoIds.includes(item.id));}
function validData(value,domain,space,now){
  const base=['version','complete','space','generation','generatedAt'];
  if(!envelope(value,space,now))return false;
  if(domain==='qa')return keys(value,[...base,'questions','threads'])&&rows(value.questions)&&value.questions.every(question)&&rows(value.threads)&&value.threads.every(thread);
  if(domain==='cms')return keys(value,[...base,'entries','summaries'])&&rows(value.entries)&&value.entries.every(entry)&&rows(value.summaries)&&value.summaries.every(summary)&&value.summaries.every(item=>value.entries.some(saved=>saved.id===item.id));
  if(domain==='website')return keys(value,[...base,'sections'])&&rows(value.sections)&&value.sections.every(section);
  return false;
}
async function json(path,maxBytes){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);
  try{
    const response=await fetch(path,{cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});
    if(!response.ok||Number(response.headers?.get('content-length')||0)>maxBytes)return null;
    const raw=await response.text();if(new TextEncoder().encode(raw).byteLength>maxBytes)return null;return JSON.parse(raw);
  }finally{clearTimeout(timer);}
}
export async function readPublicSnapshot(domain,{space}={}){
  if(!own(names,domain)||!['production','staging'].includes(space))return null;
  const key=space+':'+domain;
  if(!loads.has(key))loads.set(key,(async()=>{
    try{
      const manifest=await json('/data/public-content/manifest.json',16384),now=Date.now();
      if(!keys(manifest,['version','complete','space','generation','generatedAt','domains'])||!envelope(manifest,space,now)||!keys(manifest.domains,Object.keys(names))||Object.keys(manifest.domains).length!==3||manifest.domains[domain]!==names[domain])return null;
      const value=await json('/data/public-content/'+names[domain],4*1024*1024);
      if(!validData(value,domain,space,Date.now())||value.generation!==manifest.generation||value.generatedAt!==manifest.generatedAt)return null;
      return value;
    }catch{return null;}
  })());
  const pending=loads.get(key),value=await pending;
  if(value&&envelope(value,space,Date.now()))return value;
  // A deliberate retry can discover a first copy or a recovered CDN. Never
  // keep a failed/expired result for the lifetime of an otherwise open page.
  if(loads.get(key)===pending)loads.delete(key);
  return null;
}
export function snapshotDocs(records){
  return records.map(record=>({id:record.id,data:()=>Object.fromEntries(Object.entries(record).filter(([key])=>key!=='id').map(([key,value])=>{
    if(['createdAt','answeredAt','publishedAt','updatedAt'].includes(key)&&timestamp(value)){const millis=Date.parse(value);return[key,{toMillis:()=>millis,toDate:()=>new Date(millis)}];}
    return[key,value];
  }))}));
}
