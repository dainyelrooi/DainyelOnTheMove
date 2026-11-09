import {watchDestinations,getDestinationArchive} from './visited-data.js?v=visits1';
let initialized = false;
export async function initAtlas() {
  if (initialized) return;
  const map = document.getElementById('world-map');
  if (!map) return;
  const revision = new URL(import.meta.url).search;
  await Promise.all(['world-country-paths.js','travel-data.js'].map(path => import(new URL(path + revision, import.meta.url).href)));
  initialized = true;
  let visits = await getDestinationArchive();
  const { renderAtlasPhoto } = await import(new URL('atlas-photo.js' + revision, import.meta.url).href);
  let visitedByCountry = new Map();
  let selectedId = null, rendered = '';
  const ns = 'http://www.w3.org/2000/svg';
  const countries = document.getElementById('country-layer'), markers = document.getElementById('marker-layer');
  const list = document.getElementById('visit-list');
  list.replaceChildren();
  const project = ([lon, lat]) => [(lon + 180) / 360 * 1000, (90 - lat) / 180 * 500];
  function select(place) {
    selectedId = place.id;
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
    path.addEventListener('click', () => {const visit=visitedByCountry.get(feature.name);if(visit)select(visit);});
    path.addEventListener('keydown', event => {const visit=visitedByCountry.get(feature.name);if(visit&&(event.key==='Enter'||event.key===' ')){event.preventDefault();select(visit);}});
    const title = document.createElementNS(ns, 'title'); title.textContent = feature.name; path.append(title); countries.append(path);
  }
  function renderDestinations(next){
  const signature=JSON.stringify(next);if(signature===rendered)return;rendered=signature;visits=next;
  visitedByCountry=new Map(visits.filter(place=>place.mapName).map(place=>[place.mapName,place]));
  countries.querySelectorAll('.country').forEach(path=>{
    const visit=visitedByCountry.get(path.dataset.country);path.classList.toggle('visited',!!visit);
    if(visit&&!path.classList.contains('revealed')){path.setAttribute('tabindex','0');path.setAttribute('role','button');path.setAttribute('aria-label',visit.name+', previously visited');}
  });
  // Preserve the focused control while the live archive adds another country.
  const focusedName=list.contains(document.activeElement)?document.activeElement.dataset.visitName:null;
  list.querySelectorAll('.visit-group').forEach(node=>node.remove());markers.querySelectorAll('.territory-marker').forEach(node=>node.remove());
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
  const selected=visits.find(place=>place.id===selectedId);
  if(selected&&document.getElementById('place-status-text').textContent==='Previously visited'){list.querySelectorAll('[data-visit-name]').forEach(button=>{const active=button.dataset.visitName===selected.name;button.classList.toggle('is-selected',active);button.setAttribute('aria-pressed',String(active));});document.getElementById('place-year').textContent=selected.tripDetails||selected.year;}
  const filter=document.querySelector('.map-filter [aria-pressed="true"]')?.dataset.filter||'all';
  list.querySelectorAll('.visit-group').forEach(node=>{node.classList.toggle('map-hidden',filter==='revealed');list.insertBefore(node,list.querySelector('.map-reveal-list'));});
  markers.querySelectorAll('.territory-marker').forEach(node=>node.classList.toggle('map-hidden',filter==='revealed'));
  countries.querySelectorAll('.visited,.revealed').forEach(node=>node.classList.toggle('map-hidden',filter==='revealed'&&!node.classList.contains('revealed')||filter==='visited'&&!node.classList.contains('visited')));
  if(focusedName)[...list.querySelectorAll('[data-visit-name]')].find(button=>button.dataset.visitName===focusedName)?.focus({preventScroll:true});
  }
  renderDestinations(visits);watchDestinations(renderDestinations);
  let zoom = 1;
  function setZoom(value, centre) {
    zoom = Math.max(1, Math.min(6, value));
    const box = map.viewBox.baseVal;
    const [x, y] = centre || [box.x + box.width / 2, box.y + box.height / 2];
    const w = 1000 / zoom, h = 500 / zoom;
    map.setAttribute('viewBox', [Math.max(0, Math.min(1000-w, x-w/2)), Math.max(0, Math.min(500-h, y-h/2)), w, h].join(' '));
    document.getElementById('zoom-in').disabled = zoom >= 6;
    document.getElementById('zoom-out').disabled = zoom <= 1;
  }
  document.getElementById('zoom-in').addEventListener('click', () => setZoom(zoom + .4));
  document.getElementById('zoom-out').addEventListener('click', () => setZoom(zoom - .4));
  document.getElementById('zoom-reset').addEventListener('click', () => setZoom(1));
  setZoom(1);
  const hint = document.querySelector('.map-hint'); hint.id = 'atlas-pan-help'; hint.textContent = 'Choose a place on the map or from the list. After zooming, drag to move the map or focus the map and use the arrow keys.'; map.setAttribute('aria-describedby', 'atlas-pan-help');
  const [, {initAtlasCheckin}] = await Promise.all(['map-enhancements.js', 'atlas-checkin.js'].map(path => import(new URL(path + revision, import.meta.url).href)));
  initAtlasCheckin(map, (point, zoom) => setZoom(zoom, point), revision);
  const requested = new URLSearchParams(location.search).get('place');
  const place = visits.find(item => item.id === requested || item.name.toLowerCase() === requested?.toLowerCase());
  if (place) select(place);
}
