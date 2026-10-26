/* One Google CMP message controls optional AdSense and basic-mode Analytics. */
(() => {
  'use strict';
  const tag = document.currentScript;
  const name = tag?.dataset.consentPage;
  const expected = name === 'index' ? '/' : '/' + name;
  const path = location.pathname;
  const entry = name === 'entry';
  const validPath = entry ? /^\/entry\/entry-[a-f0-9]{32}\/?$/.test(path) :
    Boolean(name) && [expected, expected + '.html', expected === '/' ? '/index.html' : expected + '/'].includes(path);
  if (!validPath || new URLSearchParams(location.search).has('website-preview') || window.top !== window.self) return;
  const production = ['dainyelonthemove.com', 'www.dainyelonthemove.com'].includes(location.hostname);
  const id = 'G-EYLP0YYJMJ';
  let started = false, analytics = false, tagLoaded = false, apiReady = false;
  let knownChoice = false, dialogOpen = false, lastPage = '';
  const routeTitles = {
    'about-me':'About Dainyel', kit:'My kit', map:'The travel atlas', ask:'Ask Dainyel',
    'qa-community':'Community Q&A', 'creator-profile':'Creator profile', contact:'Collaborate',
    'film-library':'Film library', 'film-road':'Philippines travel film', 'film-scooter':'On the road',
    'film-whale':'Beneath the blue', 'film-bali':'Bali film', 'film-sak-yant':'Sak Yant film',
    'youtube-player':'YouTube diary', 'instagram-player':'Instagram diary',
    'field-notes':'Field Notes', 'travel-stories':'Travel stories'
  };
  const status = text => {
    const node = document.querySelector('[data-privacy-choice-status]');
    if (node) node.textContent = text;
  };
  const clearAnalyticsCookies = () => {
    document.cookie.split(';').forEach(item => {
      const cookieName = item.trim().split('=')[0];
      if (!/^_ga(?:_|$)/.test(cookieName)) return;
      ['', location.hostname, '.' + location.hostname, '.dainyelonthemove.com'].forEach(domain => {
        document.cookie = cookieName + '=; Max-Age=0; Path=/; SameSite=Lax' + (domain ? '; Domain=' + domain : '');
      });
    });
  };
  const page = () => {
    // Never send query text, unknown paths, private fragments or entry IDs to Analytics.
    const base = entry ? '/entry' : expected;
    const hash = location.hash.slice(1), target = document.getElementById(hash);
    const panelId = target?.closest('.site-panel')?.id;
    const mapped = Object.hasOwn(routeTitles, hash) ? hash : target?.closest('#qa-community') ? 'qa-community' : panelId;
    const route = (base === '/' || base === '/stories') && target && Object.hasOwn(routeTitles, mapped || '') ? mapped : '';
    return {page_location:location.origin + base + (route ? '#' + route : ''),
      page_title:route ? routeTitles[route] + ' | DainyelOnTheMove' : entry ? 'From the road | DainyelOnTheMove' : document.title};
  };
  const trackRoute = () => {
    if (!production || !analytics || !tagLoaded) return;
    const current = page();
    if (current.page_location === lastPage) return;
    lastPage = current.page_location;
    window.gtag('set', current);
    window.gtag('event', 'page_view', {...current, send_to:id});
  };
  const pause = () => {
    analytics = false;
    window['ga-disable-' + id] = true;
    if (window.adsbygoogle) window.adsbygoogle.pauseAdRequests = 1;
  };
  const startAnalytics = () => {
    window['ga-disable-' + id] = false;
    if (tagLoaded) { trackRoute(); return; }
    tagLoaded = true;
    let referrer = '';
    try { const ref = new URL(document.referrer); referrer = ref.origin + ref.pathname; } catch (_) {}
    const current = page(); lastPage = current.page_location;
    window.gtag('js', new Date());
    window.gtag('config', id, {allow_google_signals:false, allow_ad_personalization_signals:false,
      cookie_expires:15552000, cookie_update:false, ...current, page_referrer:referrer});
    const script = document.createElement('script');
    script.id = 'dotm-google-tag'; script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.append(script);
  };
  const sync = () => {
    if (dialogOpen || !production || !started) return;
    let value;
    try { value = window.googlefc.getGoogleConsentModeValues(); } catch (_) { pause(); return; }
    if (!value) { pause(); return; }
    // Only GRANTED (1) is permission. Unknown, not configured and not applicable stay off.
    analytics = value.analyticsStoragePurposeConsentStatus === 1;
    const ads = value.adStoragePurposeConsentStatus === 1;
    knownChoice ||= [value.analyticsStoragePurposeConsentStatus, value.adStoragePurposeConsentStatus].some(v => v === 1 || v === 2);
    window.adsbygoogle.requestNonPersonalizedAds = value.adPersonalizationPurposeConsentStatus === 1 && value.adUserDataPurposeConsentStatus === 1 ? 0 : 1;
    window.adsbygoogle.pauseAdRequests = ads ? 0 : 1;
    window['ga-disable-' + id] = !analytics;
    if (analytics) startAnalytics(); else clearAnalyticsCookies();
  };
  const start = () => {
    if (!production || started || entry && !document.querySelector('[data-published-entry].cms-story')) return;
    started = true;
    // The old local Analytics-only choice is not consent for advertising.
    try { localStorage.removeItem('dotm-analytics-choice-v1'); } catch (_) {}
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.pauseAdRequests = 1;
    window.adsbygoogle.requestNonPersonalizedAds = 1;
    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    window.googlefc.callbackQueue.push({CONSENT_API_READY:() => {
      apiReady = true;
      if (typeof window.__tcfapi === 'function') window.__tcfapi('addEventListener', 2, (data, success) => {
        if (!success || !data || data.cmpStatus === 'error') { pause(); return; }
        if (data.eventStatus === 'cmpuishown') { dialogOpen = true; pause(); }
        else if (data.eventStatus === 'useractioncomplete') {
          dialogOpen = false;
          // Re-read Google's newly stored decision on a fresh document after revocation.
          if (knownChoice) { pause(); location.reload(); }
          else setTimeout(sync, 0);
        } else if (data.eventStatus === 'tcloaded') { dialogOpen = false; setTimeout(sync, 0); }
      });
    }});
    window.googlefc.callbackQueue.push({CONSENT_MODE_DATA_READY:sync});
    const script = document.createElement('script');
    script.id = 'dotm-adsense'; script.async = true; script.crossOrigin = 'anonymous';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9073450763802389';
    script.addEventListener('error', () => { pause(); status('Privacy choices are temporarily unavailable. Optional advertising and Analytics remain off. You can keep reading the website.'); });
    document.head.append(script);
  };
  const controls = () => {
    document.querySelectorAll('[data-cookie-settings]').forEach(button => {
      button.hidden = false;
      button.addEventListener('click', () => {
        if (!production) { status('Optional advertising and Analytics are off on this test website. The live website uses one Google privacy message.'); return; }
        if (!apiReady) { status('Privacy choices are not available yet. Refresh or try again later; reading the website does not require consent.'); return; }
        dialogOpen = true; pause();
        window.googlefc.callbackQueue.push({CONSENT_API_READY:() => window.googlefc.showRevocationMessage()});
      });
    });
  };
  document.addEventListener('site:route-view', trackRoute);
  window.addEventListener('pageshow', event => { if (event.persisted && production) { pause(); location.reload(); } });
  window['ga-disable-' + id] = true;
  if (entry) window.addEventListener('site:article-rendered', () => {
    if (document.querySelector('[data-published-entry].cms-story')) start(); else pause();
  });
  start();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', controls, {once:true}); else controls();
})();
