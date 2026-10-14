/* Only published trip information belongs in data/trip.json. */
(() => {
  const source = new URL('../data/trip.json', document.currentScript.src);
  window.publicTripReady = fetch(source, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('Trip data unavailable.');
      return response.json();
    })
    .then(trip => {
      if (!trip || typeof trip.title !== 'string' || !Number.isFinite(Date.parse(trip.departureAt)) || !Array.isArray(trip.revealedStops)) {
        throw new Error('Invalid public trip data.');
      }
      return trip;
    })
    .catch(() => null);
})();
