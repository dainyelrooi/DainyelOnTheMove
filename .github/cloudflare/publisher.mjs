// Independent free clock. Content, Google identity and Brevo keys stay in GitHub.
const endpoint='https://api.github.com/repos/dainyelrooi/DainyelOnTheMove/actions/workflows/content-publication.yml/dispatches';
export async function clockTick(env,scheduledTime,{fetcher=(...args)=>globalThis.fetch(...args),now=Date.now}={}){
  if(env.ENABLED!=='true')return{state:'disabled'};
  if(!['staging','production'].includes(env.SPACE)||!env.CLOCK_DB||!env.GITHUB_CLOCK_TOKEN)throw Error('clock-not-configured');
  const at=now();if(Math.abs(at-scheduledTime)>300000)throw Error('obsolete-clock-invocation');
  const id=Math.floor(scheduledTime/60000);
  const receipt=await env.CLOCK_DB.prepare("INSERT OR IGNORE INTO clock_ticks(id,state,at_ms,code) SELECT ?,'attempting',?,'' WHERE NOT EXISTS (SELECT 1 FROM clock_ticks WHERE state IN ('attempting','accepted') AND at_ms>?)").bind(id,at,at-90000).run();
  if(receipt.meta?.changes!==1)return{state:'already-requested'};
  let state='retrying',code='connection-unavailable';
  try{
    const response=await fetcher(endpoint,{method:'POST',headers:{Authorization:'Bearer '+env.GITHUB_CLOCK_TOKEN.trim(),Accept:'application/vnd.github+json','Content-Type':'application/json','User-Agent':'Dainyel-publication-clock','X-GitHub-Api-Version':'2022-11-28'},body:JSON.stringify({ref:env.SPACE==='production'?'main':'staging',inputs:{mode:'process',space:env.SPACE}}),redirect:'manual',signal:AbortSignal.timeout(25000)});
    if(response.status===204){state='accepted';code='';}else code='github-http-'+response.status;
  }catch(error){code=error?.name==='TimeoutError'||error?.name==='AbortError'?'github-timeout':error?.name==='TypeError'?(/redirect/i.test(error.message)?'redirect-policy-unsupported':/header|character|byte/i.test(error.message)?'invalid-request-header':/timeout|AbortSignal/i.test(error.message)?'timeout-api-unavailable':/invocation|this reference/i.test(error.message)?'fetch-binding-error':'request-validation-failed'):'connection-unavailable';}
  await env.CLOCK_DB.batch([env.CLOCK_DB.prepare('UPDATE clock_ticks SET state=?,code=? WHERE id=?').bind(state,code,id),env.CLOCK_DB.prepare('DELETE FROM clock_ticks WHERE at_ms<?').bind(at-259200000)]);
  return{state,code};
}
export default{
  scheduled(event,env,context){context.waitUntil(clockTick(env,event.scheduledTime));},
  async fetch(request,env){
    if(request.method!=='GET'||new URL(request.url).pathname!=='/health')return new Response('Not found',{status:404});
    let last=null;try{last=await env.CLOCK_DB?.prepare('SELECT state,at_ms,code FROM clock_ticks ORDER BY id DESC LIMIT 1').first();}catch{}
    return Response.json({service:'website-publication-clock',space:env.SPACE,enabled:env.ENABLED==='true',lastRequestAt:last?new Date(last.at_ms).toISOString():null,lastRequestState:last?.state||null,lastError:last?.code||'',notice:'A workflow request is not proof of publication or email delivery.'},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
};
