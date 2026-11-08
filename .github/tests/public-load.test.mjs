import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../../assets/public-load.js',import.meta.url),'utf8');
function setup(readyState='loading',hidden=false){
  const events=new Map(),timers=new Map(),frames=[];let id=0;
  const context={document:{readyState,hidden},window:{addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)},setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>frames.push(fn)};
  vm.createContext(context);vm.runInContext(source.replace('export function','function')+'\n;globalThis.start=publicLoadReady;',context);
  return {start:context.start,events,timers,frames,paint(){for(let n=0;n<2;n++)for(const fn of frames.splice(0))fn();}};
}
test('public live connection waits for load, shares one gate and yields a paint',async()=>{
  const f=setup(),first=f.start();assert.equal(first,f.start());let connected=false;first.then(()=>connected=true);await Promise.resolve();assert.equal(connected,false);
  f.events.get('load')();assert.equal(f.timers.size,0);assert.equal(f.events.size,0);await Promise.resolve();assert.equal(connected,false);
  f.paint();await first;assert.equal(connected,true);
});
test('a missing asset cannot indefinitely postpone public corrections or withdrawals',async()=>{
  const f=setup('loading',true),ready=f.start();const timer=[...f.timers.values()][0];assert.equal(timer.ms,2500);timer.fn();await ready;assert.equal(f.events.size,0);assert.equal(f.timers.size,0);
});
test('already-loaded pages connect without another delay or load subscription',async()=>{
  const f=setup('complete'),ready=f.start();assert.equal(f.events.size,0);assert.equal(f.timers.size,0);f.paint();await ready;
});
