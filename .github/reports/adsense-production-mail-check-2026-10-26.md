# AdSense production release and scheduled Postcard check — 26 October 2026

## Authorised scope and recovery

The owner explicitly approved releasing the reviewed AdSense and shared consent changes to production. He also approved reconnecting the existing future Postcard to the current reviewed website publication, preserving the email text and chosen delivery time. The website release and the separately authorised mail reconnection are complete, subject to the future-delivery and consent limitations below.

Existing pre-change source backup: `backups/website_2026-10-26_10-36-27` in the project parent. Production Hosting run **40300945108**, main commit **f4425a2**, succeeded. No new paid service, advertising layout, billing or tax change was introduced by this release.

This report contains only release evidence and masked scheduling metadata. It contains no unpublished story or email content, destination reveal, record identifier, subscriber identity, credentials or private provider data.

## Production HTTP readback

**PASS** — Independent canonical HTTP GET checks against `https://dainyelonthemove.com` confirmed:

- All **21** covered public HTML routes return 200 and contain exactly one shared `privacy-consent.js` loader and one publisher account meta element. No retired `analytics-consent.js` loader or separate inline AdSense script tag remains on these routes.
- All **10** excluded routes behave as expected: administration, studio, dedicated forms, the explicit static error page and legacy/search redirects contain neither consent loader nor account meta. Redirect destinations are the expected public routes.
- `/ads.txt` contains exactly `google.com, pub-9073450763802389, DIRECT, f08c47fec0942fa0`.
- The known non-sensitive `/.github/reports/adsense-single-consent-2026-10-26.md` URL returns **404**, confirming report descendants are not hosted.
- The published `/assets/privacy-consent.js` is byte-for-byte equal to the reviewed local source.

The explicitly requested `/404` URL serves an existing static file and therefore returns 200. The hidden-report request separately verifies actual missing-resource 404 handling.

Evidence is stored outside Hosting and source control at `C:/Users/dainy/Documents/Codex/2026-10-26/adsense/production-readback.json`. Only route metadata and aggregate checks were retained; response bodies were not saved. Initial restricted-network DNS failures were resolved by authorised read-only network access and are not website failures. The generic `/entry` shell was checked without requesting any scheduled or unpublished entry identifier.

## AdSense account status and consent limits

**PASS** — After the code was live, the existing AdSense site was verified through its published account meta tag. The native provider UI then displayed **Getting ready / Review requested**. This establishes the site-review request, not Google approval or actual ad delivery.

External screenshot: `C:/Users/dainy/Documents/Codex/2026-10-26/adsense/live-site-review-requested.png`.

**PENDING** — In the canonical browser observation, the new Google choice window had not appeared. The CMP script was loaded and the Analytics tag was absent. This supports script publication and the observed absence of Analytics; it does not prove the full consent lifecycle. Native Consent / Do not consent / Manage options, reopening, revised choices, corresponding network behaviour and actual advertising remain unproven on the canonical site. Do not describe this release as complete native consent or legal compliance verification.

An additional forced Google Funding Choices preview also displayed no choice message. The cause is unknown; the observation does not establish a website defect, a provider configuration cause or a successful consent lifecycle. Analytics remained absent in that observation.

The previously published Google message and proportional owner-supplied logo remain the intended single advertising-and-Analytics consent interface. The old local Analytics popup has been retired in the released source. Technical Google requests for loading the standard AdSense/CMP service may occur before a choice; this is not a zero-network-before-consent design.

## Subscriber audience verification

**PASS** — Read-only Brevo UI inspection confirmed saved segment **1**, `Postcards — active subscribers`, with both conditions:

1. Email campaign subscription status is **Subscribed**.
2. Contact is a member of **Postcards from Dainyel**, list **3**.

The UI's last-edit value was **22 October, 09:59** and the saved delivery segment version matched. No filter, list, contact or provider setting was changed during this check. The website worker addresses this saved segment rather than storing an individual recipient snapshot.

Brevo documents automatic segment membership updates as contact data or qualifying contacts change. New active subscribers who meet both conditions join the selected audience for future campaigns. Exact provider recipient-evaluation timing and delivery to a particular inbox were not tested. People joining after an edition has already sent do not automatically receive that previous edition; Brevo offers a separate manual Send to new contacts action.

Free-plan limits still apply. The worker checks positive available credits but does not prove sufficient quota for every recipient. Brevo may suspend a campaign at the daily limit and require manual resumption. Audience selection is not an inbox-delivery guarantee.

## Scheduled email for 27 October

**PASS — approved reconnection completed and fully read back through the existing authenticated Firebase IAM connector.**

The initial masked production readback found the intended request queued for **27 October 2026 at 11:00 Europe/Amsterdam** (`10:00 UTC`). It used `after-publication` with pinned publication revision **2**, while the corresponding current reviewed website schedule was queued for the same time at revision **6**. It had no campaign ID. The worker's revision guard would have held that original request rather than dispatching against the changed publication.

