// Local visitor choices only: no accounts, tracking or remote database.
export const LIST_KEY='dotm-reading-list-v1',PACK_KEY='dotm-packing-list-v1';
export const MAX_SAVED=40,OFFLINE_LIFETIME=86400000;
export const PACKING=[['documents','Passport and travel documents'],['copies','An offline copy of important bookings'],['phone','Phone and charging cable'],['adapter','Plug adapter for your destination'],['power','Power bank — check your airline’s rules'],['layers','Clothes and a light extra layer'],['rain','Rain protection'],['shoes','Comfortable walking shoes'],['toiletries','Your usual toiletries'],['sun','Sun protection'],['bottle','Reusable water bottle'],['laundry','Laundry strips and a small laundry bag']];
export function readingUrl(value){
  if(typeof value!=='string'||value.length>180||!/^\/[a-z0-9/-]+$/.test(value)||value.includes('//')||value.includes('/../'))return null;
  const path=value.replace(/\/$/,'');
  return /^\/entry\/entry-[a-f0-9]{32}$/.test(path)||/^\/(?:thailand|thailand-solo|bali|philippines|note-[a-z0-9-]+|postcard-[a-z0-9-]+)$/.test(path)?path:null;
}
export function savedItems(raw){
  try{const value=JSON.parse(raw);if(value?.version!==1||!Array.isArray(value.items))return[];
    const seen=new Set();return value.items.filter(row=>row&&readingUrl(row.url)===row.url&&typeof row.title==='string'&&row.title.trim()&&row.title.length<=180&&Number.isSafeInteger(row.savedAt)&&row.savedAt>0&&!seen.has(row.url)&&seen.add(row.url)).slice(0,MAX_SAVED).map(({url,title,savedAt})=>({url,title,savedAt}));
  }catch{return[];}
}
export function updateSaved(rows,item,save=true,now=Date.now()){
  const url=readingUrl(item?.url);if(!url)throw Error('This is not a supported public reading page.');
  const next=rows.filter(row=>row.url!==url);
  if(save){if(typeof item.title!=='string'||!item.title.trim())throw Error('The article title is unavailable.');if(next.length>=MAX_SAVED)throw Error('Your list is full. Remove an item before saving another.');next.unshift({url,title:item.title.trim().slice(0,180),savedAt:now});}
  return {version:1,items:next};
}
export function packingItems(raw){try{const value=JSON.parse(raw);return value?.version===1&&Array.isArray(value.checked)?value.checked.filter((id,index,all)=>PACKING.some(row=>row[0]===id)&&all.indexOf(id)===index):[];}catch{return[];}}
const escapeIcs=value=>String(value).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
export function foldCalendarLine(line){let out='',bytes=0;for(const char of line){const count=new TextEncoder().encode(char).length;if(bytes+count>75){out+='\r\n ';bytes=1;}out+=char;bytes+=count;}return out;}
export function premiereCalendar({videoId,title,startsAt},now=Date.now()){
  const start=Date.parse(startsAt);if(!/^[A-Za-z0-9_-]{11}$/.test(videoId)||typeof title!=='string'||!title.trim()||title.length>180||!Number.isFinite(start)||start<now)throw Error('This premiere is no longer in the future.');
  const stamp=time=>new Date(time).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//DainyelOnTheMove//Public premieres//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT','UID:youtube-'+videoId+'@dainyelonthemove.com','DTSTAMP:'+stamp(now),'DTSTART:'+stamp(start),'SUMMARY:'+escapeIcs(title),'URL:https://www.youtube.com/watch?v='+videoId,'DESCRIPTION:Watch this publicly announced premiere on YouTube. Imported calendar events do not update automatically.','END:VEVENT','END:VCALENDAR'];
  return lines.map(foldCalendarLine).join('\r\n')+'\r\n';
}
