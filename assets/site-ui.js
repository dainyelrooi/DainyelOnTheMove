(() => {
  const secondaryMatchers = [
    link => link.getAttribute('href') === 'qa.html',
    link => link.getAttribute('href') === 'my-kit.html',
    link => link.getAttribute('href') === 'destinations.html#location'
  ];

  const addStyles = () => {
    if (document.getElementById('site-ui-navigation-styles')) return;
    const style = document.createElement('style');
    style.id = 'site-ui-navigation-styles';
    style.textContent = `
      header nav .nav-more{position:relative;z-index:30}
      header nav .nav-more summary{display:inline-flex;align-items:center;gap:6px;cursor:pointer;list-style:none;color:inherit;white-space:nowrap}
      header nav .nav-more summary::-webkit-details-marker{display:none}
      header nav .nav-more summary::after{content:'⌄';font-size:.85em;transition:transform .18s ease}
      header nav .nav-more[open] summary{color:var(--yellow,#f4c21d)}
      header nav .nav-more[open] summary::after{transform:rotate(180deg)}
      header nav .nav-more summary:focus-visible{outline:2px solid var(--yellow,#f4c21d);outline-offset:4px;border-radius:2px}
      header nav .nav-more-menu{position:absolute;top:calc(100% + 13px);right:0;min-width:188px;padding:9px;background:var(--dark,#101512);border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 38px rgba(0,0,0,.24)}
      header nav .nav-more-menu a{display:block;padding:10px 12px;white-space:nowrap}
      header nav .nav-more-menu a:hover{background:rgba(255,255,255,.08)}
      @media(max-width:900px){
        header nav .nav-more{width:100%}
        header nav .nav-more summary{padding:0;color:#e7e9e5}
        header nav .nav-more-menu{position:static;min-width:0;margin:10px 0 0;padding:6px 0 2px 12px;border:0;border-left:1px solid rgba(255,255,255,.2);box-shadow:none}
        header nav .nav-more-menu a{padding:8px 0}
      }
      @media(min-width:901px){
        header.is-compact nav .nav-more{width:auto}
        header.is-compact nav .nav-more summary{display:block;padding:11px 13px;border-radius:2px}
        header.is-compact nav .nav-more-menu{position:static;min-width:0;margin:0;padding:0 0 4px 12px;border:0;box-shadow:none}
        header.is-compact nav .nav-more-menu a{padding:9px 13px}
      }
    `;
    document.head.append(style);
  };

  const addUtilityLink = (menu, href, label) => {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    if (new URL(link.href, location.href).pathname === location.pathname) link.setAttribute('aria-current', 'page');
    menu.append(link);
  };

  const enhanceNavigation = () => {
    const nav = document.querySelector('header nav');
    if (!nav || nav.dataset.enhanced === 'true') return;
    nav.dataset.enhanced = 'true';
    addStyles();

    const cta = nav.querySelector('.nav-cta');
    const directLinks = [...nav.querySelectorAll(':scope > a:not(.nav-cta)')];
    const secondary = directLinks.filter(link => secondaryMatchers.some(matches => matches(link)));
    const primary = directLinks.filter(link => !secondary.includes(link));

    const desiredPrimary = [
      link => new URL(link.href, location.href).pathname === '/',
      link => new URL(link.href, location.href).pathname.endsWith('/blog.html'),
      link => new URL(link.href, location.href).pathname.endsWith('/videos.html'),
      link => new URL(link.href, location.href).pathname.endsWith('/destinations.html'),
      link => new URL(link.href, location.href).pathname.endsWith('/about.html')
    ].map(matches => primary.find(matches)).filter(Boolean);

    [...desiredPrimary].reverse().forEach(link => nav.prepend(link));

    const more = document.createElement('details');
    more.className = 'nav-more';
    const summary = document.createElement('summary');
    summary.textContent = 'More';
    summary.setAttribute('aria-label', 'Open more navigation options');
    const menu = document.createElement('div');
    menu.className = 'nav-more-menu';
    menu.setAttribute('aria-label', 'More navigation options');
    secondary.forEach(link => menu.append(link));
    addUtilityLink(menu, 'updates.html', 'Travel log');
    addUtilityLink(menu, 'search.html', 'Search stories');
    more.append(summary, menu);
    nav.insertBefore(more, cta || null);

    nav.addEventListener('click', event => {
      const link = event.target.closest('a');
      if (!link) return;
      more.open = false;
      nav.classList.remove('open');
      const toggle = document.querySelector('.menu-toggle');
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '☰';
      }
    });
    document.addEventListener('click', event => {
      if (!more.contains(event.target)) more.open = false;
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && more.open) {
        more.open = false;
        summary.focus();
      }
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhanceNavigation, { once: true });
  else enhanceNavigation();
})();