After explicit owner approval to preserve the original email and time, the repair used the existing authenticated Firebase IAM connector with its existing permissions. No additional access, Rules, authentication or provider configuration was enabled. The original queued job was cancelled with its exact server update-time precondition and an update mask containing only `status` and `updatedAt`. Its original immutable payload and private draft/history were retained.

A single fixed new mail ID was used for create-if-absent creation of the replacement private draft at revision 1 and its exact `history/r1` recovery copy. The reviewed publication plan and delivery settings were rechecked. Only after cancellation of the original job was confirmed was the replacement job created with a create-if-absent precondition, `action:after-publication`, pinned publication revision **6**, all **seven original email fields unchanged**, and the **same 27 October 10:00 UTC / 11:00 Amsterdam** delivery time. No existing mail job was rewritten in place, deleted or duplicated before confirmed cancellation.

The complete post-action readback confirmed all **11** guards: `oldCancelled`, `oldPayloadUnchanged`, `newQueued`, `exactReplacement`, `exactOriginalMail`, `sameOriginalTime`, `draftMatches`, `recoveryMatches`, `currentReviewedPlan`, `onlyOneActiveJob` and `noProviderHandoff`. The replacement has no campaign ID or processing phase. Thus exactly one active linked request remains and the identified revision mismatch is repaired.

This was an authorised **IAM maintenance repair**, not the normal signed-owner browser transaction. It used current literal UTC audit timestamps; it did not use server timestamp transforms or demonstrate the client's Rules/TOTP enforcement. The owner's native MFA sign-in remained pending after the prior tab closed, but it did not block this separately authorised repair through the already authenticated connector. Do not describe this evidence as a completed end-to-end admin/MFA test. Database access rights and security boundaries were not relaxed.

No email, test email, campaign, workflow processing dispatch, immediate send or provider operation was triggered by the repair or its database readback. In the linked workflow, provider creation and sending occur only after the due time and successful matching website publication. Background schedules can be delayed; 11:00 is a no-earlier-than time rather than an exact-minute delivery promise. Future dispatch remains subject to the unchanged worker, publication, provider, quota and revision guards; queued readiness is not proof of a future send or inbox receipt.

**PASS — naturally scheduled worker observation:** the existing main-branch schedule ran without manual dispatch in run40344074749, created26October14:54:35UTC and completed14:55:12UTC. Job121646200645 and its processing step succeeded; its bounded completion message was read without exposing credentials or message content. A subsequent masked server read still showed the repaired request queued for the future, pinned6, with no campaign ID or processing phase. This independently confirms a current scheduled run and no early handoff. The five latest native schedule records contained multi-hour gaps, including approximately seven hours between the two most recent starts. Do not translate the configured ten-minute cron into an exact ten-minute service guarantee. No load, inbox or future due-time send was tested.

## Evidence boundaries and remaining actions

| Item | Status | Evidence or remaining action |
| --- | --- | --- |
| Reviewed website release | PASS | Production Hosting 40300945108 on f4425a2 |
| Public coverage and exclusions | PASS | Independent 21 covered / 10 excluded HTTP readback |
| Publisher authorisation and hidden reports | PASS | Exact ads.txt, matching shared script, report 404 |
| AdSense site-review request | PASS | Native UI Getting ready / Review requested |
| Google site approval and live ad delivery | PENDING | Provider review and subsequent real observation |
| Canonical native consent lifecycle | PENDING | Choice window not yet observed; accept/refuse/reopen not tested |
| Active subscriber audience | PASS | Segment 1 conditions and pinned version read back |
| Tomorrow's linked request readiness | PASS | Exactly one queued request; current reviewed revision 6, original payload and time; future guards still apply |
| Approved mail reconnection | PASS | Authenticated existing IAM connector; CAS cancellation, create-if-absent replacement and all 11 readback guards passed |
| Fresh owner browser/MFA lifecycle | NOT TESTED | Native sign-in remained pending; IAM maintenance does not establish client Rules/TOTP end-to-end acceptance |
| Actual campaign send and inbox receipt | NOT TESTED | Future event; no test or subscriber mail sent |

Current source references: `tools/site_ads.py`, `assets/privacy-consent.js`, `assets/postcard-desk.js`, `assets/publication-schedule.js`, `firestore.rules`, `.github/tools/postcard-delivery.py` and `.github/workflows/postcard-delivery.yml`. The mail worker queries only queued/processing jobs; after native provider handoff, Brevo is authoritative for subsequent campaign status. An admin Scheduled/Accepted label alone is not proof of sending or receipt.

Primary provider references:

- [Brevo: About segments](https://help.brevo.com/hc/en-us/articles/360021703959-About-segments)
- [Brevo: Send to new contacts and resume campaigns](https://help.brevo.com/hc/en-us/articles/4411394977810-Send-to-new-contacts-resume-duplicate-and-archive-email-campaigns)
- [Google: Funding Choices API](https://developers.google.com/funding-choices/fc-api-docs)

Rules, authentication, App Check, existing reminders, calendar integrations and provider security settings were not altered for this report. No subscriber identities or future content were included in the report or its HTTP evidence.
