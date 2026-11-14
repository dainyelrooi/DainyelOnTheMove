import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {sharedPlacePoint, projectPlacePoint} from '../../assets/shared-place-point.js';

const root = new URL('../../', import.meta.url);
const countries = JSON.parse(await readFile(new URL('data/atlas-country-points.json', root), 'utf8'));
const cities = JSON.parse(await readFile(new URL('data/atlas-city-points.json', root), 'utf8'));
const lookup = async kind => kind === 'country' ? countries : cities;

test('the owner-confirmed Miraflores district has the same approximate anchor in both maps', async () => {
  const point = await sharedPlacePoint({country:'Peru', city:'Miraflores'}, lookup);
  assert.equal(point.precision, 'city');
  assert.deepEqual(point.anchor, [-77.0, -12.1]);
  const [x, y] = projectPlacePoint(point.anchor);
  assert.ok(x > 280 && x < 290 && y > 280 && y < 290);
});

test('country-only and unrecognised city labels get an explicitly broader country anchor', async () => {
  const kinds = [];
  const country = await sharedPlacePoint({country:'Peru'}, async kind => { kinds.push(kind); return countries; });
  assert.deepEqual(kinds, ['country']);
  assert.equal(country.precision, 'country');
  assert.deepEqual(country.anchor, countries.PE);
  const unknown = await sharedPlacePoint({country:'Peru', city:'An unmapped fixture'}, lookup);
  assert.equal(unknown.precision, 'country');
  assert.deepEqual(unknown.anchor, countries.PE);
});

test('withdrawn, invalid and unknown places cannot cause reference requests or invented markers', async () => {
  const never = () => { throw Error('Should not request a place'); };
  for (const input of [null, {}, {city:'Miraflores'}, {country:'Peru', city:12}, {country:'An unknown fixture'}]) {
    assert.equal(await sharedPlacePoint(input, never), null);
  }
  const unavailable = await sharedPlacePoint({country:'Peru', city:'Lima'}, async () => null);
  assert.equal(unavailable.anchor, null); assert.equal(unavailable.precision, null);
});

test('invalid city coordinates cannot displace the valid country reference', async () => {
  for (const invalid of [[181,0], [0,91], [NaN,0], ['-77',-12], [0], null]) {
    const point = await sharedPlacePoint({country:'Peru', city:'Lima'}, async kind => kind === 'city' ? {PE:{lima:invalid}} : countries);
    assert.equal(point.precision, 'country'); assert.deepEqual(point.anchor, countries.PE);
  }
});

const homeSource = await readFile(new URL('assets/home-checkin-map.js', root), 'utf8');
async function bootHome({withdrawn = false} = {}) {
  const node = () => ({textContent:'',attrs:new Map(),setAttribute(k,v){this.attrs.set(k,v);},removeAttribute(k){this.attrs.delete(k);}});
  const pin=node(),name=node(),note=node(),map=node(),link={},events=new Map();
  const selectors={'[data-home-checkin-pin]':pin,'a':link,'[data-home-checkin-name]':name,'[data-home-checkin-note]':note,'svg':map};
  const container={dataset:{},querySelector:selector=>selectors[selector]},window={};
  const document={readyState:'interactive',querySelector:()=>null,addEventListener:(type,callback)=>events.set(type,callback)};
  const code=homeSource.replace(/^import .*;\r?\n/gm,'').replace('export function','function').replace('new URL(import.meta.url).search',"''");
  const context={document,window,sharedPlaceLabel:location=>location?.country||'',pointLookup:()=>lookup,sharedPlacePoint,projectPlacePoint,encodeURIComponent,URL};
  runInNewContext(code+'\nglobalThis.start=initHomeCheckinMap;',context);
  context.start(container);
  if(withdrawn){window.siteSharedCheckin={known:true,value:null};events.get('site:check-in')({detail:null});}
  window.publicTripReady=Promise.resolve({currentLocation:{country:'Peru'}});
  events.get('DOMContentLoaded')();
  for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
  return{pin,name,note};
}

test('the home pin receives the static fallback when deferred trip bootstrap becomes ready later',async()=>{
  const {pin,name,note}=await bootHome();assert.equal(name.textContent,'Peru');assert.match(note.textContent,/Country overview/);assert.equal(pin.attrs.has('hidden'),false);
});

test('a withdrawn shared location stays hidden after the deferred static bootstrap',async()=>{
  const {pin,name}=await bootHome({withdrawn:true});assert.equal(pin.attrs.has('hidden'),true);assert.equal(name.textContent,'Explore the shared journey');
});
