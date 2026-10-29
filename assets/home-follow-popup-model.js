import {calendarDay,tripState} from './journey-core.js';

export const FOLLOW_VISIBLE_MS=10000;
export const FOLLOW_IDLE_MS=1800;
export const FOLLOW_COOLDOWN_MS=24*60*60*1000;
export const FOLLOW_ALREADY_MS=30*24*60*60*1000;

export function followPhase(trip,now=Date.now()){
  if(!trip||typeof trip.id!=='string'||!trip.id||trip.id.length>100||!Number.isFinite(now)||!Number.isFinite(Date.parse(trip.departureAt)))return null;
  try{
    const state=tripState(trip,now);
    if(state.phase==='completed')return null;
    if(state.phase==='planned')return 'before';
    if(state.phase==='travelling')return Number.isInteger(state.day)&&state.day>=1&&state.day<=3?'departure':'follow';
    const zone=trip.timeZone||'Europe/Amsterdam';
    const plannedDay=Math.floor((Date.parse(calendarDay(now,zone))-Date.parse(calendarDay(trip.departureAt,zone)))/86400000)+1;
    return plannedDay<=3?'awaiting':'follow';
  }catch{return null;}
}

export function followEligible(trip,{now=Date.now(),record=null,seenInSession=false}={}){
  if(!followPhase(trip,now)||seenInSession)return false;
  // A changed computer clock must not turn a saved dismissal into an instant reminder.
  const shown=Number(record?.shownAt),until=Number(record?.dismissedUntil);
  if(Number.isFinite(shown)&&shown>now)return false;
  if(Number.isFinite(until)&&until>now)return false;
  return true;
}

export function followEngaged({visibleMs,idleMs}){
  return Number.isFinite(visibleMs)&&visibleMs>=FOLLOW_VISIBLE_MS&&
    Number.isFinite(idleMs)&&idleMs>=FOLLOW_IDLE_MS;
}

export function followDismissal(now=Date.now(),alreadyFollowing=false){
  return {version:1,shownAt:now,dismissedUntil:now+(alreadyFollowing?FOLLOW_ALREADY_MS:FOLLOW_COOLDOWN_MS)};
}
