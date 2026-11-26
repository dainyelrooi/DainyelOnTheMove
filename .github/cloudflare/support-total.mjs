// Read-only projection of this one public campaign. No donor data, account
// credentials, payment scripts, database writes or user-supplied upstream URL.
export const CAMPAIGN='https://whydonate.com/nl/fundraising/dainyelonthemove';
const TTL=300000,MAX_BYTES=262144;
const unavailable=()=>new Error('support-total-unavailable');

export function campaignTotal(html){
  const states=[...html.matchAll(/<script\b[^>]*\bid=["']wd-fundraiser-state["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if(states.length!==1)throw unavailable();
  const state=JSON.parse(states[0][1]),result=state?.payload?.data?.result;
  const amount=result?.donation?.amount;
  if(state.slug!=='dainyelonthemove'||result?.currency_code?.toLowerCase()!=='eur'||
    typeof amount!=='number'||!Number.isFinite(amount)||amount<0||amount>100000000||
    Math.abs(amount*100-Math.round(amount*100))>0.00001)throw unavailable();
  return Math.round(amount*100);
}

async function boundedHtml(response){
  if(Number(response.headers.get('content-length'))>MAX_BYTES||!response.body)throw unavailable();
  const reader=response.body.getReader(),parts=[];let size=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;
    if(size>MAX_BYTES)throw unavailable();parts.push(value);
  }}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}

function valid(value,now){
  const time=Date.parse(value?.checkedAt);
  return value?.schemaVersion===1&&value.currency==='EUR'&&Number.isSafeInteger(value.amountMinor)&&
    value.amountMinor>=0&&value.amountMinor<=10000000000&&Number.isFinite(time)&&time<=now&&now-time<TTL&&
    Object.keys(value).sort().join(',')==='amountMinor,checkedAt,currency,schemaVersion';
}

export function createSupportTotal({fetcher=fetch,now=()=>Date.now(),cache=globalThis.caches?.default}={}){
  let saved,pending,retryAt=0;
  async function load(request){
    if(saved&&valid(saved,now()))return saved;
    if(now()<retryAt)throw unavailable();
    if(pending)return pending;
    pending=(async()=>{
      const key=new Request(new URL('/__support-total-v1',request.url));
      if(cache){try{const hit=await cache.match(key);if(hit){const value=await hit.json();if(valid(value,now()))return saved=value;}}catch{/* Cache is optional; never return unvalidated/stale data. */}}
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
      try{
        const response=await fetcher(CAMPAIGN,{redirect:'manual',signal:controller.signal,
          headers:{Accept:'text/html','User-Agent':'DainyelOnTheMove/1.0 (public donation total)'}});
        if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))throw unavailable();
        const amountMinor=campaignTotal(await boundedHtml(response));
        saved={schemaVersion:1,currency:'EUR',amountMinor,checkedAt:new Date(now()).toISOString()};
        if(cache){try{await cache.put(key,Response.json(saved,{headers:{'Cache-Control':'public, max-age=300'}}));}catch{/* No paid storage or database fallback. */}}
        return saved;
      }finally{clearTimeout(timer);}
    })();
    try{return await pending;}catch{retryAt=now()+60000;throw unavailable();}finally{pending=undefined;}
  }
  return async(request,headers)=>{
    try{return Response.json(await load(request),{headers:{...headers,'Cache-Control':'public, max-age=60','X-Robots-Tag':'noindex'}});}
    catch{return Response.json({error:'support-total-unavailable'},{status:503,headers:{...headers,'Retry-After':'60'}});}
  };
}
