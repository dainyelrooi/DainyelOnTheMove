import test from 'node:test';
import assert from 'node:assert/strict';
import {clockTick} from '../cloudflare/publisher.mjs';
const at=Date.parse('2026-11-07T17:00:00Z');
function fixture(){const rows=new Map();return{rows,prepare(sql){let args;return{bind(...values){args=values;return this;},async run(){const[id,time,cutoff]=args;if(rows.has(id)||[...rows.values()].some(r=>['accepted','attempting'].includes(r.state)&&r.at_ms>cutoff))return{meta:{changes:0}};rows.set(id,{state:'attempting',at_ms:time});return{meta:{changes:1}};},async apply(){if(sql.startsWith('UPDATE')){const[state,code,id]=args;Object.assign(rows.get(id),{state,code});}}};},async batch(statements){for(const statement of statements)await statement.apply();}};}
test('disabled clock has no database, account or workflow side effects',async()=>{assert.equal((await clockTick({ENABLED:'false'},at,{fetcher:()=>assert.fail()})).state,'disabled');});
test('fixed workflow request is fenced against overlapping and duplicate ticks',async()=>{
 const db=fixture(),env={ENABLED:'true',SPACE:'staging',CLOCK_DB:db,GITHUB_CLOCK_TOKEN:'non-secret-fixture'},calls=[];
 const fetcher=async(url,options)=>{calls.push({url,options});return{status:204};};
 await Promise.all([clockTick(env,at,{fetcher,now:()=>at}),clockTick(env,at,{fetcher,now:()=>at})]);
 await clockTick(env,at+60000,{fetcher,now:()=>at+60000});assert.equal(calls.length,1);
 await clockTick(env,at+120000,{fetcher,now:()=>at+120000});assert.equal(calls.length,2);
 assert.equal(JSON.parse(calls[0].options.body).ref,'staging');assert.equal(JSON.parse(calls[0].options.body).inputs.space,'staging');assert.match(calls[0].url,/content-publication.yml\/dispatches$/);
});
test('connection errors are recorded without response bodies and a later tick can retry',async()=>{
 const db=fixture(),env={ENABLED:'true',SPACE:'production',CLOCK_DB:db,GITHUB_CLOCK_TOKEN:'non-secret-fixture'};
 const result=await clockTick(env,at,{fetcher:async()=>{throw Error('sensitive provider body');},now:()=>at});assert.deepEqual(result,{state:'retrying',code:'connection-unavailable'});
 assert.equal((await clockTick(env,at+60000,{fetcher:async()=>({status:204}),now:()=>at+60000})).state,'accepted');
 await assert.rejects(clockTick(env,at,{now:()=>at+600000}));
});
