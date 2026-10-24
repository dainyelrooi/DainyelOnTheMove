export function initPhotoGalleries() {
  if (!('HTMLDialogElement' in window)) return;
  const galleries = new Map();
  document.querySelectorAll('.story-gallery, .photo-note, [data-photo-gallery]').forEach((container, number) => {
    const figures = [...container.querySelectorAll('figure')].filter(figure => figure.querySelector('img') && !figure.querySelector('a,button'));
    if (!figures.length) return;
    const chapter = container.closest('[id]');
    const id = 'photos-' + (chapter?.id || 'memories') + '-' + (number+1);
    const photos = figures.map(figure => {
      const image = figure.querySelector('img'), caption = figure.querySelector('figcaption')?.textContent.trim() || image.alt;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'photo-open';
      button.setAttribute('aria-label','Enlarge photo: ' + (image.alt || caption));
      const hint = document.createElement('span'); hint.className = 'photo-zoom'; hint.setAttribute('aria-hidden','true'); hint.textContent = '⤢';
      image.before(button); button.append(image,hint);
      // Page edits can replace a photograph after this gallery was opened.
      // Read its current public values rather than keeping the first snapshot.
      return {get src(){return image.getAttribute('src');},get alt(){return image.alt;},get caption(){return figure.querySelector('figcaption')?.textContent.trim()||image.alt||caption;},button};
    });
    galleries.set(id,photos);
    if (container.hasAttribute('data-photo-slideshow')) initSlideshow(container, figures, photos);
    photos.forEach((photo,index) => photo.button.addEventListener('click',() => {
      previousFocus = photo.button;
      history.pushState({photoEntry:true,photoReturn:location.pathname+location.search+location.hash},'', '#'+id+'-'+(index+1));
      renderRoute();
    }));
  });
  if (!galleries.size) return;
  let dialog, active, position = 0, previousFocus, previousOverflow;
  function ensureDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog'); dialog.className = 'photo-viewer'; dialog.setAttribute('aria-labelledby','photo-viewer-title');
    dialog.innerHTML = '<div class="photo-viewer-bar"><h2 id="photo-viewer-title">Through my lens</h2><button class="photo-close" type="button" aria-label="Close photo gallery">×</button></div><figure class="photo-viewer-figure"><img alt="" decoding="async"/><figcaption aria-live="polite" aria-atomic="true"><span class="photo-caption"></span><span class="photo-counter"></span></figcaption></figure><div class="photo-viewer-controls"><button type="button" class="photo-previous" aria-label="Previous photo">← Previous</button><span>Use ← and → to explore</span><button type="button" class="photo-next" aria-label="Next photo">Next →</button></div><p class="sr-only" role="status" data-photo-error></p>';
    document.body.append(dialog);
    dialog.querySelector('.photo-close').addEventListener('click',closeFromButton);
    dialog.querySelector('.photo-previous').addEventListener('click',() => move(-1));
    dialog.querySelector('.photo-next').addEventListener('click',() => move(1));
    dialog.addEventListener('cancel',event => { event.preventDefault(); closeFromButton(); });
    dialog.addEventListener('click',event => { if (event.target === dialog) closeFromButton(); });
    dialog.addEventListener('keydown',event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') move(-position);
      else if (event.key === 'End') move(galleries.get(active).length-1-position);
      else move(event.key === 'ArrowRight' ? 1 : -1);
    });
    let startX;
    const image = dialog.querySelector('img');
    image.addEventListener('pointerdown',event => { if (event.isPrimary && event.pointerType === 'touch') startX = event.clientX; });
    image.addEventListener('pointerup',event => { if (startX !== undefined && Math.abs(event.clientX-startX)>65) move(event.clientX<startX?1:-1); startX=undefined; });
    image.addEventListener('pointercancel',() => { startX=undefined; });
    image.addEventListener('error',() => { dialog.querySelector('[data-photo-error]').textContent = 'This photo could not load. Close the viewer to continue reading, or try another photo.'; });
  }
  function move(offset) {
    const photos = galleries.get(active); if (!photos) return;
    position = (position+offset+photos.length)%photos.length;
    history.replaceState(history.state,'','#'+active+'-'+(position+1)); showPhoto();
  }
  function showPhoto() {
    const photos = galleries.get(active), photo = photos[position], image = dialog.querySelector('img');
    photo.reveal?.();
    if (photo.reveal) previousFocus = photo.button;
    dialog.querySelector('[data-photo-error]').textContent = '';
    image.src = photo.src; image.alt = photo.alt;
    dialog.querySelector('.photo-caption').textContent = photo.caption;
    dialog.querySelector('.photo-counter').textContent = (position+1)+' / '+photos.length;
    dialog.querySelector('.photo-viewer-controls').hidden = photos.length<2;
  }
  function closeFromButton() {
    if (history.state?.photoEntry) history.back();
    else { history.replaceState(null,'',location.pathname+location.search); closeDialog(); }
  }
  function closeDialog() {
    if (!dialog?.open) return;
    dialog.close(); document.body.style.overflow = previousOverflow || ''; active=null;
    const focus = previousFocus; requestAnimationFrame(() => focus?.isConnected && focus.focus({preventScroll:true}));
  }
  function renderRoute() {
    const match = location.hash.match(/^#(photos-[a-zA-Z0-9_-]+)-(\d+)$/), photos = match && galleries.get(match[1]);
    const index = match ? Number(match[2])-1 : -1;
    if (!photos || index<0 || index>=photos.length) { closeDialog(); return; }
    ensureDialog(); active=match[1]; position=index;
    if (!dialog.open) {
      previousFocus ||= photos[index].button; previousOverflow=document.body.style.overflow;
      document.body.style.overflow='hidden'; dialog.showModal(); dialog.querySelector('.photo-close').focus();
    }
    showPhoto();
  }
  addEventListener('hashchange',renderRoute); addEventListener('popstate',renderRoute); renderRoute();
}

