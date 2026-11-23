const PAGE_SIZE=6;
// Enhance the existing crawlable cards; without JavaScript every fact stays readable.
export function initFactList(root,{getUrl=()=>new URL(location.href),replaceUrl=url=>history.replaceState(null,'',url.pathname+url.search+url.hash),noun='discovery',plural='discoveries',empty='New discoveries will appear here when published.'}={}){
  const select=root.querySelector('[data-fact-filter]'),list=root.querySelector('[data-facts-list]'),status=root.querySelector('[data-facts-status]'),more=root.querySelector('[data-facts-more]'),filters=root.querySelector('[data-fact-filters]');
  let chosen=getUrl().searchParams.get('country')||'',limit=PAGE_SIZE;
  function refresh({reset=false,fromUrl=false}={}){
    if(reset)limit=PAGE_SIZE;
    if(fromUrl)chosen=getUrl().searchParams.get('country')||'';
    const cards=[...list.children],places=new Map(cards.filter(card=>card.dataset.factCountry).map(card=>[card.dataset.factCountry,card.dataset.factCountryName||card.dataset.factCountry]));
    select.replaceChildren(new Option('All places',''),...[...places].sort((a,b)=>a[1].localeCompare(b[1])).map(([code,name])=>new Option(name,code)));
    select.value=places.has(chosen)?chosen:'';
    const matches=cards.filter(card=>!select.value||card.dataset.factCountry===select.value),visible=matches.slice(0,limit);
    cards.forEach(card=>card.hidden=!visible.includes(card));
    status.textContent=matches.length?'Showing '+visible.length+' of '+matches.length+' '+(matches.length===1?noun:plural)+(select.value?' from '+places.get(select.value):' from the road')+'.':empty;
    more.hidden=visible.length===matches.length;filters.hidden=!cards.length;
    return visible;
  }
  select.addEventListener('change',()=>{
    chosen=select.value;const url=getUrl();if(chosen)url.searchParams.set('country',chosen);else url.searchParams.delete('country');replaceUrl(url);refresh({reset:true});
  });
  more.addEventListener('click',()=>{const previous=refresh().length;limit+=PAGE_SIZE;const visible=refresh();visible[previous]?.focus();});
  return {refresh,clear(){list.replaceChildren();filters.hidden=more.hidden=true;}};
}
