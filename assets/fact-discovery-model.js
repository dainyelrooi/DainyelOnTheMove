import {catalogEntry} from './published-catalog.js';
import {countryForPlace} from './content-destinations.js';
export function publishedFacts(entries,{country='',limit=500,now=Date.now()}={}){
  const seen=new Set();
  return (entries||[]).flatMap(raw=>{const entry=catalogEntry(raw);if(!entry||entry.kind!=='fact'||Date.parse(entry.publishedAt)>now||seen.has(entry.id))return [];seen.add(entry.id);const place=countryForPlace(entry.place);if(country&&place?.code!==country)return [];return [{...entry,country:place?.code||'',countryName:place?.name||entry.place}];}).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||a.id.localeCompare(b.id)).slice(0,limit);
}
export function factTitle(title){return String(title).replace(/^Did you know\?\s*/i,'');}
export function readingPlan(rows,selection){
  const byDate=(a,b)=>Number(b.time||0)-Number(a.time||0)||Number(a.order||0)-Number(b.order||0);
  const blogs=rows.filter(r=>r.kind==='blog').sort(byDate),notes=rows.filter(r=>r.kind==='field-note').sort(byDate),facts=rows.filter(r=>r.kind==='fact').sort(byDate);
  const visible=selection==='notes'?notes:[...blogs];
  if(selection!=='notes'&&facts.length)visible.splice(Math.min(2,visible.length),0,facts[0]);
  return {visible,ordered:[...visible,...rows.filter(r=>!visible.includes(r))]};
}

