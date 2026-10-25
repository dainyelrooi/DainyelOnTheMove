// A preview must never inherit live storage just because its hostname is new.
const liveHosts = new Set(['dainyelonthemove.com', 'www.dainyelonthemove.com', 'dainyelonthemove.web.app', 'dainyelonthemove.firebaseapp.com']);
const testHosts = new Set(['dainyelonthemove-staging.web.app', 'dainyelonthemove-staging.firebaseapp.com', 'localhost', '127.0.0.1', '[::1]', '::1']);
export function spaceForHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (liveHosts.has(host)) return 'production';
  if (testHosts.has(host) || /^dainyelonthemove-staging--[a-z0-9-]+\.web\.app$/.test(host)) return 'staging';
  return 'unsupported';
}
export const space = spaceForHost(globalThis.location?.hostname);
export const sharedDataReadOnly = space !== 'production';
