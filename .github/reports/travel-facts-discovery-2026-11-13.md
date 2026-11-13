# Travel facts discovery — staging review, 13 November 2026

The owner requested a dedicated home for Did you know? facts, country connections in the Atlas, subtle placement between travel stories and a recent fact on the homepage. This release is prepared for staging; production publication is not authorised by that request.

## Behaviour

- /did-you-know is a normal crawlable page with its own canonical/social metadata, sitemap entry and an accessible country filter. Navigation More, Stories and the home discovery link expose it.
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

Physical iOS/Android and search-engine ranking/indexing were not tested. An already-open page uses the approved public reading-copy freshness window; normal publication and public-copy generation may take time. This is not a promise of instantaneous updates or guaranteed search ranking. No production approval or subscriber email is implied.

## Staging receipt

Source 6d08bdc deployed successfully through Hosting 43465622051; approved public-copy refresh 43465622211, isolated regression 43465622025 and OneDrive source backup 43465622063 all succeeded. Readback confirmed six exact JS/CSS modules, four crawlable hub cards, one initial homepage card, the hub canonical/sitemap and staging noindex headers. The report URL returns 404. Nine browser scenarios also passed on the actual staging hostname at 390 and 1280px, with photographs loaded and analytics/submissions blocked in the test browser. The new fact-discovery cases are additionally included in the persistent launch-regression workflow. Production remains on the prior approved main release.

