import {sharedPlaceLabel} from '../assets/journey-core.js';
/* Render only places explicitly published in the public trip file. */
(() => {
  function initialize() {
    const list = document.getElementById('journey-stops');
    if (!list || !window.publicTripReady) return;
  window.publicTripReady.then(trip => {
    if (!trip) return;
    const stops = Array.isArray(trip.revealedStops) ? trip.revealedStops : [];
    const current = sharedPlaceLabel(trip.currentLocation);
    if (current) {
      const location = document.createElement('p');
      location.className = 'trip-location-note';
      location.textContent = (stops.length ? 'Last shared location: ' : 'First shared place: ') + current + (stops.length ? '' : '.');
      list.before(location);
      if (!stops.length) {
        const empty = document.getElementById('trip-reveal-empty');
        if (empty) {
          // The shared trip clock must not restore the unrevealed-place copy.
          empty.removeAttribute('data-trip-secret');
          empty.textContent = 'The rest of the route will be revealed along the way.';
        }
      }
    }
    if (!stops.length) return;
    document.getElementById('trip-reveal-empty')?.remove();
    list.replaceChildren();
    stops.filter(stop => stop && typeof stop.country === 'string' && stop.country.trim()).forEach(stop => {
      const card = document.createElement('article');
      card.className = 'trip-reveal-card';
      if (typeof stop.id === 'string' && /^[a-z0-9-]+$/.test(stop.id)) card.id = 'reveal-' + stop.id;
      const heading = document.createElement('h3');
      heading.textContent = [stop.city, stop.country].filter(Boolean).join(', ');
      const date = document.createElement('time');
      if (stop.date) date.dateTime = stop.date;
      const publishedDate = Date.parse(stop.date);
      date.textContent = Number.isFinite(publishedDate)
        ? new Intl.DateTimeFormat('en-GB', { day:'numeric', month:'long', year:'numeric', timeZone:'UTC' }).format(new Date(publishedDate))
        : stop.date || '';
      const text = document.createElement('p');
      text.textContent = stop.text || '';
      card.append(date, heading, text);
      const photo = stop.photos?.[0];
      if (photo && typeof photo.src === 'string' && /^(?:assets\/|\/assets\/)/.test(photo.src) && !photo.src.includes('..')) {
        const image = document.createElement('img');
        image.src = photo.src;
        image.alt = photo.alt || '';
        image.loading = 'lazy';
        image.decoding = 'async';
        image.width = 640; image.height = 400;
        card.prepend(image);
      }
      if (typeof stop.storyUrl === 'string' && /^\/?[a-z0-9-]+(?:\.html)?(?:#[a-z0-9-]+)?$/i.test(stop.storyUrl)) {
        const link = document.createElement('a');
        link.href = stop.storyUrl;
        link.className = 'text-link';
        link.textContent = 'Read the story \u2192';
        card.append(link);
      }
      list.append(card);
    });
    const heading = document.querySelector('#trip-reveals > h3');
    if (heading) heading.textContent = 'The journey, as it unfolds.';
  });
  }
  // Atlas can import this module before the later classic defer bootstrap runs.
  if (window.publicTripReady) initialize();
  else if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', initialize, {once:true});
})();
