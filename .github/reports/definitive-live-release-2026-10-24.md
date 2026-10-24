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


## Completed live evidence

- Source6997bc6 was published by production Hosting run40093500614; success. Staging run40093408815 and its private backup/preflight40093408819 also succeeded. Production source and active named-database Rules match exactly. No indexes/Auth/billing deployment.
- Enabled only POSTCARD_ARCHIVE_ENABLED. CONTACT_DELIVERY_ENABLED and POSTCARDS_DELIVERY_ENABLED are false, both environments' subscriber setting absent/off, and production mailJobs empty. The first archive dispatch stopped because its absent switch was not yet created; after creating the read-only switch, run40093615405 succeeded. It committed f9a0fe9 and deployed the public archive; the live page shows three real editions including the23October Philippines update, after its24hour delay. All provider operations were read-only, no campaign mutation/send.
- First production independent backup40093540075 succeeded. After the normal owner lifecycle checks, a second production backup40109209139 succeeded and the actual live Overview showed its verified saved-writing/photo snapshot. Daily03:37UTC scheduling now exists on the default main branch; no Codex or local PC is required. Native GitHub/provider availability and existing quota boundaries still apply.
- Owner privately signed into production. The normal CMS save/preview/consent/publish cycle succeeded using a clearly labelled temporary copy of the existing Thailand Field Note. Actual public page showed the title, sourced existing text, automatic approximate reading time and chapter/TOC. Take offline succeeded and the page then showed unavailable. The private labelled draft/history remain for recovery; no published copy or summary remains.
- Existing-page editor connected to production; saved the original footer text, rendered its same-origin preview, accepted explicit publication and restored original normally. No public footer override/search projection remains. The saved draft has an empty active override map and private recovery history. No source content was lost or mapped to another section.
- One labelled owner contact message was submitted through the real live form. It appeared privately in the owner inbox and changed the Questions review counter from0to1; Mark handled returned it to0 and moved only that check into the handled disclosure. No contact forwarding or visitor/subscriber email was sent/requested. Message is retained privately, not permanently deleted.
- Live Postcards editor loaded private draft controls and clearly reported subscriber delivery not activated; Send/Schedule disabled. No email draft/job was created for verification. Calendar showed its month/list/navigation controls. Authoritative readback confirmed all7 original live records/checkmarks match the isolated review copy (excluding test timestamps/default platform metadata); existing reminder preference remains enabled and unchanged.
- Production public readback: About, Stories, Films, Q&A, Postcards and Contact HTTP200 without staging noindex; admin/studio HTTP200 with noindex and DENY. Nine deployed JS/data assets match local source. atlas.html301to/atlas; search301to/#search. Known report, AGENTS and composer URLs404. Optional paid service remains off.
- Live public screenshot: C:/Users/dainy/Documents/Codex/2026-10-24/production-release-approved/about-live.png. Live admin and public About retained for the owner. Production publication/withdrawal, existing-page original publication/restore, private contact receipt/handling, draft-only mail controls and private backup status observed. No exhaustive security/physical-device/concurrent-device/offline or actual-mail/inbox delivery claim. The57 Rules simulations used mocked service reads; no broad automated suite was added.

## Handoff

Use https://dainyelonthemove.com/admin for real content. Write creates new stories/notes/facts; Website edits current sections; Calendar keeps its existing plan; Overview distinguishes private versus published and shows backups. Publishing never sends a newsletter automatically. Contact messages are read in Questions. Postcards drafts/previews work, while newsletter sending and contact forwarding deliberately remain disabled for this no-email release. Existing earlier schedules/question alerts/reminder preference were preserved and never invoked by this release.
