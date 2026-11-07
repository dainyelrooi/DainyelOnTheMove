import {receiveSharedTrip,receivePublishedTripEntries} from './shared-trip.js';
import {mergeDestinations,publicVisits,validVisits} from './visited-model.js?v=visits1';
import {space} from './site-environment.js';
import {linkPublishedDestinations} from './content-destinations.js';
let initial,base=[],visits={},entries=[],authoritative=false,rendered='';
const listeners=new Set();
function render(){
  if(!base.length)return;
  const destinations=linkPublishedDestinations(mergeDestinations(base,visits),entries);
  for(const node of document.querySelectorAll('[data-destination-count]'))node.textContent=String(destinations.length);
  const signature=JSON.stringify(destinations);if(signature===rendered)return;rendered=signature;
  for(const listener of listeners)listener(destinations);
}
export function receiveSharedVisits(source){
  if(source?.version!==2)return;
  const value=publicVisits(source);authoritative=true;visits=value.visits;
  getDestinationArchive().then(render).catch(()=>{});
}
export function getDestinationArchive(){
  if(!initial)initial=(async()=>{
    await import('./travel-data.js?v=visits1');base=window.travelData.visitedDestinations;
    try{
      const response=await fetch('/data/public-content/visits.json',{cache:'no-cache'});
      if(response.ok){const value=await response.json();if(value.version===1&&value.space===space&&Number.isSafeInteger(value.revision)&&value.revision>=0){const cached=validVisits(value.visits);if(!authoritative){visits=cached;receiveSharedTrip(value);}}}
    }catch{/* Keep the authored archive when the independent public copy is unavailable. */}
    try{const response=await fetch('/data/public-content/catalog.json',{cache:'no-cache'});if(response.ok){const value=await response.json();if(value.version===1&&value.space===space&&Number.isFinite(Date.parse(value.generatedAt))&&Date.now()-Date.parse(value.generatedAt)<86400000&&Date.parse(value.generatedAt)<Date.now()+300000&&Array.isArray(value.entries)&&value.entries.length<=500){entries=value.entries;receivePublishedTripEntries(entries);}}}catch{}
    render();return base;
  })().catch(error=>{initial=null;throw error;});
  return initial.then(()=>linkPublishedDestinations(mergeDestinations(base,visits),entries));
}
export function watchDestinations(listener){
  listeners.add(listener);getDestinationArchive().then(destinations=>{if(listeners.has(listener))listener(destinations);}).catch(()=>{});
  // The existing singleton shared-location listener also carries visited years.
  if(space!=='unsupported')import('../js/location-live.js').catch(()=>{});
  return()=>listeners.delete(listener);
}
