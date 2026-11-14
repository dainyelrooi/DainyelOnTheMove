import {catalogEntry} from './published-catalog.js';

// Facts and Field Notes have their own home sections. Keep this shortcut a story.
export function latestTravelStory(entries, now = Date.now()) {
  return (entries || []).map(catalogEntry).filter(entry => entry?.kind === 'blog' && Date.parse(entry.publishedAt) <= now)
    .sort((a,b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.id.localeCompare(b.id))[0] || null;
}
