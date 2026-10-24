// Reuse the real cards in a ring: no duplicate links, players or CMS records.
const active = new WeakMap();
export function initCarousels(scope = document) {
  for (const track of scope.querySelectorAll('[data-card-carousel]')) {
    if (active.has(track)) continue;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const controls = document.createElement('div'); controls.className = 'collection-controls';
    const previous = document.createElement('button'), next = document.createElement('button'), count = document.createElement('span');
    previous.type = next.type = 'button'; previous.textContent = '←'; next.textContent = '→';
    previous.setAttribute('aria-label', 'Previous cards'); next.setAttribute('aria-label', 'Next cards');
    count.className = 'collection-count'; count.setAttribute('aria-live', 'off');
    controls.append(previous, count, next); track.after(controls);
    track.setAttribute('aria-label', track.dataset.cardCarousel || 'Browse the collection');
    track.classList.add('collection-loop-ready');
    const rank = new WeakMap(); let serial = 0, ordered = [], timer, settleTimer, visible = false, hover = false, focused = false, moving = false, rebasing = false, lastScroll = 0, direction = 1;
    const cards = () => [...track.children].filter(card => !card.hidden && !card.classList.contains('video-filtered-out'));
    const unit = () => { const first = cards()[0]; return first ? first.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0) : 1; };
    const perPage = () => Math.max(1, Math.round((track.clientWidth + (parseFloat(getComputedStyle(track).columnGap) || 0)) / unit()));
    const loops = () => track.clientWidth > 0 && cards().length > perPage();
    function mutate(change) { observer.disconnect(); change(); observer.observe(track, {childList: true}); }
    // Moving an off-screen card and compensating its width leaves the view still.
    function rebase(forward) {
      const items = cards(), width = unit(), left = track.scrollLeft; if (!loops()) return;
      rebasing = true;
      mutate(() => {
        if (forward) { track.append(items[0]); track.scrollLeft = left - width; }
        else { track.insertBefore(items.at(-1), items[0]); track.scrollLeft = left + width; }
      });
      lastScroll = track.scrollLeft;
      requestAnimationFrame(() => { rebasing = false; });
    }
    function paint() {
      const items = cards(), offset = Math.max(0, Math.round(track.scrollLeft / unit())), first = items[offset], total = items.length;
      const logical = ordered.filter(card => !card.hidden && !card.classList.contains('video-filtered-out'));
      const start = Math.max(0, logical.indexOf(first)), size = Math.min(perPage(), total);
      count.textContent = total ? Array.from({length: size}, (_, n) => (start + n) % total + 1).join(', ') + ' of ' + total : 'No entries';
      controls.hidden = !loops(); previous.disabled = next.disabled = !loops();
    }
    function plan() {
      clearTimeout(timer); paint();
      if (reduced.matches || !visible || hover || focused || moving || document.hidden || !loops() || document.querySelector('dialog[open],.site-panel.is-open:not(#film-library)')) return;
      timer = setTimeout(() => {
        if (reduced.matches || !visible || hover || focused || document.hidden || document.querySelector('dialog[open],.site-panel.is-open:not(#film-library)')) return plan();
        if ([...document.querySelectorAll('video[controls]')].some(video => !video.paused)) return plan();
        move(1);
      }, 5000);
    }
    function settle() {
      clearTimeout(settleTimer); moving = false;
      // Native touch/trackpad scrolling can also continue past either edge.
      if (loops() && !focused) {
        const edge = track.scrollWidth - track.clientWidth;
        if (direction > 0 && track.scrollLeft >= edge - 3 && track.scrollLeft >= unit() - 3) rebase(true);
        else if (direction < 0 && track.scrollLeft <= 3) rebase(false);
      }
      paint(); plan();
    }
    function move(value) {
      if (!loops() || moving) return;
      clearTimeout(timer); direction = value;
      if (value > 0 && track.scrollLeft + unit() > track.scrollWidth - track.clientWidth + 3) rebase(true);
      else if (value < 0 && track.scrollLeft < unit() - 3) rebase(false);
      moving = true;
      track.scrollTo({left: track.scrollLeft + value * unit(), behavior: reduced.matches ? 'instant' : 'smooth'});
      clearTimeout(settleTimer); settleTimer = setTimeout(settle, 600);
    }
    function refresh() {
      clearTimeout(timer); clearTimeout(settleTimer); moving = false;
      for (const card of track.children) if (!rank.has(card)) rank.set(card, serial++);
      ordered = [...track.children].sort(track.hasAttribute('data-static-collection')
        ? (a, b) => Number(b.dataset.publishedTime || 0) - Number(a.dataset.publishedTime || 0) || Number(a.dataset.staticOrder || 0) - Number(b.dataset.staticOrder || 0)
        : (a, b) => rank.get(a) - rank.get(b));
      mutate(() => track.append(...ordered));
      track.scrollLeft = 0;
      // One real off-screen card supplies room to navigate backwards immediately.
      if (loops()) rebase(false);
      lastScroll = track.scrollLeft; plan();
    }
    const observer = new MutationObserver(refresh);
    previous.addEventListener('click', () => move(-1)); next.addEventListener('click', () => move(1));
    track.addEventListener('scroll', () => {
      if (!rebasing) {
        if (Math.abs(track.scrollLeft - lastScroll) > 1) direction = Math.sign(track.scrollLeft - lastScroll);
        lastScroll = track.scrollLeft; moving = true; clearTimeout(timer); clearTimeout(settleTimer); settleTimer = setTimeout(settle, 160);
      }
      paint();
    }, {passive: true});
    track.addEventListener('keydown', event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); } });
    const region = track.parentElement;
    region.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hover = true; plan(); } });
    region.addEventListener('pointerleave', () => { hover = false; plan(); });
    region.addEventListener('focusin', () => { focused = track.contains(document.activeElement); plan(); });
    region.addEventListener('focusout', () => queueMicrotask(() => { focused = track.contains(document.activeElement); plan(); }));
    track.addEventListener('collection:changed', refresh);
    let width = 0;
    new ResizeObserver(() => { if (Math.abs(track.clientWidth - width) > 1) { width = track.clientWidth; refresh(); } }).observe(track);
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; plan(); }, {threshold: .2}).observe(track);
    document.addEventListener('visibilitychange', plan); window.addEventListener('pageshow', plan); window.addEventListener('pagehide', () => { clearTimeout(timer); clearTimeout(settleTimer); });
    reduced.addEventListener('change', plan);
    active.set(track, {refresh}); refresh();
  }
}
