export function initStoryReader() {
  const toc = document.querySelector('[data-reading-toc]');
  if (!toc) return;
  const links = [...toc.querySelectorAll('a[href^="#"]')];
  const chapters = links.map(link => document.getElementById(link.hash.slice(1)));
  let queued = false;
  function update() {
    queued = false;
    let current = 0;
    chapters.forEach((chapter,index) => { if (chapter && chapter.getBoundingClientRect().top <= 180) current=index; });
    links.forEach((link,index) => {
      if (index===current) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  }
  const schedule = () => { if (!queued) { queued=true; requestAnimationFrame(update); } };
  addEventListener('scroll',schedule,{passive:true}); addEventListener('resize',schedule); addEventListener('pageshow',schedule);
  links.forEach(link => link.addEventListener('click',() => {
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    // Let the native fragment navigation finish, then move reading focus.
    requestAnimationFrame(() => { const heading=target.querySelector('h3') || target; heading.tabIndex=-1; heading.focus({preventScroll:true}); });
  }));
  update();
}
