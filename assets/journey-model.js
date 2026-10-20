let ready;
export function loadJourney() {
  if (!ready) ready = fetch(new URL('../data/journey.json', import.meta.url), {cache:'no-cache'}).then(r => {
    if (!r.ok) throw new Error('Archive unavailable');
    return r.json();
  }).then(async data => {
    if (data.schemaVersion !== 1 || !Array.isArray(data.destinations)) throw new Error('Invalid public archive');
    const records=await (window.publicServiceReady||Promise.resolve([]));
    const types={journal:'journal',postcard:'postcards',expense:'expenses',challenge:'challenges',checkin:'checkins'};
    for(const [kind,key]of Object.entries(types)){
      const published=records.filter(r=>r.kind===kind);
      data[key]=[...published,...data[key].filter(old=>!published.some(r=>r.id===old.id))];
    }
    return data;
  }).catch(error => { ready = null; throw error; });
  return ready;
}
