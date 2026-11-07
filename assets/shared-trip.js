import {countryForPlace,linkPublishedDestinations} from './content-destinations.js';
import {sharedStops} from './visited-model.js';
let source=null,entries=[];
export function receivePublishedTripEntries(value){entries=value;document.dispatchEvent(new Event('site:trip-updates'));}
export function receiveSharedTrip(value){if(JSON.stringify(source?.stops||{})===JSON.stringify(value?.stops||{}))return;source=value;document.dispatchEvent(new Event('site:trip-updates'));}
export function withSharedStops(trip){
  const stops=[...(trip?.revealedStops||[])];
  for(const stop of sharedStops(source))if(!stops.some(old=>countryForPlace(old.country)?.code===countryForPlace(stop.country)?.code&&String(old.date).slice(0,10)===stop.date))stops.push(stop);
  const linked=linkPublishedDestinations(stops.map(s=>({...s,name:s.country,id:countryForPlace(s.country)?.baseId})),entries);
  return{...trip,revealedStops:stops.map((stop,i)=>({...stop,storyUrl:linked[i].storyHref||stop.storyUrl})).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')))};
}
