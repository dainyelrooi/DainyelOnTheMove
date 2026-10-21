/* Counts come from the existing owner-only live snapshots; no extra reads/storage. */
const sources = ['questions', 'communityThreads', 'replies'];
const counts = new Map(sources.map(source => [source, {value:null,error:false}]));
const badge = document.querySelector('[data-review-badge]');
const nav = document.querySelector('[data-review-nav]');
const announcement = document.querySelector('[data-review-announcement]');

function displayCount(value) {
  return value > 99 ? '99+' : String(value);
}

function render() {
  let total = 0, loading = false, failed = false;
  for (const [source, state] of counts) {
    const sectionBadge = document.querySelector(`[data-review-count="${source}"]`);
    const sectionLabel = document.querySelector(`[data-review-count-label="${source}"]`);
    if (sectionBadge) {
      sectionBadge.hidden = !state.error && !(state.value > 0);
      sectionBadge.textContent = state.error ? '!' : displayCount(state.value || 0);
      sectionBadge.title = state.error ? 'This review count could not be loaded.' : `${state.value} awaiting review`;
    }
    if (sectionLabel) sectionLabel.textContent = state.error ? ' — review count unavailable' :
      state.value > 0 ? ` — ${state.value} awaiting review` : '';
    total += state.value || 0;
    loading ||= state.value === null && !state.error;
    failed ||= state.error;
  }
  let label;
  if (failed) label = total ? `At least ${total} items awaiting review. Some review counts are unavailable.` :
    'Review counts unavailable. Check the review queues.';
  else if (loading) label = total ? `At least ${total} items awaiting review. Other review counts are loading.` :
    'Review counts are loading.';
  else label = total ? `${total} ${total === 1 ? 'item' : 'items'} awaiting review.` : 'No items awaiting review.';
  if (badge) {
    badge.hidden = !total && !failed;
    badge.textContent = total ? displayCount(total) + (failed && total <= 99 ? '+' : '') : failed ? '!' : '';
    badge.title = label;
  }
  nav?.setAttribute('aria-label', 'Questions. ' + label);
  // One quiet announcement after initial snapshots settle; never announce bodies/names.
  if (announcement) {
    const message = loading ? '' : label;
    if (announcement.textContent !== message) announcement.textContent = message;
  }
}

export function setReviewCount(source, value) {
  if (!counts.has(source)) return;
  counts.set(source, Number.isSafeInteger(value) && value >= 0 ? {value,error:false} : {value:null,error:true});
  render();
}

export function failReviewCount(source) {
  if (!counts.has(source)) return;
  counts.set(source, {value:null,error:true});
  render();
}

export function resetReviewCounts() {
  for (const source of sources) counts.set(source, {value:null,error:false});
  render();
}

resetReviewCounts();
