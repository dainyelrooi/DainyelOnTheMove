// Only local, explicitly supplied photographs belong in an atlas selection.
export function renderAtlasPhoto(photo, filmHref) {
  const figure = document.getElementById('place-photo');
  if (!figure) return;
  const valid = photo && typeof photo.src === 'string' && /^\/?assets\/[a-z0-9_./-]+$/i.test(photo.src) && !photo.src.includes('..');
  figure.hidden = !valid;
  let image = figure.querySelector('img');
  if (valid) {
    if (!image) { image = document.createElement('img'); image.width=640; image.height=400; image.decoding='async'; figure.prepend(image); }
    image.src = photo.src; image.alt = photo.alt || '';
    figure.querySelector('figcaption').textContent = photo.caption || photo.alt || '';
  } else image?.remove();
  const link = document.getElementById('place-film-link');
  const film = typeof filmHref === 'string' && /^#film-[a-z-]+$/.test(filmHref);
  link.hidden = !film;
  if (film) link.href = filmHref;
  else link.removeAttribute('href');
  const details = document.getElementById('selected-place');
  if (!matchMedia('(prefers-reduced-motion:reduce)').matches) details.animate?.([{ opacity:.5, transform:'translateY(6px)' },{ opacity:1, transform:'none' }], { duration:220 });
}
