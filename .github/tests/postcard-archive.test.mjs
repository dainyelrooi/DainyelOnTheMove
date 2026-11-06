import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const source=await readFile(new URL('../../assets/postcard-archive.js',import.meta.url),'utf8');
const context={document:{querySelector:()=>null},Date,Intl};
runInNewContext(source.replaceAll('export function','function')+'\nthis.api={publicEdition,archivePage};',context);
const {publicEdition,archivePage}=context.api;
const fixture=()=>({id:'brevo-42',title:'Public edition',sentAt:'2026-11-01T11:00:00Z',availableAt:'2026-11-02T11:00:00Z',paragraphs:['Public edition','A public paragraph.'],links:['/stories'],photo:null});

test('popup refuses early, future, malformed or mismatched editions',()=>{
  const at=Date.parse('2026-11-02T11:00:00Z');
  assert.equal(publicEdition(fixture(),'brevo-42',at).paragraphs[0],'A public paragraph.');
  for(const [patch,id,now] of [[{},'brevo-42',at-1],[{availableAt:'2026-11-01T11:00:00Z'},'brevo-42',at],[{},'brevo-43',at],[{sentAt:'unknown'},'brevo-42',at],[{paragraphs:['x'.repeat(12001)]},'brevo-42',at],[{paragraphs:null},'brevo-42',at]])assert.throws(()=>publicEdition({...fixture(),...patch},id,now));
});
test('popup exposes only safe public fields, local links and approved image origins',()=>{
  const data={...fixture(),privateNotes:'Never project',recipient:'Never project',links:['/stories','/admin','//foreign.invalid','javascript:bad','/postcards#join'],photo:{src:'https://foreign.invalid/image.jpg',alt:'Wrong origin'}};
  const result=publicEdition(data,'brevo-42');
  assert.equal(result.privateNotes,undefined);assert.equal(result.recipient,undefined);assert.equal(result.photo,null);
  assert.equal(JSON.stringify(result.links),JSON.stringify(['/stories','/postcards#join']));
});
test('six-card pagination keeps every edition reachable without an endless archive',()=>{
  const seen=[];
  for(let page=0;page<4;page++){const state=archivePage(20,page);assert.ok(state.end-state.start<=6);for(let n=state.start;n<state.end;n++)seen.push(n);}
  assert.equal(JSON.stringify(seen),JSON.stringify(Array.from({length:20},(_,n)=>n)));
  assert.equal(archivePage(20,100).current,3);assert.equal(archivePage(20,-1).current,0);assert.equal(archivePage(0,0).end,0);
});
