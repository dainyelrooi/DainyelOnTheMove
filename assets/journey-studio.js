import {api,serviceAvailable} from './journey-api.js';
import {loadJourney} from './journey-model.js';
import {parseMinor} from './journey-core.js';
let owner;
let refreshExisting, resetExisting;
export function clearJourneyStudio(){owner=null;resetExisting?.();}
export async function initJourneyStudio(user){
  owner=user;
  const host=document.getElementById('journey-studio');if(!host)return;if(host.dataset.ready){refreshExisting?.();return;}host.dataset.ready='true';
  const form=host.querySelector('form'),status=host.querySelector('[data-studio-status]'),kind=form.elements.kind,queue=host.querySelector('[data-studio-queue]'),preview=host.querySelector('[data-studio-preview]');
  let revision=0;
  const newId=()=>kind.value==='trip'?'latin-america-2026':kind.value+'-'+crypto.randomUUID().replaceAll('-','').slice(0,20);
  const type=()=>{
    host.querySelectorAll('[data-for-kind]').forEach(row=>{const active=row.dataset.forKind.split(' ').includes(kind.value);row.hidden=!active;row.querySelectorAll('input,select,textarea').forEach(input=>input.disabled=!active);});
    preview.hidden=true;host.querySelector('[data-studio-publish]').disabled=true;
  };
  kind.addEventListener('change',()=>{form.elements.id.value=newId();revision=0;type();});type();form.elements.id.value=newId();
  const model=await loadJourney();
  for(const d of model.destinations){const option=document.createElement('option');option.value=d.id;option.textContent=d.name;form.elements.destinationId.append(option);}
  const photos=new Map([...model.destinations.map(d=>d.photo),...model.journal.map(n=>n.photo),...model.postcards.map(p=>p.photo)].filter(Boolean).map(p=>[p.src,p]));
  for(const photo of photos.values()){const option=document.createElement('option');option.value=photo.src;option.textContent=photo.alt;form.elements.photo.append(option);}
  function content(){
    const v=Object.fromEntries(new FormData(form)),photo=v.photo?{src:v.photo,alt:photos.get(v.photo).alt}:undefined;
    if(v.kind==='journal')return{title:v.title,text:v.text,eventDate:v.eventDate,destinationId:v.destinationId,tripId:v.tripId,...(v.storyUrl?{storyUrl:v.storyUrl}:{}),...(photo?{photo}:{})};
    if(v.kind==='checkin')return{city:v.city,country:v.country,eventDate:v.eventDate,tripId:v.tripId};
    if(v.kind==='reveal')return{city:v.city,country:v.country,date:v.eventDate,text:v.text,...(v.storyUrl?{storyUrl:v.storyUrl}:{}),...(photo?{photos:[photo]}:{})};
    if(v.kind==='trip')return{confirmedDepartureAt:v.confirmedDepartureAt||null,endedAt:v.endedAt||null};
    if(v.kind==='postcard')return{title:v.title,subtitle:v.subtitle,sentDate:v.eventDate,paragraphs:v.text.split(/\n\s*\n/).filter(Boolean),destinationIds:[v.destinationId],storyUrls:v.storyUrl?[v.storyUrl]:[],...(photo?{photo}:{})};
    if(v.kind==='expense')return{date:v.eventDate,tripId:v.tripId,destinationId:v.destinationId,category:v.category,currency:v.currency,amountMinor:parseMinor(v.amount,v.currency),personalMinor:parseMinor(v.personal,v.currency),coverageNote:v.coverageNote};
    return{title:v.title,text:v.text,displayName:v.displayName||'A fellow traveller'};
  }
  async function refresh(){
    const requestingOwner=owner;
    try{const result=await api('/api/content',{user:requestingOwner});if(owner!==requestingOwner)return;queue.replaceChildren();
      for(const record of result.records){const button=document.createElement('button');button.type='button';button.textContent=`${record.kind} · ${record.content.title||record.content.city||record.id} · ${record.moderation}`;
        button.addEventListener('click',()=>{form.reset();kind.value=record.kind;type();form.elements.id.value=record.id;revision=record.revision;for(const [key,value]of Object.entries(record.content)){if(form.elements[key]&&typeof value!=='object')form.elements[key].value=value;}if(record.content.date)form.elements.eventDate.value=record.content.date;if(record.content.sentDate)form.elements.eventDate.value=record.content.sentDate;if(record.content.paragraphs)form.elements.text.value=record.content.paragraphs.join('\n\n');if(record.content.photo)form.elements.photo.value=record.content.photo.src;if(record.kind==='expense'){const digits=new Intl.NumberFormat('en',{style:'currency',currency:record.content.currency}).resolvedOptions().maximumFractionDigits;form.elements.amount.value=(record.content.amountMinor/10**digits).toFixed(digits);form.elements.personal.value=(record.content.personalMinor/10**digits).toFixed(digits);}form.elements.lifecycle.value=record.lifecycle||'proposed';form.elements.result.value=record.result||'';status.textContent='Entry loaded. Review your changes before publishing.';});queue.append(button);
      }
      if(!result.records.length)queue.textContent='No entries in the new content queue yet.';
    }catch(error){status.textContent=error.message;}
  }
  refreshExisting=refresh;
  resetExisting=()=>{revision=0;form.reset();queue.replaceChildren();preview.textContent='';preview.hidden=true;host.querySelector('[data-studio-publish]').disabled=true;status.textContent='Sign in to open the private publishing desk.';};
  form.addEventListener('input',()=>{preview.hidden=true;host.querySelector('[data-studio-publish]').disabled=true;});
  form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;try{preview.textContent=Object.values(content()).map(value=>Array.isArray(value)?value.map(v=>v.alt||v).join('\n'):typeof value==='object'?value?.alt||'':value).join('\n\n');preview.hidden=false;host.querySelector('[data-studio-publish]').disabled=false;status.textContent='Preview ready. Check the place, dates, photograph and wording before publishing.';}catch(error){status.textContent=error.message;}});
  for(const [selector,action]of [['[data-studio-save]','save'],['[data-studio-publish]','publish'],['[data-studio-unpublish]','unpublish'],['[data-studio-reject]','reject']])host.querySelector(selector).addEventListener('click',async()=>{
    if(!form.reportValidity())return;try{const result=await api('/api/content',{method:'POST',user:owner,body:{id:form.elements.id.value,kind:kind.value,content:content(),revision,action,...(kind.value==='challenge'?{lifecycle:form.elements.lifecycle.value,result:form.elements.result.value}:{})}});revision++;await refresh();status.textContent=result.message;preview.hidden=true;host.querySelector('[data-studio-publish]').disabled=true;}catch(error){status.textContent=error.message;}
  });
  host.querySelector('[data-studio-new]').addEventListener('click',()=>{form.reset();revision=0;form.elements.id.value=newId();type();status.textContent='New private draft.';});
  if(await serviceAvailable())refresh();else status.textContent='The private content service is prepared but not enabled. No draft or publication can be stored yet. Existing Q&A moderation remains separate below.';
}
