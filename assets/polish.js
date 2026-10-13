(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const markRevealSections = () => {
    const main = document.querySelector('main');
    if (!main || reduceMotion || !('IntersectionObserver' in window)) return;
    const sections = [...main.querySelectorAll(':scope > section, :scope > article')]
      .filter(section => !section.matches('.hero, .page-intro'));
    if (!sections.length) return;
    document.body.classList.add('reveal-ready');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: 0.06 });
    sections.forEach(section => {
      section.dataset.reveal = '';
      observer.observe(section);
    });
  };

  const optimiseMedia = () => {
    const firstVisual = document.querySelector('.hero img, .hero video, .page-intro img, .page-intro video, main img, main video');
    document.querySelectorAll('img').forEach(image => {
      image.decoding = 'async';
      if (image !== firstVisual && !image.hasAttribute('loading')) image.loading = 'lazy';
    });
    document.querySelectorAll('video:not([data-autoplay-on-view])').forEach(video => {
      if (!video.closest('.hero, .page-intro')) video.preload = 'metadata';
    });
  };

  const improveMenuSemantics = () => {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('header nav');
    if (!toggle || !nav) return;
    if (!nav.id) nav.id = 'primary-navigation';
    toggle.setAttribute('aria-controls', nav.id);
    toggle.setAttribute('aria-label', 'Open navigation menu');
    const updateLabel = () => toggle.setAttribute('aria-label', nav.classList.contains('open') ? 'Close navigation menu' : 'Open navigation menu');
    toggle.addEventListener('click', () => window.setTimeout(updateLabel, 0));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '☰';
        updateLabel();
        toggle.focus();
      }
    });
  };

  const start = () => {
    document.body.classList.add('site-polish');
    optimiseMedia();
    improveMenuSemantics();
    markRevealSections();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
