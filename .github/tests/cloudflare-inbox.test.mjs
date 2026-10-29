import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const source=await readFile(new URL('../../assets/cloudflare-inbox.js',import.meta.url),'utf8');
const worker='https://fixture-inbox-staging.fixture-account.workers.dev';
const config={schemaVersion:1,staging:{url:worker},production:null};
const exports=['getCloudflareConfig','cloudflareRequest','readCloudflarePublic','submitCloudflareSubmission','cloudflareSubmissionError'];
function fixture({space='staging',configuration=config,configurationStatus=200,response,fail=false}={}){
  const calls=[],pending={fail};
  const context={space,WeakMap,URL,Object,Array,Date,JSON,Error,TextDecoder,TextEncoder,Uint8Array,AbortSignal,crypto:globalThis.crypto,Promise,
    fetch:async(url,options)=>{calls.push({url,options});if(url==='/data/cloudflare.json')return new Response(JSON.stringify(configuration),{status:configurationStatus});if(pending.fail)throw Error('network');const body=JSON.parse(options.body||'{}');return response?response(url,options):new Response(JSON.stringify({id:'cf-'+body.requestId,status:'pending'}));}};
  const runnable=source.replace(/^import .*;\r?\n/gm,'').replace(/export /g,'').replace("import('../js/firebase.js')","Promise.resolve({appCheck:{}})").replace("import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-check.js')","Promise.resolve({getToken:async()=>({token:'fixture-app-check'})})");
  runInNewContext(runnable+'\nglobalThis.api={'+exports.join(',')+'};',context);
  return{api:context.api,calls,pending};
}
function form(){const fields=[{tagName:'TEXTAREA',type:'textarea',value:'Fixture question',readOnly:false,disabled:false},{tagName:'INPUT',type:'checkbox',checked:true,disabled:false}];return{fields,querySelectorAll:()=>fields};}
const payload={kind:'question',topic:'philippines',question:'A synthetic isolated frontend question.',publicationConsent:true};

test('inactive, unsupported and separate environments cannot inherit the test endpoint',async()=>{
  for(const space of ['production','unsupported']){const f=fixture({space});assert.equal(await f.api.getCloudflareConfig(),null);assert.equal(await f.api.submitCloudflareSubmission(form(),payload),null);assert.equal(f.calls.filter(call=>call.url===worker+'/submissions').length,0);}
  const f=fixture();assert.equal(await f.api.getCloudflareConfig(),worker);
});
test('malformed, failed or cross-environment configuration fails closed instead of returning a legacy-write signal',async()=>{
  for(const configuration of [{...config,production:{url:worker}},{...config,staging:{url:'https://fixture.invalid'}},{...config,staging:{url:worker+'/other'}},{...config,staging:{url:worker+'?secret=bad'}},{...config,extra:true}])await assert.rejects(fixture({configuration}).api.submitCloudflareSubmission(form(),payload));
  await assert.rejects(fixture({configurationStatus:503}).api.submitCloudflareSubmission(form(),payload));
});
test('uncertain retry freezes the original payload and ID; confirmed receipt unlocks the form',async()=>{
  const f=fixture({fail:true}),target=form();await assert.rejects(f.api.submitCloudflareSubmission(target,payload),error=>/^cf-[a-f0-9]{32}$/.test(error.reference));
  assert.equal(target.fields[0].readOnly,true);assert.equal(target.fields[1].disabled,true);assert.equal(target.fields[0].value,'Fixture question');
  const first=JSON.parse(f.calls.at(-1).options.body);f.pending.fail=false;const result=await f.api.submitCloudflareSubmission(target,{...payload,question:'The changed payload must not be used.'});
  assert.equal(result.id,'cf-'+first.requestId);assert.equal(f.calls.at(-1).options.body,JSON.stringify(first));assert.equal(target.fields[0].readOnly,false);assert.equal(target.fields[1].disabled,false);
});
test('public fetches omit credentials and private headers; owner calls require signed user and app tokens',async()=>{
  const f=fixture({response:()=>new Response(JSON.stringify({questions:[],threads:[],replies:[]}))});await f.api.readCloudflarePublic();const request=f.calls.at(-1).options;
  assert.equal(request.credentials,'omit');assert.equal(request.redirect,'error');assert.equal(request.cache,'no-store');assert.equal(request.headers.Authorization,undefined);assert.equal(request.headers['X-Firebase-AppCheck'],undefined);
  await assert.rejects(f.api.cloudflareRequest('/admin/submissions'));
  await f.api.cloudflareRequest('/admin/submissions',{user:{getIdToken:async()=> 'fixture-owner-token'}});assert.equal(f.calls.at(-1).options.headers.Authorization,'Bearer fixture-owner-token');assert.equal(f.calls.at(-1).options.headers['X-Firebase-AppCheck'],'fixture-app-check');
  await assert.rejects(f.api.cloudflareRequest('/arbitrary-endpoint'));
});
test('pending or malformed contributions are never accepted as a public feed',async()=>{
  const row={id:'cf-'+'1'.repeat(32),question:'A synthetic question.',answer:'Fixture answer.',topic:'philippines',createdAt:'2026-01-01T00:00:00Z',answeredAt:'2026-01-01T00:00:00Z',status:'pending',publicationConsent:true};
  await assert.rejects(fixture({response:()=>new Response(JSON.stringify({questions:[row],threads:[],replies:[]}))}).api.readCloudflarePublic());
  const result=await fixture({response:()=>new Response(JSON.stringify({questions:[{...row,status:'published'}],threads:[],replies:[]}))}).api.readCloudflarePublic();assert.equal(result.questions.length,1);
});
test('a bounded multilingual public projection is not rejected by the smaller private-response limit',async()=>{
  const questions=Array.from({length:100},(_,index)=>({id:'cf-'+index.toString(16).padStart(32,'0'),question:'\u6587'.repeat(1000),answer:'\u6587'.repeat(3000),topic:'philippines',createdAt:'2026-01-01T00:00:00Z',answeredAt:'2026-01-01T00:00:00Z',status:'published',publicationConsent:true}));
  const body=JSON.stringify({questions,threads:[],replies:[]});assert.ok(Buffer.byteLength(body)>1024*1024);
  const result=await fixture({response:()=>new Response(body)}).api.readCloudflarePublic();assert.equal(result.questions.length,100);
});
