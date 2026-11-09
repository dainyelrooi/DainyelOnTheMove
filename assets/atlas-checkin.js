import {sharedPlaceLabel} from './journey-core.js';
import {countryFor} from './visited-model.js';

const ns = 'http://www.w3.org/2000/svg';
const fold = name => name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
const validPoint = point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)
  && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90;
const project = ([lon, lat]) => [(lon + 180) * (1000 / 360), (90 - lat) * (500 / 180)];

export function initAtlasCheckin(map, zoomTo, revision) {
  const card = document.querySelector('[data-atlas-checkin]');
  const layer = document.getElementById('checkin-layer');
  if (!card || !layer) return;
  const label = card.querySelector('[data-atlas-checkin-name]');
  const note = card.querySelector('[data-atlas-checkin-note]');
  const button = card.querySelector('button');
  const pin = document.createElementNS(ns, 'g');
  const svg = (tag, attrs) => {
    const node = document.createElementNS(ns, tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    return node;
  };
  const pinLabel = svg('text', {class:'atlas-pin-label', y:'-22', 'aria-hidden':'true'});
  pin.classList.add('atlas-checkin-pin');
  pin.setAttribute('role', 'button');
  pin.append(
    svg('circle', {class:'atlas-pin-hit', cy:'-13', r:'29'}),
    svg('path', {class:'atlas-pin-shape', d:'M0 0C-5-8-13-14-13-23a13 13 0 0 1 26 0C13-14 5-8 0 0Z'}),
    svg('circle', {class:'atlas-pin-dot', cy:'-23', r:'4.5'}),
    pinLabel
  );
  let point, outlined, level, request = 0, lastKey;
  const lookups = new Map();
  function lookup(kind) {
    if (!lookups.has(kind)) {
      const url = new URL('../data/atlas-' + kind + '-points.json' + revision, import.meta.url);
      lookups.set(kind, fetch(url, {cache:'no-cache', signal:AbortSignal.timeout(4500)}).then(response => {
        if (!response.ok) throw new Error('Atlas lookup unavailable');
        return response.json();
      }).catch(() => { lookups.delete(kind); return null; }));
    }
    return lookups.get(kind);
  }
  function positionPin() {
    if (point) {
      const box = map.viewBox.baseVal;
      const scale = .85 * box.width / (map.clientWidth || 1000);
      pin.setAttribute('transform', 'translate(' + point.join(' ') + ') scale(' + scale + ')');
      const nearRightEdge = point[0] > box.x + box.width * .58;
      pinLabel.setAttribute('x', nearRightEdge ? '-20' : '20');
      pinLabel.setAttribute('text-anchor', nearRightEdge ? 'end' : 'start');
    }
  }
  new MutationObserver(positionPin).observe(map, {attributes:true, attributeFilter:['viewBox']});
  if ('ResizeObserver' in window) new ResizeObserver(positionPin).observe(map);
  function focusPoint() { if (point) zoomTo(point, level === 'city' ? 18 : 9); }
  button.addEventListener('click', focusPoint);
  pin.addEventListener('click', focusPoint);
  pin.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); focusPoint(); }
  });
  function clearMarker() {
    point = null;
    outlined?.classList.remove('is-checkin-area');
    outlined = null;
    if ([pin,button].includes(document.activeElement)) map.focus({preventScroll:true});
    pin.remove();
    button.hidden = true;
  }
  async function show(location) {
    const place = sharedPlaceLabel(location);
    const country = place ? countryFor(location.country) : null;
    const key = JSON.stringify([place, country?.code]);
    if (key === lastKey) return;
    lastKey = key;
    const current = ++request;
    clearMarker();
    card.hidden = !place;
    if (!place) return;
    label.textContent = place;
    note.textContent = 'Shared by Dainyel.';
    if (!country) return;
    function draw(anchor, precision) {
      point = project(anchor);
      level = precision;
      const mapName = precision === 'city' ? location.city.trim() : country.name;
      const characters = [...mapName];
      pinLabel.textContent = characters.length > 24 ? characters.slice(0,23).join('') + '…' : mapName;
      positionPin();
      pin.setAttribute('tabindex', '0');
      pin.setAttribute('aria-label', 'Zoom to last shared check-in: ' + place
        + (precision === 'city' ? ' (approximate city area)' : ' (country overview)'));
      if (!pin.isConnected) layer.append(pin);
      button.hidden = false;
      note.textContent = precision === 'city' ? 'Approximate city area.' : 'Showing the country on the map.';
      if (precision === 'country') {
        outlined = [...map.querySelectorAll('[data-country]')].find(path => path.dataset.country === country.mapName);
        outlined?.classList.add('is-checkin-area');
      } else {
        outlined?.classList.remove('is-checkin-area');
        outlined = null;
      }
    }
    const city = location.city && fold(location.city);
    // Only the fixed, same-origin reference files are fetched. No check-in is sent.
    const [countries, cities] = await Promise.all([lookup('country'), city ? lookup('city') : null]);
    if (current !== request) return;
    const cityPoint = cities?.[country.code]?.[city];
    const area = countries?.[country.code];
    if (validPoint(cityPoint)) draw(cityPoint, 'city');
    else if (validPoint(area)) draw(area, 'country');
    else note.textContent = 'This check-in has no mapped area.';
  }
  document.addEventListener('site:check-in', event => { show(event.detail); });
  function start() {
    if (window.siteSharedCheckin?.known) { show(window.siteSharedCheckin.value); return; }
    Promise.resolve(window.publicTripReady).then(trip => {
      // An authoritative withdrawal or update always beats the published fallback.
      if (!window.siteSharedCheckin?.known) show(trip?.currentLocation);
    }).catch(() => {});
  }
  if (window.publicTripReady || document.readyState !== 'loading') start();
  else document.addEventListener('DOMContentLoaded', start, {once:true});
}
