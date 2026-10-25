// Private plan content is imported after owner sign-in, never bundled here.
import {validateCalendarPhoto} from './calendar-photo.js';
export const TIMEZONE = 'Europe/Amsterdam';
export const MAX_POSTS = 200;
export const calendarKinds={social:'Social post',task:'Task',appointment:'Appointment'};
export function calendarValueEqual(a,b){
  const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
  return JSON.stringify(stable(a))===JSON.stringify(stable(b));
}
const dateParts = new Intl.DateTimeFormat('en-CA', {timeZone:TIMEZONE, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
export function localParts(date) {
  return Object.fromEntries(dateParts.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type,p.value]));
}
export function localDate(date = new Date()) {
  const p = localParts(date); return `${p.year}-${p.month}-${p.day}`;
}
export function localInput(date) {
  const p = localParts(date); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function tomorrow(date = new Date()) {
  const day = new Date(localDate(date) + 'T12:00:00Z'); day.setUTCDate(day.getUTCDate()+1); return day.toISOString().slice(0,10);
}
export function localToDate(value) {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) throw new Error('Choose a valid date and time.');
  const target = Date.parse(value + ':00Z');
  if (!Number.isFinite(target)) throw new Error('Choose a valid date and time.');
  let candidate = target;
  for (let i=0;i<4;i++) {
    const offset = Date.parse(localInput(new Date(candidate))+':00Z') - candidate;
    candidate = target - offset;
  }
  const date = new Date(candidate);
  if (localInput(date) !== value || date.getUTCFullYear()<2020 || date.getUTCFullYear()>2100) throw new Error('That date or time does not exist in Europe/Amsterdam.');
  if([candidate-3600000,candidate+3600000].some(other=>localInput(new Date(other))===value))throw new Error('That time occurs twice during the daylight-saving change. Choose another time.');
  return date;
}
export function isDue(entry, now = new Date()) {
  return entry.remindersEnabled && !entry.scheduled && !entry.published && localDate(entry.publishAt.toDate()) <= tomorrow(now);
}
const allowed = {
  imageUrl: url => url.hostname==='static.metricool.com' && url.pathname.startsWith('/planner/'),
  designUrl: url => url.hostname==='www.canva.com' && /^\/(folder|design)\//.test(url.pathname),
  musicUrl: url => ['open.spotify.com','music.apple.com','www.youtube.com','youtube.com','youtu.be','www.top40.nl'].includes(url.hostname)
};
export function safeUrl(value, kind) {
  value=typeof value==='string'?value.trim():value;
  if (!value) return '';
  if (typeof value!=='string' || value.length>1200) throw new Error('A link in the plan is too long.');
  let url; try {url = new URL(/^https?:\/\//i.test(value)?value:'https://'+value);} catch {throw new Error('This optional link could not be read. Correct it or leave it empty.');}
  if (url.protocol!=='https:' || url.username || url.password || url.port || !allowed[kind]?.(url)) throw new Error('Links are optional. Use a Canva design/folder, a Metricool planner image or a supported music link, or leave the field empty. Upload your photo directly below.');
  return url.href;
}
function text(value, maximum, required = false) {
  if (typeof value!=='string' || value.length>maximum || (required && !value.trim())) throw new Error('A post is missing required information or contains too much text.');
  return value.trim();
}
export function validatePlanPost(raw) {
  const kind=raw.kind||'social';
  if(!Object.hasOwn(calendarKinds,kind))throw Error('Choose a social post, task or appointment.');
  const platforms=kind==='social'?(raw.platforms||['instagram']):[];
  if(!Array.isArray(platforms)||kind==='social'&&(!platforms.length||platforms.length>6||platforms.some(value=>!['instagram','youtube','tiktok','facebook','linkedin','pinterest'].includes(value))))throw Error('Choose at least one supported social channel.');
  return {
    ...(kind!=='social'?{kind}:{}),platforms:[...new Set(platforms)],photo:validateCalendarPhoto(raw.photo),
    title:text(raw.title,160,true), caption:text(raw.caption||'',5000,kind==='social'),
    publishLocal:localInput(localToDate(raw.publishLocal)),
    imageUrl:safeUrl(raw.imageUrl,'imageUrl'), designUrl:safeUrl(raw.designUrl,'designUrl'),
    musicTitle:text(raw.musicTitle||'',160), musicArtist:text(raw.musicArtist||'',160),
    musicNote:text(raw.musicNote||'',800), musicSearch:text(raw.musicSearch||'',500), musicUrl:safeUrl(raw.musicUrl||'','musicUrl')
  };
}
function htmlPosts(source) {
  // Template contents are inert. No imported elements/scripts are inserted into the page.
  const template = document.createElement('template'); template.innerHTML = source;
  const months=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
  return [...template.content.querySelectorAll('article.post')].map(article => {
    const get = selector => article.querySelector(selector)?.textContent.trim()||'';
    const match = get('.eyebrow').match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})\s*[•·]\s*(\d\d:\d\d)/i);
    const month = match && months.indexOf(match[2].toLowerCase());
    if (!match || month<0) throw new Error('A publication date in the HTML overview could not be read.');
    return {title:get('h2'),caption:get('textarea'),publishLocal:`${match[3]}-${String(month+1).padStart(2,'0')}-${match[1].padStart(2,'0')}T${match[4]}`,
      imageUrl:article.querySelector('.visual img')?.getAttribute('src')||'',designUrl:article.querySelector('.visual a')?.getAttribute('href')||'',
      musicTitle:get('.song'),musicArtist:get('.artist'),musicNote:get('.why'),musicSearch:get('.search'),musicUrl:article.querySelector('.music-actions a')?.getAttribute('href')||''};
  });
}
export function parsePlan(source, filename) {
  let rows;
  if (/\.html?$/i.test(filename)) rows=htmlPosts(source);
  else {let data;try {data=JSON.parse(source);}catch {throw new Error('Choose the original HTML overview or a valid calendar JSON export.');} if(data?.version!==1 || data.timezone!==TIMEZONE)throw new Error('This calendar export uses an unsupported format or timezone.');rows=data.posts;}
  if (!Array.isArray(rows) || rows.length<1 || rows.length>50) throw new Error('Import between 1 and 50 posts at a time.');
  return rows.map(validatePlanPost);
}
export async function importId(post) {
  const bytes=new TextEncoder().encode(post.title+'\n'+post.publishLocal+(post.kind&&post.kind!=='social'?'\n'+post.kind:''));
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return 'plan-'+[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,32);
}
