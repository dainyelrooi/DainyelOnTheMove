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
if (relevant()) {
  if (window.siteSharedCheckin?.known) draw(window.siteSharedCheckin.value);
  if (!window.siteSharedLocationFeedStarted) {
    window.siteSharedLocationFeedStarted = true;
    try {
      onSnapshot(doc(db, 'siteStatus', 'current'), {includeMetadataChanges:true}, snapshot => {
        if (snapshot.metadata?.fromCache === true) return;
        const source = snapshot.exists() ? snapshot.data() : null;
        if (!sharedPlaceLabel(source)) { publish(null); return; }
        const location = {...(source.city === undefined ? {} : {city:source.city.trim()}), country:source.country.trim()};
        try {
          const stamp = source.updatedAt?.toDate?.();
          if (stamp instanceof Date && Number.isFinite(stamp.getTime())) location.updatedAt = stamp.toISOString();
        } catch { /* A missing date never becomes an invented "just now". */ }
        publish(location);
      }, unavailable);
    } catch { window.siteSharedLocationFeedStarted = false; unavailable(); }
  }
}
