import {loadJourney} from './journey-model.js';
import {archiveMoments, filterMoments} from './journey-core.js';
export async function initReplay(api) {
  const host=document.querySelector('[data-journey-replay]');
  if (!host) return;
  try {
    const model=await loadJourney();
    const moments=archiveMoments(model);
    for (const d of model.destinations.filter(d=>d.filmHref)) moments.push({id:`film-${d.id}`,destinationId:d.id,year:Math.max(...d.years),tripId:`archive-${Math.max(...d.years)}`,kind:'film',title:`${d.name} · Film`,url:'/'+d.filmHref});
    const trip=await window.publicTripReady;
    for(const stop of trip?.revealedStops || []) moments.push({id:`reveal-${stop.id}`,destinationId:null,year:Number(stop.date.slice(0,4)),tripId:trip.id,kind:'reveal',title:[stop.city,stop.country].filter(Boolean).join(', '),url:`atlas.html#reveal-${stop.id}`,revealId:stop.id});
    moments.sort((a,b)=>a.year-b.year||a.id.localeCompare(b.id));
    const fields={year:host.querySelector('[data-replay-year]'),trip:host.querySelector('[data-replay-trip]'),kind:host.querySelector('[data-replay-kind]')};
    const addOptions=(field,values)=> {for(const value of new Set(values)){const option=document.createElement('option');option.value=value;option.textContent=value;field.append(option);}};
    addOptions(fields.year,moments.map(m=>m.year));addOptions(fields.trip,moments.map(m=>m.tripId));
    for(const option of fields.trip.options){if(!option.value)continue;option.textContent=option.value.startsWith('archive-')?'Archive · '+option.value.slice(8):model.stories.find(s=>s.tripId===option.value)?.title||trip?.title||option.value;}
    let filtered=[],current=-1,restoring=false;
    const state=host.querySelector('[data-replay-state]'),list=host.querySelector('[data-replay-list]');
    const prev=host.querySelector('[data-replay-prev]'),next=host.querySelector('[data-replay-next]');
    function selectMoment(index, push=true) {
      if(!filtered.length)return;
      current=Math.max(0,Math.min(index,filtered.length-1));
      const moment=filtered[current];
      restoring=true;
      if(moment.destinationId)api.select(moment.destinationId);
      else if(moment.revealId)document.querySelector(`[data-reveal-id="${moment.revealId}"]`)?.click();
      restoring=false;
      list.querySelectorAll('li').forEach((li,i)=>{if(i===current)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
      state.textContent=`${current+1} of ${filtered.length} · ${moment.year} · ${moment.title}. Archive order within a year does not imply exact travel dates.`;
      prev.disabled=current===0;next.disabled=current===filtered.length-1;
      if(push)writeState(moment);
    }
    function writeState(moment) {
      const url=new URL(location.href);
      for(const [name,field] of Object.entries(fields)){if(field.value)url.searchParams.set(`atlas${name}`,field.value);else url.searchParams.delete(`atlas${name}`);}
      if(moment){url.searchParams.set('moment',moment.id);if(moment.destinationId)url.searchParams.set('place',moment.destinationId);}
      else {url.searchParams.delete('moment');url.searchParams.delete('place');}
      history.pushState(null,'',url);document.dispatchEvent(new CustomEvent('site:route-view'));
    }
    function render(fromUrl=false) {
      filtered=filterMoments(moments,Object.fromEntries(Object.entries(fields).map(([k,f])=>[k,f.value])));
      list.replaceChildren();
      filtered.forEach((m,i)=> {
        const li=document.createElement('li'),button=document.createElement('button'),link=document.createElement('a');
        button.type='button';button.textContent=`${m.year} · ${m.title} · ${m.kind}`;button.addEventListener('click',()=>selectMoment(i));
        link.href=m.url;link.textContent=' Open →';li.append(button,link);list.append(li);
      });
      const ids=new Set(filtered.map(m=>m.destinationId).filter(Boolean));
      api.filter(ids,Object.values(fields).some(f=>f.value));
      const wanted=new URL(location.href).searchParams.get('moment');
      const index=filtered.findIndex(m=>m.id===wanted);
      current=-1;prev.disabled=true;next.disabled=!filtered.length;
      state.textContent=filtered.length ? `${filtered.length} public moments. Choose a moment or start replay. Repeated visits without exact dates stay grouped by year.` : 'No public moments match these filters. Try another year or content type.';
      if(fromUrl&&index>=0)selectMoment(index,false);
    }
    const restore=()=> {
      const params=new URL(location.href).searchParams;
      for(const [name,field]of Object.entries(fields))field.value=params.get(`atlas${name}`)||'';
      render(true);
      const place=params.get('place');if(place&&!params.get('moment')){restoring=true;api.select(place);restoring=false;}
    };
    Object.values(fields).forEach(field=>field.addEventListener('change',()=>{writeState();render();}));
    prev.addEventListener('click',()=>selectMoment(current-1));next.addEventListener('click',()=>selectMoment(current+1));
    host.querySelector('[data-replay-reset]').addEventListener('click',()=>{Object.values(fields).forEach(f=>f.value='');writeState();render();});
    host.querySelector('[data-replay-share]').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);state.textContent='Atlas link copied with the current filters and selection.';}catch{state.textContent='Copy this page’s address to share the current atlas view.';}});
    document.addEventListener('site:atlas-select',e=>{if(!restoring){const url=new URL(location.href);url.searchParams.set('place',e.detail.id);url.searchParams.delete('moment');history.pushState(null,'',url);}});
    addEventListener('popstate',restore);restore();host.querySelector('[data-replay-controls]').hidden=false;
  } catch {host.querySelector('[data-replay-state]').textContent='Replay is temporarily unavailable. The map and visited-place list still work.';}
}
