# Peru photographs — staging review, 13 November 2026

The owner supplied the Cusco/Machu Picchu and Lima photo folders and requested a neat integration. This is a new staging candidate; production approval has not been given for it. No newsletter or test email was requested or sent.

## Placement and selection

- 33 selected original photographs: Lima 10, Cusco 8, Inca Trail 7, Machu Picchu/the return journey 8. The supplied video is outside this photo task. Similar views and weaker/less relevant frames were left out; originals were not changed or removed.
- One compact, initially folded photo notebook in the existing Atlas. Four manual galleries reuse the existing enlarged viewer, previous/next, keyboard, swipe and history behavior. A native details element keeps the full source selection readable without JavaScript.
- Stories/Field Notes discovery link, a separate Peru country-album link and an actual Peru photograph in the selected-country card. Peru narrative entries link to their relevant album section through the shared browser/initial-HTML renderer. Existing text, photographs, article IDs, URLs and publication dates remain intact. Facts do not acquire an extra narrative gallery block.
- No extra public route, database listener, visit, shared check-in, paid service, dependency or Rules/Auth configuration. New photo/caption fields belong to the existing editable Atlas area, rather than a separate unmanageable page.

## Files and preservation

- Photo provenance/selection: `.github/peru-photos.json`; public web derivatives: `assets/optimized/peru/`.
- Album source: `.github/templates/peru-photos.html`; inclusion/discovery in shared map/reading templates and the existing Home/Atlas page sources; scoped `assets/peru-photos.css`.
- Country-photo selection: `data/journey.json`, composed `assets/travel-data.js`.
- Shared destination links: `assets/content-destinations.js`, `assets/atlas.js`, `assets/publishing-model.js`.
- Gallery opening unfolds its containing notebook. The shared panel keyboard/focus handlers yield to an open native dialog: otherwise Escape closed the underlying homepage map as well as the photograph. This failure was reproduced before the fix and its return path passed afterwards.
- Composer regenerated HTML, search and existing Atlas/editor catalogues. No existing editor field was reassigned to a different photograph.
- Local pre-change backup: `backups/website_2026-11-13_21-21-22`. Branch: `feature/peru-photo-galleries`.

The 33 source images total 228,814,532 bytes. Full WebP derivatives total 8,030,164 bytes; the responsive smaller derivatives total 2,557,146 bytes. The 640px album/country cover is separate. Maximum edge is 1,600px; the mobile derivatives fit within 800px. All derivatives were decoded and checked for stripped EXIF/GPS/ICC, unique full-image digests and no upscaling. The original framing/backgrounds were retained.

Two already-public production Field Notes and their existing public photographs were copied create-only into the separate staging namespace to make the round-trip links reviewable. The source was a fresh, complete, public-only production export; image paths/digests were verified. Atomic create-only writes prevented overwriting any existing staging record. No production CMS, mail, provider, schedule, visitor or location record was changed.

## Verification

- PASS: 280 Node tests, including the actual shared article renderer's destination-specific album links and unchanged input payloads. The fallback-reader VM fixture now supplies the newly imported real helper.
- PASS: 190 isolated Python tests; public trip and journey route/asset/metadata/hosting checks.
- PASS: 18 local browser scenarios in Edge at 390px and 1280px: all four galleries, loop boundaries, full-image viewer, keyboard/Escape, direct location fragments, no page overflow, Stories discovery, both existing Field Note links, no-JavaScript content and homepage-map return after enlarged viewing.
- PASS: the folded notebook requested no full gallery photograph in the isolated browser checks; opening/browsing loads the selected responsive media. No measured PageSpeed/Core Web Vitals claim.
- PASS: every selected photo is represented in the Atlas admin editing catalogue. Native signed-owner editing was not exercised in this photo task.
- PASS: source `5abcb0b` deployed to staging by Hosting run `43548699328`; regression `43548699367` and source backup `43548699289` succeeded. Public-copy workflow `43548737482` completed its check/sync steps and deployed-version verification, exposing both isolated Field Note review copies.
- PASS: 20 actual staging browser scenarios at 390px/1280px. This repeats the local gallery/reading/no-JavaScript/home-panel checks and adds clearing the Peru-only album link when switching countries. Both real staged original-URL Field Note pages link back to their relevant album sections. No application exceptions or native transition warnings occurred in this staging run.
- PASS: all 74 deployed runtime/photograph files matched the source bytes (text compared after newline normalization); staging's `X-Robots-Tag` is `noindex, nofollow, noarchive, noimageindex`; the report returns 404. The production Atlas still has no new album. A first HTML-only noindex assertion was corrected to check the actual Hosting header; a transient HTTP timeout was retried successfully.
- NOT TESTED: physical devices and native signed-owner editing in this photo task. Production deployment remains unapproved and was not performed.

Review entry point: `https://dainyelonthemove-staging.web.app/atlas?place=peru#peru-photos-title`.

Runtime test artifacts are ignored under `.wrangler/peru-photo-review/`. Source backups and reports are not public Hosting content.
