const idOk=id=>/^brevo-[1-9][0-9]{0,12}$/.test(id);
const pathOk=path=>typeof path==='string'&&/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)?)?(?:#[a-zA-Z0-9_-]+)?$/.test(path)&&!/^\/(admin|studio|search|postcards-form)(?:[\/#]|$)/.test(path);
const defaultCover='https://dainyelonthemove.com/assets/postcards-cover.svg';
const imageOk=src=>src===defaultCover||/^https:\/\/dainyelonthemove[.]com\/assets\/[a-zA-Z0-9/_-]+\.(webp|jpg|jpeg|png|avif)$/.test(src);
export function coverPath(src){return imageOk(src)?new URL(src).pathname:'/assets/postcards-cover.svg';}
const el=(tag,text,className)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;};
const date=value=>new Intl.DateTimeFormat('en-GB',{dateStyle:'long',timeZone:'Europe/Amsterdam'}).format(new Date(value));

export function publicEdition(data,identifier,now=Date.now()){
  if(!idOk(identifier)||data?.id!==identifier||typeof data.title!=='string'||!data.title.trim()||data.title.length>240)throw Error('Invalid public edition');
  const sent=Date.parse(data.sentAt),available=Date.parse(data.availableAt);
  if(!Number.isFinite(sent)||!Number.isFinite(available)||available<sent+86400000||available>now)throw Error('Edition is not public yet');
  if(!Array.isArray(data.paragraphs)||!data.paragraphs.length||data.paragraphs.length>70||data.paragraphs.some(p=>typeof p!=='string'||p.length>12000))throw Error('Invalid public text');
  return {id:identifier,title:data.title,sentAt:data.sentAt,paragraphs:data.paragraphs.filter(p=>p.trim()&&p!==data.title),links:(Array.isArray(data.links)?data.links:[]).filter(pathOk).slice(0,12),photo:data.photo&&imageOk(data.photo.src)?{src:data.photo.src,alt:typeof data.photo.alt==='string'?data.photo.alt.slice(0,300):''}:null};
}

export function archivePage(total,page,size=6){
  const pages=Math.max(1,Math.ceil(total/size)),current=Math.max(0,Math.min(page,pages-1));
  return {current,pages,start:current*size,end:Math.min(total,(current+1)*size)};
}

