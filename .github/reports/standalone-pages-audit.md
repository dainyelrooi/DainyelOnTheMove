# Standalone pages and supplied audit — staging review

## Scope and release state

Owner requested own pages alongside existing overlays, then supplied a 16 October audit with P0/P1 priorities first. Implemented source on feature/standalone-public-pages, integrated into staging. No main/production push or subscriber newsletter is authorised for this batch. Backup: website_2026-10-16_04-55-33. Existing public travel content and moderation contracts preserved.

## Completed priority work

- Eight ordinary pages: About, Videos, Atlas, Journey, Q&A, My kit, Collaborate, Field Notes. Own H1, title, description, canonical, social metadata, JSON-LD and sitemap entries. Shared fragments remain the single content source; no duplicated editing workflow.
- Header/footer/search use actual page addresses. Homepage intercepts normal clicks for its existing overlays; modified clicks retain document navigation. Overlay page links and standalone share buttons expose direct URLs. Film overlays remain outside inert main content.
- Matching Hosting aliases: destinations -> atlas.html, updates -> field-notes.html; blog -> stories.html retained. Former about/videos/journey/qa/my-kit/collaborate .html addresses become 200 documents rather than homepage redirects. Extensionless and slash aliases redirect to their matching page. Incoming fragments remain available where their content exists. Previously cached 301s may require a fresh browser session/cache refresh for review.
- Journey reuses existing safe countdown, lazy Postcards signup and published-reveals feed. The next route is not disclosed; no fabricated latest update or location.
- Field Notes has a dedicated page; original archive/tab content remains available. Existing related-story links and story reading progress preserved.
- Q&A explains public publication, return-to-site answers, no collected email, manual review and no promised response time. Same personal/community forms and collections are reused.
- Both Instagram and owner-approved support business contact appear. Form explicitly prepares a message; it does not send. No invented collaborations alias, performance numbers or equipment review.
- Inspected GA retention in account UI: event-level 2 months, user-level 14 months, reset enabled. Privacy source updated accordingly. No Analytics account setting change; new public paths are allowlisted with existing consent and production-only measurement.
- Only relevant profile/Q&A CSS is loaded on each new page; existing videos retain lazy hydration and external frames require a visitor action.

## Mail diagnosis — existing production integration

A real personal-question notification was accepted in scheduled run 38830654901 and independently found in Gmail Website, outside Inbox, at 02:39 Europe/Amsterdam on 16 October. It counted one personal question and no community questions. Manual notify run 38843692955 found no further new questions and sent no duplicate. The code checks both questions and communityThreads across pending/published/rejected states with server-time cursors. No reset or historical replay was performed. The issue observed was delayed GitHub scheduling; owner elected to keep GitHub with possible delays rather than add an external planner. Community submission-to-email receipt remains unverified; no fictional question was inserted.

## Checks actually performed

- JavaScript syntax: site-ui, Analytics consent and Q&A passed. Compose-Site and diff whitespace checks passed. Public-trip validator passed.
- All eight generated documents: one H1, no duplicate IDs, correct unique canonical/description, parseable JSON-LD, local linked assets/documents exist.
- Staging deploy run 38843619524 succeeded. All eight new URLs returned HTTP 200 with staging noindex headers. Destinations/Updates/Blog reached their relevant targets. A known .github/reports URL returned 404.
- Browser: standalone video opened its dialog, reached readyState 4, paused=false and time progression beyond 19 seconds; Escape restored the collection. Atlas rendered 183 country paths. Journey countdown was visibly populated and no upcoming stop was disclosed. Standalone Q&A enabled both form fieldsets; published-answer state loaded.
- GA retention values inspected in UI. Prior live Analytics receipt and consent were already confirmed in this conversation; no GA hits intentionally sent from staging.

## Pending before claiming audit completion

- Full mobile/tablet device exercise and keyboard pass across all menus/forms: the attempted 390px browser override did not change the observed 1265px viewport, so it is not counted as a mobile test. No Lighthouse or field Core Web Vitals score is claimed.
- Postcards: owner previously confirmed native-form signup, DOI and welcome mail; complete unsubscribe/suppression/reply delivery still require a real controlled subscriber check. Do not unsubscribe an unrelated visitor or invent a new email address. CAPTCHA remains an owner interaction.
- Real community-question-to-mail receipt and ongoing schedule timeliness; scheduling can be delayed substantially.
- Search typo tolerance/category grouping and exhaustive video playback/no-JavaScript/404 checks remain a separate quality pass. Current search routes were updated to the new documents.
- Additional latest-publication/date badges require real publication dates or a real new release. Do not infer publication dates from file timestamps.

## Optional/content-dependent follow-up

Atlas continent/year filters and country permalinks; illustrative story maps; gallery personal captions; useful first-time-solo tips; equipment photos/reviews/editing workflow; finished Philippines story; latest-from-road feed items. Use only owner-supplied experiences. Existing map list/photos/related links, galleries, video categories and reading progress already implement several audit suggestions: inspect before replacing them.

No secrets, recipient addresses, visitor questions or unrevealed journey places are recorded in this report.
