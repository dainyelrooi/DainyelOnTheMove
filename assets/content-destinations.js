import {countryFor,countries} from './visited-model.js';
// Only explicit country names/aliases, never two-letter substrings or GPS.
export function countryForPlace(place){
  const direct=countryFor(place);if(direct)return direct;
  for(const part of String(place||'').split(/[,·|/]/)){const country=countryFor(part.trim());if(country)return country;}
  return null;
}
export function atlasHref(place){const country=countryForPlace(place);return country?'/atlas?place='+encodeURIComponent(country.baseId||'country-'+country.code.toLowerCase())+'#map':null;}
export function linkPublishedDestinations(destinations,entries){
  const latest=new Map(),facts=new Map();
  for(const entry of [...entries].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))){
    const country=countryForPlace(entry.place);if(!country||!/^entry-[a-f0-9]{32}$/.test(entry.id)||!Number.isFinite(Date.parse(entry.publishedAt))||Date.parse(entry.publishedAt)>Date.now())continue;
    if(entry.kind==='fact'){if(!facts.has(country.code))facts.set(country.code,[]);facts.get(country.code).push(entry);}
    else if(!latest.has(country.code))latest.set(country.code,entry);
  }
  return destinations.map(place=>{
    const country=countries.find(c=>c.baseId===place.id||'country-'+c.code.toLowerCase()===place.id)||countryFor(place.name),entry=country&&latest.get(country.code);
    const details={...place,countryCode:country?.code||'',facts:facts.get(country?.code)||[]};
    return entry?{...details,storyHref:'/entry/'+entry.id,storyStatus:entry.kind==='blog'?'Travel story':'Field Note',storyText:entry.title,storyLink:'Read the latest entry →'}:details;
  });
}
