import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const source=await fs.readFile(new URL('../../assets/public-snapshot.js',import.meta.url),'utf8');

test('actual Python exporter output is accepted by every browser snapshot domain',async()=>{
  // Synthetic in-memory database only: the Python fixture forbids real auth and
  // HTTP. No generated test visitor content is written into the website.
  const code=`import importlib.util,json\nfrom datetime import datetime,timezone\nfrom pathlib import Path\ns=importlib.util.spec_from_file_location('fixture',Path('.github/tests/test_public_content_snapshot.py'))\nm=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nm.TIME=datetime.now(timezone.utc).isoformat().replace('+00:00','Z')\nt=m.PublicSnapshotTests();t.setUp()\ntry:\n print(json.dumps(m.worker.build_snapshot(m.FakeStore(),'staging')['documents']))\nfinally:\n t.doCleanups()`;
  const documents=JSON.parse(execFileSync('python',['-c',code],{cwd:new URL('../..',import.meta.url),encoding:'utf8',maxBuffer:1024*1024}));
  const original=globalThis.fetch;
  globalThis.fetch=async path=>{const name=path.split('/').at(-1);return {ok:Object.hasOwn(documents,name),headers:{get:()=>null},text:async()=>JSON.stringify(documents[name])};};
  try{
    const module=await import('data:text/javascript;base64,'+Buffer.from(source+'\n//export-contract').toString('base64'));
    for(const domain of ['qa','cms','website'])assert.ok(await module.readPublicSnapshot(domain,{space:'staging'}),domain+' must accept the real exporter contract');
    const cms=await module.readPublicSnapshot('cms',{space:'staging'});
    assert.equal(cms.entries[0].photos[0].src,cms.summaries[0].coverPhoto.src);
    assert.equal(cms.entries[0].id,cms.summaries[0].id);
    assert.equal(await module.readPublicSnapshot('cms',{space:'production'}),null);
  }finally{globalThis.fetch=original;}
});
