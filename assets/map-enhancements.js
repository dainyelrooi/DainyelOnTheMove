(() => {
  const data = window.travelData;
  const map = document.getElementById('world-map');
  const markerLayer = document.getElementById('marker-layer');
  const visitList = document.getElementById('visit-list');
  const tools = document.querySelector('.map-tools');
  if (!data || !map || !markerLayer || !visitList || !tools) return;

  const plans = data.southAmericaJourney.stops;
  const statusLabel = status => status === 'completed' ? 'Completed route stop' : status === 'exploring' ? 'Currently exploring' : 'Planned route stop';
  const shortStatus = status => status === 'completed' ? 'Completed' : status === 'exploring' ? 'Exploring' : 'Planned';
  const ns = 'http://www.w3.org/2000/svg';
  const project = ([lon, lat]) => [(lon + 180) / 360 * 1000, (90 - lat) / 180 * 500];
  const selected = { status:document.getElementById('place-status-text'), name:document.getElementById('place-name'), description:document.getElementById('place-description'), year:document.getElementById('place-year'), story:document.getElementById('place-story') };

  const filters = document.createElement('div');
  filters.className = 'map-filter';
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', 'Filter travel atlas');
  [['all','All'],['visited','Visited'],['completed','Route completed'],['current','Currently exploring'],['planned','Planned route']].forEach(([value,label]) => {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.filter = value; button.textContent = label;
    button.setAttribute('aria-pressed', String(value === 'all')); filters.append(button);
  });
  tools.insertBefore(filters, tools.firstChild);

  const route = document.createElementNS(ns, 'path');
  route.classList.add('map-route');
  route.setAttribute('d', plans.map((stop, index) => `${index ? 'L' : 'M'} ${project(stop.coordinates).join(' ')}`).join(' '));
  markerLayer.append(route);

  function selectPlan(plan, marker) {
    document.querySelectorAll('.visit-button.is-selected,.country.is-selected,.territory-marker.is-selected,.planned-marker.is-selected').forEach(node => node.classList.remove('is-selected'));
    if (marker) marker.classList.add('is-selected');
    document.querySelectorAll('.country').forEach(path => { if (path.dataset.country === plan.mapName) path.classList.add('is-selected'); });
    selected.status.textContent = statusLabel(plan.status || 'planned');
    selected.name.textContent = plan.country;
    selected.description.textContent = plan.detail;
    selected.year.hidden = false;
    selected.year.replaceChildren(Object.assign(document.createElement('strong'), {textContent:'Route status:'}), document.createTextNode(' ' + shortStatus(plan.status || 'planned') + '. Details and content appear only when confirmed.'));
    selected.story.hidden = true;
  }

  plans.forEach(plan => {
    const [x,y] = project(plan.coordinates);
    const marker = document.createElementNS(ns, 'circle');
    marker.setAttribute('cx', x.toFixed(1)); marker.setAttribute('cy', y.toFixed(1)); marker.setAttribute('r', '5.5');
    marker.classList.add('planned-marker'); marker.dataset.journeyStatus = plan.status || 'planned'; marker.dataset.planName = plan.country;
    marker.setAttribute('tabindex', '0'); marker.setAttribute('role', 'button'); marker.setAttribute('aria-label', plan.country + ', ' + shortStatus(plan.status || 'planned') + ' journey stop');
    const title = document.createElementNS(ns, 'title'); title.textContent = plan.country + ' - ' + shortStatus(plan.status || 'planned'); marker.append(title);
    marker.addEventListener('click', () => selectPlan(plan, marker));
    marker.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectPlan(plan, marker); } });
    markerLayer.append(marker);
    if (plan.mapName) {
      const country = [...document.querySelectorAll('.country')].find(path => path.dataset.country === plan.mapName);
      if (country) { country.classList.add('planned', 'is-' + (plan.status || 'planned')); country.addEventListener('click', () => selectPlan(plan, marker)); country.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') selectPlan(plan, marker); }); }
    }
  });

  const group = document.createElement('section'); group.className = 'map-plan-list';
  group.innerHTML = '<h4>Route progress</h4>';
  const holder = document.createElement('div'); holder.className = 'visit-buttons';
  plans.forEach(plan => { const button = document.createElement('button'); button.type='button'; button.className='visit-button'; button.innerHTML='<span>' + plan.country + '</span><small>' + shortStatus(plan.status || 'planned') + '</small>'; button.addEventListener('click', () => selectPlan(plan, [...markerLayer.querySelectorAll('.planned-marker')].find(marker => marker.dataset.planName === plan.country))); holder.append(button); });
  group.append(holder, Object.assign(document.createElement('p'), {className:'map-plan-note', textContent:'This route remains a plan until a real update, story or film is shared.'})); visitList.append(group);

  function applyFilter(filter) {
    const statusFilter = filter === 'completed' ? 'completed' : filter === 'current' ? 'exploring' : filter === 'planned' ? 'planned' : '';
    const showVisited = filter === 'all' || filter === 'visited';
    document.querySelectorAll('.country.visited,.territory-marker').forEach(node => node.classList.toggle('map-hidden', !showVisited));
    document.querySelectorAll('.country.planned,.planned-marker').forEach(node => {
      const status = node.dataset.journeyStatus || [...node.classList].find(name => name.indexOf('is-') === 0)?.replace('is-', '') || 'planned';
      const visible = filter === 'all' || (statusFilter && status === statusFilter);
      node.classList.toggle('map-hidden', !visible);
    });
    route.classList.toggle('map-hidden', !(filter === 'all' || filter === 'planned'));
    route.classList.toggle('is-paused', filter !== 'planned');
    if (filter === 'current' && !plans.some(plan => plan.status === 'exploring')) {
      selected.status.textContent = 'Currently exploring';
      selected.name.textContent = 'No public destination shared';
      selected.description.textContent = 'A current location appears only when Dainyel chooses to share a broad city-and-country update.';
      selected.year.hidden = true;
      selected.story.hidden = true;
    }
    filters.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  }
  filters.addEventListener('click', event => { const button = event.target.closest('button[data-filter]'); if (button) applyFilter(button.dataset.filter); });

  let drag;
  map.addEventListener('pointerdown', event => { if (event.pointerType === 'mouse' && event.button !== 0) return; const box = map.viewBox.baseVal; if (box.width >= 1000) return; drag = {x:event.clientX,y:event.clientY,view:{x:box.x,y:box.y,width:box.width,height:box.height}}; map.setPointerCapture?.(event.pointerId); });
  map.addEventListener('pointermove', event => { if (!drag) return; const rect=map.getBoundingClientRect(); const dx=(event.clientX-drag.x)/rect.width*drag.view.width; const dy=(event.clientY-drag.y)/rect.height*drag.view.height; const maxX=1000-drag.view.width,maxY=500-drag.view.height; const x=Math.max(0,Math.min(maxX,drag.view.x-dx)); const y=Math.max(0,Math.min(maxY,drag.view.y-dy)); map.setAttribute('viewBox',`${x} ${y} ${drag.view.width} ${drag.view.height}`); });
  map.addEventListener('pointerup', () => { drag = undefined; }); map.addEventListener('pointercancel', () => { drag = undefined; });
})();
