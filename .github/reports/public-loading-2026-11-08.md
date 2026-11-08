# Public loading maintenance — 8 November 2026

Scope: the owner reported slower public pages. Staging candidate only; no production release, database/configuration changes, subscriber mail or paid services are authorised by this request.

## Evidence before changes

Fresh official PageSpeed mobile runs (slow 4G, emulated Moto G Power, Lighthouse 13.6.0):

| Public route | Performance | FCP | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|
| Home | 94 | 0.9 s | 2.6 s | 180 ms | 0 |
| Stories | 100 | 0.9 s | 1.2 s | 40 ms | 0 |
| Films | 93 | 0.9 s | 2.1 s | 250 ms | 0 |
| Atlas | 95 | 0.9 s | 0.9 s | 130 ms | 0 |

Reports: [Home](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com/vhot6h5tbe?form_factor=mobile), [Stories](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-stories/jgaviyqnt0?form_factor=mobile), [Films](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-videos/cfd6cao7gh?form_factor=mobile), [Atlas](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-atlas/zc8aiqme1l?form_factor=mobile).

CrUX has insufficient real-user data; these are single laboratory samples, not proof of every visitor's connection. The numbers do not establish a site-wide performance collapse or a historical like-for-like regression. Home console inspection in the normal browser returned no errors/warnings.

Home's third-party insight measured approximately 942 KiB from Google's CDN, including 698 KiB of reCAPTCHA JavaScript and 176 KiB of Firestore. Its reCAPTCHA main-thread work was 456 ms. Source inspection confirms optional public live reads start after two frames, while critical initial assets can still be loading. This competes with the initial page. Security must remain enforced.

The CMS detail listener also unconditionally replaced the full initial article with a photo-less article, read every photo document again, then rebuilt the article a second time. This creates avoidable banner/gallery disappearance, reader reset and duplicate base64 media transfers even when live content exactly matches the initial Hosting page.

A separate local Edge Lighthouse diagnostic returned 62 on Home, LCP 2.5 s, TBT 3,160 ms, 1,374 KiB. It used a different browser/environment and is deliberately not substituted for the official PSI score. Raw diagnostics stay in ignored `.wrangler/` and must not be hosted or committed.

## Changes

- `assets/public-load.js`: one shared, bounded gate lets the initial document load and paint before optional protected public enhancements start. Missing/slow assets cannot defer them indefinitely (2.5-second ceiling plus paint frames). The existing 12-second initial-read deadline remains measured from initialisation, not postponed by the gate.
- `website-public.js`, `publishing-public.js`, `nav-updates.js`, `visited-data.js`, `site-clarity.js`: reuse the gate for their automatic protected reads. Actual realtime subscriptions, server authority, App Check, authentication and private-preview boundaries are preserved. No deferred reader is disabled for an audit or user-agent.
- `publishing-model.js` and `.github/tools/render-public-entries.mjs`: canonicalise all displayed entry fields and add a SHA-256 fingerprint to the initial approved article. SDK timestamps and exported timestamps have the same representation. The fingerprint adds 64 characters, not a duplicate article body.
- `publishing-public.js`: retain existing chapter/image DOM only after the protected live record exactly matches that fingerprint and the initial copy is fresh. Avoid duplicate photo reads and reader reconstruction for this case. Any real content change (even with the same timestamp), withdrawal, mismatch or expired copy takes the normal live path. At the existing 24-hour boundary media is re-read normally; stale callbacks cannot resurrect withdrawn content.
- Regenerated root HTML and shared public shell through the existing composer; only asset fingerprints changed in those pages.

The existing realtime query API is intentionally retained because already-open pages must receive publication corrections/withdrawals. No new database/query model, permission, index or provider integration is introduced.

## Verification before deployment

- PASS: 236 isolated Node tests in the first complete run, including real renderer/reader flows for exact-content preservation, timestamp-independent corrections, media expiry, withdrawal and delayed callbacks. A subsequent recovery-notice test adds one case (237 total); all 50 focused reader/startup tests passed after that refinement.
- PASS: 124 Python tests.
- PASS: new load-gate tests cover shared startup, load/paint ordering, already-loaded pages and a failed-asset ceiling.
- PASS: public trip validator, journey checks and whitespace checks.
- Pre-change OneDrive backup: `website_2026-11-08_15-48-10`; restore point source `a5b216c`.

