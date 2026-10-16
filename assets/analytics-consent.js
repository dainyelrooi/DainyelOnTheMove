/* Basic consent mode: the Google tag stays unloaded until acceptance. */
(() => {
  'use strict';
  const id = 'G-EYLP0YYJMJ';
  const key = 'dotm-analytics-choice-v1';
  const maxAge = 180 * 24 * 60 * 60 * 1000;
  const production = ['dainyelonthemove.com', 'www.dainyelonthemove.com'].includes(location.hostname);
  let enabled = false;
  let choice = null;
  let lastPage = '';
  const routeTitles = {
    'about-me':'About Dainyel', kit:'My kit', map:'The travel atlas', ask:'Ask Dainyel',
    'qa-community':'Community Q&A', 'creator-profile':'Creator profile', contact:'Collaborate',
    'film-library':'Film library', 'film-road':'Philippines travel film', 'film-scooter':'On the road',
    'film-whale':'Beneath the blue', 'film-bali':'Bali film', 'film-sak-yant':'Sak Yant film',
    'youtube-player':'YouTube diary', 'instagram-player':'Instagram diary',
    'field-notes':'Field Notes', 'travel-stories':'Travel stories'
  };
  const page = () => {
    // Known static canonical URLs only: never send search terms, unknown paths or user data.
    const canonical = document.querySelector('link[rel="canonical"]');
    let path = '/404.html';
    try { path = new URL(canonical.href).pathname; } catch (_) {}
    const publicPaths = ['/about.html', '/videos.html', '/atlas.html', '/journey.html', '/qa.html', '/my-kit.html', '/collaborate.html', '/field-notes.html', '/', '/index.html', '/stories.html', '/thailand.html', '/thailand-solo.html', '/bali.html', '/philippines.html', '/privacy.html', '/cookies.html', '/search.html', '/404.html'];
    if (!publicPaths.includes(path)) path = '/404.html';
    const hash = location.hash.slice(1);
    const home = ['/', '/index.html'].includes(path);
    const target = document.getElementById(hash);
    const panelId = target?.closest('.site-panel')?.id;
    const mapped = Object.hasOwn(routeTitles, hash) ? hash : target?.closest('#qa-community') ? 'qa-community' : panelId;
    const route = (home || path === '/stories.html') && target && Object.hasOwn(routeTitles, mapped || '') ? mapped : '';
    return {page_location:location.origin + path + (route ? '#' + route : ''), page_title:route ? routeTitles[route] + ' | DainyelOnTheMove' : document.title};
  };
  const trackRoute = () => {
    if (!production || choice !== 'accepted' || !enabled) return;
    const current = page();
    if (current.page_location === lastPage) return;
    lastPage = current.page_location;
    window.gtag('set', current);
    window.gtag('event', 'page_view', {...current, send_to:id});
  };
  document.addEventListener('site:route-view', trackRoute);
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && ['accepted', 'rejected'].includes(saved.value) && Number.isFinite(saved.at) && Date.now() - saved.at >= 0 && Date.now() - saved.at < maxAge) choice = saved.value;
  } catch (_) { /* Ask again next visit if storage is unavailable. */ }
  const clearCookies = () => {
    document.cookie.split(';').forEach(item => {
      const name = item.trim().split('=')[0];
      if (!/^_ga(?:_|$)/.test(name)) return;
      ['', location.hostname, '.' + location.hostname, '.dainyelonthemove.com'].forEach(domain => {
        document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax' + (domain ? '; Domain=' + domain : '');
      });
    });
  };
  const start = () => {
    if (!production || enabled) return;
    enabled = true;
    window['ga-disable-' + id] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
    window.gtag('consent', 'update', {analytics_storage:'granted'});
    window.gtag('js', new Date());
    let referrer = '';
    try { const ref = new URL(document.referrer); referrer = ref.origin + ref.pathname; } catch (_) {}
    const current = page();
    lastPage = current.page_location;
    window.gtag('config', id, {allow_google_signals:false, allow_ad_personalization_signals:false, cookie_expires:15552000, cookie_update:false, ...current, page_referrer:referrer});
    const script = document.createElement('script');
    script.id = 'dotm-google-tag'; script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    script.onload = () => { script.dataset.loaded = 'true'; };
    document.head.append(script);
  };
  if (choice === 'accepted') start();
  else { window['ga-disable-' + id] = true; clearCookies(); }
  const init = () => {
    const panel = document.createElement('section');
    panel.className = 'cookie-choice'; panel.setAttribute('aria-labelledby', 'cookie-choice-title');
    panel.hidden = choice !== null;
    panel.innerHTML = '<h2 id="cookie-choice-title">A little insight, with your permission.</h2><p>May I use Google Analytics to understand which pages visitors enjoy? It uses cookies and sends visit information to Google. Optional analytics stays off unless you accept. <a href="/cookies.html">Read about cookies</a>.</p><div class="cookie-actions"><button type="button" data-choice="rejected">Reject analytics</button><button type="button" data-choice="accepted">Accept analytics</button></div>';
    document.body.append(panel);
    let returnFocus = null;
    const save = value => {
      choice = value;
      try { localStorage.setItem(key, JSON.stringify({value, at:Date.now()})); } catch (_) {}
      if (value === 'accepted') {
        if (enabled) { window['ga-disable-' + id] = false; window.gtag?.('consent','update',{analytics_storage:'granted'}); trackRoute(); }
        else start();
      } else {
        window['ga-disable-' + id] = true;
        window.gtag?.('consent','update',{analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
        clearCookies();
      }
      panel.hidden = true;
      returnFocus?.focus();
    };
    panel.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => save(button.dataset.choice)));
    document.querySelectorAll('[data-cookie-settings]').forEach(button => {
      button.hidden = false;
      button.addEventListener('click', () => { returnFocus = button; panel.hidden = false; panel.querySelector('button').focus(); });
    });
    panel.addEventListener('keydown', event => { if (event.key === 'Escape' && choice !== null) { panel.hidden = true; returnFocus?.focus(); } });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
