# Launch follow-up — 28 October 2026 (Curaçao)

Owner approved completing the necessary remaining work and releasing it, and confirmed being on Curaçao. Reporting date follows the owner's current UTC−4 time; verification instants below use UTC explicitly. No extra newsletter or test message is part of this release.

## Verified existing publication and mail

- Normal production CMS schedule for the pre-departure Field Note is `published`. Its exact approved revision 6 payload matches the public document, published 28 October at 07:19 UTC. The real canonical browser page rendered its text, chapters, reading time and photographs.
- Brevo campaign 8 showed **Sent**, 13 recipients, the correct Field Note link and existing list 3 with **Email campaigns subscriptions = Subscribed**. This proves provider state, not every recipient's inbox. No new send, duplicate, suspension or reschedule was performed.
- The cancelled standalone mail remains exactly held by the existing repository variable; the hold is not removed by this release. The completed extra one-time publication check was deleted after success.

## Changes prepared and locally verified

- Public reader reserve: Q&A answers/conversations/replies, published CMS entries/cards/photos, and published Website overrides can use a complete validated public Hosting copy after initial Firestore failure or a 12-second initial server wait. Static original content stays available.
- Only consented published Q&A and actually published CMS/Website projections are exported. No private questions, drafts, scheduled unpublished payloads, subscriber/contact data or orphan media. All queries and explicitly referenced media are pinned to one server read time.
- Public copies are **ephemeral Hosting files**, excluded from Git. Visitor content and photos are not added to permanent public source history. Source/archive releases retain only a still-fresh, complete same-target CDN generation; a subsequent complete export drops withdrawn paths from the active release.
- New authoritative server results, including empty/withdrawn records, override reserves. Identical metadata acknowledgements preserve reading state. Reserves and copied photographs expire after 24 hours, including suspended tabs. A displayed old copy is not an instantaneous revocation mechanism while Firestore is unreachable.
- Initial read errors do not become invented empty feeds. Explicit retries can discover a recovered or newly created copy. Namespace, generation, schema, byte/row/request and image-hash checks fail closed. WebP container/dimension validation is not full image decoding.
- Four refresh opportunities per day are prepared in the existing free GitHub/Firebase setup. Sync has an 8 MiB aggregate REST-response cap and existing free-database guards. A failed/partial sync does not deploy. No new service, billing, Rules, Auth, MFA, credentials or advertising activation.
- Deployment excludes authentication temporary files on both Hosting targets. Ordinary source/archive deployments coordinate with copy deployments and reject stale Git checkouts.
- Owner-confirmed journey uses `departureConfirmed: true`, with actual departure timestamp still null and no fabricated travel-day number. Shared location is country-only Curaçao, without a city, coordinates, arrival date or future itinerary. Reporting timezone stays Amsterdam; static and dynamic status show underway.

## Checks and limits

- PASS: 144 Node tests; 95 Python tests using the bundled runtime; public route/reference/metadata/Hosting checks; public-trip schema; source whitespace. Includes actual Python-exporter output consumed by the real browser validator. Fixtures are synthetic and never written into hosted public data.
- Host Python lacks its timezone database; the bundled Python passed the complete suite. CI uses Ubuntu's timezone database.
- Staging: Hosting40801982528 and regression40801983448 passed for100f6aa. Follow-up regression40802198478 and real export/Hosting40802198319 passed for0b7915a. Strict CDN retain/readback validated a real complete staging generation with2published answers/1community conversation,0published test CMS entries/0page overrides. All22sitemap routes returned200/title/noindex; private admin retained noindex/DENY and source report returned404. Real browser status showed underway/Curaçao; existing published answers and conversation controls opened.
- The separate staging private-backup workflow failed at its automatic calendar seeding step; the historic remote error code is unproved, not assumed quota. Seeding was already initialized, and importing later production items on every source push is unnecessary. It is now an explicit manual-only test action; push/schedule still run actual backup, and owner preflight/failures remain enabled. Safe error categories preserve diagnostics without payload logging. Retest after this fix and production evidence follow.
- This improves public-read availability; it does not eliminate ordinary healthy Firestore reads, remove all free quotas, or make new submissions/admin writes independent of Firestore. New independent submission storage requires a separate reviewed design. Existing ad code remains in Analytics-only mode until a deliberate approved advertising change.
- No exhaustive physical-device, load/INP, universal PageSpeed 99+, payment/payout or all-inbox delivery claim. The separate Pinterest chat completed the exact guarded temporary-image cleanup: its result records40deleted/0remaining at29October01:00UTC, without calendar/OneDrive/website-photo/email changes. No second cleanup was run here.
