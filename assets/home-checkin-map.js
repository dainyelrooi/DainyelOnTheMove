import {sharedPlaceLabel} from './journey-core.js';
import {sharedPlacePoint, pointLookup, projectPlacePoint} from './shared-place-point.js';

export function initHomeCheckinMap(root) {
  if (!root || root.dataset.ready) return;
  root.dataset.ready = 'true';
  const pin = root.querySelector('[data-home-checkin-pin]'), link = root.querySelector('a');
  const name = root.querySelector('[data-home-checkin-name]'), note = root.querySelector('[data-home-checkin-note]');
  const map = root.querySelector('svg'), lookup = pointLookup(new URL(import.meta.url).search);
  let active = false, request = 0, authoritative = window.siteSharedCheckin?.known === true;
  let location = authoritative ? window.siteSharedCheckin.value : null;
  const clear = () => { pin.setAttribute('hidden', ''); pin.setAttribute('display', 'none'); };
  async function show() {
    const run = ++request, value = location, place = sharedPlaceLabel(value);
    clear();
    name.textContent = place || 'Explore the shared journey';
    note.textContent = place ? 'Open the Atlas for the shared places.' : 'No current check-in has been shared.';
    link.href = '/atlas#map';
    map.setAttribute('aria-label', 'Map of Latin America. Open the travel Atlas.');
    if (!active || !place) return;
    const resolved = await sharedPlacePoint(value, lookup);
    if (run !== request || !resolved) return;
    link.href = '/atlas?place=' + encodeURIComponent(resolved.country.baseId || 'country-' + resolved.country.code.toLowerCase()) + '#map';
    if (!resolved.anchor) return;
    const [x, y] = projectPlacePoint(resolved.anchor);
    // This is a Latin America illustration, so never clamp an outside place to it.
    if (x < 160 || x > 430 || y < 145 || y > 425) {
      note.textContent = 'See this shared place in the full Atlas.';
      return;
    }
    pin.setAttribute('transform', 'translate(' + x + ' ' + y + ')');
    pin.removeAttribute('display'); pin.removeAttribute('hidden');
    const precision = resolved.precision === 'city' ? 'Approximate city area' : 'Country overview';
    note.textContent = precision + ' · shared by Dainyel.';
    map.setAttribute('aria-label', 'Last shared check-in: ' + place + '. ' + precision + '.');
  }
  document.addEventListener('site:check-in', event => { authoritative = true; location = event.detail; show(); });
  function connectTrip() {
    Promise.resolve(window.publicTripReady).then(trip => {
      if (window.siteSharedCheckin?.known === true) { authoritative = true; location = window.siteSharedCheckin.value; }
      else if (!authoritative) location = trip?.currentLocation || null;
      show();
    }).catch(() => {});
  }
  if (window.publicTripReady || document.readyState !== 'loading') connectTrip();
  else document.addEventListener('DOMContentLoaded', connectTrip, {once:true});
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      active = true; observer.disconnect(); show();
    }, {rootMargin:'160px'});
    observer.observe(root);
  } else { active = true; }
  show();
}

const root = document.querySelector('[data-home-checkin-map]');
if (root) initHomeCheckinMap(root);
