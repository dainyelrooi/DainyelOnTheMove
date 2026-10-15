(() => {
  if (window.siteVideoControl) return;
  const videos = [...document.querySelectorAll('video[data-autoplay-on-view]')];
  const reduce = matchMedia('(prefers-reduced-motion:reduce)');
  const saver = !!navigator.connection?.saveData;
  const states = new Map();
  function updateStart(video, state) {
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
  function hydrate(video, state) {
    if (state.hydrated || (video.hasAttribute('data-hero-video') && !state.heroReady) || ((reduce.matches || saver) && !state.manual)) return;
    state.hydrated = true;
    video.querySelectorAll('source[data-src]').forEach(source => { source.src = source.dataset.src; });
    if (video.dataset.poster) video.poster = video.dataset.poster;
    if (state.nativeControls) video.controls = true;
    video.preload = 'auto'; video.load();
  }
  async function prepareHero(video, state) {
    if (state.heroScheduled) return;
    state.heroScheduled = true;
    await document.fonts.ready.catch(() => {});
    const poster = video.parentElement.querySelector('img');
    if (poster && !poster.complete) await new Promise(resolve => { poster.addEventListener('load',resolve,{once:true}); poster.addEventListener('error',resolve,{once:true}); });
    // Finish the readable poster page before starting the heavier background clip.
    if (document.readyState !== 'complete') await new Promise(resolve => addEventListener('load',resolve,{once:true}));
    if (!state.manual && 'requestIdleCallback' in window) await new Promise(resolve => requestIdleCallback(resolve,{timeout:1500}));
    state.heroReady = true; start(video,state);
  }
  function start(video, state) {
    if (!state.inView || state.userPaused || document.hidden || ((reduce.matches || saver) && !state.manual)) return;
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
  function label(video) {
    document.querySelectorAll('[data-video-toggle]').forEach(button => {
      if (button.dataset.videoToggle === video.id) { button.textContent = video.paused ? 'Play background video' : 'Pause background video'; button.setAttribute('aria-pressed',String(!video.paused)); }
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
    const state = {hydrated:false,inView:false,userPaused:false,manual:false,automaticPause:false,heroReady:false,heroScheduled:false,failed:false,nativeControls:video.controls}; states.set(video,state);
    video.muted = true; video.defaultMuted = true; video.loop = true; video.playsInline = true; video.preload = 'none';
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
      button.addEventListener('click', () => {
        state.manual = true; state.userPaused = false; state.inView = true;
        if (state.failed) state.hydrated = false;
        state.failed = false; status.hidden = true;
        // Hydrate inside the user gesture, including reduced-motion/data-saver mode.
        start(video, state); updateStart(video, state);
      });
      updateStart(video, state);
    }
    video.addEventListener('play', () => { state.userPaused = false; state.automaticPause = false; label(video); updateStart(video,state); });
    video.addEventListener('playing', () => { video.classList.add('is-playing'); state.failed = false; if(state.status)state.status.hidden = true; updateStart(video,state); });
    video.addEventListener('error', () => { video.classList.remove('is-playing'); failed(video,state); });
    // With a single <source>, browsers can report a failed request on the source only.
    const sources = video.querySelectorAll('source');
    if (sources.length === 1) sources[0].addEventListener('error', () => { if(state.hydrated)failed(video,state); });
    video.addEventListener('pause', () => { if (state.automaticPause) state.automaticPause=false; else if (state.inView && !document.hidden) state.userPaused=true; label(video); updateStart(video,state); });
    playback?.observe(video); preload?.observe(video);
    if (!playback) { state.inView = true; start(video,state); }
    label(video);
  });
  document.querySelectorAll('[data-video-toggle]').forEach(button => button.addEventListener('click', () => {
    const video = document.getElementById(button.dataset.videoToggle), state = states.get(video); if (!state) return;
    if (!video.paused) { state.userPaused = true; video.pause(); }
    else { state.userPaused = false; state.manual = true; state.inView = true; start(video,state); }
    label(video);
  }));
  document.addEventListener('visibilitychange', () => states.forEach((state,video) => { if(document.hidden)pause(video);else start(video,state); }));
  reduce.addEventListener?.('change', () => states.forEach((state,video) => { if (reduce.matches && !state.manual) pause(video); else start(video,state); }));
  window.siteVideoControl = { pause };
})();
