(() => {
  const script=document.currentScript;
  import(new URL('journey-core.js',script.src)).then(({tripState,sharedPlaceLabel})=> {
    let trip={title:'Trip to Latin America',departureAt:document.querySelector('[data-departure-badge]')?.dataset.departureBadge,timeZone:'Europe/Amsterdam',confirmedDepartureAt:null,revealedStops:[]};
    let timer;
    const text=(selector,value)=>document.querySelectorAll(selector).forEach(n=>{if(n.textContent!==value)n.textContent=value;});
    const date=value=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:trip.timeZone}).format(new Date(value));
    function render() {
      if(!Number.isFinite(Date.parse(trip.departureAt)))return;
      const state=tripState(trip),seconds=Math.floor(state.remaining/1000);
      document.querySelectorAll('[data-departure-badge]').forEach(badge=>{
        if(badge.dataset.navUpdatesTrigger!==undefined)return;
        if(badge.textContent!==state.label)badge.textContent=state.label;
        badge.setAttribute('aria-label',state.label.replace('<1 day','less than one day'));
      });
      text('[data-trip-title]',trip.title);
      text('[data-trip-phase]',state.phase==='travelling'?state.label:state.phase==='completed'?'The journey, remembered':'The next chapter');
      const actualDate=Number.isFinite(Date.parse(trip.confirmedDepartureAt||''));
      text('[data-trip-departure]',state.phase==='travelling'?(actualDate?'On the road since '+date(trip.confirmedDepartureAt):'The journey is underway.'):state.phase==='completed'?'A journey to remember.':'Planned departure · '+date(trip.departureAt));
      text('[data-trip-secret]',state.phase==='travelling'?'Follow the places, stories and moments I share along the way.':state.phase==='completed'?'Revisit the stories and moments shared from the journey.':trip.revealedStops.length?'Explore the places I have chosen to reveal.':state.phase==='awaiting-confirmation'?'The planned date has arrived. I’ll share a departure update when it is confirmed.':'The route will be revealed along the way.');
      text('[data-trip-clock-label]',state.phase==='planned'?'Countdown to planned departure':state.label);
      document.querySelectorAll('[data-trip-clock-label]').forEach(n=>n.hidden=state.phase==='travelling'||state.phase==='completed');
      const values={days:Math.floor(seconds/86400),hours:Math.floor(seconds/3600)%24,minutes:Math.floor(seconds/60)%60,seconds:seconds%60};
      document.querySelectorAll('[data-trip-clock-fallback]').forEach(n=>n.hidden=true);
      document.querySelectorAll('[data-trip-countdown]').forEach(n=>{n.hidden=state.phase!=='planned';for(const [unit,value]of Object.entries(values)){const node=n.querySelector(`[data-trip-${unit}]`);if(node)node.textContent=String(value).padStart(2,'0');}});
      const checkin=trip.currentLocation;
      const place=sharedPlaceLabel(checkin),sharedDate=Number.isFinite(Date.parse(checkin?.updatedAt||''));
      text('[data-checkin-summary]',place?`Last shared check-in: ${place}.`+(sharedDate?` Shared ${date(checkin.updatedAt)}.`:''):window.publicServiceState==='unavailable'?'Shared updates are temporarily unavailable. Please try again later.':'No check-in shared for this trip yet.');
    }
    function resume(){clearInterval(timer);render();if(!document.hidden)timer=setInterval(render,1000);}
    document.addEventListener('visibilitychange',resume);addEventListener('pageshow',resume);addEventListener('pagehide',()=>clearInterval(timer));
    window.siteDepartureBadge=()=>render();
    resume();
    window.publicTripReady?.then(published=>{if(published){trip=published;resume();}}).catch(()=>{});
    document.addEventListener('site:check-in',e=>{trip={...trip,currentLocation:e.detail};render();});
  }).catch(()=>{});
})();
