// Set up the manual film galleries before the shared viewport video controller.
(() => {
  document.querySelectorAll('[data-film-slideshow]').forEach((gallery, number) => {
    const stage = gallery.querySelector('.film-slides');
    const slides = [...stage?.children || []].filter(slide => slide.querySelector('video'));
    if (slides.length < 2) return;
    stage.id ||= 'philippines-films-' + (number + 1);
    gallery.setAttribute('role', 'region');
    gallery.setAttribute('aria-roledescription', 'carousel');
    const controls = document.createElement('div'); controls.className = 'film-gallery-controls';
    const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = '←';
    const next = document.createElement('button'); next.type = 'button'; next.textContent = '→';
    const count = document.createElement('span'); count.className = 'film-gallery-count';
    count.setAttribute('role', 'status'); count.setAttribute('aria-live', 'polite'); count.setAttribute('aria-atomic', 'true');
    previous.setAttribute('aria-label', 'Previous film'); next.setAttribute('aria-label', 'Next film');
    [previous, next].forEach(button => button.setAttribute('aria-controls', stage.id));
    controls.append(previous, count, next); stage.append(controls);
    let current = 0;
    function select(index) {
      const old = slides[current];
      const moveFocus = old.contains(document.activeElement);
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, position) => {
        const hidden = position !== current;
        if (hidden) {
          const video = slide.querySelector('video');
          if (window.siteVideoControl) window.siteVideoControl.pause(video);
          else video.pause();
        }
        slide.hidden = hidden;
      });
      count.textContent = (current + 1) + ' / ' + slides.length;
      count.setAttribute('aria-label', 'Film ' + (current + 1) + ' of ' + slides.length);
      if (moveFocus) next.focus({preventScroll: true});
      // IntersectionObserver hydrates/plays the visible slide, respecting reduced motion.
    }
    slides.forEach((slide, position) => {
      slide.setAttribute('role', 'group'); slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', (position + 1) + ' of ' + slides.length);
    });
    previous.addEventListener('click', () => select(current - 1));
    next.addEventListener('click', () => select(current + 1));
    // Native video arrows must continue seeking. Gallery shortcuts belong to its controls.
    controls.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      select(event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : current + (event.key === 'ArrowRight' ? 1 : -1));
    });
    gallery.classList.add('film-carousel-ready'); select(0);
  });
})();
