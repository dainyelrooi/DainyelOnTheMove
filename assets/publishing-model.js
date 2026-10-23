// Plain text is the source of truth. HTML supplied in an entry is never executed.
export const MAX_PHOTOS=12, MAX_IMAGE_BYTES=140*1024;
export const kinds={blog:'Travel story','field-note':'Field Note',fact:'Did you know?'};
const reviewHosts=['dainyelonthemove-staging.web.app','dainyelonthemove-staging.firebaseapp.com','localhost','127.0.0.1'];
export const space=reviewHosts.includes(location.hostname)?'staging':'production';
export const validId=value=>/^entry-[a-f0-9]{32}$/.test(value);
export const mediaId=value=>/^photo-[a-f0-9]{32}$/.test(value);
export const newId=prefix=>prefix+'-'+crypto.randomUUID().replaceAll('-','');
export const entryUrl=id=>'/entry/'+id;
export const presentationFields=['heroPhotoId','heroPosition','heroLayout','storyLabel','tripPeriod'];
export function normaliseEntry(value){return {...value,heroPhotoId:value.heroPhotoId??value.photoIds?.[0]??'',heroPosition:value.heroPosition||'center',heroLayout:value.heroLayout||'split',storyLabel:value.storyLabel||'',tripPeriod:value.tripPeriod||'',photoPlacements:value.photoPlacements??(value.photoIds||[]).map(()=>0)};}
export function chaptersFrom(text){
  const chapters=[{title:'Opening',text:'',index:0}];
  let fact=false;for(const line of text.split('\n')){if(/^:::fact\s/.test(line))fact=true;const heading=!fact&&line.match(/^##\s+(.+?)\s*$/);if(heading)chapters.push({title:heading[1],text:'',index:chapters.length});else chapters.at(-1).text+=line+'\n';if(line.trim()===':::')fact=false;}
  return chapters;
}
export function readingMinutes(entry){const text=[entry.excerpt,entry.body].join(' ').replace(/https:\/\/\S+/g,'').replace(/[:*#[\]()>_-]/g,' ');return Math.max(1,Math.ceil((text.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu)||[]).length/200));}
export function element(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
export function safeLink(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function validateEntry(value,{complete=true}={}){
  value=normaliseEntry(value);
  if(!kinds[value.kind])throw Error('Choose an entry type.');
  for(const [key,min,max] of [['title',1,140],['excerpt',10,320],['body',10,60000],['place',0,100],['sources',0,3000],['videoUrl',0,500]])if(typeof value[key]!=='string'||value[key].trim().length<(complete?min:0)||value[key].length>max)throw Error('Check the '+key+' field and its length.');
  if(!Array.isArray(value.photoIds)||value.photoIds.length>MAX_PHOTOS||value.photoIds.some(id=>!mediaId(id))||new Set(value.photoIds).size!==value.photoIds.length)throw Error('Choose up to twelve different photos.');
  if(complete&&value.videoUrl){const u=new URL(value.videoUrl);if(!safeLink(value.videoUrl)||!['www.youtube.com','youtube.com','youtu.be','vimeo.com','www.vimeo.com'].includes(u.hostname))throw Error('Use a YouTube or Vimeo video link.');}
  if(complete&&value.sources.split('\n').filter(Boolean).some(url=>!safeLink(url.trim())))throw Error('Put one complete HTTPS source link on each line.');
  if(!['split','wide'].includes(value.heroLayout)||!['top','center','bottom'].includes(value.heroPosition))throw Error('Choose a banner layout and crop.');
  if(typeof value.heroPhotoId!=='string'||value.heroPhotoId&&!value.photoIds.includes(value.heroPhotoId))throw Error('Choose a banner from this entry’s photographs.');
  for(const [key,max] of [['storyLabel',120],['tripPeriod',80]])if(typeof value[key]!=='string'||value[key].length>max)throw Error('Check the '+key+' field.');
  if(!Array.isArray(value.photoPlacements)||value.photoPlacements.length!==value.photoIds.length||value.photoPlacements.some(n=>!Number.isInteger(n)||n< -1||n>24))throw Error('Choose where each photograph appears.');
  const chapters=chaptersFrom(value.body);
  if(complete&&(chapters.length>25||chapters.some(c=>c.title.length>140)))throw Error('Use up to 24 chapters, with headings no longer than 140 characters.');
  if(complete&&value.photoPlacements.some(n=>n>=chapters.length))throw Error('A photo refers to a removed chapter. Choose a new position for that photo.');
  if(complete)for(const block of value.body.matchAll(/^:::fact\s+(.+)\n([\s\S]*?)\n:::$/gm)){if(!block[2].match(/^Source:\s*(https:\/\/\S+)\s*$/m)||!safeLink(block[2].match(/^Source:\s*(https:\/\/\S+)\s*$/m)[1]))throw Error('Add a complete HTTPS source to each fact card.');}
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
export function renderArticle(target,value,photos=[],{prefix='entry',preview=false}={}){
  const entry=normaliseEntry(value),chapters=chaptersFrom(entry.body),byId=new Map(photos.filter(Boolean).map((p,index)=>[p.id||entry.photoIds[index],p]));
  target.replaceChildren();target.classList.add('publishing-article','article-page','cms-story');target.dataset.heroLayout=entry.heroLayout;
  const masthead=element('section',undefined,'story-masthead'),grid=element('div',undefined,'wrap masthead-grid'),copy=element('div',undefined,'masthead-copy'),title=element('h1',entry.title),meta=element('div',undefined,'story-meta');title.id=prefix+'-title';
  copy.append(element('span',entry.storyLabel||[kinds[entry.kind],entry.place].filter(Boolean).join(' · '),'eyebrow'),title,element('p',entry.excerpt),element('p','Words & photographs by Dainyel','story-byline'));
  if(entry.tripPeriod)meta.append(element('span',entry.tripPeriod));
  if(entry.place)meta.append(element('span',entry.place));meta.append(element('span','Approx. '+readingMinutes(entry)+' min read'));copy.append(meta);grid.append(copy);
  const hero=byId.get(entry.heroPhotoId);
  if(hero){const figure=element('figure',undefined,'masthead-photo'),image=element('img');image.src=hero.dataUrl;image.alt=hero.alt;image.width=hero.width;image.height=hero.height;image.decoding='async';image.style.objectPosition=entry.heroPosition;figure.append(image,element('figcaption',hero.alt));grid.append(figure);}else grid.classList.add('cms-no-banner');
  masthead.append(grid);target.append(masthead);
  const story=element('section',undefined,'story'),wrap=element('div',undefined,'wrap'),layout=element('div',undefined,'reading-layout'),rail=element('aside',undefined,'reading-rail'),toc=element('nav',undefined,'story-toc'),article=element('article',undefined,'story-article');
  toc.dataset.cmsToc='';toc.setAttribute('aria-label','Story chapters');toc.append(element('span','In this story','story-toc-label'));rail.setAttribute('aria-label','Reading navigation');article.dataset.readingBody='';
  for(const chapter of chapters){
    const chapterPhotos=entry.photoIds.map((id,index)=>({id,position:entry.photoPlacements[index],photo:byId.get(id)})).filter(p=>p.position===chapter.index&&p.photo);
    if(!chapter.index&&!chapter.text.trim()&&!chapterPhotos.length)continue;
    const section=element('section',undefined,'article-chapter'),prose=element('div',undefined,'article-prose');section.id=prefix+'-chapter-'+chapter.index;
    const heading=element('h2',chapter.title);heading.id=section.id+'-title';section.setAttribute('aria-labelledby',heading.id);heading.tabIndex=-1;
    if(chapter.index)prose.append(element('span','Chapter '+chapter.index,'eyebrow'),heading);else heading.className='sr-only';
    if(!chapter.index)prose.append(heading);
    const parts=chapter.text.split(/(^:::fact\s+[^\n]+\n[\s\S]*?\n:::\s*$)/gm);
    for(const part of parts){const fact=part.match(/^:::fact\s+([^\n]+)\n([\s\S]*?)\n:::\s*$/);if(!fact)renderBody(prose,part);else{const card=element('aside',undefined,'island-fact'),source=fact[2].match(/^Source:\s*(https:\/\/\S+)\s*$/m);card.append(element('span','Did you know?','eyebrow'),element('h3',fact[1]));renderBody(card,fact[2].replace(/^Source:.*$/m,''));if(source&&safeLink(source[1])){const a=element('a','Source: '+new URL(source[1]).hostname+' ↗');a.href=safeLink(source[1]);a.target='_blank';a.rel='noopener noreferrer';card.append(a);}prose.append(card);}}
    section.append(prose);
    if(chapterPhotos.length){const gallery=element('div',undefined,'story-gallery cms-gallery');gallery.id=prefix+'-gallery-'+chapter.index;for(const {photo} of chapterPhotos){const figure=element('figure'),image=element('img');image.src=photo.dataUrl;image.alt=photo.alt;image.width=photo.width;image.height=photo.height;image.loading='lazy';image.decoding='async';figure.append(image,element('figcaption',photo.alt));gallery.append(figure);}section.append(gallery);}
    const link=element('a',chapter.title);link.href='#'+section.id;toc.append(link);article.append(section);
  }
  if(entry.videoUrl){const block=element('figure',undefined,'cms-film'),a=element('a','Watch my film ↗','text-link');a.href=safeLink(entry.videoUrl);a.target='_blank';a.rel='noopener noreferrer';block.append(element('p','From this journey','eyebrow'),a,element('figcaption','Opens on YouTube or Vimeo when you choose to watch.'));article.append(block);}
  const urls=entry.sources.split('\n').map(url=>safeLink(url.trim())).filter(Boolean);
  if(urls.length){const aside=element('aside',undefined,'publishing-sources');aside.append(element('h2','Sources & further reading'));const list=element('ul');for(const url of urls){const li=element('li'),a=element('a',new URL(url).hostname+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';li.append(a);list.append(li);}aside.append(list);article.append(aside);}
  const back=element('a','Back to the opening ↑','text-link back-to-opening');back.href='#'+title.id;rail.append(toc,back);layout.append(rail,article);wrap.append(layout);story.append(wrap);target.append(story);
  if(!preview){const ending=element('section',undefined,'journal-next'),inner=element('div',undefined,'wrap');inner.append(element('span','Take the scenic route.','eyebrow'),element('h2','More stories from the road.'));for(const [text,url] of [['Explore the travel stories →','/stories'],['Read the Field Notes →','/field-notes']]){const a=element('a',text,'text-link');a.href=url;inner.append(a);}ending.append(inner);target.append(ending);}
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
