// Animate a few headings once. Content is always visible if this module fails.
const preference = matchMedia('(prefers-reduced-motion:reduce)');
// This module loads after window load. Decoration waits for an idle moment too.
const showDetails = () => {
  // Scope style changes to these few surfaces, not inherited variables on root.
  document.querySelectorAll('.home-hero,.home-atlas,.home-films,.home-collaborate,.journal-next').forEach(surface => surface.setAttribute('data-detail-surface',''));
  document.documentElement.setAttribute('data-details-ready','');
};
if ('requestIdleCallback' in window) requestIdleCallback(showDetails, {timeout:2000});
else setTimeout(showDetails, 200);
const running = new Set();
function animate(node, delay = 0) {
  if (preference.matches || !node.animate) return;
  const animation = node.animate([{opacity:.4,transform:'translateY(16px)'},{opacity:1,transform:'none'}],{duration:520,delay,easing:'cubic-bezier(.2,.7,.2,1)'});
  running.add(animation); animation.finished.then(() => running.delete(animation)).catch(() => running.delete(animation));
}
const headings = document.querySelectorAll('.section-head > div, .about-intro > div, .atlas-intro > div:first-child, .trip-grid > div:first-child, .community-intro > div:first-child, .collab-row > div:first-child, .article-prose > h3');
if ('IntersectionObserver' in window) {
  const gates = new Map();
  headings.forEach(node => {
    const gate = node.closest('main > section') || node;
    if (!gates.has(gate)) gates.set(gate, []);
    gates.get(gate).push(node);
  });
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting || entry.target.closest('[inert]')) return;
    observer.unobserve(entry.target);
    gates.get(entry.target).forEach(node => animate(node));
  }), {threshold:.15});
  // Observe section boxes, not descendants of content-visibility containers.
  gates.forEach((nodes,gate) => observer.observe(gate));
  preference.addEventListener('change',() => { if (preference.matches) { running.forEach(animation => animation.cancel()); running.clear(); } });
}
document.querySelectorAll('[data-title-line]').forEach((line,index) => animate(line,index*100));

// A small response on the existing play cue, never a replacement cursor.
// Listen only on film cards; no page-wide pointer loop or layout animation.
const pointerDetail = matchMedia('(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference) and (forced-colors:none)');
const filmCards = [...document.querySelectorAll('.film-card')].filter(card => card.querySelector('.film-play'));
let removePointerDetails = [];
function syncPointerDetails() {
  removePointerDetails.forEach(remove => remove());
  removePointerDetails = [];
  if (!pointerDetail.matches || document.hidden) return;
  filmCards.forEach(card => {
    let frame = 0, bounds, point;
    const clear = () => {
      cancelAnimationFrame(frame); frame = 0; bounds = null;
      card.style.removeProperty('--film-cue-x');
      card.style.removeProperty('--film-cue-y');
    };
    const enter = event => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') { clear(); return; }
      bounds = card.getBoundingClientRect();
    };
    const move = event => {
      if ((event.pointerType !== 'mouse' && event.pointerType !== 'pen') || !bounds || card.matches(':focus-within')) return;
      point = {x:event.clientX, y:event.clientY};
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const offset = (value, start, size) => Math.max(-7, Math.min(7, ((value-start)/size-.5)*14));
        card.style.setProperty('--film-cue-x', offset(point.x,bounds.left,bounds.width).toFixed(1)+'px');
        card.style.setProperty('--film-cue-y', offset(point.y,bounds.top,bounds.height).toFixed(1)+'px');
      });
    };
    card.addEventListener('pointerenter', enter, {passive:true});
    card.addEventListener('pointermove', move, {passive:true});
    card.addEventListener('pointerleave', clear);
    card.addEventListener('pointercancel', clear);
    card.addEventListener('focusin', clear);
    removePointerDetails.push(() => {
      clear();
      card.removeEventListener('pointerenter', enter);
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerleave', clear);
      card.removeEventListener('pointercancel', clear);
      card.removeEventListener('focusin', clear);
    });
  });
}
pointerDetail.addEventListener('change', syncPointerDetails);
document.addEventListener('visibilitychange', syncPointerDetails);
syncPointerDetails();
