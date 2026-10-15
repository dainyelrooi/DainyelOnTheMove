(() => {
  const departureNode = document.querySelector('time[data-trip-departure]');
  if (!departureNode) return;
  let departure = Date.parse(departureNode.dateTime);
  if (!Number.isFinite(departure)) return;
  let trip = { revealedStops: [] };
  const countdowns = [...document.querySelectorAll('[data-trip-countdown]')];
  const controls = [...document.querySelectorAll('[data-trip-clock-toggle]')];
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Amsterdam'
  });
  let date = formatter.format(new Date(departure));
  let paused = false;
  let timer;
  let departed = false;
  function render() {
    document.querySelectorAll('[data-trip-clock-fallback]').forEach(node => { node.hidden = true; });
    const remaining = Math.max(0, departure - Date.now());
    const totalSeconds = Math.floor(remaining / 1000);
    const values = {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor(totalSeconds / 3600) % 24,
      minutes: Math.floor(totalSeconds / 60) % 60,
      seconds: totalSeconds % 60
    };
    countdowns.forEach(countdown => {
      countdown.hidden = remaining === 0;
      Object.entries(values).forEach(([unit, value]) => {
        const node = countdown.querySelector('[data-trip-' + unit + ']');
        if (node) node.textContent = String(value).padStart(2, '0');
      });
    });
    controls.forEach(button => { button.hidden = remaining === 0; });
    if (remaining === 0 && !departed) {
      departed = true;
      document.querySelectorAll('[data-trip-phase]').forEach(node => { node.textContent = 'The journey is underway'; });
      document.querySelectorAll('[data-trip-departure]').forEach(node => { node.textContent = 'Departed ' + date; });
      document.querySelectorAll('[data-trip-secret]').forEach(node => {
        node.textContent = trip.revealedStops.length ? 'Follow the places revealed along the way.' : 'The trip has begun. First reveal coming.';
      });
    }
    if (remaining === 0) window.clearInterval(timer);
  }
  function resume() {
    window.clearInterval(timer);
    if (!paused && !document.hidden && Date.now() < departure) timer = window.setInterval(render, 1000);
  }
  controls.forEach(button => {
    button.addEventListener('click', () => {
      paused = !paused;
      controls.forEach(control => {
        control.textContent = paused ? 'Resume countdown' : 'Pause countdown';
        control.setAttribute('aria-pressed', String(paused));
      });
      if (!paused) render();
      resume();
    });
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !paused) render();
    resume();
  });
  window.addEventListener('pagehide', () => window.clearInterval(timer), { once: true });
  window.addEventListener('pageshow', event => {
    if (event.persisted) { if (!paused) render(); resume(); }
  });
  render();
  resume();
  // The clock starts from the date in the HTML, even if the optional feed fails.
  // Apply a valid published feed when it arrives without delaying the first tick.
  if (window.publicTripReady) window.publicTripReady.then(published => {
    if (!published || !Number.isFinite(Date.parse(published.departureAt))) return;
    trip = published;
    departure = Date.parse(trip.departureAt);
    date = formatter.format(new Date(departure));
    document.querySelectorAll('[data-trip-title]').forEach(node => { node.textContent = trip.title; });
    document.querySelectorAll('[data-trip-departure]').forEach(node => {
      node.textContent = (Date.now() < departure ? 'Departing ' : 'Departed ') + date;
      if (node.tagName === 'TIME') node.dateTime = trip.departureAt;
    });
    departed = false;
    if (!paused) render();
    resume();
  }).catch(() => {});
})();
