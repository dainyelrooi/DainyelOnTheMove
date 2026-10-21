# Journey experience — local implementation

Status: local feature branch; no push, public preview, Firebase configuration change, campaign or production release.

## Inventory and decisions

- Static HTML, shared templates, vanilla JavaScript, Python standard-library authoring; preserve stack and existing URLs/hashes.
- Shared header/footer, editorial typography, palette, lazy consent-gated films, galleries, Brevo signup and existing Firebase owner authentication retained.
- One existing SVG atlas; extend its selection path with replay/filter state, never add a second map.
- `data/trip.json`: approved public upcoming trip configuration. A planned departure is not evidence of departure.
- `data/journey.json`: public archive model for destinations, stories, journal, sanitized Postcards, budget and actual expenses. Generate legacy travel-data adapter from this model.
- Existing `fieldNotes` Firestore collection contains private subscribers. Journal entries must use separate content storage.
- Existing Q&A realtime Firestore queries retained. New server-controlled content uses private collections and an explicit public projection, not unrestricted browser writes.
- Existing Firestore database: Enterprise, Native mode, europe-west4. No database/schema/provider change performed remotely.
- Direct contact requires a server runtime and transactional mail provider. Local integration must fail closed when unavailable; copying a draft is not delivery.
- Owner supplied a rough EUR 8,000–10,000 trip budget, prefers below budget; actual expense records are absent. Do not report the budget as spending.

## Reuse / routes

| Existing | Action | Reason |
|---|---|---|
| Header + home countdown | Extend shared status model | One clock, honest departure transition |
| atlas.html and #map | Extend | Replay/filter/list on same SVG |
| stories.html / field-notes.html | Shared journal projection | One source, standalone stable entries |
| thailand.html / thailand-solo.html / bali.html | Enhance existing article DOM | Story mode, summary, reading time and chapters |
| philippines.html | Keep preview | Full text not supplied |
| Q&A + owner studio | Extend moderation | Reuse authentication and pending workflow |
| Brevo collapsed signup | Keep | Existing consent/CAPTCHA/single opt-in |
| Local Collaborate draft | Server route + honest failure | Actual submission and delivery confirmation |

## Release boundary

Review only on loopback/private local preview. Before release: show preview, measured results, remaining content/provider blocks and rollback; ask explicit approval. Staging is public and is not an approved private preview for this request.

## Feature coverage

| Feature | Implemented locally | Remaining dependency |
|---|---|---|
| 1 On the Move LIVE | Shared header/home clock; planned vs confirmed departure; reporting-timezone calendar day; last-shared date; neutral missing/failure states | Real departure/check-ins must be supplied and deliberately published |
| 2 Journey Replay | Existing SVG map; chronology by recorded year; year/trip/story/film/journal/reveal filters; list, URL sharing and Back/Forward | Exact dates of many historical visits are not known; no invented ordering within a year |
| 3 Cinematic Story Mode | Opt-in on three full stories; original DOM; native chapters/history/progress; normal/no-JS/reduced-motion fallback | Philippines remains a preview, as requested |
| 4 Unfiltered Journal | Three unchanged archive notes from one model; standalone pages, Stories/home/archive cards; separate event/publication dates; mobile draft/review workflow | New server persistence needs configured runtime; mobile photo upload not added, use existing approved library |
| 5 Postcard Wall | One real sent Thailand edition; public sanitized detail URL; story relationships; sample-before-signup; existing collapsed Brevo form retained | Other real sent editions may be added after review; no future campaigns copied |
| 6 Digital passport | Real destination taxonomy; public-ID bookmarks; save/remove/reload/clear; storage errors and removed-ID filtering | Device-local only, no account or synchronization |
| 8 Real Travel Costs | Approved planning range separate from actual expenses; integer currency math; personal/group split; currency separation; date/trip/place/category filters; coverage details and honest empty state | No actual expense records supplied: ready for content, not a published spending overview |
| 9 Community Challenges | Within Q&A; server validation/rate limits/App Check; private pending queue; verified-owner publication; separate lifecycle/result; private edit key and re-review | Runtime, owner identity and real App Check/database tests before enablement |

## Existing page improvements

- Primary home action is Follow the Journey; live status then atlas, stories/films and journal; existing personal introduction and anchors retained.
- Story read-time is calculated at 200 words/min from the article, excluding navigation/footer. Chapters derive from actual named sections/headings, retaining existing short labels and IDs.
- Q&A uses answeredAt for recent answers and stable question deep links, including direct lookup beyond the first page. A new composite index is prepared locally; existing realtime moderation is retained.
- Direct contact has a real server/provider adapter, validation, consent, bounded requests, origin checks, durable idempotency and held ambiguous mail outcomes. Unavailable forms explicitly disable sending and offer existing contact alternatives.
- Owner sign-in no longer automatically publishes a device check-in. Device lookup fills city/country for review before saving.
- New stable URLs, canonical/social metadata, public search projection and sitemap; dynamic future entries have server-rendered metadata and a conditional public sitemap feed.
- No new visitor accounts, second map, newsletter campaign, tracking product or framework migration.

## Verified checks

