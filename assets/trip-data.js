/* Only published trip information belongs in data/trip.json. */
(() => {
  const source = new URL('../data/trip.json', document.currentScript.src);
  const publicResponse = fetch(new URL('../data/services.json',source),{cache:'no-store'})
    .then(r=>{if(!r.ok)throw Error();return r.json();}).then(config=>{
      if(!config.journeyApi){window.publicServiceState='disabled';return{records:[],questions:[]};}
      return fetch(new URL('../api/public',source),{cache:'no-store',signal:AbortSignal.timeout(8000)}).then(r=>{if(!r.ok)throw Error();window.publicServiceState='available';return r.json();});
    }).catch(()=>{window.publicServiceState='unavailable';return{records:[],questions:[]};});
  window.publicServiceReady=publicResponse.then(result=>Array.isArray(result.records)?result.records.filter(r=>r.status==='published'):[]);
  window.publicQuestionsReady=publicResponse.then(result=>Array.isArray(result.questions)?result.questions:[]);
  window.publicTripReady = fetch(source, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('Trip data unavailable.');
      return response.json();
    })
    .then(async trip => {
      if (!trip || typeof trip.title !== 'string' || !Number.isFinite(Date.parse(trip.departureAt)) || !Array.isArray(trip.revealedStops) ||
          ('departureConfirmed' in trip && typeof trip.departureConfirmed !== 'boolean')) {
        throw new Error('Invalid public trip data.');
      }
      const records=await window.publicServiceReady;
      const status=records.find(r=>r.kind==='trip');
      const checkin=records.find(r=>r.kind==='checkin'&&r.tripId===trip.id);
      return {...trip,...(status?{confirmedDepartureAt:status.confirmedDepartureAt,endedAt:status.endedAt}:{}),...(checkin?{currentLocation:{city:checkin.city,country:checkin.country,updatedAt:checkin.publishedAt}}:{}),revealedStops:[...trip.revealedStops,...records.filter(r=>r.kind==='reveal')]};
    })
    .catch(() => null);
})();
