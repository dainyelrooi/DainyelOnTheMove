import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source=await fs.readFile(new URL('../../assets/public-snapshot.js',import.meta.url),'utf8');
async function setup(change=()=>{}){
  const now=Date.now(),meta={version:1,complete:true,space:'production',generation:'a'.repeat(32),generatedAt:new Date(now-60000).toISOString()};
  const manifest={...meta,domains:{qa:'qa.json',cms:'cms.json',website:'website.json'}};
  const qa={...meta,questions:[{id:'public-fixture',status:'published',topic:'general',question:'Published fixture?',answer:'Approved fixture.',createdAt:meta.generatedAt,answeredAt:meta.generatedAt,publicationConsent:true}],threads:[]};
  const values={manifest,qa};change(values);
  const calls=[];
  const original=globalThis.fetch;
  globalThis.fetch=async(path,options)=>{calls.push({path,options});const value=path.endsWith('manifest.json')?values.manifest:values.qa;return {ok:value!==null,headers:{get:()=>null},text:async()=>JSON.stringify(value)};};
  const module=await import('data:text/javascript;base64,'+Buffer.from(source+'\n//'+Math.random()).toString('base64'));
  return {module,calls,values,restore:()=>{globalThis.fetch=original;}};
}
test('fresh approved copy loads once without credentials and adapts public dates',async()=>{
  const s=await setup(()=>{});try{const result=await s.module.readPublicSnapshot('qa',{space:'production'});assert.equal(result.questions[0].id,'public-fixture');assert.equal(s.module.snapshotDocs(result.questions)[0].data().answeredAt.toMillis(),Date.parse(result.generatedAt));await s.module.readPublicSnapshot('qa',{space:'production'});assert.equal(s.calls.length,2);assert.ok(s.calls.every(call=>call.options.credentials==='omit'));}finally{s.restore();}
});
test('missing, partial, stale, cross-space and mismatched releases stay unavailable',async()=>{
  for(const change of [v=>v.manifest=null,v=>v.qa.complete=false,v=>v.qa.generation='b'.repeat(32),v=>v.qa.space='staging',v=>v.manifest.generatedAt=new Date(Date.now()-25*3600000).toISOString(),v=>v.manifest.domains.qa='https://example.invalid/private']){
    const s=await setup(change);try{assert.equal(await s.module.readPublicSnapshot('qa',{space:'production'}),null);}finally{s.restore();}
  }
});
test('pending content, missing consent and unexpected private fields are rejected',async()=>{
  for(const change of [v=>v.qa.questions[0].status='pending',v=>delete v.qa.questions[0].publicationConsent,v=>v.qa.questions[0].email='private-fixture@example.invalid',v=>v.qa.questions[0].answer='x'.repeat(12001)]){
    const s=await setup(change);try{assert.equal(await s.module.readPublicSnapshot('qa',{space:'production'}),null);}finally{s.restore();}
  }
});
test('only complete successful empty copy is a real empty feed',async()=>{
  const s=await setup(v=>v.qa.questions=[]);try{assert.deepEqual((await s.module.readPublicSnapshot('qa',{space:'production'})).questions,[]);}finally{s.restore();}
});
test('snapshot images must be generated same-origin WebP files',async()=>{
  const s=await setup(()=>{});try{const good='/assets/public-content/'+'c'.repeat(64)+'.webp';assert.equal(s.module.publicMediaSrc(good),good);for(const bad of ['https://example.invalid/a.webp','data:image/webp;base64,AAAA','/assets/public-content/../private.webp','/assets/public-content/a.webp'])assert.equal(s.module.publicMediaSrc(bad),null);}finally{s.restore();}
});
test('an already-open page cannot reuse a copy after its freshness window',async()=>{
  const s=await setup(),realNow=Date.now;
  try{assert.ok(await s.module.readPublicSnapshot('qa',{space:'production'}));Date.now=()=>realNow()+25*3600000;assert.equal(await s.module.readPublicSnapshot('qa',{space:'production'}),null);}finally{Date.now=realNow;s.restore();}
});
test('an explicit retry can discover a copy after an initial unavailable response',async()=>{
  const s=await setup(),saved=s.values.qa;s.values.qa=null;
  try{assert.equal(await s.module.readPublicSnapshot('qa',{space:'production'}),null);s.values.qa=saved;assert.ok(await s.module.readPublicSnapshot('qa',{space:'production'}));assert.equal(s.calls.length,4);}finally{s.restore();}
});
