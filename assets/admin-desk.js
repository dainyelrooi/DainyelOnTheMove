/* Workspace navigation is presentation only. Firebase still controls owner access. */
const authLoading = document.getElementById('auth-loading');
if (authLoading) {
  const deadline = setTimeout(() => {
    if (authLoading.hidden) return;
    authLoading.replaceChildren(document.createTextNode('Secure sign-in is taking longer than expected. '));
    const retry = document.createElement('a');
    retry.href = '/admin';
    retry.textContent = 'Reload this page';
    authLoading.append(retry);
  }, 12000);
  document.addEventListener('admin:auth-ready', () => clearTimeout(deadline), { once: true });
}
const dashboard = document.getElementById('dashboard');
const navigation = document.querySelector('[data-desk-nav]');
if (dashboard && navigation) {
  const links = [...navigation.querySelectorAll('a[href^="#"]')];
  const views = [...dashboard.querySelectorAll('[data-admin-view]')];
  function showView(hash, focus = false) {
    let target;
    try { target = document.getElementById(decodeURIComponent(hash.slice(1))); } catch { /* Ignore malformed fragments. */ }
    const view = target?.closest('[data-admin-view]') || views[0];
    for (const panel of views) panel.hidden = panel !== view;
    for (const link of links) {
      if (link.hash === '#' + view.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    if (focus) {
      view.querySelector('[data-view-title]')?.focus({preventScroll:true});
      navigation.scrollIntoView({block:'start',behavior:'auto'});
    }
  }
  dashboard.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#admin-"]');
    if (!link || !views.some(v=>'#'+v.id===link.hash) || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button) return;
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    showView(link.hash, true);
  });
  window.addEventListener('popstate', () => showView(location.hash));
  window.addEventListener('hashchange', () => showView(location.hash));
  showView(location.hash);
  const signedInLayout = () => document.body.classList.toggle('owner-signed-in', !dashboard.hidden);
  new MutationObserver(signedInLayout).observe(dashboard, {attributes:true, attributeFilter:['hidden']});
  signedInLayout();
}
