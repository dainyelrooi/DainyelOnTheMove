import {countries} from './countries.js?v=countries1';
const byCode=new Map(countries.map(country=>[country.code,country]));
const fold=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const byName=new Map(countries.flatMap(country=>country.aliases.map(name=>[fold(name),country])));
export {countries};
export function countryFor(value){return byName.get(fold(value))||null;}
export function validVisits(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>300)throw Error('Invalid visited archive');
  const clean={};
  for(const [code,years] of Object.entries(value)){
    if(!byCode.has(code)||!Array.isArray(years)||!years.length||years.length>50||new Set(years).size!==years.length||years.some(year=>!Number.isSafeInteger(year)||year<1900||year>9999))throw Error('Invalid visited archive');
    clean[code]=[...years].sort((a,b)=>a-b);
  }
  return clean;
}
export function publicVisits(value){
  if(!value||value.version!==2||!Number.isSafeInteger(value.revision)||value.revision<1)throw Error('Unknown shared location format');
  return {version:1,revision:value.revision,visits:validVisits(value.visits)};
}
export function mergeDestinations(base,visits={}){
  const result=base.map(place=>({...place,years:[...(place.years||[])]}));
  for(const [code,years] of Object.entries(validVisits(visits))){
    const country=byCode.get(code);
    const known=result.find(place=>place.id===country.baseId||place.id==='country-'+code.toLowerCase()||place.mapName&&place.mapName===country.mapName||countryFor(place.name)?.code===code);
    if(known){
      const missing=years.filter(year=>!known.years.includes(year));
      if(missing.length){known.years=[...new Set([...known.years,...years])].sort((a,b)=>a-b);known.year=known.years.join(' · ');known.listYear=known.years.join(', ');known.tripDetails=(known.tripDetails||known.name)+'; also shared in '+missing.join(', ');}
    }else{
      result.push({id:'country-'+code.toLowerCase(),name:country.name,mapName:country.mapName,region:'Shared on the journey',kind:'destination',parent:null,years,year:years.join(' · '),listYear:years.join(', '),tripDetails:country.name+' · shared in '+years.join(', '),memory:'A destination I have shared from the road.'});
    }
  }
  return result;
}
export function nextSharedLocation(previous,selection,stamp,year=new Date().getUTCFullYear()){
  if(previous&&'version'in previous&&previous.version!==2)throw Error('Refresh before editing this location');
  const visits=previous?.version===2?publicVisits(previous).visits:{};
  const revision=(previous?.version===2?previous.revision:0)+1;
  const extra=previous?.stops?{stops:{...previous.stops},lastStopId:previous.lastStopId}:{};
  if(selection===null)return {version:2,revision,city:'',country:'',countryCode:'',updatedAt:stamp,visits,...extra};
  const country=countryFor(selection.country),city=String(selection.city||'').trim();
  if(!country||city.length>60||/[\u0000-\u001f\u007f]/.test(city)||!Number.isSafeInteger(year)||year<1900||year>9999)throw Error('Choose a recognised country and a short city name');
  visits[country.code]=[...new Set([...(visits[country.code]||[]),year])].sort((a,b)=>a-b);
  if(selection.sharedDate){
    const date=String(selection.sharedDate);if(!/^\d{4}-\d\d-\d\d$/.test(date)||!Number.isFinite(Date.parse(date))||date>new Date().toISOString().slice(0,10))throw Error('Choose an existing date for this shared trip update');
    const id=country.code+'-'+date.replaceAll('-','');extra.stops={...(extra.stops||{}),[id]:{countryCode:country.code,date:selection.dateValue||date+'T00:00:00Z'}};extra.lastStopId=id;
    if(Object.keys(extra.stops).length>200)throw Error('Review your existing shared trip updates before adding more');
  }
  return {version:2,revision,city,country:country.name,countryCode:country.code,updatedAt:stamp,visits,...extra};
}
export function removeSharedVisit(previous,code,stamp){
  const visits=publicVisits(previous).visits;if(!Object.hasOwn(visits,code))throw Error('This automatic visit is not saved');delete visits[code];
  return {...previous,visits,revision:previous.revision+1,updatedAt:stamp,...(previous.countryCode===code?{city:'',country:'',countryCode:''}:{})};
}
export function removeSharedStop(previous,id,stamp){
  if(!previous?.stops?.[id])throw Error('This trip update is not saved');const stops={...previous.stops};delete stops[id];return{...previous,stops,lastStopId:id,revision:previous.revision+1,updatedAt:stamp};
}
export function sharedStops(source){
  return Object.entries(source?.stops||{}).flatMap(([id,stop])=>{const country=byCode.get(stop.countryCode),value=stop.date?.toDate?.()?.toISOString()||stop.date,date=typeof value==='string'?value.slice(0,10):'';return country&&new RegExp('^'+country.code+'-[0-9]{8}$').test(id)&&/^\d{4}-\d\d-\d\d$/.test(date)?[{id:'shared-'+id,country:country.name,date,text:'Shared from the road.',shared:true}]:[];}).sort((a,b)=>a.date.localeCompare(b.date));
}
