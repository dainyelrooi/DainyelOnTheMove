// Animate a few headings once. Content is always visible if this module fails.
const preference = matchMedia('(prefers-reduced-motion:reduce)');
const running = new Set();
function animate(node, delay = 0) {
  if (preference.matches || !node.animate) return;
  const animation = node.animate([{opacity:.4,transform:'translateY(16px)'},{opacity:1,transform:'none'}],{duration:520,delay,easing:'cubic-bezier(.2,.7,.2,1)'});
  running.add(animation); animation.finished.then(() => running.delete(animation)).catch(() => running.delete(animation));
}
const headings = document.querySelectorAll('.section-head > div, .about-intro > div, .atlas-intro > div:first-child, .trip-grid > div:first-child, .community-intro > div:first-child, .collab-row > div:first-child, .article-prose > h3');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting || entry.target.closest('[inert]')) return;
    observer.unobserve(entry.target); animate(entry.target);
  }), {threshold:.15});
  headings.forEach(node => observer.observe(node));
  preference.addEventListener('change',() => { if (preference.matches) { running.forEach(animation => animation.cancel()); running.clear(); } });
}
document.querySelectorAll('[data-title-line]').forEach((line,index) => animate(line,index*100));
