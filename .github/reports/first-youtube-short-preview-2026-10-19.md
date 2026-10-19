# First YouTube Short - staging preview, 19 October 2026

## Scope and approval

Owner supplied https://www.youtube.com/shorts/IIJ99aL2yh4 and approved adding it to the homepage YouTube diary and film collection, with a preview before production. This is staging only. No production publication or subscriber email is authorised yet.

## Implementation

- Shared social diary has a featured Short card, retaining Instagram/TikTok and the channel link in the player panel.
- The existing youtube-player panel now presents the actual Short title: Island roads, underwater moments and stories from the road. Removed the stale claim that no public video exists.
- Film collection classifies the Short under Short moments. Shared fragments keep the standalone video page and homepage overlay aligned.
- Used the actual public YouTube thumbnail observed in the video's og:image metadata, stored locally as a 405x720 AVIF (28,501 bytes). No generated artwork, re-upload or video download.
- Retained deliberate per-player opt-in with youtube-nocookie iframe and a direct Shorts link. No YouTube image/player request is needed just to see the local thumbnail. The native 9:16 player does not autoplay sound. Existing panel focus/history/close logic is reused.
- Existing cookie notice already describes optional YouTube players. No Analytics, Firebase backend, subscriber list or account setting was changed.
- Source templates were composed to root documents; shared CSS fingerprint changes refresh other pages without changing their content.

## Preparation

Backup: backups/website_2026-10-19_12-03-47. Preview screenshots live outside web source in the sibling newsletter-drafts folder. No test suite was added/run; this request is a visual preview. Browser inspection confirmed the real title, thumbnail, featured home card and gated player controls. Production release awaits owner review.

## Production approval - 19 October 2026

The owner approved the reviewed preview for production and explicitly requested no Postcards email for this release. This supersedes the staging-only restriction for this batch only. Do not create or send a release campaign for this Short. Existing scheduled weekly campaigns remain unchanged.

Pre-release backup: backups/website_2026-10-19_12-10-08. Reviewed content commit: b4cfce4. Publish only the approved static Hosting source; no Firebase Auth/Firestore, newsletter or other account settings are part of this release.

## Production result

Firebase Hosting production deployment completed successfully from cd04620. Canonical homepage and videos.html both returned HTTP 200 with the Short, its intended home anchor and collection classification. The local AVIF returned HTTP 200 as image/avif (28,501 bytes). The report URL returned 404, confirming Hosting exclusion. No test suite or new playback test was run for this reviewed publication. No Postcards campaign was created or sent, and existing future mail schedules were not modified.