// Opt-in chapter slideshows retain the same photographs and enlarged-view routes.
function initSlideshow(container, figures, photos) {
  if (figures.length < 2) return;
  const chapter = container.closest('section'), title = chapter?.querySelector('h3')?.textContent || 'Travel photographs';
  container.setAttribute('role', 'region');
  container.setAttribute('aria-roledescription', 'carousel');
  container.setAttribute('aria-label', title + ' — photos');
  const controls = document.createElement('div'); controls.className = 'slideshow-controls';
  const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = '←'; previous.setAttribute('aria-label', 'Previous slide');
  const next = document.createElement('button'); next.type = 'button'; next.textContent = '→'; next.setAttribute('aria-label', 'Next slide');
  const count = document.createElement('span'); count.className = 'slideshow-counter'; count.setAttribute('aria-live', 'polite'); count.setAttribute('aria-atomic', 'true');
  const hint = document.createElement('p'); hint.className = 'slideshow-hint sr-only'; hint.textContent = 'Browse the photos with the arrows, or tap a photo to enlarge.';
  controls.append(previous, count, next); container.append(controls, hint);
  let current = 0, start, swiped = false;
  function select(index) {
    const moveFocus = figures[current].contains(document.activeElement);
    current = (index + figures.length) % figures.length;
    figures.forEach((figure, number) => { figure.hidden = number !== current; });
    count.textContent = (current + 1) + ' / ' + figures.length;
    count.setAttribute('aria-label', 'Photo ' + (current + 1) + ' of ' + figures.length);
    if (moveFocus) photos[current].button.focus({preventScroll: true});
  }
  figures.forEach((figure, index) => {
    figure.setAttribute('role', 'group'); figure.setAttribute('aria-roledescription', 'slide'); figure.setAttribute('aria-label', (index + 1) + ' of ' + figures.length);
    photos[index].reveal = () => { if (current !== index) select(index); };
  });
  previous.addEventListener('click', () => select(current - 1));
  next.addEventListener('click', () => select(current + 1));
  container.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    select(event.key === 'Home' ? 0 : event.key === 'End' ? figures.length - 1 : current + (event.key === 'ArrowRight' ? 1 : -1));
  });
  container.addEventListener('pointerdown', event => {
    swiped = false;
    if (event.isPrimary && event.pointerType === 'touch' && event.target.closest('.photo-open')) start = {x: event.clientX, y: event.clientY};
  });
  container.addEventListener('pointerup', event => {
    if (!start) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y; start = undefined;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3) { swiped = true; select(current + (dx < 0 ? 1 : -1)); }
  });
  container.addEventListener('pointercancel', () => { start = undefined; });
  container.addEventListener('click', event => {
    if (swiped && event.target.closest('.photo-open')) { event.preventDefault(); event.stopImmediatePropagation(); swiped = false; }
  }, true);
  container.classList.add('slideshow-ready'); select(0);
}
