import {countryFor,countries} from './visited-model.js';
// Only explicit country names/aliases, never two-letter substrings or GPS.
export function countryForPlace(place){
  const direct=countryFor(place);if(direct)return direct;
  for(const part of String(place||'').split(/[,·|/]/)){const country=countryFor(part.trim());if(country)return country;}
  return null;
}
export function atlasHref(place){const country=countryForPlace(place);return country?'/atlas?place='+encodeURIComponent(country.baseId||'country-'+country.code.toLowerCase())+'#map':null;}
export function linkPublishedDestinations(destinations,entries){
  const latest=new Map();
  for(const entry of [...entries].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))){
    const country=countryForPlace(entry.place);if(country&&!latest.has(country.code)&&/^entry-[a-f0-9]{32}$/.test(entry.id))latest.set(country.code,entry);
  }
  return destinations.map(place=>{
    const country=countries.find(c=>c.baseId===place.id||'country-'+c.code.toLowerCase()===place.id)||countryFor(place.name),entry=country&&latest.get(country.code);
    return entry?{...place,storyHref:'/entry/'+entry.id,storyStatus:entry.kind==='blog'?'Travel story':entry.kind==='fact'?'Did you know?':'Field Note',storyText:entry.title,storyLink:'Read the latest entry →'}:place;
  });
}
