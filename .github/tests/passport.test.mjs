import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../../assets/passport.js',import.meta.url),'utf8')).replace("import {loadJourney} from './journey-model.js';",'');
const {passportStorage}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function memory(){const data=new Map();return{data,getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
test('save, remove, reload and clear use only valid public IDs',()=>{const raw=memory(),adapter=passportStorage(raw,new Set(['place:thailand','story:bali']));assert.deepEqual(adapter.read(),{ids:[],ok:true});assert.equal(adapter.write(['place:thailand','private-route','place:thailand']),true);assert.deepEqual(passportStorage(raw,new Set(['place:thailand'])).read().ids,['place:thailand']);adapter.write([]);assert.deepEqual(adapter.read().ids,[]);adapter.write(['story:bali']);assert.equal(adapter.clear(),true);assert.equal(raw.data.size,0);});
test('withdrawn public IDs cannot reveal removed content',()=>{const raw=memory();passportStorage(raw,new Set(['note:public'])).write(['note:public']);assert.deepEqual(passportStorage(raw,new Set()).read().ids,[]);});
test('blocked/quota storage errors do not crash or claim a save',()=>{const bad={getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}},adapter=passportStorage(bad,new Set(['public']));assert.deepEqual(adapter.read(),{ids:[],ok:false});assert.equal(adapter.write(['public']),false);assert.equal(adapter.clear(),false);});
test('corrupt, wrong-version and oversized local state fail safely',()=>{for(const value of ['broken','{"version":2,"ids":["public"]}',JSON.stringify({version:1,ids:[]})+' '.repeat(40001)]){const raw=memory();raw.data.set('dotm-passport-v1',value);assert.equal(passportStorage(raw,new Set(['public'])).read().ok,false);}});
