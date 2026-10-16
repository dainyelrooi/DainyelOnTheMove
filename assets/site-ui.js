(() => {
  const root = document.documentElement;
  root.dataset.uiReady = '';
  const assetBase = new URL('.', document.currentScript.src);
  const assetRevision = new URL(document.currentScript.src).search || '?v=phase1b';
  const loadModule = path => { const url = new URL(path, assetBase); url.search = assetRevision; return import(url.href); };
  const publicPage = document.body.dataset.publicPage;
  const isHome = location.pathname === '/' || location.pathname.endsWith('/index.html');
  const header = document.querySelector('.site-header');
  const nav = document.querySelector('.site-links');
  const toggle = document.querySelector('.site-toggle');
  const more = document.querySelector('.site-more');
  function setMenu(open) {
    nav?.classList.toggle('is-open', open);
    toggle?.setAttribute('aria-expanded', String(open));
    toggle?.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    if (toggle) toggle.textContent = open ? '×' : '☰';
  }
  toggle?.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  let hoverTimer;
  const compact = () => innerWidth > 900 && header?.classList.contains('is-small');
  [toggle, nav].filter(Boolean).forEach(node => {
    node.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' && compact()) { clearTimeout(hoverTimer); setMenu(true); }
    });
    node.addEventListener('pointerleave', () => {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => { if (compact() && !nav.matches(':hover') && !toggle.matches(':hover') && !nav.contains(document.activeElement) && document.activeElement !== toggle) setMenu(false); }, 180);
    });
  });
  const progress = document.getElementById('reading-progress-fill');
  const readingBody = document.querySelector('[data-reading-body]');
  const updateScroll = () => {
    if (progress && document.body.classList.contains('article-page')) {
      // At the opening, progress is zero; do not force the whole article to lay out.
      let fraction = 0;
      if (scrollY > 0) {
        const bounds = readingBody?.getBoundingClientRect();
        const start = bounds ? bounds.top + scrollY - 120 : 0;
        const max = bounds ? Math.max(1, bounds.height - innerHeight + 160) : document.documentElement.scrollHeight - innerHeight;
        fraction = max > 0 ? Math.max(0, Math.min(1, (scrollY - start) / max)) : 0;
      }
      progress.style.transform = 'scaleX(' + fraction + ')';
    }
    header?.classList.toggle('is-small', scrollY > 80);
  };
  let scrollFrame = 0;
  const scheduleScroll = () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; updateScroll(); });
  };
  // Defaults already show the full header and zero progress. Wait for page layout.
  addEventListener('pageshow', scheduleScroll);
  addEventListener('scroll', scheduleScroll, { passive: true });
  addEventListener('resize', () => { setMenu(false); scheduleScroll(); });
  document.addEventListener('click', event => { if (more && !more.contains(event.target)) more.open = false; });

  let initialSection = null;
  // The 301 aliases retain incoming fragments; turn them into clean new URLs.
  if (isHome) {
    const url = new URL(location.href), view = url.searchParams.get('view');
    if (view) {
      let oldHash = url.hash.slice(1), target;
      const views = {
        about: oldHash === 'next-chapter' ? 'about-next' : oldHash && document.getElementById(oldHash)?.closest('#about-me') ? oldHash : 'about',
        films: ({ 'scooter-film':'film-scooter', youtube:'youtube-player', 'instagram-reel':'instagram-player' })[oldHash] || 'films',
        map: oldHash === 'location' ? 'map-location' : 'map',
        trip: ({ atlas:'atlas', route:'trip-reveals', 'follow-trip':'follow-trip' })[oldHash] || 'next-chapter',
        ask: oldHash === 'community' ? 'qa-community' : ['question-form','community-question-form','qa-community'].includes(oldHash) ? oldHash : 'ask',
        kit: oldHash && document.getElementById(oldHash)?.closest('#kit') ? oldHash : 'kit', collaborate: 'collaborate'
      };
      target = views[view]; url.searchParams.delete('view');
      if (target) { url.hash = target; initialSection = target; }
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  }
  if (location.pathname.endsWith('/stories.html') && location.hash.startsWith('#thailand')) {
    location.replace('thailand.html' + location.search + location.hash); return;
  }
  // Small independent enhancements; readable content never waits for animation.
  if (document.querySelector('.story-gallery, .photo-note, [data-photo-gallery]')) loadModule('photo-gallery.js').then(module => module.initPhotoGalleries()).catch(() => {});
  if (readingBody) loadModule('story-reader.js').then(module => module.initStoryReader()).catch(() => {});
  const motion = () => loadModule('motion.js').catch(() => {});
  if (document.readyState === 'complete') motion();
  else addEventListener('load', motion, { once:true });
  document.querySelector('[data-print-profile]')?.addEventListener('click', () => window.print());

  let activePanel = null, returnFocus = null;
  const panels = [...document.querySelectorAll('.site-panel')];
  const background = [...document.querySelectorAll('body > .skip-link, body > .site-header, body > main, body > .site-footer')];
  const focusables = panel => [...panel.querySelectorAll('a[href],button,input,select,textarea,summary,iframe,video[controls],[tabindex]:not([tabindex="-1"])')]
    .filter(node => !node.matches(':disabled') && node.tabIndex >= 0 && !node.closest('[hidden], [inert]') && node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden');
  const modulePromises = new Map();
  async function service(name) {
    if (!modulePromises.has(name)) {
      const paths = { qa:'../js/qa-live.js', 'field-notes':'../js/field-notes.js' };
      const status = document.getElementById(name === 'qa' ? 'qa-service-status' : 'field-service-status');
      if (status) status.textContent = 'Loading securely…';
      modulePromises.set(name, loadModule(paths[name]).then(() => {
        const scope = name === 'qa' ? document.getElementById('ask') : document.getElementById('field-notes-form');
        scope?.querySelectorAll('[data-service-fields]').forEach(fieldset => { fieldset.disabled = false; });
        document.querySelectorAll('[data-enable-service="' + name + '"]').forEach(button => { button.hidden = true; });
        if (status) status.textContent = '';
      }).catch(() => {
        modulePromises.delete(name);
        if (status) status.textContent = 'This feature could not load. Please try again or contact Dainyel on Instagram.';
        throw new Error('Service unavailable');
      }));
    }
    return modulePromises.get(name);
  }
  document.querySelectorAll('[data-enable-service]').forEach(button => {
    button.addEventListener('click', () => { service(button.dataset.enableService).catch(() => {}); });
  });
  const subscribe = document.getElementById('field-notes-form');
  if (subscribe && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect(); service('field-notes').catch(() => {});
      }
    }, { rootMargin: '100px' }); observer.observe(subscribe);
  }
  let mapPromise;
  async function prepareMap() {
    if (!mapPromise) mapPromise = Promise.all([
      loadModule('atlas.js').then(module => module.initAtlas()),
      loadModule('../js/journey-tracker.js'),
      loadModule('../js/location-live.js')
    ]).catch(() => { mapPromise = null; });
    return mapPromise;
  }
  function disposePanel(panel) {
    panel.querySelectorAll('video').forEach(video => { window.siteVideoControl?.pause(video); });
    panel.querySelectorAll('[data-embed-slot]').forEach(slot => slot.replaceChildren());
    panel.querySelectorAll('.embed-consent').forEach(consent => { consent.hidden = false; });
  }
  function closeCurrent(restore = true) {
    if (!activePanel) return;
    const previous = activePanel; disposePanel(previous);
    previous.classList.remove('is-open'); previous.removeAttribute('aria-modal'); previous.removeAttribute('role');
    activePanel = null; background.forEach(node => { node.inert = false; });
    document.body.style.overflow = ''; delete root.dataset.dialogOpen;
    if (restore) {
      const target = returnFocus?.isConnected && returnFocus !== document.body ? returnFocus : document.getElementById(previous.dataset.return || 'home');
      if (target) {
        if (!target.matches('a,button,input,select,textarea,[tabindex]')) target.tabIndex = -1;
        // Fragment history can move focus after popstate; restore after that step.
        requestAnimationFrame(() => { if (!activePanel && target.isConnected) target.focus({ preventScroll: true }); });
      }
    }
  }
  async function renderRoute(trigger) {
    if (!isHome && !publicPage) return;
    let id; try { id = decodeURIComponent(location.hash.slice(1)); } catch { id = ''; }
    const target = document.getElementById(id), panel = target?.closest('.site-panel');
    document.dispatchEvent(new CustomEvent('site:route-view'));
    if (!panel) {
      const details = target?.closest('details'); if (details) details.open = true;
      // Resolve real section heights before an explicit jump across deferred sections.
      if (target && id !== 'home' && target.closest('main > section')) root.dataset.anchorNavigation = '';
      closeCurrent();
      if (target && initialSection === id) {
        initialSection = null;
        requestAnimationFrame(() => target.scrollIntoView({block:'start',behavior:'instant'}));
      }
      return;
    }
    initialSection = null;
    setMenu(false); if (more) more.open = false;
    document.querySelectorAll('link[data-panel-style]').forEach(link => { link.media = 'all'; });
    if (activePanel !== panel) {
      if (!activePanel) returnFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
      closeCurrent(false); activePanel = panel;
      background.forEach(node => { node.inert = true; });
      document.body.style.overflow = 'hidden'; root.dataset.dialogOpen = '';
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.classList.add('is-open');
      panel.scrollTop = 0;
      panel.querySelectorAll('video[data-poster]').forEach(video => { video.poster = video.dataset.poster; });
      panel.querySelector('.panel-top h2')?.focus({ preventScroll: true });
    }
    // Opening a film is the play gesture; do not require another click inside the player.
    if (trigger instanceof HTMLElement) window.siteVideoControl?.playPanel(panel);
    if (id === 'kit') document.getElementById('kit').open = true;
    const details = target?.closest('details'); if (details) details.open = true;
    if (panel.id === 'map') await prepareMap();
    if (panel.id === 'ask') {
      await service('qa').catch(() => {});
      const wanted = new URLSearchParams(location.search).get('topic'), select = document.getElementById('topic');
      if (wanted && [...select.options].some(option => option.value === wanted)) { select.value = wanted; select.dispatchEvent(new Event('change')); }
    }
    if (activePanel === panel && target !== panel) {
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
      if (target.matches('form')) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    }
  }
  function closePanel() {
    if (!activePanel) return;
    const suggested = activePanel.dataset.return || 'home';
    const fallback = document.getElementById(suggested) ? suggested : 'main-content';
    if (history.state?.sitePanelEntry) history.back();
    else { history.replaceState(null, '', location.pathname + location.search + '#' + fallback); closeCurrent(); document.dispatchEvent(new CustomEvent('site:route-view')); document.getElementById(fallback)?.scrollIntoView({ block:'start' }); }
  }
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const close = event.target.closest('[data-close-panel]');
    if (close) { event.preventDefault(); closePanel(); return; }
    if (activePanel && event.target === activePanel) { closePanel(); return; }
    const link = event.target.closest('a[href]'); if (!link) return;
    if (link.closest('.site-links')) { setMenu(false); if (more) more.open = false; }
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;
    const homePages = {'/about.html':'about-me','/videos.html':'film-library','/atlas.html':'map','/journey.html':'next-chapter','/qa.html':'ask','/my-kit.html':'kit','/collaborate.html':'contact'};
    if (isHome && homePages[url.pathname] && !url.hash) { url.hash = homePages[url.pathname]; url.pathname = location.pathname; }
    if (url.pathname !== location.pathname && !(isHome && ['/','/index.html'].includes(url.pathname))) return;
    if (!url.hash) return;
    let target; try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch { return; }
    if (!target) return;
    event.preventDefault();
    const panel = target.closest('.site-panel');
    const state = panel ? { sitePanelEntry: true } : null;
    history.pushState(state, '', url.pathname + url.search + url.hash);
    renderRoute(link);
    if (!panel) {
      target.scrollIntoView({ behavior:matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth', block:'start' });
      if (link.classList.contains('skip-link')) { target.tabIndex = -1; target.focus({preventScroll:true}); }
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (activePanel) { event.preventDefault(); closePanel(); }
      else if (more?.open) { more.open = false; more.querySelector('summary').focus(); }
      else if (nav?.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
    }
    if (event.key === 'Tab' && activePanel) {
      const items = focusables(activePanel), first = items[0], last = items.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === activePanel.querySelector('.panel-top h2'))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener('focusin', event => {
    if (activePanel && !activePanel.contains(event.target)) activePanel.querySelector('.panel-top h2')?.focus({ preventScroll:true });
  });
  addEventListener('hashchange', renderRoute); addEventListener('popstate', renderRoute);
  if (document.readyState === 'complete') renderRoute();
  else document.addEventListener('DOMContentLoaded',renderRoute,{once:true});

  // Standalone pages reuse the same services, with no permanently open modal.
  if (publicPage === 'qa') service('qa').catch(() => {});
  if (publicPage === 'atlas') prepareMap();
  const standalonePages = {'about-me':'about.html', 'map':'atlas.html', 'ask':'qa.html', 'kit':'my-kit.html', 'contact':'collaborate.html', 'creator-profile':'collaborate.html#creator-profile', 'film-library':'videos.html'};
  panels.forEach(panel => {
    const path = standalonePages[panel.id];
    if (!path) return;
    const link = document.createElement('a'); link.href = '/' + path;
    link.className = 'panel-page-link'; link.textContent = 'Open as a page ↗';
    panel.querySelector('.panel-top')?.append(link);
  });
  const share = document.querySelector('[data-share-page]');
  if (share) {
    share.hidden = false;
    share.addEventListener('click', async () => {
      const status = document.querySelector('.share-status');
      const url = new URL(location.pathname + location.hash, location.origin).href;
      try {
        if (navigator.share) await navigator.share({title:document.title,url});
        else { await navigator.clipboard.writeText(url); status.textContent = 'Page link copied.'; }
      } catch (error) { if (error.name !== 'AbortError') status.textContent = 'You can copy this page’s address from your browser.'; }
    });
  }

  // External frames only exist after a deliberate per-player load action.
  document.querySelectorAll('[data-load-embed]').forEach(button => button.addEventListener('click', () => {
    const panel = button.closest('.site-panel'), slot = panel.querySelector('[data-embed-slot]');
    if (!slot || slot.firstChild) return;
    const iframe = document.createElement('iframe');
    iframe.src = button.dataset.embedUrl;
    iframe.title = button.dataset.loadEmbed === 'youtube' ? 'DainyelOnTheMove YouTube video diary' : 'DainyelOnTheMove Instagram Reel';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin'; iframe.allowFullscreen = true;
    slot.append(iframe); panel.querySelector('.embed-consent').hidden = true;
    iframe.focus();
  }));

  // Contact prepares a local message; it never writes to a server.
  const contact = document.getElementById('collaboration-form');
  contact?.querySelector('[data-contact-fields]')?.removeAttribute('disabled');
  contact?.addEventListener('submit', event => {
    event.preventDefault(); if (!contact.reportValidity()) return;
    const data = new FormData(contact), text = document.getElementById('prepared-brief');
    text.value = 'Hi Dainyel!\n\nMy name: ' + String(data.get('name') || '').trim() + '\nBrand / organisation: ' + String(data.get('brand') || '').trim() + '\nInterested in: ' + data.get('format') + '\n\n' + String(data.get('message') || '').trim();
    text.hidden = false; document.getElementById('copy-brief').hidden = false;
    document.getElementById('collaboration-status').textContent = 'Your message is ready. Copy it, then send it on Instagram.';
    text.focus(); text.select();
  });
  document.getElementById('copy-brief')?.addEventListener('click', async () => {
    const text = document.getElementById('prepared-brief'), status = document.getElementById('collaboration-status');
    try { await navigator.clipboard.writeText(text.value); status.textContent = 'Copied. You can now paste the message into Instagram.'; }
    catch { text.focus(); text.select(); status.textContent = 'Select and copy the prepared message below, then paste it into Instagram.'; }
  });

  const tabs = [...document.querySelectorAll('.story-tabs a')];
  if (tabs.length) {
    const list = tabs[0].parentElement; list.setAttribute('role', 'tablist');
    function chooseTab(id, update = false) {
      if (!['travel-stories','field-notes'].includes(id)) id = 'travel-stories';
      tabs.forEach(tab => {
        const selected = tab.hash === '#' + id, panel = document.querySelector(tab.hash);
        tab.setAttribute('role','tab'); tab.setAttribute('aria-controls',panel.id); tab.setAttribute('aria-selected',String(selected)); tab.tabIndex = selected ? 0 : -1;
        panel.setAttribute('role','tabpanel'); panel.hidden = !selected;
      });
      if (update) history.pushState(null, '', '#' + id);
      document.dispatchEvent(new CustomEvent('site:route-view'));
    }
    tabs.forEach((tab,index) => {
      tab.addEventListener('click', event => { event.preventDefault(); chooseTab(tab.hash.slice(1),true); });
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        chooseTab(tabs[next].hash.slice(1),true); tabs[next].focus();
      });
    });
    const updateTabs = () => chooseTab(location.hash.slice(1));
    addEventListener('hashchange',updateTabs); addEventListener('popstate',updateTabs); updateTabs();
  }
})();
