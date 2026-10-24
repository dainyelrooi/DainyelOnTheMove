# Definitive live release — 24 October 2026

## Owner approval and scope

Owner explicitly requested going live, all remaining definitive release steps, and no mail via Brevo. This releases the reviewed staging batch since production f9a6539: independent CMS/page editing, recovery/Overview/calendar, contact intake, public archive and website clarity, circular collections/compact Q&A, About and Postcards discovery. Unrelated quiet-growth work remains unstaged.

## Preparation

- OneDrive source backup website_2026-10-24_14-11-00. Current production is an ancestor of the reviewed branch; no divergent main changes or force push required.
- Existing dainyel-content instance confirmed Enterprise Native, realtime/free tier, Europe-west4; billing disabled. No database, index, Auth/provider permission, credential, paid runtime or billing change.
- Applied previously prepared production Rules candidate: three namespace gates, owner-only operations-status reads and bounded optional platforms in the legacy production calendar. Schema/size/type, exact publication/recovery/history, immutable media, consent/pending and Google/TOTP boundaries retained.
-57 focused compiled-source access/negative simulations passed with service reads mocked, plus Rules syntax validation. This is not an exhaustive security audit or real second-account test. Rules design and simulated results retained outside Hosting in production-release-approved.
- Focused named-database Rules deployment completed; authoritative cloud.firestore/dainyel-content source exactly matches current local source. Production publication collections and mailJobs initially empty; no staging data migrated. Both environments' subscriber delivery setting absent/off.
- Corrected live admin environment/help wording and contact receipt text: messages go to the private website inbox; no claim of email delivery while forwarding is off. Composer and affected JS syntax checks passed.

## Email boundary

No subscriber campaign/test/release mail or queued marketing request is created. Marketing delivery and contact forwarding flags/settings remain off. Existing campaign schedules, calendar reminder preference and question alert service are preserved and are not invoked for verification. Read-only archive refresh uses GET provider requests only and may publish already sent public editions after24hours. No signup is submitted during release checks.

## Release completion

Production Hosting, archive activation, daily backup dispatch and authenticated normal production lifecycle checks follow below.
