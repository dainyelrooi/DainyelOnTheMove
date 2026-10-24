export function initReadingCollections(){
  for(const section of document.querySelectorAll('[data-reading-collection]')){
    const track=section.querySelector('[data-published-list]'),buttons=[...section.querySelectorAll('[data-reading-filter]')];
    let selected=document.body.dataset.publicPage==='field-notes'?'notes':location.hash==='#field-notes'?'notes':location.hash==='#travel-stories'?'blog':'all';
    function filter(){
      buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.readingFilter===selected)));
      [...track.children].forEach(card=>{card.hidden=selected!=='all'&&(selected==='notes'?card.dataset.readingKind==='blog':card.dataset.readingKind!=='blog');});
      track.dispatchEvent(new Event('collection:changed'));
    }
    buttons.forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.readingFilter;const hash=selected==='notes'?'field-notes':selected==='blog'?'travel-stories':'reading';history.replaceState(null,'','#'+hash);filter();}));
    window.addEventListener('popstate',()=>{selected=location.hash==='#field-notes'?'notes':location.hash==='#travel-stories'?'blog':'all';filter();});
    track.addEventListener('collection:updated',filter);filter();
  }
}
