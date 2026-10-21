(() => {
  const view = document.body.dataset.legacyView;
  const targets = {trip:'/#next-chapter',map:'/atlas',collaborate:'/#collaborate',about:'/#about-me',films:'/#films',stories:'/stories',ask:'/#ask',kit:'/#kit'};
  if (!targets[view]) return;
  const target = new URL(targets[view], location.href);
  new URLSearchParams(location.search).forEach((value,key) => { if(key !== 'view') target.searchParams.set(key,value); });
  if (view === 'stories' && /\/updates(?:\.html)?\/?$/.test(location.pathname)) target.hash = 'field-notes';
  location.replace(target.href);
})();
