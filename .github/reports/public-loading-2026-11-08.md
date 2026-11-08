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

- PASS: 236 isolated Node tests, including real renderer/reader flows for exact-content preservation, timestamp-independent corrections, media expiry, withdrawal and delayed callbacks.
- PASS: 124 Python tests.
- PASS: new load-gate tests cover shared startup, load/paint ordering, already-loaded pages and a failed-asset ceiling.
- PASS: public trip validator, journey checks and whitespace checks.
- Pre-change OneDrive backup: `website_2026-11-08_15-48-10`; restore point source `a5b216c`.

## Staging acceptance

Pending deployment and real-browser/performance readback. Do not interpret the pre-change scores as the candidate's scores. Full third-party verification still has network/CPU costs after the initial page; this change does not remove them or guarantee 99/100 scores.
