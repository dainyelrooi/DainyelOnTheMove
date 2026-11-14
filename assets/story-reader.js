export function initStoryReader() {
  const toc = document.querySelector('[data-reading-toc]');
  if (!toc) return;
  const links = [...toc.querySelectorAll('a[href^="#"]')];
  const chapters = links.map(link => document.getElementById(link.hash.slice(1)));
  const toggle=document.createElement('button');
  toggle.type='button'; toggle.className='toc-toggle'; toggle.textContent='In this story · show chapters';
  toggle.setAttribute('aria-expanded','false'); toc.id ||= 'story-chapters'; toggle.setAttribute('aria-controls',toc.id); toc.before(toggle);
  const small=matchMedia('(max-width:900px)');
  const collapse=()=>{toc.dataset.collapsed=String(small.matches&&toggle.getAttribute('aria-expanded')==='false');};
  toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'In this story · hide chapters':'In this story · show chapters';collapse();});
  small.addEventListener('change',collapse);collapse();
  const progress=document.querySelector('[data-reading-toc-status]')||document.createElement('p');progress.className='story-chapter-status';progress.dataset.readingTocStatus='';
  if(!progress.isConnected)document.querySelector('.masthead-copy')?.append(progress);
  let queued = false;
  function update() {
    queued = false;
    let current = 0;
    if(scrollY>0)chapters.forEach((chapter,index) => { if (chapter && chapter.getBoundingClientRect().top <= 180) current=index; });
    links.forEach((link,index) => {
      if (index===current) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
    progress.textContent=`Chapter ${current+1} of ${chapters.length} · ${links[current]?.textContent || ''}`;
  }
  const schedule = () => { if (!queued) { queued=true; requestAnimationFrame(update); } };
  addEventListener('scroll',schedule,{passive:true}); addEventListener('resize',schedule); addEventListener('pageshow',schedule);
  links.forEach(link => link.addEventListener('click',() => {
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    // Let the native fragment navigation finish, then move reading focus.
    requestAnimationFrame(() => { const heading=target.querySelector('h3') || target; heading.tabIndex=-1; heading.focus({preventScroll:true}); });
    if(small.matches){toggle.setAttribute('aria-expanded','false');collapse();}
  }));
  update();
}
