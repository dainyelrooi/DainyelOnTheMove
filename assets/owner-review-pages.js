// Keep large moderation archives usable without dropping access to older rows.
// The SDK is passed in so the paging/session boundary can be tested offline.
export const OWNER_PAGE_SIZE = 50;
export function watchOwnerPage(sdk, base, {list, label, receive, failed}) {
  const controls = document.createElement('div'); controls.className = 'pending-actions';
  const latest = document.createElement('button'), older = document.createElement('button'), note = document.createElement('p');
  latest.type = older.type = 'button'; latest.className = older.className = 'secondary-button';
  latest.textContent = 'First ' + label; older.textContent = 'More ' + label;
  note.className = 'field-help'; note.setAttribute('role', 'status');
  controls.append(latest, older); list.after(controls, note);
  let stop, cursor, last, generation = 0;
  function subscribe() {
    const run = ++generation; stop?.(); latest.disabled = older.disabled = true;
    note.textContent = 'Loading a private review page…';
    const view = sdk.query(base, ...(cursor ? [sdk.startAfter(cursor)] : []), sdk.limit(OWNER_PAGE_SIZE));
    stop = sdk.onSnapshot(view, snapshot => {
      if (run !== generation) return;
      last = snapshot.docs.at(-1);
      const partial = Boolean(cursor) || snapshot.size === OWNER_PAGE_SIZE;
      latest.disabled = !cursor; older.disabled = snapshot.size < OWNER_PAGE_SIZE;
      controls.hidden = !cursor && snapshot.size < OWNER_PAGE_SIZE;
      note.hidden = !partial;
      note.textContent = cursor ? 'Showing another page. Choose First to return to the current first batch.' :
        'Showing up to ' + OWNER_PAGE_SIZE + ' items. Use More to reach the rest. Counts marked + are a minimum, not the whole queue.';
      receive(snapshot, {partial, older: Boolean(cursor), isCurrent: () => run === generation});
    }, error => {
      if (run !== generation) return;
      controls.hidden = false; latest.disabled = false; older.disabled = true;
      note.hidden = false; note.textContent = 'This review page could not connect. Choose First to retry.';
      failed(error);
    });
  }
  latest.addEventListener('click', () => { cursor = undefined; subscribe(); });
  older.addEventListener('click', () => { if (last) { cursor = last; subscribe(); } });
  subscribe();
  return () => { generation++; stop?.(); controls.remove(); note.remove(); };
}