- 24 isolated Node business/HTTP tests pass: clock boundaries/DST, integer money and mixed currencies, personal shares/partial coverage, storage errors/revoked IDs, pending/public boundaries, owner rejection, edit re-review, revision conflicts, idempotent mail, provider failure, lengths/consent/rate limits, origin/content-type/body-size rejection and escaped public rendering.
- 28 changed/new JavaScript files passed syntax checking; all generated local links/assets/IDs, seven new routes, unique metadata and sitemap references passed static checks. `git diff --check` passed.
- Ten pages × 320/375/768/1024/1440 pixels = 50 browser layout checks, no horizontal page overflow or duplicate h1.
- Browser actions verified: equal 7-day header/main snapshot; Postcards initially collapsed with no iframe source, opens/closes on click; passport save/reload/saved-only; atlas filtered selection/deep link/previous/back; cinematic URL/back and mobile TOC; chapter jump/photo enlargement/next/close.
- Local private/authoring path checks returned 404, public model and passport returned 200. Disabled real HTTP contact runtime returned 503 with no send. No real mail test was performed.
- Locked server SDK installed without lifecycle scripts; required Admin modules imported. npm audit during installation reported zero known vulnerabilities; that is not a complete security audit.
- Real owner login, App Check, new database index and deployed server/IAM flows were not exercised remotely. Mock tests do not establish live Firebase or inbox delivery success.

## Comparable performance measurements

Lighthouse 13.5, fresh headless Edge sessions, mobile simulated throttling, GPU disabled, loopback with gzip enabled for both the pre-change backup and local release. Three interleaved baseline/release runs per representative page; medians below. Eight release desktop pages were measured separately. Raw reports are outside Hosting in the sibling review-evidence/journey-experience directory. Earlier uncompressed preview measurements are retained, not mixed into these medians.

Local preview intentionally sends X-Robots-Tag noindex; its SEO score is consequently limited and is not a production SEO regression. These are lab results, not field Core Web Vitals or a permanent PageSpeed guarantee. INP was not measured; TBT is only a lab diagnostic.

| Mobile page | Baseline → release | LCP | TBT | CLS | Accessibility | Own initial JS | Initial transfer |
|---|---:|---:|---:|---:|---:|---:|---:|
| index | 89 → 90 | 2.78s | 259ms | 0.000 | 100 | 26.7 KiB | 0.59 MiB |
| atlas | 85 → 98 | 2.13s | 63ms | 0.058 | 100 | 78.7 KiB | 0.18 MiB |
| thailand | 93 → 97 | 2.04s | 161ms | 0.000 | 100 | 22.8 KiB | 0.2 MiB |
| qa | 86 → 97 | 1.96s | 145ms | 0.000 | 100 | 21.5 KiB | 0.13 MiB |
| collaborate | 99 → 99 | 1.89s | 73ms | 0.000 | 100 | 20.2 KiB | 0.14 MiB |

The 200 KiB own-JS and 1.5 MiB mobile automatic-transfer budgets pass on these pages. The homepage retains the owner-requested muted moving hero and pause control: its local median remains 90, LCP about 2.78s, so **95+ and the 2.5s LCP target are not established for the homepage**. Atlas/story/Q&A/contact medians are 97–99. Background video still uses one selected source, poster first, no sound, visibility pause and reduced-motion/data-saver safeguards.

| Desktop release page | Performance | Accessibility |
|---|---:|---:|
| index | 99 | 100 |
| atlas | 100 | 100 |
| thailand | 100 | 100 |
| qa | 100 | 100 |
| collaborate | 100 | 100 |
| passport | 100 | 100 |
| postcards | 100 | 100 |
| travel-costs | 100 | 100 |

## Exact blockers / release conditions

1. New server runtime is not provisioned/deployed; existing static Hosting cannot execute it. Runtime/billing, service identity, verified owner UID, exact origins/proxy chain, secret injection and Hosting rewrites need an approved release. No paid service or billing upgrade was enabled.
2. Existing transactional mail credentials are not available in this local runtime. Configure the existing verified sender and the privately supplied single-test recipient, then verify provider acceptance AND inbox receipt. The approved one-test authorization persists; no repeated permission is needed for that same controlled test.
3. Apply and verify the prepared answeredAt composite index with the approved database release. No remote Firestore/Auth/Rules changes were made.
4. Actual approved expenses with dates, category, currency, amount, own share and coverage are missing. EUR 8,000–10,000 is only a planning range.
5. A genuine current-trip check-in, actual departure, new challenges/results and more sent Postcards must come from real publications. Empty states stay truthful.
6. Homepage mobile 95+ is not proven by these measurements. Recheck Google PSI on an approved deployment; do not substitute lab TBT for field INP.
7. Enable and verify retention cleanup/TTL for new server records before public submissions. Expiry fields are real Firestore timestamps in the production adapter, but expiry policies were not deployed.

## Review and rollback

**21 October update:** the owner subsequently approved staging publication with the new service disabled. The complete frontend is now on the existing test site; production and backend configuration remain unchanged. Release evidence: [journey-staging-release-2026-10-21.md](journey-staging-release-2026-10-21.md). The local-only account below records the state when this implementation report was first completed on 20 October.

Review: local loopback http://127.0.0.1:8765/index.html#next-chapter ; atlas.html, stories.html, field-notes.html, postcards.html, passport.html and travel-costs.html are available there. This is not a public preview. Screenshots and machine-readable evidence are in the sibling review-evidence/journey-experience directory. No source fixture, private draft, secret or test-recipient configuration is hosted.

The starting branch was clean staging at 9a2b132. Backup is backups/website_2026-10-20_21-26-33 in the project parent. Current work is local feature/journey-experience. No staging/main push or Firebase deployment occurred. For a future release, preserve the previous Hosting version; rollback Hosting and disable services.json if necessary, separately withdraw any server-public content. Local source history and backup remain available. Do not reset or delete unrelated later work.

Owner workflow: journey-owner-guide.md. Runtime contracts/configuration: ../server/README.md. Destination taxonomy follows the existing public visits; Aruba/Curaçao are constituent countries within the Kingdom, not additional sovereign-country counts ([Government of the Netherlands](https://www.government.nl/themes/government-and-democracy/caribbean-parts-of-the-kingdom)).
