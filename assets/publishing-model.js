// Plain text is the source of truth. HTML supplied in an entry is never executed.
export const MAX_PHOTOS=12, MAX_IMAGE_BYTES=140*1024;
export const kinds={blog:'Travel story','field-note':'Field Note',fact:'Did you know?'};
export const space=location.hostname==='dainyelonthemove.com'||location.hostname==='www.dainyelonthemove.com'?'production':'staging';
export const validId=value=>/^entry-[a-f0-9]{32}$/.test(value);
export const mediaId=value=>/^photo-[a-f0-9]{32}$/.test(value);
export const newId=prefix=>prefix+'-'+crypto.randomUUID().replaceAll('-','');
export const entryUrl=id=>'/entry/'+id;
export function element(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
export function safeLink(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function validateEntry(value){
  if(!kinds[value.kind])throw Error('Choose an entry type.');
  for(const [key,min,max] of [['title',1,140],['excerpt',10,320],['body',10,60000],['place',0,100],['sources',0,3000],['videoUrl',0,500]])if(typeof value[key]!=='string'||value[key].trim().length<min||value[key].length>max)throw Error('Check the '+key+' field and its length.');
  if(!Array.isArray(value.photoIds)||value.photoIds.length>MAX_PHOTOS||value.photoIds.some(id=>!mediaId(id))||new Set(value.photoIds).size!==value.photoIds.length)throw Error('Choose up to twelve different photos.');
  if(value.videoUrl){const u=new URL(value.videoUrl);if(!safeLink(value.videoUrl)||!['www.youtube.com','youtube.com','youtu.be','vimeo.com','www.vimeo.com'].includes(u.hostname))throw Error('Use a YouTube or Vimeo video link.');}
  if(value.sources.split('\n').filter(Boolean).some(url=>!safeLink(url.trim())))throw Error('Put one complete HTTPS source link on each line.');
  return value;
}
function inline(parent,text){
  const pattern=/\[([^\]\n]{1,180})\]\((https:\/\/[^\s)]+)\)|\*\*([^*\n]+)\*\*/g;let start=0;
  for(const match of text.matchAll(pattern)){parent.append(document.createTextNode(text.slice(start,match.index)));if(match[3])parent.append(element('strong',match[3]));else{const href=safeLink(match[2]);if(href){const a=element('a',match[1]);a.href=href;a.target='_blank';a.rel='noopener noreferrer';parent.append(a);}else parent.append(document.createTextNode(match[0]));}start=match.index+match[0].length;}
  parent.append(document.createTextNode(text.slice(start)));
}
export function renderBody(parent,text){
  for(const part of text.split(/\n\s*\n/).filter(Boolean)){
    if(part.startsWith('## ')){const h=element('h2');inline(h,part.slice(3));parent.append(h);}
    else if(part.split('\n').every(line=>line.startsWith('- '))){const list=element('ul');for(const line of part.split('\n')){const item=element('li');inline(item,line.slice(2));list.append(item);}parent.append(list);}
    else{const p=element('p');inline(p,part);p.style.whiteSpace='pre-line';parent.append(p);}
  }
}
export function renderArticle(target,entry,photos=[]){
  target.replaceChildren();target.className='publishing-article';
  const meta=element('p',[kinds[entry.kind],entry.place].filter(Boolean).join(' · '),'eyebrow');
  target.append(meta,element('h1',entry.title),element('p',entry.excerpt,'publishing-intro'));
  if(photos.length){
    const gallery=element('div',undefined,'publishing-gallery'),stage=element('div',undefined,'publishing-stage'),image=element('img'),caption=element('p',undefined,'publishing-caption');
    image.decoding='async';stage.append(image);gallery.append(stage,caption);let current=0;
    const count=element('span',undefined,'publishing-count');count.setAttribute('role','status');count.setAttribute('aria-live','polite');
    const previous=element('button','←'),next=element('button','→');previous.type=next.type='button';previous.setAttribute('aria-label','Previous photo');next.setAttribute('aria-label','Next photo');previous.className='publishing-previous';next.className='publishing-next';
    const show=index=>{current=(index+photos.length)%photos.length;image.src=photos[current].dataUrl;image.alt=photos[current].alt;caption.textContent=photos[current].alt;count.textContent=(current+1)+' / '+photos.length;};
    previous.addEventListener('click',()=>show(current-1));next.addEventListener('click',()=>show(current+1));
    if(photos.length>1)stage.append(previous,count,next);show(0);target.append(gallery);
  }
  renderBody(target,entry.body);
  if(entry.videoUrl){const p=element('p'),a=element('a','Watch my film ↗','text-link');a.href=safeLink(entry.videoUrl);a.target='_blank';a.rel='noopener noreferrer';p.append(a);target.append(p);}
  const urls=entry.sources.split('\n').map(url=>safeLink(url.trim())).filter(Boolean);
  if(urls.length){const aside=element('aside',undefined,'publishing-sources');aside.append(element('h2','Sources & further reading'));const list=element('ul');for(const url of urls){const li=element('li'),a=element('a',new URL(url).hostname+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';li.append(a);list.append(li);}aside.append(list);target.append(aside);}
}
export async function preparePhoto(file){
  if(file.size>35*1024*1024)throw Error('Choose a photograph smaller than 35 MB.');
  let bitmap;try{bitmap=await createImageBitmap(file);}catch{throw Error('This photo format cannot be opened by this browser. Export it as JPEG, PNG or WebP first.');}
  try{
    for(const longest of [1600,1200,900])for(const quality of [.82,.65,.48]){
      const scale=Math.min(1,longest/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
      if(blob?.type==='image/webp'&&blob.size<=MAX_IMAGE_BYTES){const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});return {dataUrl,width:canvas.width,height:canvas.height,alt:'Photograph from this story'};}
    }
    throw Error('This photo could not be reduced enough. Choose a smaller export.');
  }finally{bitmap.close();}
}
