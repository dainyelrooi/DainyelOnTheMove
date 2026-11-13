import {readingPlan} from './fact-discovery-model.js';
export function initReadingCollections(){
  for(const section of document.querySelectorAll('[data-reading-collection]')){
    const track=section.querySelector('[data-published-list]'),buttons=[...section.querySelectorAll('[data-reading-filter]')];
    const selection=()=>location.hash==='#field-notes'?'notes':location.hash==='#travel-stories'?'blog':document.body.dataset.publicPage==='field-notes'?'notes':'blog';
    let selected=selection();
    function filter(){
      buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.readingFilter===selected)));
      const rows=[...track.children].map(card=>({card,kind:card.dataset.readingKind,time:card.dataset.publishedTime,order:card.dataset.staticOrder})),plan=readingPlan(rows,selected);
      plan.ordered.forEach((row,index)=>{row.card.hidden=!plan.visible.includes(row);row.card.dataset.readingOrder=String(index);});
      track.append(...plan.ordered.map(row=>row.card));
      track.dispatchEvent(new Event('collection:changed'));
    }
    buttons.forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.readingFilter;const hash=selected==='notes'?'field-notes':selected==='blog'?'travel-stories':'reading';history.replaceState(null,'','#'+hash);filter();}));
    window.addEventListener('popstate',()=>{selected=selection();filter();});
    track.addEventListener('collection:updated',filter);filter();
  }
}
