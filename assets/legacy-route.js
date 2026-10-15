(() => {
  const view = document.body.dataset.legacyView;
  if (!view) return;
  const url = new URL(view === 'stories' ? '/stories.html' : '/', location.href);
  new URLSearchParams(location.search).forEach((value, key) => url.searchParams.set(key, value));
  if (view !== 'stories') url.searchParams.set('view', view);
  url.hash = location.hash || (location.pathname.endsWith('/updates.html') ? '#field-notes' : '');
  location.replace(url.href);
})();
