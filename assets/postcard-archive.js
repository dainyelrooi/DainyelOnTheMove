const idOk=id=>/^brevo-[1-9][0-9]{0,12}$/.test(id);
const pathOk=path=>/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)?)?(?:#[a-zA-Z0-9_-]+)?$/.test(path)&&!/^\/(admin|studio|search|postcards-form)(?:[\/#]|$)/.test(path);
const imageOk=src=>/^https:\/\/dainyelonthemove[.]com\/assets\/[a-zA-Z0-9/_-]+\.(webp|jpg|jpeg|png|avif)$/.test(src);
const el=(tag,text,className)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;};
const date=value=>new Intl.DateTimeFormat('en-GB',{dateStyle:'long',timeZone:'Europe/Amsterdam'}).format(new Date(value));
const wall=document.querySelector('[data-postcard-archive]');
if(wall){
  const collection=wall.closest('[data-postcard-collection]'),detail=document.querySelector('[data-postcard-edition]'),status=document.querySelector('[data-archive-status]');let version=0;
  async function route(){
    const match=location.hash.match(/^#edition-(brevo-[1-9][0-9]{0,12})$/),run=++version;
    if(!match){collection.hidden=false;detail.hidden=true;detail.replaceChildren();return;}
    detail.hidden=false;detail.replaceChildren(el('p','Loading this public Postcard…'));collection.hidden=true;
    try{
      const response=await fetch('/data/postcards/editions/'+match[1]+'.json',{cache:'no-cache'});if(!response.ok)throw Error();const d=await response.json();if(run!==version)return;
      if(d.id!==match[1]||!Array.isArray(d.paragraphs)||!Number.isFinite(Date.parse(d.sentAt)))throw Error();
      detail.replaceChildren();const back=el('a','← All Postcards','text-link');back.href='/postcards';detail.append(back,el('p','Sent '+date(d.sentAt),'content-date'),el('h2',d.title));
      if(d.photo&&imageOk(d.photo.src)){const image=el('img');image.src=d.photo.src;image.alt=d.photo.alt||'A photograph from this Postcard';image.width=1200;image.height=800;image.loading='lazy';detail.append(image);}
      for(const text of d.paragraphs.slice(0,70))if(typeof text==='string'&&text!==d.title)detail.append(el('p',text));
      const links=el('nav',undefined,'journey-links');links.setAttribute('aria-label','Mentioned in this Postcard');
      for(const path of (d.links||[]).slice(0,12))if(pathOk(path)){const a=el('a',path==='/'?'Visit the website →':'Explore '+path.split('#')[0].slice(1).replaceAll('-',' ')+' →');a.href=path;links.append(a);}detail.append(links);
      const join=el('a','Get the next Postcard first →','button');join.href='/#follow-trip';detail.append(join);detail.scrollIntoView({block:'start'});
    }catch{if(run===version){detail.replaceChildren(el('h2','This public edition is not available yet.'));const back=el('a','Browse the Postcards →');back.href='/postcards';detail.append(back);}}
  }
  window.addEventListener('hashchange',route);route();
  fetch('/data/postcards/index.json',{cache:'no-cache'}).then(response=>{if(!response.ok)throw Error();return response.json();}).then(index=>{
    if(index.schemaVersion!==1||!Array.isArray(index.editions))throw Error();
    for(const d of [...index.editions].reverse()){
      if(!idOk(d.id)||typeof d.title!=='string'||!Number.isFinite(Date.parse(d.sentAt)))continue;
      const existing=[...wall.querySelectorAll('h2')].find(h=>h.textContent.trim().toLowerCase()===d.title.trim().toLowerCase());if(existing){existing.closest('article').dataset.sentAt=d.sentAt;continue;}
      const card=el('article',undefined,'postcard-edition'),copy=el('div'),h=el('h2'),link=el('a',d.title);card.dataset.sentAt=d.sentAt;link.href='/postcards#edition-'+d.id;h.append(link);
      if(d.photo&&imageOk(d.photo.src)){const image=el('img');image.src=d.photo.src;image.alt=d.photo.alt||'';image.width=640;image.height=420;image.loading='lazy';card.append(image);}
      copy.append(el('small','Sent '+date(d.sentAt)),h,el('p',d.excerpt));const read=el('a','Read the Postcard →','text-link');read.href=link.href;copy.append(read);card.append(copy);wall.prepend(card);
    }
    wall.append(...[...wall.children].sort((a,b)=>Date.parse(b.dataset.sentAt||'1970-01-01')-Date.parse(a.dataset.sentAt||'1970-01-01')));
    status.textContent='Public copies appear at least 24 hours after sending. Subscribers receive each edition first, directly in their inbox.';
  }).catch(()=>{status.textContent='The automatic archive is temporarily unavailable. Previously published editions remain below.';});
}
