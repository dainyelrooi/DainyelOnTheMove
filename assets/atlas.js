let initialized = false;
export async function initAtlas() {
  if (initialized) return;
  const map = document.getElementById('world-map');
  if (!map) return;
  const revision = new URL(import.meta.url).search;
  await Promise.all(['world-country-paths.js','travel-data.js'].map(path => import(new URL(path + revision, import.meta.url).href)));
  initialized = true;
  const visits = window.travelData.visitedDestinations;
  const { renderAtlasPhoto } = await import(new URL('atlas-photo.js' + revision, import.meta.url).href);
  const visitedByCountry = new Map(visits.filter(place => place.mapName).map(place => [place.mapName, place]));
  const ns = 'http://www.w3.org/2000/svg';
  const countries = document.getElementById('country-layer'), markers = document.getElementById('marker-layer');
  const list = document.getElementById('visit-list');
  list.replaceChildren();
  const project = ([lon, lat]) => [(lon + 180) / 360 * 1000, (90 - lat) / 180 * 500];
  function select(place) {
    document.querySelectorAll('.country.is-selected,.visit-button.is-selected,.territory-marker.is-selected,.revealed-marker.is-selected').forEach(node => node.classList.remove('is-selected'));
    countries.querySelectorAll('.country').forEach(path => path.classList.toggle('is-selected', path.dataset.country === place.mapName));
    list.querySelectorAll('[data-visit-name]').forEach(button => button.classList.toggle('is-selected', button.dataset.visitName === place.name));
    list.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.classList.contains('is-selected'))));
    markers.querySelectorAll('.territory-marker').forEach(marker => marker.classList.toggle('is-selected', marker.dataset.visitName === place.name));
    document.getElementById('place-status-text').textContent = 'Previously visited';
    document.getElementById('place-name').textContent = place.name;
    document.getElementById('place-description').textContent = place.memory || (place.coordinates ? 'The marker shows the approximate territory, never an exact location.' : 'A place I have visited in ' + place.region + '.');
    renderAtlasPhoto(place.photo, place.filmHref);
    const year = document.getElementById('place-year'); year.hidden = false; year.textContent = place.tripDetails || place.year;
    const story = document.getElementById('place-story'); story.hidden = !place.storyHref;
    if (place.storyHref) {
      document.getElementById('place-story-status').textContent = place.storyStatus || 'Travel story';
      document.getElementById('place-story-description').textContent = place.storyText || '';
      const link = document.getElementById('place-story-link');
      link.href = place.name === 'Thailand' ? '/stories#travel-stories' : place.storyHref;
      link.textContent = place.storyLink || 'Read the story →'; link.hidden = false;
    }
    const detail = document.getElementById('selected-place');
    const bounds = detail.getBoundingClientRect();
    if (bounds.top < 90 || bounds.top > innerHeight - 140) {
      document.getElementById('place-name').focus({preventScroll:true});
      detail.scrollIntoView({block:'start',behavior:'instant'});
    }
  }
  for (const feature of window.worldCountryPaths) {
    const path = document.createElementNS(ns, 'path'); path.setAttribute('d', feature.path); path.setAttribute('fill-rule', 'evenodd');
    path.classList.add('country'); path.dataset.country = feature.name;
    const visit = visitedByCountry.get(feature.name);
    if (visit) {
      path.classList.add('visited'); path.setAttribute('tabindex', '0'); path.setAttribute('role', 'button'); path.setAttribute('aria-label', visit.name + ', previously visited');
      path.addEventListener('click', () => select(visit));
      path.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(visit); } });
    }
    const title = document.createElementNS(ns, 'title'); title.textContent = feature.name; path.append(title); countries.append(path);
  }
  const groups = new Map();
  visits.forEach(place => {
    if (!groups.has(place.region)) {
      const group = document.createElement('section'); group.className = 'visit-group';
      const title = document.createElement('h4'); title.textContent = place.region;
      const holder = document.createElement('div'); holder.className = 'visit-buttons'; group.append(title, holder); list.append(group); groups.set(place.region, holder);
    }
    const button = document.createElement('button'); button.type = 'button'; button.className = 'visit-button'; button.dataset.visitName = place.name;
    button.setAttribute('aria-pressed', 'false');
    const label = document.createElement('span'); label.textContent = place.name;
    const date = document.createElement('small'); date.textContent = place.listYear || place.year;
    button.append(label, date); button.addEventListener('click', () => select(place)); groups.get(place.region).append(button);
    if (place.coordinates) {
      const [x, y] = project(place.coordinates), marker = document.createElementNS(ns, 'circle');
      marker.setAttribute('cx', (x + (place.name === 'Aruba' ? -5 : place.name === 'Curaçao' ? 5 : 0)).toFixed(1)); marker.setAttribute('cy', y.toFixed(1)); marker.setAttribute('r', '6');
      marker.classList.add('territory-marker'); marker.setAttribute('tabindex','0'); marker.setAttribute('role','button'); marker.setAttribute('aria-label',place.name + ', previously visited');
      marker.dataset.visitName = place.name;
      marker.addEventListener('click', () => select(place)); marker.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(place); } }); markers.append(marker);
    }
  });
  let zoom = 1;
  function setZoom(value) { zoom = Math.max(1, Math.min(3, value)); const w = 1000 / zoom, h = 500 / zoom; map.setAttribute('viewBox', `${(1000-w)/2} ${(500-h)/2} ${w} ${h}`); document.getElementById('zoom-in').disabled = zoom >= 3; document.getElementById('zoom-out').disabled = zoom <= 1; }
  document.getElementById('zoom-in').addEventListener('click', () => setZoom(zoom + .4));
  document.getElementById('zoom-out').addEventListener('click', () => setZoom(zoom - .4));
  document.getElementById('zoom-reset').addEventListener('click', () => setZoom(1));
  setZoom(1);
  const hint = document.querySelector('.map-hint'); hint.id = 'atlas-pan-help'; hint.textContent = 'Choose a place on the map or from the list. After zooming, drag to move the map or focus the map and use the arrow keys.'; map.setAttribute('aria-describedby', 'atlas-pan-help');
  await import(new URL('map-enhancements.js' + revision, import.meta.url).href);
  const requested = new URLSearchParams(location.search).get('place');
  const place = visits.find(item => item.id === requested || item.name.toLowerCase() === requested?.toLowerCase());
  if (place) select(place);
}
