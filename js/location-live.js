import { doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db } from './firebase.js';
import { sharedPlaceLabel } from '../assets/journey-core.js';

// Reuse one public subscription, including when hashed and ordinary imports
// meet. This receives only the owner's shared broad place, never device GPS.
const relevant = () => document.querySelector('[data-nav-updates],[data-location-place],[data-location-updated],#location-place,#location-updated');
function nodes(selector, legacy) {
  return [...new Set([...document.querySelectorAll(selector), document.getElementById(legacy)].filter(Boolean))];
}
function draw(location) {
  const place = sharedPlaceLabel(location);
  for (const card of document.querySelectorAll('[data-location-card]')) card.hidden = !place;
  for (const label of nodes('[data-location-place]', 'location-place')) label.textContent = place || 'Currently exploring somewhere new';
  const stamp = Date.parse(location?.updatedAt || '');
  const updated = !place ? 'No current location shared' : Number.isFinite(stamp) ? 'Updated ' + new Date(stamp).toLocaleString(undefined, {dateStyle:'medium', timeStyle:'short'}) : 'Shared date not provided';
  for (const label of nodes('[data-location-updated]', 'location-updated')) label.textContent = updated;
}
function publish(location) {
  window.siteSharedCheckin = {known:true, value:location};
  draw(location);
  // Clear missing/withdrawn values as well, so a later static trip bootstrap
  // cannot resurrect an authoritative removed check-in.
  document.dispatchEvent(new CustomEvent('site:check-in', {detail:location}));
}
function unavailable() {
  for (const label of nodes('[data-location-updated]', 'location-updated')) label.textContent = 'Location update is temporarily unavailable';
}
function sharedLocation(source) {
  if (!sharedPlaceLabel(source)) return null;
  const location = {...(source.city === undefined ? {} : {city:source.city.trim()}), country:source.country.trim()};
  try {
    const stamp = typeof source.updatedAt === 'string' ? new Date(source.updatedAt) : source.updatedAt?.toDate?.();
    if (stamp instanceof Date && Number.isFinite(stamp.getTime())) location.updatedAt = stamp.toISOString();
  } catch { /* Keep unknown dates unknown; never manufacture a current timestamp. */ }
  return location;
}
function tripContextReady() {
  // The ordinary trip bootstrap may still be resolving when Firestore arrives.
  // Wait for that existing promise rather than briefly displaying an old place.
  return new Promise(resolve => {
    function read() { Promise.resolve(window.publicTripReady || null).then(resolve, () => resolve(null)); }
    if (window.publicTripReady || document.readyState !== 'loading') read();
    else document.addEventListener('DOMContentLoaded', read, {once:true});
  });
}
function currentSharedLocation(location, trip) {
  const fallback = sharedLocation(trip?.currentLocation);
  const releaseBoundary = Date.parse(trip?.departureAt || '');
  const sharedAt = Date.parse(location.updatedAt || '');
  // This is the existing trip's publication/date boundary, not an inferred
  // actual departure instant. A positively dated pre-trip check-in must not
  // replace the place approved for the confirmed journey. Undated records and
  // missing trip evidence are not guessed to be old.
  if (trip?.departureConfirmed === true && fallback && Number.isFinite(releaseBoundary) && Number.isFinite(sharedAt) && sharedAt < releaseBoundary) return fallback;
  return location;
}
if (relevant()) {
  if (window.siteSharedCheckin?.known) draw(window.siteSharedCheckin.value);
  if (!window.siteSharedLocationFeedStarted) {
    window.siteSharedLocationFeedStarted = true;
    const tripReady = tripContextReady();
    let revision = 0;
    try {
      onSnapshot(doc(db, 'siteStatus', 'current'), {includeMetadataChanges:true}, snapshot => {
        if (snapshot.metadata?.fromCache === true) return;
        const received = ++revision;
        const source = snapshot.exists() ? snapshot.data() : null;
        const location = sharedLocation(source);
        // A withdrawal is authoritative immediately and invalidates any older
        // valid snapshot still waiting for the static trip context.
        if (!location) { publish(null); return; }
        tripReady.then(trip => { if (received === revision) publish(currentSharedLocation(location, trip)); });
      }, unavailable);
    } catch { window.siteSharedLocationFeedStarted = false; unavailable(); }
  }
}
