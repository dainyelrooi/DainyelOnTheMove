// Shared, deliberately small rendering boundary for owner-authored page edits.
export {space as siteSpace} from './site-environment.js';
export const photoId=value=>/^photo-[a-f0-9]{32}$/.test(value||'');
export const sectionId=value=>/^[a-z][a-z0-9-]{0,70}-[a-f0-9]{16}$/.test(value||'');
export function safeSiteLink(value){
  if(typeof value!=='string'||value.length>1200||/[\u0000-\u0020\\]/.test(value))return null;
  if(/^#[A-Za-z0-9_-]+$/.test(value))return value;
  if(/^\/(?!\/)[A-Za-z0-9_/#?=&.%+-]*$/.test(value)&&!value.includes('..')&&!/^\/(admin|studio)(?:[/.?#]|$)/i.test(value))return value;
  try{const u=new URL(value);if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;if(u.protocol==='mailto:'&&/^mailto:[^?\s]+@[^?\s]+$/.test(value))return value;}catch{}
  return null;
}
export function safeSiteImage(value){return typeof value==='string'&&/^\/?assets\/[A-Za-z0-9_./-]+\.(webp|jpg|jpeg|png|avif)$/.test(value)&&!value.includes('..')?'/'+value.replace(/^\//,''):null;}
export function safeAnnouncementLink(value){const link=safeSiteLink(value);return link&&(link.startsWith('/')||link.startsWith('#')||link.startsWith('https:'))?link:null;}
export function siteText(node,value){
  node.replaceChildren();const pattern=/\[([^\]\n]{1,180})\]\(([^\s)]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|\n/g;let start=0;
  for(const match of value.matchAll(pattern)){
    node.append(document.createTextNode(value.slice(start,match.index)));
    if(match[1]){const href=safeSiteLink(match[2]);if(href){const a=document.createElement('a');a.textContent=match[1];a.href=href;if(href.startsWith('https:')){a.target='_blank';a.rel='noopener noreferrer';}node.append(a);}else node.append(document.createTextNode(match[1]));}
    else if(match[3]||match[4]){const tag=document.createElement(match[3]?'strong':'em');tag.textContent=match[3]||match[4];node.append(tag);}else node.append(document.createElement('br'));
    start=match.index+match[0].length;
  }
  node.append(document.createTextNode(value.slice(start)));
}
export function validateSiteValues(group,values){
  const result={};if(!values||typeof values!=='object'||Array.isArray(values))throw Error('Choose a valid page section.');
  for(const [key,value] of Object.entries(values)){
    const field=group.fields.find(f=>f.key===key);if(!field||typeof value!=='string'||value.length>8000)throw Error('This backup no longer matches this page section.');
    if(field.kind==='text'&&!value.trim())throw Error('Keep a short, readable text in each field. Use Restore original if you want to undo a change.');
    if(field.kind==='image'){
      let image;try{image=JSON.parse(value);}catch{throw Error('Choose a valid photograph.');}
      if(!image||!safeSiteImage(image.src)&&!photoId(image.src)||typeof image.alt!=='string'||image.alt.length>180||!['top','center','bottom'].includes(image.position))throw Error('Choose a photograph, a description and its crop.');
    }
    if(field.kind==='link'){
      let link;try{link=JSON.parse(value);}catch{throw Error('Check the link.');}
      const optionalEmpty=field.optional&&typeof link?.text==='string'&&typeof link?.href==='string'&&!link.text.trim()&&!link.href.trim();
      if(!optionalEmpty&&(!link||typeof link.text!=='string'||!link.text.trim()||link.text.length>(field.labelMaxLength||180)||field.headerAnnouncement&&/[\u0000-\u001f\u007f]/.test(link.text)||!(field.websiteOnly?safeAnnouncementLink(link.href):safeSiteLink(link.href))))throw Error(field.websiteOnly?'Give the announcement a single-line label of up to 60 characters and a page or HTTPS link, or clear both fields to hide it.':'Give each link a label and a valid website, HTTPS or email address.');
    }
    if(value!==field.default)result[key]=value;
  }
  return result;
}
export function referencedSitePhotos(values){return [...new Set(Object.values(values).flatMap(value=>{try{const item=JSON.parse(value);return photoId(item?.src)?[item.src]:[];}catch{return []}}))];}
