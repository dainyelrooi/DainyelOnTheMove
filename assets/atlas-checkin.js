import {sharedPlaceLabel} from './journey-core.js';
import {countryFor} from './visited-model.js';
import {pointLookup, sharedPlacePoint, projectPlacePoint} from './shared-place-point.js';

const ns = 'http://www.w3.org/2000/svg';

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
  const lookup = pointLookup(revision);
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
      point = projectPlacePoint(anchor);
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
    // Only the fixed, same-origin reference files are fetched. No check-in is sent.
    const resolved = await sharedPlacePoint(location, lookup);
    if (current !== request) return;
    if (resolved?.anchor) draw(resolved.anchor, resolved.precision);
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
