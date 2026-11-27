import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=(await readFile(new URL('../../assets/performance-choice.js',import.meta.url),'utf8')).replaceAll('export ','').replace("if(typeof document!=='undefined')initSpeedMeasurements();",'');
function fixture(change={}){
 const document=new EventTarget(),window=new EventTarget(),timers=new Map(),calls=[],instance={};let sequence=0;
 document.documentElement={dataset:{}};document.hidden=false;window.self=window;window.top=window;
 const context=vm.createContext({document,window,location:{hostname:'dainyelonthemove.com',pathname:'/stories',search:'',hash:'',...change},performance:{getEntriesByType:()=>[]},PerformanceObserver:class{observe(){}disconnect(){}},setTimeout:(fn,ms)=>{timers.set(++sequence,{fn,ms});return sequence;},clearTimeout:id=>timers.delete(id)});
 vm.runInContext(source,context);
 const sdk={initializePerformance:(_app,settings)=>{calls.push(['init',settings]);return instance;},trace:()=>({start(){calls.push(['trace']);},putAttribute(){},putMetric(){},stop(){calls.push(['stop']);}})};
 const choice=value=>{const event=new Event('site:measurement-choice');event.detail={allowed:value};document.dispatchEvent(event);};
 const tick=async ms=>{for(const [id,row] of [...timers])if(row.ms===ms){timers.delete(id);await row.fn();}await new Promise(resolve=>setImmediate(resolve));};
 return {context,document,window,timers,calls,instance,sdk,choice,tick};
}
test('no Performance SDK or trace is loaded without an explicit measurement choice',async()=>{
 const f=fixture();await f.context.initSpeedMeasurements({load:async()=>assert.fail('no consent')});await f.tick(2500);assert.equal(f.calls.length,0);assert.equal(f.timers.size,0);
 f.choice(true);f.choice(false);await f.tick(2500);assert.equal(f.calls.length,0);
});
test('withdrawal during SDK loading prevents initialization and collection',async()=>{
 const f=fixture();let finish;await f.context.initSpeedMeasurements({load:()=>new Promise(resolve=>finish=resolve)});f.choice(true);await f.tick(2500);f.choice(false);finish({sdk:f.sdk,app:{}});await f.tick(0);assert.equal(f.calls.length,0);
});
test('collection is consent-gated, automatic instrumentation stays off, and renewal resumes one bounded trace',async()=>{
 const f=fixture();await f.context.initSpeedMeasurements({load:async()=>({sdk:f.sdk,app:{}})});
 f.choice(true);await f.tick(2500);assert.equal(f.instance.instrumentationEnabled,false);assert.equal(f.instance.dataCollectionEnabled,true);assert.equal(f.calls[0][1].instrumentationEnabled,false);
 f.choice(false);assert.equal(f.instance.dataCollectionEnabled,false);await f.tick(30000);assert.equal(f.calls.filter(row=>row[0]==='trace').length,0);
 f.choice(true);await f.tick(2500);await f.tick(30000);f.window.dispatchEvent(new Event('pagehide'));assert.equal(f.calls.filter(row=>row[0]==='trace').length,1);f.choice(false);assert.equal(f.instance.dataCollectionEnabled,false);
});
test('private routes and newly introduced query data cannot produce a measurement',async()=>{
 for(const pathname of ['/admin','/postcards-form']){const f=fixture({pathname});await f.context.initSpeedMeasurements({load:async()=>assert.fail('private route')});f.choice(true);await f.tick(2500);assert.equal(f.calls.length,0);}
 const f=fixture();await f.context.initSpeedMeasurements({load:async()=>({sdk:f.sdk,app:{}})});f.choice(true);await f.tick(2500);f.context.location.search='?email=private';await f.tick(30000);assert.equal(f.calls.filter(row=>row[0]==='trace').length,0);
});
