import {getCloudflareConfig} from './cloudflare-inbox.js';

const INTERVAL=300000;
export function formatSupportTotal(value,now=Date.now()){
  const time=Date.parse(value?.checkedAt);
  if(value?.schemaVersion!==1||value.currency!=='EUR'||!Number.isSafeInteger(value.amountMinor)||
    value.amountMinor<0||value.amountMinor>10000000000||!Number.isFinite(time)||time>now+60000||now-time>360000)throw Error('support-total-unavailable');
  return new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR',minimumFractionDigits:0,maximumFractionDigits:2}).format(value.amountMinor/100);
}

export function startSupportTotals({root=document,getEndpoint=getCloudflareConfig,fetcher=fetch,now=()=>Date.now(),view=window}={}){
  const boxes=[...root.querySelectorAll('[data-support-total]')];if(!boxes.length)return;
  let timer,pending,stopped=false,nextRefresh=0;
  const visible=new Set();
  const open=box=>!root.hidden&&(!box.closest('details')||box.closest('details').open);
  const active=()=>!stopped&&boxes.some(box=>visible.has(box)&&open(box));
  const clear=()=>{view.clearTimeout(timer);timer=undefined;};
  const fallback=()=>{for(const box of boxes){box.querySelector('[data-support-amount]').hidden=true;box.querySelector('[data-support-fallback]').hidden=false;box.querySelector('[data-support-updated]').hidden=true;}};
  async function refresh(){
    clear();if(!active())return;
    if(pending)return pending;
    nextRefresh=now()+INTERVAL;
    pending=(async()=>{
      try{
        const base=await getEndpoint();if(!base)throw Error('support-total-unavailable');
        const response=await fetcher(base+'/support-total',{credentials:'omit',redirect:'error',cache:'no-cache',signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});
        if(!response.ok||Number(response.headers.get('content-length'))>1024)throw Error('support-total-unavailable');
        const text=await response.text();if(text.length>1024)throw Error('support-total-unavailable');
        const value=JSON.parse(text),amount=formatSupportTotal(value,now());
        // Schedule against the source check, so two five-minute caches do not
        // compound into a ten-minute refresh delay. Bound very short retries.
        nextRefresh=Math.max(now()+15000,Date.parse(value.checkedAt)+INTERVAL);
        for(const box of boxes){const node=box.querySelector('[data-support-amount]');node.textContent=amount;node.hidden=false;
          box.querySelector('[data-support-fallback]').hidden=true;
          const time=box.querySelector('[data-support-updated]');time.dateTime=value.checkedAt;
          time.textContent='Checked '+new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date(value.checkedAt));time.hidden=false;
        }
      }catch{fallback();}
    })();
    try{await pending;}finally{pending=undefined;wake();}
  }
  function wake(){
    if(!active()){clear();return;}
    if(now()>=nextRefresh)void refresh();
    else{clear();timer=view.setTimeout(refresh,nextRefresh-now());}
  }
  const details=new Set(boxes.map(box=>box.closest('details')).filter(Boolean));
  for(const detail of details)detail.addEventListener('toggle',wake);
  root.addEventListener('visibilitychange',wake);
  view.addEventListener('pagehide',()=>{stopped=true;clear();});
  view.addEventListener('pageshow',()=>{stopped=false;wake();});
  if(view.IntersectionObserver){const observer=new view.IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);}wake();},{rootMargin:'100px'});boxes.forEach(box=>observer.observe(box));}
  else{boxes.forEach(box=>visible.add(box));wake();}
}
if(typeof document!=='undefined')startSupportTotals();
