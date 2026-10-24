import {initCarousels} from './collection-carousel.js?v=clarity3';
import {initReadingCollections} from './reading-collection.js?v=clarity2';
import {initSearch} from './global-search.js?v=clarity1';
initReadingCollections();initCarousels();initSearch();
for(const details of document.querySelectorAll('.qa-disclosure'))details.addEventListener('toggle',()=>{
  const hint=details.querySelector(':scope > summary .qa-open-hint');
  if(hint)hint.textContent=details.open?'Click to close':'Click to open';
});
if(document.getElementById('youtube-diary')||document.getElementById('youtube-player'))fetch('/data/latest-youtube.json',{cache:'no-cache'}).then(response=>{if(!response.ok)throw Error();return response.json();}).then(data=>{
  if(!/^[A-Za-z0-9_-]{11}$/.test(data.videoId)||data.channelId!=='UC107rsLuNIUqOtjkHG8tm8Q')return;
  for(const card of document.querySelectorAll('#youtube-diary,.film-card[href="#youtube-player"]')){
    const image=card.querySelector('img');if(image){image.src='/assets/optimized/youtube-latest.jpg?v='+data.videoId;image.removeAttribute('srcset');image.alt=data.title;image.width=480;image.height=360;}
    const title=card.querySelector('strong,h3');if(title)title.textContent=data.title;
    const small=card.querySelector('small');if(small)small.textContent='Latest from YouTube';
  }
}).catch(()=>{});
const coffee=document.querySelector('[data-footer-coffee]'),opens=Date.parse('2026-10-28T00:00:00+01:00');
let timer;
function release(){clearTimeout(timer);if(!coffee)return;coffee.hidden=Date.now()<opens;if(coffee.hidden&&!document.hidden)timer=setTimeout(release,Math.min(opens-Date.now(),2147483647));}
release();document.addEventListener('visibilitychange',release);window.addEventListener('pageshow',release);window.addEventListener('pagehide',()=>clearTimeout(timer));
const latest=document.querySelector('[data-atlas-latest]');
if(latest){
  window.publicTripReady?.then(trip=>{if(trip?.revealedStops?.length)latest.hidden=true;});
  const watchLatest=()=>Promise.all([import('../js/firebase.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js'),import('./publishing-model.js')]).then(([{db},sdk,{space}])=>{
    sdk.onSnapshot(sdk.query(sdk.collection(db,'cmsSpaces',space,'summaries'),sdk.orderBy('publishedAt','desc'),sdk.limit(100)),snapshot=>{
      const newest=snapshot.docs.find(row=>row.data().kind==='blog'&&/^entry-[a-f0-9]{32}$/.test(row.id)),link=latest.querySelector('[data-latest-story]');
      link.href=newest?'/entry/'+newest.id:'/philippines';link.textContent='Read '+(newest?newest.data().title:'Beneath the Philippine blue.')+' →';
    },()=>{});
  }).catch(()=>{});
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();watchLatest();}},{rootMargin:'100px'});observer.observe(latest);}else if(document.body.dataset.publicPage==='atlas')watchLatest();
}
