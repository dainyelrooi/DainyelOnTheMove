(() => {
  const journey = window.travelData && window.travelData.southAmericaJourney;
  if (!journey || !Array.isArray(journey.stops)) return;

  const stops = journey.stops;
  const completed = stops.filter(stop => stop.status === 'completed');
  const exploring = stops.find(stop => stop.status === 'exploring');
  const next = exploring || stops.find(stop => stop.status === 'planned');
  const progress = completed.length + ' / ' + stops.length;
  const nextName = next ? next.country : 'Route complete';
  const state = exploring ? 'Exploring' : completed.length === stops.length ? 'Completed' : 'Planned';

  document.querySelectorAll('[data-route-progress]').forEach(node => {
    node.textContent = progress + ' planned route';
  });
  document.querySelectorAll('[data-route-next]').forEach(node => {
    node.textContent = nextName;
  });
  document.querySelectorAll('[data-route-state]').forEach(node => {
    node.textContent = state;
  });
  document.querySelectorAll('[data-route-window]').forEach(node => {
    node.textContent = journey.dateRange;
  });
})();