## Staging acceptance

First candidate `a58be5e` passed Hosting42522672728, full regression42522672683 (including the existing Rules emulator tests) and OneDrive backup42522672764. Remote gate returned200 on staging; production still returned404 for this new asset. The non-sensitive report path returned404 on both origins. Production remains at `a5b216c`.

Fresh official mobile PSI samples on that staged candidate:

| Route | Performance | FCP | LCP | TBT | Speed Index |
|---|---:|---:|---:|---:|---:|
| Home | 93 | 1.1 s | 2.7 s | 30 ms | 4.9 s |
| Stories | 97 | 0.9 s | 0.9 s | 30 ms | 4.4 s |
| Films | 99 | 0.9 s | 1.5 s | 50 ms | 3.4 s |
| Atlas | 96 | 0.9 s | 1.4 s | 40 ms | 2.2 s |

Reports: [Home](https://pagespeed.web.dev/analysis/https-dainyelonthemove-staging-web-app/g1m0ixzv9d?form_factor=mobile), [Stories](https://pagespeed.web.dev/analysis/https-dainyelonthemove-staging-web-app-stories/fwp6h5x57g?form_factor=mobile), [Films](https://pagespeed.web.dev/analysis/https-dainyelonthemove-staging-web-app-videos/sg4m7owr1m?form_factor=mobile), [Atlas](https://pagespeed.web.dev/analysis/https-dainyelonthemove-staging-web-app-atlas/dhmikg0cr2?form_factor=mobile).

All four samples had lower TBT; the largest observed improvement was Films93→99. Home93 versus94 and Stories97 versus100 are **not** overall score improvements. Home/Stories Speed Index increased. The origins, public CMS state and run-to-run network/CPU variation differ, so these single samples cannot isolate a causal speed improvement or establish a median. Home still needs attention to its first visual completion (LCP2.7s in this sample); third-party security remains substantial. Do not claim every page is faster or a guaranteed99/100.

The separate local Edge diagnostic changed from62 to68, LCP2.5→2.4s, TBT3,160→880ms, but Speed Index4.8→8.9s. Transfer size remained essentially unchanged at1,381KiB versus1,374KiB: the gate prioritises rather than removes protected work. These local numbers are not official PSI scores. Its actual mobile screenshot was inspected and is retained only in ignored `.wrangler/public-loading-staging-mobile.jpg`.

Real browser checks:

- PASS: staged homepage and header load; manually shared Peru update arrives after startup. No console errors/warnings observed on the checked normal-browser Home/Films flow.
- PASS: Home→Films panel, Next cards, Escape close, Stories navigation, Field Notes selection and opening a real Field Note.
- PASS: isolated local browser with the actual initial renderer/reader and synthetic SDK callbacks: original heading/chapter DOM retained,0 media-document reads. A content correction with unchanged timestamps renders immediately and reads its photo; withdrawal immediately replaces the article with unavailable state. No cloud writes, publications or emails in this fixture; not deployed.
- LIMIT: the browser viewport capability did not apply the requested390px override (actual measured1265px). No manual narrow-screen success is claimed. Mobile lab emulation and its actual screenshot are the mobile evidence; no physical-device claim. Override reset.
- LIMIT: staging currently has no readable published CMS reserve for a native cloud roundtrip of this exact initial-HTML optimisation. The deterministic integration and isolated actual-browser checks above cover it without publishing test content or changing owner data.

Final refinement removes an owned initial-copy warning after successful live recovery without rebuilding the article. It does not change the loading gate or benchmarked network behaviour; final staging CI receipt follows below. Full third-party verification still has network/CPU costs after the initial page. No provider, mail, scheduling, AdSense, Analytics, consent or security configuration was changed.

Final source `587df30` passed staging Hosting42523827612 and complete regression42523827725. This is the deployed candidate; the later report-only receipt does not change it. Production publication still requires separate owner approval for this maintenance release.

Other maintenance: GitHub still reports advisories for isolated development dependencies. The existing28October report identifies these as excluded test tooling; this performance change does not resolve or newly validate those advisories. Do not call all dependencies clean or equate that notice with a visitor-runtime vulnerability.
