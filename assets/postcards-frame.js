(() => {
  const frame = document.querySelector('.postcards-frame');
  if (!frame) return;
  const dropdown = frame.closest('details');
  const load = () => {
    if ((!dropdown || dropdown.open) && !frame.hasAttribute('src')) frame.src = frame.dataset.postcardsSrc;
  };
  dropdown?.addEventListener('toggle', load);
  load();
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.type !== 'postcards-size') return;
    const height = Number(event.data.height);
    if (Number.isFinite(height) && height > 0) frame.height = String(Math.min(2500, Math.max(250, Math.ceil(height) + 12)));
  });
})();
