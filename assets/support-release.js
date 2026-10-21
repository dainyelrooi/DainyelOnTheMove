/* The owner-approved support link opens at midnight in the Netherlands on 28 October. */
(() => {
  const section = document.querySelector('[data-support-opens]');
  if (!section) return;
  const opensAt = Date.parse(section.dataset.supportOpens);
  const pending = section.querySelector('[data-support-pending]');
  const payment = section.querySelector('[data-support-payment]');
  if (!Number.isFinite(opensAt) || !pending || !payment) return;

  let timer;
  const refresh = () => {
    clearTimeout(timer);
    const remaining = opensAt - Date.now();
    const isOpen = remaining <= 0;
    pending.hidden = isOpen;
    payment.hidden = !isOpen;
    if (!isOpen && !document.hidden) {
      timer = setTimeout(refresh, Math.min(remaining, 2147483647));
    }
  };

  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('pageshow', refresh);
  window.addEventListener('pagehide', () => clearTimeout(timer));
  refresh();
})();
