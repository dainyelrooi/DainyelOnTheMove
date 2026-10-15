(() => {
  if (window.siteVideoControl) return;
  const videos = [...document.querySelectorAll('video[data-autoplay-on-view]')];
  const reduce = matchMedia('(prefers-reduced-motion:reduce)');
  const saver = !!navigator.connection?.saveData;
  const states = new Map();
  function pause(video) {
    const state = states.get(video); if (!state || video.paused) return;
    state.automaticPause = true; video.pause();
  }
  function hydrate(video, state) {
    if (state.hydrated || (video.hasAttribute('data-hero-video') && !state.heroReady) || ((reduce.matches || saver) && !state.manual)) return;
    state.hydrated = true;
    video.querySelectorAll('source[data-src]').forEach(source => { source.src = source.dataset.src; });
    if (video.dataset.poster) video.poster = video.dataset.poster;
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
    const result = video.play(); if (result?.catch) result.catch(() => {});
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
    const state = {hydrated:false,inView:false,userPaused:false,manual:false,automaticPause:false,heroReady:false,heroScheduled:false}; states.set(video,state);
    video.muted = true; video.defaultMuted = true; video.loop = true; video.playsInline = true; video.preload = 'none';
    video.addEventListener('play', () => { state.userPaused = false; state.automaticPause = false; video.classList.add('is-playing'); label(video); });
    video.addEventListener('pause', () => { if (state.automaticPause) state.automaticPause=false; else if (state.inView && !document.hidden) state.userPaused=true; label(video); });
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
