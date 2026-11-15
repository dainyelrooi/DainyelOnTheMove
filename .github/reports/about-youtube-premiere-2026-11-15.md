# Personal About additions and YouTube premiere — 15 November 2026

## Scope and evidence

The owner supplied public video `LEf7TK9i_ow`, scheduled for tomorrow at13:00 Netherlands time, and requested a more personal About page using previously shared information. Work extends the pending AdSense staging candidate; neither that earlier candidate nor this addition has production approval. Backup `website_2026-11-15_17-34-43` retained. No mail, campaign/schedule change, new provider connection, account action, CMS write or location reveal.

Read-only native YouTube inspection confirms **I Went Shopping in Cusco… and THIS Happened 😂🇵🇪**, Dainyel's existing channel and the16November premiere. After localisation, the player shows07:00 in Peru: the same instant as13:00 Europe/Amsterdam,16November2026 (`2026-11-16T12:00:00Z`). No reminder was set, video edited, channel metric copied or account setting changed. No paid metadata tool was used.

## Implementation

- Add a separate named About section with two initially closed disclosures. Different ways to travel uses only the already-public Thailand/Bali exchanges, Thailand solo and Philippines-with-friends journeys. The camera roll & the reality uses the owner's already-public Cusco/Inca Trail story:3a.m. start,575 photos, waiting and cloudy sunrise. Links lead to those original stories. No new psychological claim, private health/family detail or future itinerary is invented.
- A shared, text-only premiere feature appears in the homepage Films section and the standalone Films page. It links directly to the exact supplied public YouTube video without the share tracking query. Date and timezone remain explicit and readable without JavaScript. No external thumbnail, player, third-party script, API request or autoplay is introduced.
- `youtube-feature.js` changes the reminder wording at the planned instant, without claiming actual provider publication/live status. After48hours the temporary highlight disappears, leaving the unchanged latest-public-upload/player system. Visibility/BFCache handling and bounded one-shot timers keep an already-open page current; no background job or service is needed. This does not alter YouTube's premiere or any website/email schedule.
- Keep the original latest-public-upload JSON/feed/thumbnail and hourly refresh workflow unchanged: a future premiere is distinct from an already-published upload. The owner's previous always-latest player remains available.
- Feature/About sections have independent authoring regions. All806 pre-existing editable field identities/defaults remain exact;16 new fields are added. No stored editor record, history or revision is rewritten. Composer/search/catalogues updated; the two pages share one feature partial.

## Verification

- PASS:78 focused Node checks, including Netherlands/Peru timezone mapping, the exact start/expiry boundary, safe malformed windows, an already-open page's reminder transition/expiry and event/timer cleanup, plus existing consent/rendering/reserve/reader checks.
- PASS:nine Python authoring/consent checks. The added authoring case reproduces the actual field-rekey hazard of an unnamed nested callout and proves the named feature section preserves existing controls.
- PASS:composer, whitespace and independent806-field comparison. No changes to existing defaults under their IDs;822 total fields.
- PENDING:actual staging Hosting/source readback and mobile/desktop acceptance. Production remains unchanged; no email or Google review request. The earlier AdSense candidate's approval remains pending, and Google approval is not promised by this personal content addition.

Review `/about#about-from-the-road`, `/#youtube-premiere` and `/videos#youtube-premiere` on the staging host. A separate production approval is needed before these can be live for the premiere.

## Actual staging acceptance

Source `8930e5ae3f3b4661b2a740b4f8224905ee652084` passed staging Hosting43770671989, isolated launch regression43770671977 and OneDrive backup43770672055. Independent readback confirmed six exact deployed runtime/style/catalogue files, one initial premiere feature per intended page, the exact video/time/timezone, new personal disclosures and original article link, stage noindex and report404. Production About does not contain this candidate and main remains21177c0.

Native checks at actually measured390/1280px confirmed the two About disclosures start closed, click/keyboard expansion works without horizontal overflow, and the solo-story link finishes at the original Thailand route with its correct story heading. Both homepage and Films show the intended reminder link and date; Films retains all four filters. No iframe exists inside the new feature and no optional Google provider tag appeared on staging. Mobile and desktop screenshots were saved and visually inspected; temporary viewport overrides were reset. The date-bound transitions are tested in the source clock test, not claimed as real YouTube publication or physical-device acceptance. No mail, provider/account action, remote content write or production activation was performed. This supersedes the pending actual-staging checks above; the combined candidate still awaits owner release approval.

## Owner-approved release

The owner subsequently approved the combined production release with “ga maar kive”. This supersedes the earlier pending-release boundaries for the reviewed About/premiere and AdSense bundle. Recovery branch `backup/about-adsense-pre-live-20261115` and backup `website_2026-11-15_17-54-10` are retained. Use the existing main Hosting workflow and actual production public-copy retention. Do not dispatch the full publication/email processor, edit provider schedules, activate ads or send mail. Actual production deployment/readback remains necessary before a success claim.

## Final production receipt

Approved source `36f1eb0170c9869bb39e349cad92483ba5d86d0c` passed production Hosting43771953592 and main CodeQL43771953727. Staging Hosting43771953612, regression43771953623 and source backup43771953614 also succeeded. The normal public-archive run43772209513 then succeeded and created0cd5fdc, retaining these runtime changes while adding the already-eligible public edition27 and refreshing the channel feed. That newer main commit was fast-forwarded and preserved before this documentation update; no archive letter or automated change was dropped.

Independent production readback, repeated after that archive refresh, confirmed eight exact runtime/style/catalogue files, three indexable canonical pages, both premiere features, the initial support link and both report404 exclusions. The two original article fingerprints, titles, dates, hero images and canonical URLs match the pre-release baseline; their new author/profile links and schema are present. Native390/1280px checks confirmed initially closed personal disclosures, keyboard/click expansion, no horizontal overflow on About/home/Films, the exact premiere date/link/reminder text, four film filters, the original solo-story navigation, and the Cusco article's11 chapters and working author-profile navigation. Temporary viewport overrides were reset. An initial cross-page check ran before navigation settled; its subsequent native state and completed navigation verified the actual page, without a source change.

The original AdSense remediation was completed with one native review request after production acceptance. Google now displays **Getting ready** and **Review requested**. A proof screenshot is retained in the owner's Codex workspace. This confirms receipt of a request, not approval or ad serving. Analytics-only mode stays active; no ad activation, payment/security/account-setting change, YouTube edit, newsletter/test email, production content write or Rules/Auth operation was performed by this release. Existing campaign/publication schedules remain intact.

### Separate existing operational limitation

Read-only background checks found failed scheduled-publication jobs both before this release (run43771886979 on21177c0) and afterwards (43772422399). Sanitised in-memory log classification confirmed HTTP429, including the publication/reconciliation path; it did not establish a specific daily-quota or authentication cause. The private calendar-reminder run43772178412 also failed. These are not failed Hosting/CI acceptance checks and were not repaired, disabled, rescheduled or manually processed in this UI release. No raw logs, credentials or private content were saved. Do not claim that all autonomous publication/reminder services passed this release's UI checks. The successful public-archive refresh is a distinct workflow.
