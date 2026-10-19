let initialized = false;
export function initHomeExperience() {
  if (initialized) return;
  initialized = true;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const allowed = () => !reduced.matches && !connection?.saveData;
  const revision = new URL(import.meta.url).search;
  const mini = document.querySelector('[data-mini-atlas]');
  async function buildMiniAtlas() {
    if (!mini || mini.dataset.ready) return;
    mini.dataset.ready = 'loading';
    try {
      await Promise.all(['world-country-paths.js', 'travel-data.js'].map(file => import(new URL(file + revision, import.meta.url).href)));
      const visits = window.travelData.visitedDestinations;
      const byCountry = new Map(visits.filter(place => place.mapName).map(place => [place.mapName, place]));
      const ns = 'http://www.w3.org/2000/svg';
      const svg = mini.querySelector('svg');
      const layer = mini.querySelector('[data-mini-countries]');
      const select = mini.querySelector('select');
      const name = mini.querySelector('[data-mini-name]');
      const detail = mini.querySelector('[data-mini-detail]');
      const story = mini.querySelector('[data-mini-story]');
      const paths = [];
      function choose(place) {
        select.value = place.name;
        name.textContent = place.name;
        detail.textContent = (place.memory ? place.memory + ' ' : '') + (place.tripDetails || place.year);
        story.hidden = !place.storyHref;
        if (place.storyHref) { story.href = place.storyHref; story.textContent = place.storyLink || 'Explore this story →'; }
        paths.forEach(({node, visit}) => { if (visit) node.setAttribute('aria-pressed', String(visit.name === place.name)); });
      }
      function activate(node, place) {
        node.classList.add('mini-visited');
        node.setAttribute('tabindex', '0'); node.setAttribute('role', 'button');
        node.setAttribute('aria-label', place.name + ', previously visited'); node.setAttribute('aria-pressed', 'false');
        node.addEventListener('click', () => choose(place));
        node.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(place); } });
        paths.push({node, visit:place});
      }
      for (const country of window.worldCountryPaths) {
        const path = document.createElementNS(ns, 'path'); path.setAttribute('d', country.path); path.setAttribute('fill-rule', 'evenodd');
        path.classList.add('mini-country');
        const visit = byCountry.get(country.name);
        if (visit) activate(path, visit); else path.setAttribute('aria-hidden', 'true');
        layer.append(path);
      }
      for (const place of visits) {
        const option = document.createElement('option'); option.value = place.name; option.textContent = place.name; select.append(option);
        if (place.coordinates) {
          const [lon, lat] = place.coordinates;
          const dot = document.createElementNS(ns, 'circle');
          dot.setAttribute('cx', String((lon + 180) / 360 * 1000 + (place.name === 'Aruba' ? -5 : place.name === 'Curaçao' ? 5 : 0)));
          dot.setAttribute('cy', String((90 - lat) / 180 * 500)); dot.setAttribute('r', '6');
          activate(dot, place); layer.append(dot);
        }
      }
      select.addEventListener('change', () => { const place = visits.find(item => item.name === select.value); if (place) choose(place); });
      mini.querySelector('[data-mini-fallback]').hidden = true;
      mini.querySelector('[data-mini-interface]').hidden = false;
      svg.hidden = false;
      mini.dataset.ready = 'true';
    } catch (_) { mini.dataset.ready = ''; }
  }
  if (mini && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); buildMiniAtlas(); } }, {rootMargin:'200px'});
    observer.observe(mini);
  } else buildMiniAtlas();

  const coarse = matchMedia('(hover: none), (pointer: coarse)');
  const previews = [...document.querySelectorAll('video[data-film-preview]')];
  const state = new Map();
  const activePanel = () => !!document.querySelector('.site-panel.is-open:not(#film-library)');
  function stop(video, reset = true) {
    video.pause(); video.classList.remove('is-previewing');
    if (reset && video.readyState > 0) { try { video.currentTime = 0; } catch (_) {} }
  }
  function play(video) {
    if (!allowed() || document.hidden || activePanel() || (coarse.matches && state.get(video)?.played)) return;
    previews.forEach(other => { if (other !== video) stop(other); });
    if (!video.src) { video.src = video.dataset.filmPreview; video.load(); }
    if (coarse.matches) state.get(video).played = true;
    video.muted = true; video.defaultMuted = true; video.playsInline = true;
    video.play()?.catch(() => stop(video));
  }
  for (const video of previews) {
    const card = video.closest('.film-card'); state.set(video, {visible:false, played:false});
    video.addEventListener('playing', () => { if (!allowed() || document.hidden || activePanel()) stop(video); else video.classList.add('is-previewing'); });
    video.addEventListener('ended', () => stop(video));
    video.addEventListener('error', () => stop(video));
    card.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') play(video); });
    card.addEventListener('pointerleave', () => stop(video));
    card.addEventListener('focus', () => { if (!coarse.matches) play(video); });
    card.addEventListener('blur', () => stop(video));
    card.addEventListener('click', () => previews.forEach(item => stop(item)));
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        state.get(entry.target).visible = entry.isIntersecting && entry.intersectionRatio >= .65;
        if (!state.get(entry.target).visible) { stop(entry.target); state.get(entry.target).played = false; }
      }
      if (coarse.matches) {
        const visible = previews.filter(video => state.get(video).visible && !state.get(video).played);
        if (visible.length && !visible.some(video => !video.paused)) play(visible[0]);
      }
    }, {threshold:[0,.65]});
    previews.forEach(video => observer.observe(video));
  }
  const stopAll = () => previews.forEach(video => stop(video));
  reduced.addEventListener?.('change', stopAll); connection?.addEventListener?.('change', stopAll);
  document.addEventListener('visibilitychange', stopAll);
  addEventListener('hashchange', () => { if (activePanel()) stopAll(); });
}
