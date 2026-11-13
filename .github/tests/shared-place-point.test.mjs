import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
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
