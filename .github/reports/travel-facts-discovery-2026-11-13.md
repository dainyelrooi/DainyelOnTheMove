# Travel facts discovery — owner-approved release, 13 November 2026

The owner requested a dedicated home for Did you know? facts, country connections in the Atlas, subtle placement between travel stories and a recent fact on the homepage. The initial request was implemented and reviewed on staging. After that review the owner explicitly approved production publication and requested the shared footer link.

## Behaviour

- /did-you-know is a normal crawlable page with its own canonical/social metadata, sitemap entry and an accessible country filter. Navigation More, the shared footer, Stories and the home discovery link expose it.
- Field Notes contains only field-note entries. The Travel Stories carousel keeps chronological narratives and adds one clearly labelled fact after the two newest stories. It reuses the existing real card, ring controls and reduced-motion behaviour.
- Selecting an Atlas destination shows up to three matching published facts and a country-filtered hub link. Facts no longer replace the narrative link. Places with no facts hide this section; a location change clears the previous country's links.
- Home shows one newest published fact in a compact light panel. The existing latest-story shortcut does not repeat a fact already shown here.
- Fact article endings link back to the hub and their country in the Atlas. Original entry URLs, content, photos and schedules are retained.
- Existing approved public-copy generation supplies initial hub/home HTML and refreshes on publication. Its withdrawal path clears those placements. Client previews reuse the bounded same-space public catalogue, filter future records and expire at 24 hours; there is no additional Firestore listener, tracking, external service or paid dependency.

## Implementation

New modules: assets/fact-discovery-model.js, fact-discovery-view.js, fact-discovery.js and fact-discovery.css. Shared reading, destination, catalogue and carousel presentation changed in place. Shared templates and generated pages were recomposed. The existing server renderer/exporter now includes public-only discovery blocks. No Rules/Auth, newsletter, calendar or publisher scheduling configuration changed.

## Evidence

- 272 Node tests passed, including new cases for future/private exclusion, country matching, safe image projection, separate notes, singular chronological story interlude, narrative preservation and canonical article/hub cards.
- All 183 Python tests passed. A new real-renderer export case covers repeat refresh and complete withdrawal of hub/home cards. Initial local checks lacked sparse-checkout assets; restoring the original tracked files resolved that environment issue.
- tools/Check-Journey.py passed existing route, metadata, link, asset and exclusion checks. The new hub also has its own explicit canonical and sitemap entry.
- Nine isolated browser scenarios passed using already-public owner content at 390 and 1280px: filter/reset, strict notes and one story interlude, country switch/clear, retained narrative, single home card and crawlable no-JavaScript hub. Real photo loading and visual review completed. Browser fixtures made no database or provider calls.
- Four already-public Curaçao facts were copied create-only to cmsSpaces/staging for review, including their existing photographs. Production data and the twelve daily future plans were not copied or edited. No fixture text, visitor data, private draft or generated public export is committed.
- Local source recovery: backups/website_2026-11-13_11-20-42.

## Limits

Physical iOS/Android and search-engine ranking/indexing were not tested. An already-open page uses the approved public reading-copy freshness window; normal publication and public-copy generation may take time. This is not a promise of instantaneous updates or guaranteed search ranking. This release does not authorise a subscriber email, new content, schedule changes or a provider action.

## Staging receipt

Source 6d08bdc deployed successfully through Hosting 43465622051; approved public-copy refresh 43465622211, isolated regression 43465622025 and OneDrive source backup 43465622063 all succeeded. Readback confirmed six exact JS/CSS modules, four crawlable hub cards, one initial homepage card, the hub canonical/sitemap and staging noindex headers. The report URL returns 404. Nine browser scenarios also passed on the actual staging hostname at 390 and 1280px, with photographs loaded and analytics/submissions blocked in the test browser. The new fact-discovery cases are additionally included in the persistent launch-regression workflow. Production remains on the prior approved main release.


## Production approval and final preparation

The owner approved “top hij mag live, maar vergeet net ook een link te zetten in de footer”. The shared footer now includes a single Did you know? link; generated pages are recomposed from that template. Fresh pre-change local backup: website_2026-11-13_11-55-16. Release uses the existing main Hosting workflow and public-only snapshot refresh. The completed production readback is recorded below. No publishing-process or email workflow is dispatched for this UI release.

## Verified production receipt

- PASS — Source24c339f is live. Final staging Hosting43467766561, regression43467766443 and OneDrive backup43467766450 all succeeded before main was updated. Recovery branch backup/travel-facts-pre-live-20261113 preserves prior maincee8a79.
- PASS — Production Hosting43468175263 and complete production public-copy refresh43468250584 succeeded. The refresh workflow’s separate deployed-publication verification step also succeeded; no publication-process or mail workflow was manually dispatched for this release. Existing background jobs remain independently active.
- PASS — Actual production HTTP readback matches all six reviewed discovery/reading/destination JS/CSS modules. Hub, home, Stories and Atlas return200 and contain exactly one footer link. The hub has its production canonical and sitemap entry with no accidental noindex. The non-sensitive report URL remains404.
- PASS — Nine real production browser scenarios at390/1280px cover country filter/reset, four current public fact cards and photographs, strict Field Notes, one story interlude, Atlas country switching with retained narrative and the newest single home fact. No-JavaScript hub and original full article URL/footer also passed. Browser external requests were blocked; no database/provider writes or test email were made. Screenshots and public readback receipts stay ignored locally.
- PASS — After the refresh finished, a final independent readback confirmed production namespace, four current public initial hub cards, all four unchanged article URLs, public photographs and the footer link. Future scheduled facts were not published early or edited by this release.
- PASS — Final local272Node/183Python tests and public structure checks passed after the shared footer edit. Physical devices, private signed-owner interactions, Google indexing/ranking and subscriber delivery are outside this UI release’s tested claims.
