(() => {
  if (window.siteVideoControl) return;
  const videos = [...document.querySelectorAll('video[data-autoplay-on-view]')];
  const reduce = matchMedia('(prefers-reduced-motion:reduce)');
  const saver = !!navigator.connection?.saveData;
  const states = new Map();
  const needsGesture = state => !state.manual && (reduce.matches || saver);
  function updateStart(video, state) {
    if (state.toggleButton) {
      state.toggleButton.textContent = video.paused ? 'Play video' : 'Pause video';
      state.toggleButton.setAttribute('aria-label', video.paused ? 'Play homepage background video' : 'Pause homepage background video');
    }
    if (!state.startButton) return;
    state.startButton.hidden = !video.paused && video.readyState >= 2 && !state.failed;
    state.startButton.textContent = state.failed ? 'Try video again' : 'Play video';
    state.startButton.setAttribute('aria-label', state.startButton.textContent + ': ' + (video.getAttribute('aria-label') || 'travel film'));
  }
  function failed(video, state) {
    if (!state.startButton) return;
    state.failed = true;
    state.status.replaceChildren(document.createTextNode('This video could not load. Try again or '));
    const link = document.createElement('a');
    link.href = video.querySelector('source')?.dataset.src || video.currentSrc;
    link.textContent = 'open the video directly';
    state.status.append(link, '.'); state.status.hidden = false;
    updateStart(video, state);
  }
  function pause(video) {
    const state = states.get(video); if (!state || video.paused) return;
    state.automaticPause = true; video.pause();
  }
  function hydratePoster(video) {
    if (video.dataset.poster && !video.getAttribute('poster')) video.poster = video.dataset.poster;
  }
  function hydrate(video, state) {
    hydratePoster(video);
    if (state.hydrated || (video.hasAttribute('data-hero-video') && !state.heroReady) || needsGesture(state)) return;
    state.hydrated = true;
    const mobile = matchMedia('(max-width:700px)').matches;
    video.querySelectorAll('source[data-src]').forEach(source => { source.src = mobile && source.dataset.srcMobile ? source.dataset.srcMobile : source.dataset.src; });
    if (state.nativeControls) video.controls = true;
    video.preload = 'auto'; video.load();
  }
  async function prepareHero(video, state) {
    if (state.heroScheduled) return;
    state.heroScheduled = true;
    const poster = video.parentElement.querySelector('img');
    if (poster && !poster.complete) await new Promise(resolve => { poster.addEventListener('load',resolve,{once:true}); poster.addEventListener('error',resolve,{once:true}); });
    // Give the high-priority poster its first paint before fetching the clip.
    // Unrelated fonts and offscreen images must not delay the first video frame.
    await new Promise(resolve => requestAnimationFrame(resolve));
    state.heroReady = true; start(video,state);
  }
  function start(video, state) {
    if (!state.inView || state.userPaused || document.hidden || needsGesture(state)) return;
    if (video.hasAttribute('data-hero-video') && !state.heroReady) { prepareHero(video,state); return; }
    hydrate(video,state);
    const result = video.play();
    if (result?.catch) result.catch(error => {
      if (error.name === 'AbortError' || !state.inView || document.hidden) return;
      // A browser autoplay restriction is resolved by the visible play button.
      if (error.name !== 'NotAllowedError') failed(video, state);
      updateStart(video, state);
    });
  }
  function playDeliberately(video, state) {
    state.manual = true; state.userPaused = false; state.inView = true;
    if (state.failed) state.hydrated = false;
    state.failed = false;
    if (state.status) state.status.hidden = true;
    // Stay inside the card/play-button gesture so mobile browsers can start immediately.
    start(video, state); updateStart(video, state);
  }
  function playPanel(panel) {
    panel.querySelectorAll('.film-player video[data-autoplay-on-view]').forEach(video => {
      const state = states.get(video); if (!state) return;
      video.muted = true;
      playDeliberately(video, state);
    });
  }
  const playback = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const state = states.get(entry.target); state.inView = entry.isIntersecting && entry.intersectionRatio >= .15;
      if (state.inView) start(entry.target,state); else pause(entry.target);
    });
  }, {threshold:[0,.15]}) : null;
  const preload = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) hydrate(entry.target,states.get(entry.target)); });
  }, {rootMargin:saver ? '0px' : '220px 0px'}) : null;
  videos.forEach(video => {
    const state = {hydrated:false,inView:false,userPaused:false,manual:false,automaticPause:false,heroReady:false,heroScheduled:false,failed:false,nativeControls:video.controls,background:video.getAttribute('aria-hidden')==='true'&&!video.controls}; states.set(video,state);
    video.muted = true; video.defaultMuted = true; video.loop = true; video.playsInline = true; video.preload = 'none';
    const toggle = video.id && document.querySelector('[data-background-toggle][aria-controls="' + video.id + '"]');
    if (toggle) {
      state.toggleButton = toggle; toggle.hidden = false;
      toggle.addEventListener('click', () => {
        if (video.paused) playDeliberately(video, state);
        else { state.userPaused = true; pause(video); updateStart(video, state); }
      });
      updateStart(video, state);
    }
    if (video.controls && video.closest('.film-player') && video.querySelector('source[data-src]')) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'video-start'; button.dataset.videoStart = '';
      button.setAttribute('aria-label', 'Play ' + (video.getAttribute('aria-label') || 'video'));
      const status = document.createElement('p');
      status.className = 'video-playback-status'; status.setAttribute('role','status'); status.hidden = true;
      state.startButton = button; state.status = status;
      // Until a source exists, offer one functional control rather than empty native controls.
      video.controls = false;
      video.after(button, status);
      button.addEventListener('click', () => playDeliberately(video, state));
      updateStart(video, state);
    }
    video.addEventListener('play', () => { state.userPaused = false; state.automaticPause = false; updateStart(video,state); });
    video.addEventListener('playing', () => { video.classList.add('is-playing'); state.failed = false; if(state.status)state.status.hidden = true; updateStart(video,state); });
    video.addEventListener('error', () => { video.classList.remove('is-playing'); failed(video,state); });
    // With a single <source>, browsers can report a failed request on the source only.
    const sources = video.querySelectorAll('source');
    if (sources.length === 1) sources[0].addEventListener('error', () => { if(state.hydrated)failed(video,state); });
    video.addEventListener('pause', () => { if (state.automaticPause) state.automaticPause=false; else if (state.inView && !document.hidden) state.userPaused=true; updateStart(video,state); });
    playback?.observe(video); preload?.observe(video);
    if (!playback) { state.inView = true; start(video,state); }
  });
  document.addEventListener('visibilitychange', () => states.forEach((state,video) => { if(document.hidden)pause(video);else start(video,state); }));
  reduce.addEventListener?.('change', () => states.forEach((state,video) => { if (reduce.matches && !state.manual) pause(video); else start(video,state); }));
  window.siteVideoControl = { pause, playPanel };
})();
