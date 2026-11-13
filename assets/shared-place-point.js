import {sharedPlaceLabel} from './journey-core.js';
import {countryFor} from './visited-model.js';

const validPoint = point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)
  && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90;
const fold = name => name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
export const projectPlacePoint = ([lon, lat]) => [(lon + 180) * (1000 / 360), (90 - lat) * (500 / 180)];

// One local reference cache for both maps. No place is sent to a geocoder.
const references = new Map();
export function pointLookup(revision = '') {
  return kind => {
    if (!['country', 'city'].includes(kind)) return Promise.resolve(null);
    if (!references.has(kind)) {
      const url = new URL('../data/atlas-' + kind + '-points.json' + revision, import.meta.url);
      references.set(kind, fetch(url, {cache:'no-cache', signal:AbortSignal.timeout(4500)}).then(response => {
        if (!response.ok) throw Error('Place reference unavailable');
        return response.json();
      }).catch(() => { references.delete(kind); return null; }));
    }
    return references.get(kind);
  };
}

export async function sharedPlacePoint(location, lookup = pointLookup()) {
  const place = sharedPlaceLabel(location), country = place ? countryFor(location.country) : null;
  if (!country) return null;
  const city = location.city && fold(location.city);
  const [countries, cities] = await Promise.all([lookup('country'), city ? lookup('city') : null]);
  const cityPoint = cities?.[country.code]?.[city], countryPoint = countries?.[country.code];
  const anchor = validPoint(cityPoint) ? cityPoint : validPoint(countryPoint) ? countryPoint : null;
  return {place, country, anchor, precision:anchor ? validPoint(cityPoint) ? 'city' : 'country' : null};
}
