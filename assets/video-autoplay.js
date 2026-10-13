(() => {
  const videos = [...document.querySelectorAll('video[data-autoplay-on-view]')];
  if (!videos.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const states = new Map();

  const hydrate = (video, state) => {
    if (state.hydrated) return;
    state.hydrated = true;
    video.preload = 'auto';
    video.load();
  };

  const start = (video, state) => {
    if (!state.inView || reduceMotion.matches || document.hidden) return;
    hydrate(video, state);

    const play = () => {
      if (!state.inView || reduceMotion.matches || document.hidden) return;
      const result = video.play();
      if (result && typeof result.catch === 'function') result.catch(() => {});
    };

    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      play();
    } else if (!state.waitingForData) {
      state.waitingForData = true;
      video.addEventListener('canplay', () => {
        state.waitingForData = false;
        play();
      }, { once: true });
    }
  };

  const preloadObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) hydrate(entry.target, states.get(entry.target));
        });
      }, { rootMargin: '360px 0px' })
    : null;

  const playbackObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const state = states.get(entry.target);
          state.inView = entry.isIntersecting && entry.intersectionRatio >= 0.15;
          if (state.inView) start(entry.target, state);
          else entry.target.pause();
        });
      }, { threshold: [0, 0.15] })
    : null;

  videos.forEach(video => {
    const state = { hydrated: false, inView: false, waitingForData: false };
    states.set(video, state);
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    preloadObserver?.observe(video);
    playbackObserver?.observe(video);
    if (!playbackObserver) {
      state.inView = true;
      start(video, state);
    }
  });

  document.addEventListener('visibilitychange', () => {
    states.forEach((state, video) => {
      if (document.hidden) video.pause();
      else if (state.inView) start(video, state);
    });
  });

  const updateMotion = () => {
    if (reduceMotion.matches) videos.forEach(video => video.pause());
    else states.forEach((state, video) => { if (state.inView) start(video, state); });
  };
  reduceMotion.addEventListener?.('change', updateMotion);
})();