const wall=document.querySelector('[data-postcard-archive]'),dialog=document.querySelector('.postcard-dialog');
if(wall&&dialog&&typeof dialog.showModal==='function'){
  const cards=[...wall.querySelectorAll('[data-archive-id]')],pager=document.querySelector('[data-postcard-pagination]'),pageCount=document.querySelector('[data-postcard-page-count]');
  const pagePrev=document.querySelector('[data-postcard-page-prev]'),pageNext=document.querySelector('[data-postcard-page-next]');
  const title=dialog.querySelector('#postcard-dialog-title'),body=dialog.querySelector('[data-postcard-body]'),pageLink=dialog.querySelector('[data-postcard-open-page]'),close=dialog.querySelector('[data-postcard-close]');
  const previous=dialog.querySelector('[data-postcard-prev]'),next=dialog.querySelector('[data-postcard-next]'),position=dialog.querySelector('[data-postcard-position]');
  let page=0,version=0,controller,activeId,returnFocus,oldOverflow,ownHistory=false;
  const cache=new Map();
  function paginate(focus=false){
    const state=archivePage(cards.length,page);page=state.current;
    cards.forEach((card,index)=>{card.hidden=index<state.start||index>=state.end;});
    pager.hidden=state.pages<2;pagePrev.disabled=page===0;pageNext.disabled=page===state.pages-1;
    pageCount.textContent='Showing '+(cards.length?state.start+1:0)+'–'+state.end+' of '+cards.length;
    if(focus){const link=cards[state.start]?.querySelector('h2 a');link?.focus();link?.scrollIntoView({block:'center',behavior:'instant'});}
  }
  function restore(){
    ++version;controller?.abort();document.body.style.overflow=oldOverflow??'';
    const card=returnFocus?.closest?.('[data-archive-id]')||cards.find(c=>c.dataset.archiveId===activeId),index=cards.indexOf(card);
    if(index>=0){page=Math.floor(index/6);paginate();}
    const target=returnFocus&&returnFocus!==document.body?returnFocus:card?.querySelector('h2 a');
    if(target?.isConnected)target.focus({preventScroll:true});activeId=null;
  }
  function hide(){if(dialog.open)dialog.close();}
  function requestClose(){
    if(ownHistory){ownHistory=false;history.back();}
    else{history.replaceState(history.state,'',location.pathname+location.search);hide();}
  }
  async function open(identifier){
    const run=++version;controller?.abort();controller=new AbortController();activeId=identifier;
    const card=cards.find(c=>c.dataset.archiveId===identifier),index=cards.indexOf(card);
    if(index>=0){page=Math.floor(index/6);paginate();}
    const canonical=card?.querySelector('h2 a')?.getAttribute('href')||'/postcard-'+identifier;
    pageLink.href=pathOk(canonical)?canonical:'/postcards';
    title.textContent=card?.querySelector('h2')?.textContent||'Postcard';body.replaceChildren(el('p','Loading this Postcard…'));body.scrollTop=0;
    position.textContent=index>=0?(index+1)+' of '+cards.length:'';previous.hidden=next.hidden=cards.length<2||index<0;
    if(!dialog.open){returnFocus=document.activeElement;oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();close.focus();}
    try{
      let edition=cache.get(identifier);
      if(!edition){const response=await fetch('/data/postcards/editions/'+identifier+'.json',{cache:'no-cache',signal:controller.signal});if(!response.ok)throw Error('Unavailable');edition=publicEdition(await response.json(),identifier);cache.set(identifier,edition);}
      if(run!==version||!dialog.open)return;
      title.textContent=edition.title;body.replaceChildren(el('p','By Dainyel · Sent '+date(edition.sentAt),'content-date'));
      const supplied=card?.dataset.coverSrc,photo=supplied&&imageOk(supplied)?{src:supplied,alt:card.dataset.coverAlt}:edition.photo||{src:defaultCover,alt:'Postcards from Dainyel — a little piece of the journey'};
      const figure=el('figure'),image=el('img');image.src=coverPath(photo.src);image.alt=photo.alt||'';image.width=640;image.height=420;image.decoding='async';
      image.addEventListener('error',()=>{if(image.getAttribute('src')!==coverPath(defaultCover)){image.src=coverPath(defaultCover);image.alt='Postcards from Dainyel';}},{once:true});figure.append(image);
      if(card?.dataset.coverNote)figure.append(el('figcaption',card.dataset.coverNote));body.append(figure);
      for(const paragraph of edition.paragraphs)body.append(el('p',paragraph));
      const links=el('nav',undefined,'journey-links');links.setAttribute('aria-label','Mentioned in this Postcard');
      for(const path of edition.links){const link=el('a','Explore '+(path==='/'?'the website':path.split('#')[0].slice(1).replaceAll('-',' '))+' →');link.href=path;links.append(link);}body.append(links);
      const join=el('a','Receive the next Postcard →','button');join.href='/#follow-trip';body.append(join);body.scrollTop=0;
    }catch(error){if(run===version&&error.name!=='AbortError')body.replaceChildren(el('p','This Postcard could not load. Use “Open as a page” above, or close it and try again.'));}
  }
  function route(){const match=location.hash.match(/^#edition-(brevo-[1-9][0-9]{0,12})$/);if(match)open(match[1]);else{ownHistory=false;hide();}}
  wall.addEventListener('click',event=>{
    const link=event.target.closest('a'),card=link?.closest('[data-archive-id]');
    if(!card||!idOk(card.dataset.archiveId)||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();ownHistory=true;history.pushState(history.state,'','#edition-'+card.dataset.archiveId);open(card.dataset.archiveId);
  });
  function move(direction){const index=cards.findIndex(card=>card.dataset.archiveId===activeId);if(index<0)return;const identifier=cards[(index+direction+cards.length)%cards.length].dataset.archiveId;history.replaceState(history.state,'','#edition-'+identifier);open(identifier);}
  previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));close.addEventListener('click',requestClose);
  dialog.addEventListener('cancel',event=>{event.preventDefault();requestClose();});dialog.addEventListener('click',event=>{if(event.target===dialog)requestClose();});dialog.addEventListener('close',restore);
  pagePrev.addEventListener('click',()=>{page--;paginate(true);});pageNext.addEventListener('click',()=>{page++;paginate(true);});
  for(const image of wall.querySelectorAll('img'))image.addEventListener('error',()=>{if(image.getAttribute('src')!==coverPath(defaultCover)){image.src=coverPath(defaultCover);image.alt='Postcards from Dainyel';}},{once:true});
  window.addEventListener('hashchange',route);paginate();route();
}
