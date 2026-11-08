const liveHost='dainyelonthemove.com';
export function articleShareUrl(value){
  try{const url=new URL(value);if(url.protocol!=='https:'||url.hostname!==liveHost||url.username||url.password)return null;
    const path=url.pathname.replace(/\.html$/,'').replace(/\/$/,'');
    if(!/^\/(?:thailand|thailand-solo|bali|philippines|note-[a-z0-9-]+|entry\/entry-[a-f0-9]{32})$/.test(path))return null;
    return 'https://'+liveHost+path;
  }catch{return null;}
}
export function initArticleSharing(){
  if(window.parent!==window||/^\/(admin|studio)(?:[/.]|$)/.test(location.pathname))return;
  const url=articleShareUrl(document.querySelector('link[rel=canonical]')?.href),heading=document.querySelector('main h1');
  if(!url||!heading||document.querySelector('[data-article-share]'))return;
  const ending=document.querySelector('.journal-next .wrap'),article=document.querySelector('main article');if(!ending&&!article)return;
  const group=document.createElement('div'),button=document.createElement('button'),status=document.createElement('span');
  group.className='article-share';group.dataset.articleShare='';button.type='button';button.className='secondary-button';button.textContent=navigator.share?'Share this story':'Copy story link';status.setAttribute('role','status');group.append(button,status);
  if(ending)ending.append(group);else{group.className+=' article-share-standalone';article.after(group);}
  function manual(){status.replaceChildren();const label=document.createElement('label'),field=document.createElement('input');label.textContent='Copy this story link: ';field.type='text';field.readOnly=true;field.value=url;label.append(field);status.append(label);field.focus();field.select();}
  button.addEventListener('click',async()=>{
    if(button.disabled)return;button.disabled=true;status.textContent='';
    try{
      if(navigator.share)await navigator.share({title:heading.textContent.trim(),url});
      else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);if(group.isConnected)status.textContent='Story link copied.';}
      else if(group.isConnected)manual();
    }catch(error){if(error?.name!=='AbortError'&&group.isConnected)manual();}
    finally{button.disabled=false;}
  });
}
