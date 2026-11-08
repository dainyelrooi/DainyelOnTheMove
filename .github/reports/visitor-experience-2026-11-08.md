# Visitor discovery and engagement review — 8 November 2026

The owner approved the reviewed loading release for production, then requested investigation of further visitor usability/engagement improvements. Loading release is live at1f2a6a3 (receipt in public-loading-2026-11-08.md). **The new changes below are staging-only**, pending their own release approval.

## Method and findings

Reviewed the real public Home→Search→Curaçao article route, source/data flow, homepage discovery, search defaults, article endings and existing privacy/invitation behaviour. Native search returned six Curaçao results, including the exact current CMS article. This is not a claim of a broken healthy search or a complete new website/security audit.

| Priority | Location | Verified issue/opportunity | Candidate change and acceptance |
|---|---|---|---|
| P2 | Home, underway trip card | The current CMS story is found through Stories/search, but not highlighted in the homepage's older hand-selected stories/notes. | Compact ‘Latest from the road’ link in the existing trip card. Uses only actually published summaries; preserves all existing archive links. Fresh independent copy is usable without waiting for Firebase; live withdrawal wins. |
| P2 | Search startup/default results | The static index begins alphabetically with About, Atlas, Bali, Contact, Cookies and Home. New CMS stories depend on a protected listener rather than the already available independent public catalogue. | Start with recent CMS items and useful collections; cookies/privacy remain searchable. Read bounded fresh same-space catalogue alongside existing static/provider archive, with live server authority and expiry. No query is sent to an AI/search provider. |
| P2 | Search close/reopen | An unresolved load/SDK import from a previous open can register again after a rapid close/reopen, losing the old unsubscribe handle. | Generation guard, parallel independent/static/live startup, and callback checks. Test rapid reopen and delayed server/copy responses; only the current session may subscribe/render. |
| P3 | Story/Field Note endings | No direct native share/copy utility beside the existing onward-reading actions. | One ‘Share this story’ or ‘Copy story link’ button, clean canonical URL, explicit visitor gesture. Quiet cancellation and selectable-link fallback if clipboard is denied. No remote SDK, unsolicited message or new tracking. |

The latest link deliberately adds no hero image, new carousel, popup, signup form or content the owner must maintain. It also appears in the existing shared trip card on Journey. It reads one newest summary per active trip-card listener (limit1), after the existing load gate; it reuses the existing protected database/ordered collection and App Check. This is one additional bounded public read on those pages, not an unlimited free-capacity claim. Independent copies expire within24hours; empty authoritative results hide the link. No Rules/index/Auth/provider deployment is needed.

Sharing uses the canonical article URL with query/tracking and chapter fragments removed. Generic entry shells, admin/studio, framed private previews, credential URLs and foreign hosts are rejected. The visitor chooses whether/where to share through the device. No social post is created by the website or these tests.

## Design basis

- [GOV.UK button guidance](https://design-system.service.gov.uk/components/button/) supports descriptive action labels and limiting competing primary actions. Applied as a compact contextual link and a secondary utility; no extra marketing overlay.
- [W3C content structure](https://www.w3.org/WAI/tutorials/page-structure/content/) supports semantic article/section structure. Existing headings, reading chapters, focus behaviour and routes are retained.
- [Google helpful content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) prioritises original useful content and a satisfying reader experience. Discovery exposes the owner's actual published work; no filler, invented popularity, false urgency or extra route reveal is added.

These are design principles, not evidence of a measured conversion uplift. No A/B test or new Analytics event/collector is introduced. Existing consent,10-second invitation caps, opt-outs, collapsed signup and ad-disabled policy remain as approved.

## Implementation and safeguards

- New `published-catalog.js`:2.5-second HTTP deadline,2MiB bound, maximum500 summaries, namespace/date/ID/type validation, in-memory request reuse and public-field projection only.
- New `home-latest.js`: actual public item URL, immediate fresh-copy option, limit1 protected confirmation, metadata/pending-write guard, delayed-response/withdrawal precedence,24-hour expiry and page lifecycle cleanup.
- `global-search.js` and `search-engine.js`: independent CMS search, useful initial ordering, concurrent loaders, session guards and catalogue expiry. Normal queries still search privacy/help pages and retain English/Dutch/spelling tolerance.
- New `article-share.js` and scoped common CSS: native share or copy/manual fallback, no network side effect until a visitor uses their own native chooser. Private editor frames have no share UI.
- `publishing-public.js`: apply canonical metadata before reader enhancement events, so dynamically rendered articles also obtain the right share URL.
- Shared shell initialiser and Home source changed through the existing composer. Existing719 website-editor fields remain unchanged; no saved edit IDs migrated.
- Pre-change OneDrive backup: `website_2026-11-08_16-22-44`. No cloud content, calendar dates, subscribers, campaigns or social posts changed.

## Verification

- PASS:249 isolated Node checks in the first full run, followed by13 focused new functional checks (250 total after adding the stalled-static-index case) for discovery, live withdrawal, late callbacks, expiry, search reopen, sharing cancellation, clipboard denial and private-frame exclusion.
- PASS:124 Python checks.
- PASS: staged source3077ee1 Hosting42526220046, full regression42526220013 and OneDrive backup42526220040. Subsequent refinement makes static/CMS search loaders independent and takes the actual document ID as the live URL authority; final receipt follows after its deployment.
- PASS: actual staged Bali article shows exactly one ‘Share this story’ utility beside onward-reading choices. The existing ‘Ask me about Bali’ link opens the question desk, loads without another click, enables the form and selects Bali. No question was entered/submitted. No console warnings/errors observed on that route.
- PASS: isolated Edge desktop Lighthouse accessibility sample on staged `/bali#next-stories-title` returned100; actual screenshot retained in ignored `.wrangler/visitor-sharing-staging.jpg`. This is a single fragment audit, not complete WCAG conformance or a site-wide/mobile performance claim. The screenshot shows the first-visit privacy choice over the lower page; consent was not bypassed for the capture.
- LIMIT: the staging namespace currently has no readable published CMS catalogue. The latest-link empty/fallback/withdrawal behaviour is tested with isolated data; no real private draft was published for a visual demonstration. The production namespace remains separate.
- No claim of actual native mobile share delivery, newsletter signup/send, physical-device testing or measured engagement lift.

## Further opportunities

Keep new content/date/photo quality and a predictable Postcards cadence ahead of more widgets. Contextual next-story suggestions can be considered once more current-journey stories exist; current onward-reading links already work. Assess actual consented reader behaviour before changing the owner-approved invitation timing, adding more popups or asserting which variant converts best. The known isolated development dependency advisories remain separate maintenance work, not a new visitor-runtime finding from this review.
