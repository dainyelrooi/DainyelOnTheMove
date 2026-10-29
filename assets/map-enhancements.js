import { renderAtlasPhoto } from './atlas-photo.js';
import {tripState, sharedPlaceLabel} from './journey-core.js';
(() => {
  const map = document.getElementById('world-map');
  const markerLayer = document.getElementById('marker-layer');
  const visitList = document.getElementById('visit-list');
  const tools = document.querySelector('.map-tools');
  if (!map || !markerLayer || !visitList || !tools) return;

  const ns = 'http://www.w3.org/2000/svg';
  const project = ([lon, lat]) => [(lon + 180) / 360 * 1000, (90 - lat) / 180 * 500];
  const selected = Object.fromEntries(['status-text', 'name', 'description', 'year', 'story', 'story-status', 'story-description', 'story-link']
    .map(name => [name, document.getElementById('place-' + name)]));
  let activeFilter = 'all';
  let revealedStops = [];
  let sharedTrip = null;
  let route;

  function sharedJourneyCopy() {
    const place = sharedPlaceLabel(sharedTrip?.currentLocation);
    const state = sharedTrip ? tripState(sharedTrip) : null;
    const phase = state?.phase === 'travelling' ? 'On the move. ' : state?.phase === 'completed' ? 'Journey completed. ' : '';
    if (place) return phase + 'Last shared location: ' + place + '. The rest of the route will be revealed along the way.';
    if (phase) return phase + 'Places will be revealed along the way.';
    if (state?.phase === 'awaiting-confirmation') return 'The planned departure date has arrived. The next update will confirm the journey.';
    return 'The route stays secret until I get there.';
  }

  const safeUrl = value => {
    if (typeof value !== 'string' || !value.trim() || value.trim().startsWith('//')) return null;
    try {
      const url = new URL(value, window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url : null;
    } catch { return null; }
  };
  const hasCoordinates = stop => Array.isArray(stop.coordinates)
    && stop.coordinates.length === 2
    && stop.coordinates.every(Number.isFinite)
    && Math.abs(stop.coordinates[0]) <= 180
    && Math.abs(stop.coordinates[1]) <= 90;

  const filters = document.createElement('div');
  filters.className = 'map-filter';
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', 'Filter travel atlas');
  [['all', 'All'], ['visited', 'Visited'], ['revealed', 'Revealed']].forEach(([value, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.filter = value;
    button.textContent = label;
    button.setAttribute('aria-pressed', String(value === 'all'));
    filters.append(button);
  });
  tools.insertBefore(filters, tools.firstChild);

  const group = document.createElement('section');
  group.className = 'map-reveal-list';
  const heading = document.createElement('h4');
  heading.textContent = 'Trip to Latin America';
  const holder = document.createElement('div');
  holder.className = 'visit-buttons';
  const note = document.createElement('p');
  note.className = 'map-reveal-note';
  note.textContent = 'The route stays secret until I get there.';
  group.append(heading, holder, note);
  visitList.append(group);

  function clearSelection() {
    document.querySelectorAll('.visit-button.is-selected,.country.is-selected,.territory-marker.is-selected,.revealed-marker.is-selected')
      .forEach(node => { node.classList.remove('is-selected'); if (node.tagName === 'BUTTON') node.setAttribute('aria-pressed', 'false'); });
  }

  const clearRevealSelection = event => {
    if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
    document.querySelectorAll('.revealed-marker.is-selected').forEach(node => node.classList.remove('is-selected'));
  };
  [map, visitList].forEach(container => {
    container.addEventListener('click', clearRevealSelection, true);
    container.addEventListener('keydown', clearRevealSelection, true);
  });

  function selectReveal(stop, marker, button) {
    clearSelection();
    marker?.classList.add('is-selected');
    button?.classList.add('is-selected');
    button?.setAttribute('aria-pressed', 'true');
    renderAtlasPhoto(stop.photos?.[0]);
    document.querySelectorAll('.country').forEach(path => {
      if (path.dataset.country === stop.country) path.classList.add('is-selected');
    });
    if (selected['status-text']) selected['status-text'].textContent = 'Revealed on the journey';
    if (selected.name) selected.name.textContent = [stop.city, stop.country].filter(Boolean).join(', ');
    if (selected.description) selected.description.textContent = stop.text || 'A stop shared from the road.';
    if (selected.year) {
      selected.year.hidden = !stop.date;
      selected.year.textContent = stop.date ? 'Shared: ' + stop.date : '';
    }
    const storyUrl = safeUrl(stop.storyUrl);
    if (selected.story) selected.story.hidden = !storyUrl;
    const link = selected['story-link'];
    if (link) {
      link.hidden = !storyUrl;
      link.removeAttribute('href');
      link.removeAttribute('target');
      link.removeAttribute('rel');
      if (storyUrl) {
        const external = storyUrl.origin !== window.location.origin;
        link.href = storyUrl.href;
        link.textContent = external ? 'Read the story \u2197' : 'Read the story \u2192';
        if (external) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
      }
    }
    if (selected['story-status']) selected['story-status'].textContent = 'From the journey';
    if (selected['story-description']) selected['story-description'].textContent = 'Open the story behind this revealed stop.';
    const detail = document.getElementById('selected-place'), bounds = detail.getBoundingClientRect();
    if (bounds.top < 90 || bounds.top > innerHeight - 140) { selected.name.focus({preventScroll:true}); detail.scrollIntoView({block:'start',behavior:'instant'}); }
  }

  function applyFilter(filter) {
    activeFilter = filter;
    document.querySelectorAll('.country.visited,.country.revealed').forEach(node => {
      const visible = filter === 'all'
        || (filter === 'visited' && node.classList.contains('visited'))
        || (filter === 'revealed' && node.classList.contains('revealed'));
      node.classList.toggle('map-hidden', !visible);
    });
    document.querySelectorAll('.territory-marker,.visit-group').forEach(node => node.classList.toggle('map-hidden', filter === 'revealed'));
    document.querySelectorAll('.revealed-marker').forEach(node => node.classList.toggle('map-hidden', filter === 'visited'));
    group.classList.toggle('map-hidden', filter === 'visited');
    route?.classList.toggle('map-hidden', filter === 'visited');
    if (filter === 'revealed' && !revealedStops.length) {
      clearSelection();
      const place = sharedPlaceLabel(sharedTrip?.currentLocation), state = sharedTrip ? tripState(sharedTrip) : null;
      if (selected['status-text']) selected['status-text'].textContent = place ? 'Last shared location' : 'Trip to Latin America';
      if (selected.name) selected.name.textContent = place || (state?.phase === 'travelling' ? 'On the move.' : state?.phase === 'completed' ? 'The journey, remembered.' : 'A journey waiting to unfold.');
      if (selected.description) selected.description.textContent = sharedJourneyCopy();
      if (selected.year) selected.year.hidden = true;
      if (selected.story) selected.story.hidden = true;
      renderAtlasPhoto(null);
    }
    if (filter === 'visited' && selected['status-text']?.textContent === 'Revealed on the journey') {
      clearSelection(); selected['status-text'].textContent = 'Previously visited'; selected.name.textContent = 'Explore the visited archive.'; selected.description.textContent = 'Choose a place from the map or the list.'; selected.year.hidden = true; selected.story.hidden = true; renderAtlasPhoto(null);
    }
    filters.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  }
  filters.addEventListener('click', event => {
    const button = event.target.closest('button[data-filter]');
    if (button) applyFilter(button.dataset.filter);
  });

  function initializeTrip() {
    if (!window.publicTripReady) return;
    Promise.resolve(window.publicTripReady).then(trip => {
    sharedTrip = trip;
    revealedStops = Array.isArray(trip?.revealedStops)
      ? trip.revealedStops.filter(stop => stop && typeof stop.country === 'string' && stop.country.trim())
      : [];
    const segments = [];
    revealedStops.forEach((stop, index) => {
      let marker;
      if (hasCoordinates(stop)) {
        const [x, y] = project(stop.coordinates);
        marker = document.createElementNS(ns, 'circle');
        marker.setAttribute('cx', x.toFixed(1));
        marker.setAttribute('cy', y.toFixed(1));
        marker.setAttribute('r', '5.5');
        marker.classList.add('revealed-marker');
        marker.setAttribute('tabindex', '0');
        marker.setAttribute('role', 'button');
        marker.setAttribute('aria-label', [stop.city, stop.country].filter(Boolean).join(', ') + ', revealed journey stop');
        const title = document.createElementNS(ns, 'title');
        title.textContent = stop.country + ' \u2014 revealed';
        marker.append(title);
        markerLayer.append(marker);
        const previous = revealedStops[index - 1];
        if (previous && hasCoordinates(previous) && Math.abs(project(previous.coordinates)[0] - x) < 500) segments.push('M ' + project(previous.coordinates).join(' ') + ' L ' + x + ' ' + y);
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'visit-button'; button.dataset.revealId = stop.id;
      button.setAttribute('aria-pressed', 'false');
      const name = document.createElement('span');
      name.textContent = [stop.city, stop.country].filter(Boolean).join(', ');
      const status = document.createElement('small');
      status.textContent = stop.date || 'Revealed';
      button.append(name, status);
      const select = () => selectReveal(stop, marker, button);
      button.addEventListener('click', select);
      marker?.addEventListener('click', select);
      marker?.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); }
      });
      holder.append(button);
      document.querySelectorAll('.country').forEach(country => {
        if (country.dataset.country !== stop.country) return;
        country.classList.add('revealed');
        country.setAttribute('tabindex', '0'); country.setAttribute('role', 'button'); country.setAttribute('aria-label', stop.country + ', revealed journey stop');
        country.addEventListener('click', () => { if (activeFilter !== 'visited') select(); });
        country.addEventListener('keydown', event => {
          if (activeFilter !== 'visited' && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); select(); }
        });
      });
    });
    if (segments.length) {
      route = document.createElementNS(ns, 'path');
      route.classList.add('map-route');
      route.setAttribute('d', segments.join(' '));
      route.setAttribute('pathLength', '1');
      route.setAttribute('aria-hidden', 'true');
      markerLayer.insertBefore(route, markerLayer.firstChild);
    }
    if (revealedStops.length) note.textContent = 'Only places already shared from the road appear here.';
    else note.textContent = sharedJourneyCopy();
    const legend = document.querySelector('.map-legend');
    const swatch = document.createElement('span'); swatch.className = 'legend-swatch legend-revealed'; swatch.setAttribute('aria-hidden','true'); legend?.append(swatch, document.createTextNode(' Revealed'));
    applyFilter(activeFilter);
  }).catch(() => {
    // Keep the visited atlas usable when the public reveal feed is unavailable.
  });
  }
  if (window.publicTripReady) initializeTrip();
  else if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', initializeTrip, {once:true});

  map.setAttribute('role', 'group');
  map.setAttribute('tabindex', '0');
  const updateTouchPanning = () => { map.style.touchAction = map.viewBox.baseVal.width < 1000 ? 'none' : 'pan-y'; };
  updateTouchPanning();
  new MutationObserver(updateTouchPanning).observe(map, { attributes: true, attributeFilter: ['viewBox'] });
  let drag, suppressClick = false;
  const pan = (x, y, width, height) => {
    map.setAttribute('viewBox', Math.max(0, Math.min(1000 - width, x)) + ' ' + Math.max(0, Math.min(500 - height, y)) + ' ' + width + ' ' + height);
  };
  map.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const box = map.viewBox.baseVal;
    if (box.width >= 1000) return;
    drag = { x: event.clientX, y: event.clientY, view: { x: box.x, y: box.y, width: box.width, height: box.height } };
  });
  map.addEventListener('pointermove', event => {
    if (!drag) return;
    if (Math.abs(event.clientX - drag.x) + Math.abs(event.clientY - drag.y) < 6) return;
    suppressClick = true; map.setPointerCapture?.(event.pointerId);
    const rect = map.getBoundingClientRect();
    const dx = (event.clientX - drag.x) / rect.width * drag.view.width;
    const dy = (event.clientY - drag.y) / rect.height * drag.view.height;
    pan(drag.view.x - dx, drag.view.y - dy, drag.view.width, drag.view.height);
  });
  const endDrag = () => { drag = undefined; setTimeout(() => { suppressClick = false; }, 0); };
  map.addEventListener('pointerup', endDrag);
  map.addEventListener('pointercancel', endDrag);
  map.addEventListener('lostpointercapture', endDrag);
  map.addEventListener('click', event => { if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
  map.addEventListener('keydown', event => {
    if (event.target !== map || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const box = map.viewBox.baseVal;
    if (box.width >= 1000) return;
    event.preventDefault();
    const step = box.width * 0.08;
    pan(box.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), box.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0), box.width, box.height);
  });
})();
