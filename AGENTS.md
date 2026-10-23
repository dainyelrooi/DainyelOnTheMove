# AGENTS.md — Persistent instructions for DainyelOnTheMove

These instructions apply to every future Codex session in this repository.

## Project identity

- Build and maintain **DainyelOnTheMove**, an English personal travel site with a cinematic, premium editorial tone.
- Preserve the brand line: **“Take the scenic route.”**
- Communicate with Dainyel in Dutch unless he requests another language.
- This is a static multi-page site: HTML, CSS and vanilla JavaScript. Do not introduce a framework, build system or dependency without a clear technical reason and user approval.

## Canonical workspace and Git flow

- The canonical local source is `C:\Users\dainy\OneDrive\DainyelOnTheMove website\website` and the GitHub remote is `dainyelrooi/DainyelOnTheMove`.
- Do not treat old Codex output folders as the source of truth.
- `staging` is the review branch and deploys the noindex Firebase staging site through GitHub Actions.
- `main` is production and deploys the live Firebase Hosting site through GitHub Actions.
- Never deploy to production or push/merge to `main` without explicit user approval for that release. A request such as “ga live” is approval for the reviewed current change only.
- Before editing the local OneDrive source, run `tools/Create-SiteBackup.ps1` with a useful reason. Do not delete or overwrite backups.
- When running in a Cloud workspace without OneDrive access, do not pretend that a OneDrive backup exists. Preserve Git history and tell the user that the local backup step could not run.

## Content and product integrity

- Use only real journeys, dates, locations, images, videos and facts supplied by Dainyel. Ask when key content is missing; never fill gaps with invented travel facts, fake Q&A, fictional visitor activity, made-up metrics or placeholder claims presented as real.
- The upcoming trip is a surprise: publicly use only "Trip to Latin America" and the confirmed departure (28 October 2026, 00:00 Europe/Amsterdam). Never put unannounced places, stop counts, travel duration or route plans in source, metadata, documentation or commits. data/trip.json contains only revealedStops and an optional manually shared broad currentLocation; the visited archive stays separate. Never invent a reveal.
- Do not publish exact device/GPS location. Current-location features may store/show only a broad city and country after Dainyel chooses to share it.
- Preserve existing stories, destinations, working social embeds and public routes unless removal is explicitly requested.
- Collaboration contact is Instagram only until Dainyel supplies a public email address. Keep the creator profile free of audience/reach figures until he supplies numbers approved for publication. The contact form prepares a local message; it does not send it.
- Keep public website copy in English. Preserve the user’s voice when editing supplied writing.
- The supplied full Philippines story is prepared for staging review as of 23 October 2026. Production publication of this article still requires owner approval.
- Do not reintroduce AI/Gemini moderation or paid moderation services. That direction was deliberately cancelled because of cost.

## Design, UX and accessibility

- On 14 October 2026 Dainyel approved the new Cinematic Explorer palette for the phased redesign: navy #0C1B25, deep teal #133C43, coral #FF7D5F, golden sand #E9B96E, warm sand #F4EADD, ivory #FDF9F2. Coral is a surface with navy text; never use coral for small text on light backgrounds. Keep legacy sections working during the phased transition.
- Avoid overcrowding the home page. Each section needs one clear primary action.
- Preserve responsive layout, keyboard access, visible focus styles, semantic controls, contrast and `prefers-reduced-motion` behaviour.
- Keep video autoplay muted, looped and only when in view; pause outside the viewport and respect reduced motion. On 15 October 2026 the owner explicitly requested removal of every visible background play/pause button. Do not reintroduce those controls without asking. Keep native controls on foreground films. Never autoplay sound; do not claim complete WCAG conformance for control-free background motion.
- Optimise images/videos and lazy load off-screen media. Do not claim performance or accessibility scores unless actually measured.

## Firebase, privacy and security

- For Firebase work, first read the relevant Firebase skill: Hosting for hosting/deploy/domain work, Auth for sign-in, Firestore for data/rules/indexes, and the rules-auditor skill for a security review.
- Use the existing Firebase project and targets in `.firebaserc`; do not create a new Firebase project, database or Hosting site.
- Firebase client configuration in `js/firebase.js` contains public browser identifiers by design. Do not duplicate its key values in docs, messages, commits or new files.
- Never place passwords, service-account JSON, reCAPTCHA secrets, recovery codes, API keys, access tokens or personal private notes in source control, Markdown, logs or prompts.
- Never inspect, publish, copy or commit `private/`. It is intentionally gitignored.
- Firestore’s moderation model is a security boundary: public submissions must remain `pending`; only the verified owner can publish, edit moderation state or access Field Notes data.
- If Firestore fields, queries or permissions change, update the client code, `firestore.rules` and `firestore.indexes.json` together as needed, then test the real affected user flow on staging.
- Do not deploy Firestore/Auth configuration remotely without user authorisation for that release.
- Do not add email sending, visitor tracking or analytics without explicit consent/privacy design and a user request.

## SEO and public routes

- Keep `dainyelonthemove.com` as the canonical production domain.
- Keep internal search `noindex` and out of the public sitemap.
- Keep `/admin.html` and `/studio` non-indexed and protected by headers/robots configuration.
- For every new public indexable page, add a unique title, meta description, canonical URL, social metadata and a sitemap entry. Do not add private/admin pages to the sitemap.
- Retain the existing `robots.txt` restrictions and update only when required by a reviewed routing change.

## Implementation and release routine

- Phase 1b uses `.github/templates/header.html` and `footer.html` as the shared shell, page sources in `.github/templates/pages/`, and panel partials alongside them. Edit those sources, then run `python tools/Compose-Site.py` to refresh the committed root HTML and CSS/JS version queries. The composer uses only Python's standard library and is an authoring tool, not a deployment build dependency. Do not edit generated root HTML independently.
- `assets/design-system.css` is the common token/layout layer. Preserve hash routes, focus return, browser history, no-JavaScript fallbacks and click-to-load external players when modifying panels. Keep remote Firebase services lazy and preserve the existing submission contracts.
- Hosting must explicitly exclude hidden-directory descendants (`**/.*/**`, `.github/**`, `.git/**`, `.firebase/**`, `.devcontainer/**`) in both targets, alongside the existing `private/**`, docs and tooling exclusions. The earlier `**/.*` alone did not prevent report descendants from being hosted. After a release, verify a known non-sensitive `.github/reports/` URL returns 404; never inspect `private/` to test exclusion.

1. Inspect the relevant existing files before editing.
2. Make the smallest coherent change that preserves current working behaviour.
3. Create the required pre-change backup in the local workspace.
4. Run focused, non-destructive checks appropriate to the request (for example syntax/reference checks or a requested visual check). Do not invent a broad test suite for a small content edit.
5. Report changed files, what was verified and any limitations.
6. Develop each redesign phase on its own branch and publish to `staging` for review. The supplied 14 October brief requires approval between phases. Phase 0 audit and urgent phase 1a come first; do not silently mark the entire redesign complete.
7. Deploy production only after explicit approval; verify the live canonical URL afterwards.

## Known pending priorities

- Verify real owner sign-in, App Check/Auth configuration and community-reply moderation on staging.
- Review the supplied full Philippines journal and chapter media on staging; production remains subject to approval for this article.
- Postcards uses the owner’s free Brevo account and provider-hosted single opt-in with a welcome email (owner-approved 17 October 2026); website-triggered question notifications are a separate feature.
- Email setup evidence and remaining checks are in `.github/reports/field-notes-email-activation.md`. The owner confirmed receipt of both the double-opt-in confirmation and welcome email on 15 October 2026. Never treat legacy Firestore `subscribed` as verified email, silently import/contact the stored list, or claim unsubscribe/reply delivery was tested when it was not. Retention remains owner-managed; there is no automatic purge. The owner approved public identity only as Dainyel and privacy contact support@dainyelonthemove.com; do not infer permission for a surname or private address.
- Use Google Search Console and measured performance checks before claiming SEO ranking or Core Web Vitals success.

## Phase 2 authoring notes

- Phases 1b, 2, 3 and 4 are approved. On 15 October 2026 Dainyel explicitly approved production publication of this completed phased release after the final checks. This approval applies to this release only; future changes still need staging review and explicit release approval.
- Preserve gallery hash history, native dialog focus/keyboard access, no-JavaScript photographs and reduced-motion behaviour when changing `assets/photo-gallery.js` or `assets/motion.js`. Content must never depend on an animation finishing.
- Run `python tools/Validate-PublicTrip.py` for public trip feed edits. Coordinates, if used, are manually approved approximate centres rounded to at most one decimal. The validator cannot authorise public reveals. Do not put example itineraries or test fixtures into the public feed or repository.
- Creator profile printing uses the existing panel. No made-up metrics, endorsements or public email addresses.

## Phase 3 authoring notes

- Article templates load `assets/story-editorial.css` and use `data-reading-body`, `data-reading-toc` and `data-story`. Preserve the active chapter, fragment/focus behaviour, article progress and shared next-story component. Reading time is approximate at 200 words/minute; never invent publication dates.
- `assets/question-postcards.css` styles the existing Q&A renderer. Keep answers expanded initially and retain search, filters, one/two/three-card pagination, explicit rotation controls, quiet automatic updates and reduced-motion/reading-focus safeguards. Rendering changes must not alter queries, consent or pending moderation contracts.

## Phase 4 authoring notes

- `assets/contour-lines.svg` is abstract decoration, never a map or itinerary. `assets/film-grain.svg` is a tiny static tile. Keep their use limited to selected dark surfaces; reading areas stay plain. The post-load motion module enables textures at idle on individual `data-detail-surface` nodes; they are optional without JavaScript and must not compete with initial reading content. Do not use inherited root variables for late decoration; this caused unnecessary style recalculation across article DOM. Hide decoration for forced colours, increased contrast and print. Do not add animated noise or full-screen SVG filters.
- The pointer detail in `assets/motion.js` moves only the existing film play cue by at most seven pixels. Preserve the native cursor. Enable it only for a fine hover pointer without reduced motion or forced colours; clean up on leave, cancellation, focus, hidden tab and preference changes. Never attach a page-wide pointer loop, make hover necessary, or move form controls/text.
- Keep shared scroll updates coalesced into animation frames. At scroll position zero, article progress is zero without measuring the full article; read layout before changing compact-header styles. Preserve real chapter/progress behaviour when optimising startup.
- Bali's mobile masthead uses its own 4:3 WebP derivatives through `<picture>` and matching media-specific preloads. Preserve the original desktop and gallery sources, photo content/alt text and source-selection agreement; avoid downloading both hero sources.

## Video playback maintenance

- Opening a film card is the play gesture: `site-ui.js` calls `siteVideoControl.playPanel(panel)` synchronously while handling that click/keyboard activation. Start the muted film immediately, including data saver/reduced motion because the visitor explicitly chose this film. Background/unsolicited video still honours those preferences. Keep an accessible fallback start/retry if the browser rejects playback; empty native controls cannot start an unassigned source. Restore native controls once the source exists.
- Handle single-source request failures on the `<source>` error event as well as the video error event; provide a retry/direct-file action. Ignore expected autoplay veto/abort failures and retain a manual start. Verify actual decoded frame/time progression, not just a visible modal or assigned source.
- The original supplied 3840×2160 source was subsequently found outside the web source folder. The homepage now uses 10-second silent H.264/30fps fast-start derivatives: `hero-travel-desktop-1080.mp4` (1920×1080, about 7.40 MB) and `hero-travel-mobile-1080.mp4` (1080×1920 centre crop, about 5.66 MB). `data-src-mobile` is selected once on hydration at viewport widths up to 700px, so only one video source downloads. Preserve the old derivatives; never upscale and call that a quality improvement. Keep poster-first loading, viewport pause and reveal only on `playing`. The homepage film has no artificial grain; its readable gradient remains.

## Legacy route and mobile hero repairs

- All nine retired page names redirect at Hosting level with HTTP301 on both targets, covering `.html`, extensionless and trailing-slash forms. Journey always goes directly to `/#next-chapter`. The file fallbacks contain only a safe noindex handoff and meta refresh; never restore route details there. Keep retired pages out of the sitemap and preserve `/studio`'s protected rewrite.
- On 15 October 2026 an exact-URL temporary removal of `/journey.html` was submitted through the owner's existing URL-prefix Search Console property. Status was processing, not completed. The permanent server redirect remains the durable change. Do not request removal of the homepage or an entire-site prefix.
- Background videos now start muted/in-view even with data saver; explicit reduced-motion still shows a poster without automatic download/play. This is the owner's requested button-free presentation. Foreground lazy films retain their deliberate gesture and retry/native controls.
- The Philippines preview hero is a single-column grid with shared mobile gutters; do not let a control become a flex sibling that shrinks the text column. It has a separate poster image beneath the video so reduced motion or a browser autoplay block does not create an empty header.

## Postcards email setup

- The owner selected `postcards@dainyelonthemove.com` for updates/confirmation mail, display name `Dainyel on the Move`, newsletter `Postcards from Dainyel`, and `support@dainyelonthemove.com` for support/privacy. Collaboration remains Instagram-only. Do not publish a private profile name/address without explicit approval.
- Brevo domain/sender verification, the saved CAPTCHA-protected hosted form and confirmation/welcome templates were completed on 15 October 2026. The owner confirmed receipt of both emails. New sign-ups use the isolated same-origin postcards-form.html embedding official Brevo HTML, with a hosted-form fallback, not a second Firestore signup. The embed contains only an intentional public CAPTCHA site key, never its secret. The admin retains earlier private registrations and links to Brevo; do not create duplicate forms/lists/templates or import old registrations.
- Dedicated reCAPTCHA keys were entered directly by the owner and saved in Brevo. Never inspect populated secret-key fields or put their values in tool outputs, chat, source or reports. Do not reuse the website’s App Check credentials for this form.
- On 15 October 2026 the owner approved production release of inline Postcards signup and consent-controlled Analytics after staging checks. Support forwarding, replies, unsubscribe and optional email tracking still need verification; do not claim legal completeness or delivery of campaigns from the two-email owner test alone.

## Analytics consent

- The owner requested GA4 G-EYLP0YYJMJ on 15 October 2026. Preserve basic consent in assets/analytics-consent.js: no Google tag before acceptance, equal accept/reject choices and footer settings, advertising consent denied and signals/personalisation disabled. No email, question/account content, URL queries/arbitrary fragments in configured analytics events. Fixed public route names are allowlisted for separate page views. Measurement is production-only and excludes private admin, sign-up frame and redirects. Public search/error views are sanitised; never send search text or unknown error paths. Consent and cookie lifetime is six months; account retention remains unverified.

## Compact Postcards signup

- Keep homepage Follow the trip collapsed by default using native details/summary. Load the embedded form only on first expansion; retain its single opt-in with welcome email, explicit consent, CAPTCHA, direct fallback and source/origin-checked resize. Keep the hosted-form fallback usable without JavaScript.
- The owner asked about removing Analytics consent. No removal has been approved as privacy-compliant; inspect actual account/data-sharing configuration before asserting that the limited-analytics exception applies. Do not promise complete measurement of all visitors.

- The owner chose extended Analytics WITH consent after discussing the limited-analytics alternative, and reports accepting the Data Processing Terms on 15 October 2026. The site dispatches site:route-view events on supported route changes; analytics-consent.js sends deduplicated page_view events only for consented production visits. The stream’s automatic browser-history page-view option was disabled to avoid duplicate manual route views; keep normal page loads. Automatic site-search query collection was also disabled so arbitrary URL search terms are not collected. Scroll/outbound/form/video/download enhancements remain enabled.

## New-content publication and Postcards mail — standing owner instruction, 16 October 2026

- The owner explicitly requests one approval for both publication and the accompanying subscriber email. When the owner approves going live with a new blog, Field Note, or visitor-facing photo/gallery update prepared by Codex, that approval ALSO authorises sending its corresponding Postcards newsletter to the consented, active subscribers of the existing Brevo Postcards from Dainyel list. Do not ask for a second mail approval. Honour an explicit exception such as “do not email this update”.
- This is an agent-assisted publishing workflow: prepare the newsletter as part of the release, publish the approved content, verify its canonical live URL and media, then send through the existing Brevo account. No automatic backend/webhook/cron publication-to-email trigger is currently installed. Do not claim that changes made outside this workflow independently send mail.
- Prepare the newsletter BEFORE requesting release approval, and include a reviewable subject, short English preview, one representative approved photo when useful, and a link/button to the actual new content. Retain the Postcards brand, postcards@ sender, required sender identity and working unsubscribe link. Use only the approved public material; do not reveal unpublished routes, private location details, draft text or other unreleased content.
- Send at most one coherent email per approved content release/batch. A group of photos gets one update, not one email per photo. Do not send newsletters for staging, design/SEO/code fixes, spelling corrections, deployment retries, rollbacks or unchanged content. For mixed releases, describe only the newly published visitor content.
- Use only consented and still-subscribed Brevo recipients: existing confirmed contacts or future single-opt-in subscribers through the owner-approved form. Never import or contact the unverified legacy Firestore interest records, pending confirmation contacts or opted-out addresses. Do not expose recipient addresses in docs or public pages.
- Before sending, inspect Brevo campaign status and existing release records to avoid duplicates. Record the approved content/release identifier, canonical URL, campaign ID and actual queued/sent/failed state in a private-to-Hosting repository report, without recipient data or secrets. A queued campaign is not proof of delivery. On a retry, resume/check the existing campaign instead of recreating and resending it.
- Respect the account's actual free sending limits. Do not enable paid upgrades or create new credentials. If access, sender verification, quota, provider review or delivery blocks sending, report the specific unsent/queued state to the owner; do not claim completion or send duplicates. Preserve any successful website publication.
- This standing instruction does not itself authorise an unrelated production deployment or a newsletter now. It applies when the owner approves a future new-content release; production approval remains necessary.

## Private question mail setup

- The owner requested and explicitly approved activation of automatic owner emails for new questions on 16 October 2026. Initialization and verification mail succeeded; Gmail receipt under Website was independently confirmed, and QUESTION_NOTIFICATIONS_ENABLED=true is enabled. A complete real visitor submission-to-alert exercise is not yet verified. Source: .github/tools/question-notifications.py and .github/workflows/question-notifications.yml; setup/state is described in .github/reports/question-notification-setup.md. Preserve the enabled configuration and recorded verification; do not claim a complete visitor-flow test or successful scheduled execution without evidence.
- Existing Enterprise/Native dainyel-content database and status/createdAt indexes are reused. Check mode is read-only. IAM-only _automation/questionEmail contains private cursor/outbox state; never expose it via browser rules or public logs. No question content or nickname is sent in mail; only counts and the admin link.
- BREVO_API_KEY and QUESTION_NOTIFY_TO belong in GitHub Actions secrets, entered directly by the owner. Never inspect populated key fields, request secret values in chat, or add them to source. The existing Firebase service-account secret must not be replaced. Only explicitly approved initialization/sending/activation may mutate remote state or send mail.
- Start with future questions at initialization; preserve deduplication and the 25-minute uncertain-send hold. Do not reset/replay cursors or blindly retry an ambiguous send. The ten-minute schedule may be delayed or disabled after GitHub inactivity; never promise instantaneous alerts. This is separate from the agent-assisted Postcards publication workflow.


## Standalone public pages — staging review, 16 October 2026

- Eight ordinary pages now reuse shared fragments: about.html, videos.html, atlas.html, journey.html, qa.html, my-kit.html, collaborate.html and field-notes.html. Source templates use {{fragment:file.html#id}} through Compose-Site.py. Edit the original shared partial, then compose; do not duplicate its content manually.
- This change is on staging only, pending release approval. It supersedes the old routing design upon approved publication: about/videos/journey/qa/my-kit/collaborate become HTTP 200 pages; destinations aliases go to atlas.html, updates aliases go to field-notes.html, and blog aliases retain stories.html. Never restore the old journey itinerary. Journey contains only approved public reveals.
- Homepage navigation keeps interactive panels with real document href fallbacks; Ctrl/Cmd-click and opening in a new tab reach ordinary pages. Panel players must live outside main so main.inert does not disable their controls. Preserve keyboard focus, Escape and browser history. Standalone Q&A initializes the same moderated Firebase services; no backend collection/rule/index changes are part of this release.
- Owner approved Instagram AND support@dainyelonthemove.com as public collaboration contact. collaborations@dainyelonthemove.com was suggested but is not confirmed configured: do not publish it as a working address yet.
- GA account retention was inspected: event data 2 months, user data 14 months, reset on new user activity enabled. No account settings were changed. Staging privacy text now reflects those observed settings. Existing consent remains required; staging and private admin remain unmeasured.
- Owner chose to retain GitHub scheduling despite delays. A real personal-question alert was accepted and received under Gmail Website at 02:39 Europe/Amsterdam on 16 October. Scheduled execution may lag hours. A subsequent manual scan found no unnotified personal/community questions. Do not claim a successful community submission-to-email test or ten-minute delivery guarantee.
- Audit priorities/checks and remaining owner-dependent/optional work are recorded in .github/reports/standalone-pages-audit.md. No fabricated dates, reviews, latest posts, new trip reveals, reach figures or visitor activity.

## Postcards unsubscribe follow-up — 16 October 2026

- Brevo automation #1, Postcards - honour newsletter opt-outs, is active: transactional unsubscribe events filtered to Postcards templates #5/#6 blocklist Email campaigns only; re-entry enabled. Preserve the narrow template scope so operator question alerts remain independent.
- A real owner-authorised unsubscribe exposed separate campaign/transactional suppression. The owner's newsletter status was manually set to Blocklisted; transactional status and existing Postcards sender permission remain enabled. Do not silently resubscribe marketing or block authorised operator alerts.
- The owner deferred fresh signup/CAPTCHA/DOI needed to test the new automation end to end. Active configuration is not proof of a successful workflow execution. See .github/reports/mobile-postcards-validation.md; never store subscriber addresses or unsubscribe tokens in reports.
- Responsive browser checks passed at measured 305/375/753px content widths. No physical-device or Core Web Vitals claim follows from browser emulation.

## Official release approval — 16 October 2026

- Owner explicitly approved production publication of the standalone-pages release after final important fixes and site checks. This supersedes the staging-only restriction above for this release only. Evidence: .github/reports/official-release-2026-10-16.md.
- Error-page assets must resolve from the root for nested missing paths; preserve composer asset fingerprints and the search no-JavaScript collection links. All sitemap documents include appropriate parseable structured data.
- The deferred fresh Postcards signup/unsubscribe test remains pending by owner choice; publication does not establish its success. No new travel content is released in this maintenance batch, so do not send a subscriber campaign.

## Brand SEO and YouTube — 16 October 2026

- Public display brand is Dainyel on the Move; preserve DainyelOnTheMove as the joined alternate and existing YouTube handle. Existing channel ID is unchanged. A factual description, website/Instagram/TikTok links and concise relevant channel keywords were saved. No new public video was uploaded; channel discovery cannot be guaranteed by metadata alone.
- tools/site_seo.py is the current public metadata/breadcrumb authoring layer invoked by Compose-Site.py. Do not run the legacy Apply-SeoMetadata.mjs over generated pages: it predates standalone routes. Never restore old redirects or invent dates/reviews/FAQ/video eligibility for SEO.
- Search Console direct URL Inspection confirmed the live homepage indexed; the broad Pages report was stale. Existing sitemap was resubmitted and a homepage crawl request accepted. Do not conflate submitted, crawled, indexed and ranked states.
- Owner explicitly approved publication of this SEO website batch after staging review on 16 October 2026. This approval is limited to this release. Report: .github/reports/seo-brand-discoverability-2026-10-16.md. No paid research/ads or subscriber campaign is authorised for SEO maintenance.

## Postcards direct signup — owner instruction, 17 October 2026

- The owner explicitly approved removing the mandatory email-confirmation click. The existing Brevo form now uses Simple confirmation email with existing template #6, Postcards — welcome; list #3 and the form endpoint are unchanged. This is immediate single opt-in, not a second registration system. Preserve required consent, CAPTCHA, unsubscribe and the existing opt-out automation. Never restore mandatory double opt-in without owner approval.
- This applies to new form submissions. Do not bulk-convert old pending contacts, import legacy Firebase records, or silently resubscribe opted-out addresses. Campaign eligibility still requires an active Email campaigns subscription. Historical DOI setup/test reports describe the earlier flow and do not establish current single-opt-in mail delivery.
- Public success/help/privacy copy must say signup is immediate and the welcome email requires no click. Source report: .github/reports/postcards-direct-signup-2026-10-17.md.

## Weekly Postcards travel facts — owner instruction, 19 October 2026

- The owner requested recurring English newsletters with interesting facts about places he has visited and links to relevant existing blogs/pages, beginning with the first destination reveal from 28 October 2026. He selected once per week on Wednesday; the offered time was 12:00 Europe/Amsterdam.
- Codex chat automation `wekelijkse-postcards-met-reisweetjes` remains PAUSED to avoid duplicate sends. On 19 October 2026 the owner approved the two reviewed Brevo drafts; campaigns #8 and #9 are now Scheduled in Brevo for 28 October and 4 November 2026 respectively, at 12:00 Europe/Amsterdam. Do not recreate or resend them. Future weekly editions after these two are not yet prepared or scheduled.
- This explicitly authorises the weekly factual newsletter to active, consented subscribers of existing Brevo list 3; no separate approval per factual edition is needed within this scope. It does not authorise website releases, new route reveals, old-contact imports, resubscriptions or paid upgrades. Use 2–3 source-checked facts, English editorial copy, existing approved photos if useful, and a relevant live canonical link. Never invent personal experiences or claim email receipt from a queued status.
- Coordinate with the separate new-content release newsletter workflow: inspect campaign history and the weekly ledger first, avoid duplicate facts/campaigns, and combine with a planned publication mail where appropriate instead of sending two emails on the same day. Honour all opt-outs and provider limits.
- The first two approved editions are scheduled natively in Brevo and do not require the local computer or Codex allowance at sending time. This does not establish an indefinite provider-side recurring authoring system. Keep the old local sender paused. See .github/reports/weekly-postcards-2026-10-19.md for actual edition status and limitations; Scheduled is not Sent or Delivered.
- The owner prefers provider-side scheduling independent of the local computer and Codex allowance. Existing Brevo campaigns #8 and #9 were explicitly approved and scheduled on 19 October 2026. Editable HTML and previews remain outside the web repository in the sibling newsletter-drafts folder; unpublished travel details must remain out of website source, reports and Git. Preserve list 3 with Email campaigns subscriptions = Subscribed, the verified Postcards sender and normal opt-outs.

## Weekly content reminder — 19 October 2026

- Owner explicitly requested reminders through email or his calendar instead of Codex. A private Google Calendar event, Fotos en reisnotitie voor de website, was saved on 19 October 2026: Tuesdays at 10:00-10:15 Europe/Amsterdam, beginning 20 October 2026, recurring weekly with an email reminder when the event starts. Availability is Free and there are no guests. The former Codex heartbeat foto-s-en-reisnotitie-aanleveren is PAUSED; do not reactivate it or create duplicate reminders. Google Calendar owns this reminder; it does not depend on Codex or the local computer. Actual reminder-email receipt has not yet been observed. This reminder does not authorise publishing, subscriber sends or private route reveals.
- New Postcards signup copy explicitly mentions weekly destination facts, alongside occasional stories, films and updates. Preserve required consent, CAPTCHA, immediate single opt-in, opt-outs and privacy links. The existing Brevo hosted form has matching copy.
- The supplied El Nido film already appears on the live Philippines page at #el-nido with mobile/desktop derivatives. Do not duplicate the section or resend campaign #7 for the same video.

## Weekly Postcards copy release approval - 19 October 2026

- The owner explicitly approved production publication of the reviewed weekly Postcards signup copy on 19 October 2026. This is a wording/privacy consistency release, not new travel content; no extra subscriber campaign is authorised for it. Preserve the two existing scheduled Brevo editions and private trip details.

## Homepage and navigation refresh - owner instruction, 19 October 2026

- The owner explicitly changed the older compact-signup preference: Postcards is now a directly visible postcard-style form on Home and Journey, with decorative stamp/postmark. Preserve the existing required consent, provider endpoint, CAPTCHA, immediate signup, privacy/fallback links and origin/source-checked frame sizing. Do not restore the collapsed plus control without asking.
- Remove the creator profile Print/save action everywhere and remove countdown pause/resume controls. The clock remains based on the approved departure instant, pauses its interval only while the document is hidden and resynchronises from real time. The departure badge computes remaining days; never hard-code an audit's stale day count.
- The owner specifically requested a muted looping homepage hero WITH a pause button. This supersedes the earlier control-free rule for the homepage hero only. Other background videos retain their existing presentation. The hero now uses a silent, title-free 5.5-second excerpt from road-moments-web.mp4, keeping its actual 960x540 source resolution without upscaling; older higher-resolution hero files remain available. Never represent this excerpt as a quality upgrade.
- The mini-atlas uses the already-published archive of 16 past places, loaded near view, with a keyboard-accessible dropdown and links to existing stories. It shares the same archive/outline modules as the full atlas. Do not add an upcoming route or reveal.
- The countdown decoration is a neutral, boundary-free mainland Latin America silhouette using existing Natural Earth geometry, not an itinerary. Its pulse runs for two short cycles on entering view and is disabled for reduced motion. No new trip data was published.
- Film cards use silent, local three-second derivatives on mouse/keyboard focus or in view on touch. Stop outside view, when a film opens, on hidden tab, reduced motion or data saver. YouTube/Instagram retain click-to-load consent; do not add unsolicited third-party previews.
- Shared navigation keeps Stories, Films, Atlas and About primary, with other existing pages under More and a visible departure link. Desktop links stay visible while scrolling; smaller widths use an explicit menu control. This refresh is staging only pending separate release approval.


## Homepage and Thailand production approval — 19 October 2026

- The owner explicitly approved the reviewed staging release with “ga live” after the Thailand slideshow revision. The homepage/navigation refresh and Thailand journal/photo slideshows were published to production from b252e8a; the earlier staging-only restriction is superseded for this release only.
- Thailand now uses five opt-in manual chapter slideshows with all 26 gallery photographs, including 12 new owner-supplied photos. Preserve existing photo fragments, native enlarged dialog, keyboard/focus behaviour, no-JavaScript/print fallback, and the absence of timed slide advance. Raw Polarsteps exports and GPS tracks remain outside source/Hosting.
- Companion Postcards campaign #10, Postcards — Thailand photo journal — 2026-10-19 — b252e8a, was submitted once using Send now after canonical live verification. Existing list 3 plus Email campaigns subscriptions = Subscribed were confirmed. On 20 October, Brevo confirmed Sent on 19 October at 19:33, superseding its earlier Scheduled/Running states. Do not duplicate or resend; individual inbox receipt has not been confirmed. See .github/reports/thailand-live-release-2026-10-19.md for latest observed state. Campaigns #8 and #9 remain scheduled and unchanged.


## Collapsible Postcards correction - owner instruction, 20 October 2026

- The owner explicitly requested restoring click-to-expand/fold for the Postcards signup after the homepage refresh. This supersedes the 19 October always-open form preference. Retain the postcard appearance and use a native details/summary, closed initially, on Home and Journey.
- Keep the form iframe inside the details body. assets/postcards-frame.js already defers its source until first expansion; retain its source/origin sizing checks and do not reset entered form data when folding. Preserve the existing provider form, required consent, CAPTCHA, immediate single opt-in, privacy and fallback link. No subscriber email for this presentation correction.
- This correction is staged for review; it does not change the production approval of the earlier homepage/Thailand release.


## Compact banners and photo controls - owner request, 20 October 2026

- The owner requested less empty space in page banners and photo galleries. Thailand slideshow previous/next arrows and counter now overlay the image stage; keep the short caption below and the enlargement control accessible. Preserve all 26 photos, original framing/contain, keyboard focus, swipe, enlarged-dialog hash history and no timed advance.
- Public title banners omit empty share-status layout space; status text still appears when populated. Home/article spacing and the nested kit banner use more compact padding without hiding content. This correction and the collapsible signup are on staging only, pending release approval.


## Performance release approval - owner instruction, 20 October 2026

- The owner explicitly requested PageSpeed performance improvements, direct live publication and NO subscriber email. The pending collapsed Postcards and compact-spacing corrections plus mobile hero derivative were published from 5636cfe. Earlier staging-only notes are superseded for this reviewed release only.
- Measured canonical Google PSI mobile performance improved from the owner's 58 to 96 on 20 October at 05:46 CEST; Accessibility 96, Best Practices/SEO 100. This is an observed lab run, not a permanent score guarantee. Evidence and exact report URL: .github/reports/performance-2026-10-20.md.
- Preserve lazy signup hydration: the iframe must remain without src until explicit expansion, keeping initial Brevo/CAPTCHA requests absent. CAPTCHA and required consent remain intact once the form opens. No test-specific behaviour or automatic consent acceptance.
- Homepage background keeps the original 960x540 desktop source and uses hero-road-mobile-640.mp4 below 700px (640x360, silent, fast-start, 358295 bytes). Keep existing pause/resume, visibility and reduced-motion behaviour. No newsletter was sent for this design/performance batch; scheduled campaigns remain unchanged.

## Departure countdown synchronisation — staging, 20 October 2026

- The owner requested staging-only correction of the navigation badge showing eight days while the detailed clock showed seven. Keep whole remaining days rounded down, matching the detailed clock; never restore upward rounding.
- Home and Journey pass the exact departure/remaining-time snapshot from journey-summary.js to window.siteDepartureBadge in site-ui.js. Other pages use a one-second visibility-aware badge fallback with browser-cache restoration. Before departure with less than one full day, show “Departing in <1 day”; only show the journey-underway state at the actual departure instant.
- This maintenance correction is deployed on staging only and does not authorise a production release or subscriber email. Report: .github/reports/countdown-sync-2026-10-20.md.


## Local journey experience implementation (20 October 2026)

- The owner’s implementation document supersedes earlier between-phase approvals: all available phases are implemented locally; public staging/production release requires explicit final approval. Current branch: feature/journey-experience. Do not push staging/main, enable the service, or deploy configuration as routine maintenance.
- Public archive source: data/journey.json. Compose-Site.py validates and generates the old travel-data adapter, shared Field Notes cards, seven archive/passport/cost routes, metadata/search projection and sitemap entries. Do not hand-edit generated root pages or generated archive templates. Trip configuration remains data/trip.json.
- Shared journey-status.js handles header and home together. A planned date reaching zero never proves departure. Confirmed departure and calendar travel days are separate, using the reporting timezone.
- Existing private fieldNotes contains subscriber registrations; never reuse it for journal posts. New server collections stay denied to direct browser access by existing Rules.
- .github/server is optional, excluded authoring/runtime source. It is disabled and undeployed. Its locked Firebase Admin SDK is server-only. No credentials or private test recipient may enter public JSON or reports. Direct contact, mobile content persistence, new challenge submission and database integration remain blocked on an approved configured runtime and provider verification; do not claim real delivery or actual Firebase integration tests from mocked tests.
- New contact UI reports unavailable/error honestly; it no longer claims a copied local message was sent. The existing Brevo signup remains collapsed and unchanged. No newsletter campaign is authorized by this maintenance request.
- Node unit/HTTP tests are in .github/tests (isolated fixtures only). Static checks: python tools/Check-Journey.py and python tools/Validate-PublicTrip.py. Details and blockers: .github/reports/journey-implementation-2026-10-20.md and journey-owner-guide.md.

## Journey experience staging approval — 21 October 2026

- The owner explicitly approved publishing the complete reviewed local journey experience to the public test environment. This supersedes the local-only restriction for this staging release only; production remains unapproved.
- Deploy Hosting target staging only. Keep data/services.json journeyApi false; do not deploy or enable the new backend, Firestore indexes/rules, Auth settings or billing as part of this release. Contact sending, new challenge submissions and mobile content persistence remain honestly unavailable pending their approved runtime/provider integration.
- No test email or subscriber campaign is part of this staging release. Preserve the existing scheduled Postcards editions and question-notification setup.

## Owner correction and production approval — 21 October 2026

- The owner rejected the digital passport and new atlas search/replay filters and asked to retain the previous atlas presentation, then go live. Remove passport routes, links, browser module/storage feature and search/sitemap entries; do not reintroduce the replay/year/trip/content controls. Keep the existing atlas, destination selection, older map layers, zoom and approved public stories/photos.
- This explicitly authorises production publication of the reviewed journey frontend with that correction. New server features remain disabled; no backend/Auth/Rules/index or billing deployment is included. The Q&A listener must retain its older indexed-query fallback until the separate answeredAt index is available.
- The owner explicitly requested one test mail to the previously supplied own mailbox and explicitly prohibited a release newsletter to subscribers. An isolated existing-provider mail test is allowed; do not claim it validates the undeployed contact endpoint. No subscriber campaign or change to scheduled editions is authorised.

## Phone usability request — 21 October 2026

- The owner asked for the best practical phone experience. Prepare and publish this responsive maintenance batch to staging for review; production needs approval for this new batch. The earlier live approval does not cover later changes. Do not send another test mail or subscriber campaign.
- Keep the larger 44px header targets, readable mobile menu with an independent viewport-bounded scroll area, 48px primary/map controls and 16px mobile text fields. On the narrowest screens the brand text may hide while the existing accessible home-link label and logo remain.
- The mobile hero actions stack and the pause control stays in the content flow. Keep the shared countdown and the smaller anchor margin so the sticky header does not create a double gap.
- The embedded existing compact CAPTCHA is displayed at native scale, with no change to its key/provider, required consent, signup contract or deferred iframe hydration. Never solve or submit it as routine visual checking.

## Phone usability production approval — 21 October 2026

- After reviewing the mobile staging preview, the owner explicitly approved going live and prohibited email for this release. This supersedes the preceding staging-only restriction for the reviewed mobile maintenance batch only.
- Publish the reviewed static Hosting changes to the existing production target. Do not send a test email, subscriber campaign or other release email, and do not alter existing scheduled editions or question notifications. New server features remain disabled; no backend, database/Auth configuration or billing change is included.

## Full question notifications — owner request, 21 October 2026

- The owner subsequently requested full question text in private owner alerts and explicitly authorised complete testing of Ask Dainyel and Ask the Community. This authorises the controlled private notification tests for this feature; it does not authorise a subscriber campaign. Keep scheduled Postcards editions untouched.
- The existing GitHub notification worker now includes full text, topic, optional nickname, submission time and source label. Preserve escaped HTML, a frozen private outbox, bounded batches, server snapshot/cursor safety, and the existing provider idempotency/uncertain-send stop. Never log question contents or retain them in lastAccepted. Never reset existing cursors or replay historic questions to test changes.
- The public privacy notice describes the private Brevo notifications. User-created questions stay pending until owner review. Test records must be clearly labelled, kept private and rejected after verification; never publish invented visitor activity.
- Real production submissions from both forms reached the owner mailbox in one complete notification on 21 October. A repeat notify run found no new questions and sent no duplicate. Gmail's existing Website label routes these alerts outside Inbox. GitHub scheduling can still be delayed by hours; do not promise immediate or guaranteed ten-minute delivery. Detailed evidence: .github/reports/question-notification-full-text-2026-10-21.md.
- The two clearly labelled controlled test questions remain private/pending because the connected admin tab was not yet signed in. After owner sign-in, reject only those test records through the existing moderation UI. Do not claim they were already rejected or delete real visitor records.

## Admin organisation — owner request, 21 October 2026

- The owner found the phone admin page disorganised. The revised presentation uses five workspace views: Questions, Create, Location, Postcards and Published. Keep real navigation links, history/focus behaviour, owner-only dashboard visibility and the existing moderation contracts. This design batch is for staging review only; production needs approval and no email is authorised.
- Admin now has an authoring source at .github/templates/pages/admin.html and includes .github/templates/journey-studio.html. Compose it with the other pages; do not hand-edit generated admin.html. Its scoped stylesheet/script are assets/admin-desk.css and admin-desk.js. Retain noindex and protected /studio routing.
- Keep labelled full-width fields, mobile 16px inputs, large controls, grouped form sections, optional photo/story and advanced entry details disclosures. Internal references remain available without crowding the main form. Inactive content-type controls stay hidden/disabled.
- The journey service remains disabled. Only local preview is available for new updates; do not enable saving/publishing buttons while that service is unavailable or imply a draft has been saved. This does not disable the separate existing Q&A or location tools. Backend/Auth/Rules/index configuration is unchanged.

## Admin counters and live approval — 21 October 2026

- After reviewing the new admin, the owner requested an orange question/update indicator and explicitly approved direct production release of the admin after this addition. No subscriber mail is authorised. This supersedes the preceding staging-only restriction for this reviewed admin batch.
- Questions shows the total pending personal questions, community questions and community replies, with matching per-queue badges. Count pending review, not merely unread items: opening a tab must not clear it. Hide the badge at a confirmed zero; show unavailable/partial status when a query fails. Reset on sign-out and ignore obsolete listener sessions.
- Reuse the existing owner-only real-time snapshots and their sizes; do not add polling, unread flags, database writes, additional queries or email/push notification flows. Counts stay in memory. assets/admin-review-badges.js handles presentation and accessibility; js/admin-live.js supplies the existing snapshot counts.
- Preserve private moderation and the disabled optional journey service. Do not create questions or send test mail merely to demonstrate the counter. Local sample-count screenshots are layout examples, not evidence of authenticated database testing.

## Community reply queue correction — approved live, 21 October 2026

- After the owner reported the real reply-queue load error, the missing collection-group Rules match was identified. The existing `replies.status` collection-group index was already deployed. The owner separately approved the prepared database Rules correction with “Ga maar live”.
- `firestore.rules` now permits the existing verified owner to `list` pending replies through a recursive collection-group match. This grants no new direct get or write permission and no public access. Keep `replies` reserved for community conversations and retain the existing constrained per-thread reads/writes.
- Only Rules for the configured `dainyel-content` database were deployed; no indexes, Auth, optional backend, billing or email changes were included. The active Rules source was read back and matched. The connected browser was signed out, so actual authenticated queue loading remains unverified. Evidence: .github/reports/community-replies-load-2026-10-21.md.

## Public Q&A loading correction — owner-approved live, 21 October 2026

- The owner reported indefinite loading on the public questions page and explicitly requested correction plus immediate production publication. No release mail is authorized.
- Every standalone `qa.html` visit must automatically initialize the existing Q&A service, including plain URLs without a `question` parameter. Homepage panels and unrelated pages keep deferred services. Do not show a static “Loading” claim before a connection has started.
- Keep the 12-second module/feed loading deadline, nearby explicit retries, stale-result guards and cleanup of replaced listeners. Preserve the existing indexed question-query fallback and real-time moderation updates. No database/Auth configuration, records, optional backend or email flow is changed by this frontend fix.
- Evidence and production checks: .github/reports/public-qa-loading-2026-10-21.md.

## Approved archive photographs — staging, 21 October 2026

- The owner approved the ten numbered photographs in the local approval sheet: Namur/Belgium, Aruba, Rome/Italy, Scotland, Barcelona/Spain, Portugal, Poland, Denmark, Curaçao and Tunisia. Add only these approved photographs to the existing atlas destinations. Germany, Sweden and Vatican City still have no approved photograph; do not infer approval for other OneDrive files.
- This approval covers the displayed selection and placement on the test environment. Production still requires explicit approval for this release. No subscriber email is authorized for staging.
- Originals and the approval sheet remain outside the website source. Publish only optimized WebP derivatives without EXIF/GPS metadata. Preserve complete framing through each new photo's `fit: "contain"`; existing photographs retain their previous framing.
- Keep the optional owner-publishing feature isolated on feature/owner-publishing. The owner explicitly answered “Nog niet activeren” to its billing/runtime activation request. Do not enable billing, APIs, IAM, a runtime or journeyApi, or merge that feature as part of this photograph release.

## Archive photographs production approval — 21 October 2026

- After reviewing the ten approved photographs on staging, the owner explicitly requested “zet ze live, verstuur geen mail”. This authorizes production publication of this reviewed photo batch and supersedes its staging-only restriction.
- Do not send a subscriber campaign, owner test message or release email for this batch. This explicit exception overrides the standing new-content newsletter instruction. Preserve existing scheduled editions and question notifications.
- Publish the reviewed static atlas assets and data only. The optional owner-publishing branch and runtime remain unapproved for activation; keep journeyApi false and do not change billing, APIs, IAM, database rules/indexes or Auth.

## Clean page URLs — owner request, 21 October 2026

- The owner requested removing `.html` from every website page/link. Prepare this routing maintenance on staging; the earlier photo-release live approval does not authorize this new production release. No release mail is part of this maintenance.
- Keep real source/output files named `.html`. Public links, canonical/social/structured-data URLs, sitemap entries, search results, archive links and share buttons use root-relative extensionless routes, with `/` for index. tools/site_urls.py keeps authoring and output consistent; Compose-Site.py still generates the root documents.
- Both existing Hosting target configurations use cleanUrls true and trailingSlash false. Remove old redirects from active clean routes back to .html, retain retired aliases with clean destinations, and keep query strings/fragments working. Verify actual Hosting redirects on staging; the local preview maps clean filenames but does not reproduce every Hosting rule.
- Protect /admin, /admin.html and /studio (including slash variants) with noindex and frame denial, and keep robots restrictions. Clean root page routes retain no-cache headers. Keep private/hidden/tooling exclusions and the staging noindex header.
- Keep existing home panels, ordinary document navigation, Q&A permalinks, photo fragments, consent, deferred Postcards loading and disabled owner-publishing service. Do not change scheduled emails, Firebase Auth/Rules/indexes, billing or server activation.

## Clean page URLs production approval — 21 October 2026

- After reviewing the extensionless addresses on staging, the owner explicitly requested “ga live”. This authorizes production publication of the reviewed clean URL release and supersedes its staging-only restriction.
- Publish the reviewed static Hosting configuration and page/link changes only. Preserve legacy `.html` redirects, query strings/fragments, protected admin routes and existing media. Do not send release/test mail or a subscriber campaign; scheduled editions and private question notifications remain unchanged. Keep journeyApi false and do not activate billing, servers or database/Auth configuration.

## Support launch and departure Postcard — owner instruction, 21 October 2026

- The owner explicitly approved production publication of the About support section with `Coming soon` and the shared footer link. Show the existing owner-supplied WhyDonate button automatically from 28 October 2026 at 00:00 Europe/Amsterdam (`2026-10-28T00:00:00+01:00`); do not expose it as an active visible button before that date. The public WhyDonate URL is `https://whydonate.com/nl/fundraising/dainyelonthemove`.
- `assets/support-release.js` controls the date-based presentation on About, rechecks on visibility/pageshow, and preserves the pre-launch notice when JavaScript is unavailable. This is a static browser feature; it needs no running Codex process, paid service, backend activation or future deployment. It does not establish actual departure, payment success or payout verification.
- The owner also explicitly requested adding Buy me a coffee and the relevant already-public website updates to the existing departure Postcard for 28 October. Update scheduled Brevo campaign #8 in place and retain its 28 October 2026 12:00 Europe/Amsterdam schedule, sender, list 3 subscribed-only audience and unsubscribe handling. Preserve approved destination facts outside public source; do not create a duplicate campaign, send immediately, send a test email, or modify campaign #9.
- The reminder alternative is unnecessary when the date-based website activation is implemented. Keep older paused Codex reminder/sender automations paused.


## Private content calendar production approval — 22 October 2026

- After receiving the staging link, the owner explicitly requested “Top ga maar live”. This authorizes the reviewed calendar's production release, owner-only Firestore Rules addition, private import of the seven supplied posts and day-before owner reminder activation. It supersedes the earlier pending-activation restriction for this calendar only.
- Keep calendar contents out of hosted files, source history, public search, sitemap and logs. Import only the supplied plan into the existing named database; retain unticked scheduling/publication flags until the owner confirms their external state.
- Reminder emails go only to the existing owner-recipient secret, for unfinished posts the day before from 09:00 Europe/Amsterdam, at most one combined message per day. Preserve subscriber campaigns, scheduled Postcards and question alerts. No new billing, API, runtime, Auth settings or index deployment is authorized.


## Calendar mail correction — 22 October 2026

- During the approved calendar release, the owner added “Make sure that you don't send an email”. Calendar email reminders were therefore disabled in the private owner preference. Do not re-enable them from the earlier release approval without a new owner request. Keep the day-before/overdue indicators in the admin available.
- The first reminder-worker startup found no unfinished posts for the next day and sent no email. No release/test message or subscriber campaign was sent. Existing unrelated mail schedules are not part of this change.


## Owner two-step preparation — 22 October 2026

- The owner requested Google sign-in AND Google Authenticator, entirely free, and approved a small local QR module. The isolated `feature/admin-two-step` release prepares staging only; no production/Auth/Rules activation or account enrollment is approved/performed yet. See .github/reports/admin-two-step-2026-10-22.md for the coordinated activation order.
- Keep Spark/no billing. Google is already enabled; Identity Platform/TOTP still need the supported free console upgrade and explicit current configuration approval. Never use the billing-required initializeAuth API, enable SMS/Blaze, or activate the optional server.
- Admin data must require the reserved Firebase-signed TOTP token claim in both the UI and server Rules. Trust this browser may persist a valid SDK session; never implement a localStorage trust/MFA bypass. ENROLLMENT_ENABLED stays false until approved activation. Local strict Rules are prepared but not remotely deployed.
- Hand off before real Google credential linking or Authenticator enrollment; never inspect/capture passwords, QR/seed/OTP or recovery material. Native enrollment sends an owner account-security email and revokes old sessions; disclose this before the owner confirms. No website/subscriber/test mail is authorized for this release. Preserve the disabled calendar email preference and other existing schedules.


## Owner two-step production approval — 22 October 2026

- After reviewing the prepared staging login and the explicit free-activation request, the owner answered “Ga live”. This authorizes the coordinated production admin release and free shared Auth configuration for this change. It does not authorize billing, a server runtime, SMS or website/subscriber/test email.
- Identity Platform was enabled through the supported Spark console route; TOTP is enabled with one adjacent interval, existing Google sign-in is retained, and canonical production plus staging domains are now authorized. Readback confirmed billingEnabled false. Keep all existing domains and the named database. ENROLLMENT_ENABLED is now true.
- Complete the production frontend publication before the owner privately enrolls the shared Auth account. Hand off before any QR/seed/OTP or credential-linking step; do not inspect those screens. Native enrollment sends its own owner security email and revokes other refresh-token sessions, as disclosed and approved.
- Strict Rules remain pending until the owner confirms private enrollment and a successful new MFA sign-in. This is remaining release work, not a completed server-enforced MFA deployment. Do not claim complete protection or deploy the strict Rules early and strand the existing live owner. See .github/reports/admin-two-step-2026-10-22.md.


## Owner two-step enforcement completed — 22 October 2026

- The owner confirmed “gekoppeld” after the private handoff. A strictly masked account-status request confirmed verified/enabled owner identity, linked Google, TOTP enrollment and a subsequent sign-in. Never retrieve/log full user records, hashes, seeds, QR/OTP values or browser tokens to verify this.
- Strict Rules are now deployed to the existing Enterprise Native dainyel-content database. Their active source was read back and exactly matched the committed ruleset, requiring verified owner identity plus the reserved Firebase-signed TOTP claim for private owner data/moderation. This supersedes earlier pending-Rules notes for this release. See .github/reports/admin-two-step-2026-10-22.md for evidence and limits.
- Billing remains unlinked/Spark; no additional mail, SMS, runtime, indexes, public contracts or credential changes were made during finalization. Keep the calendar email preference disabled and preserve other existing schedules. The linked Codex admin tab was signed out, so do not claim every authenticated UI/error/recovery/device path was independently tested.

## Full Philippines journal preparation — 23 October 2026

- The owner supplied the full Dutch account and media and requested an English journal in the existing style, useful hyperlinks, many sourced Did you know facts and all supplied media. Prepare this article on staging for review; no current production or email authorization exists for it.
- The full article has eight reading chapters, six existing-style manual photo slideshows with all 40 unique photographs, eleven source-linked fact cards, all nine supplied full-duration films with mobile/desktop variants, plus the two existing Philippines films. Preserve the stable /philippines, #story and #el-nido routes, native enlarged-photo dialog/history/focus, no timed slide advance, and the existing muted/viewport/reduced-motion video behaviour.
- The owner confirmed the village aerial and arm-wrestling film belong to Oslob; underwater photographs belong to Boracay; the church/street photographs belong to Manila. The cancelled destination is Moalboal. Do not infer an exact site for generic church/market/reef images.
- Original HEIC/JPEG/MP4 files remain outside website source. Fresh WebP derivatives contain no EXIF/XMP; video derivatives discard source metadata. No source/GPS records, new service, billing, authentication, mail or upcoming-trip reveal is part of this content change. Report: .github/reports/philippines-story-2026-10-23.md.
- The complete journal was published to the noindex staging site from bc5cd0b; Hosting workflow 39869369000 succeeded. Production remains unchanged and unapproved for this article. No email was sent.

## Philippines film correction — owner request, 23 October 2026

- The owner superseded the earlier include-every-film request: remove the Oslob table/arm-wrestling clip and repeated El Nido kayak scene. Keep their originals outside website source; do not restore the removed web players/assets merely to match the initial media count.
- The revised journal has one manual three-film gallery each for Boracay and El Nido. Preserve native video controls/seeking, keyboard navigation on gallery controls, immediate pause of hidden slides, visibility/reduced-motion behaviour, source-order fallback and no timed slide advance. Initialize philippines-films.js before video-autoplay.js so hidden slides do not download/play at startup.
- The opening and Bohol use short silent drone loops with soft end-to-start fades and poster-first loading. Background clips have no visible playback controls, obey reduced motion and pause out of view. Full-flight links remain; their excerpts are not additional foreground players. All 40 photographs remain in the existing six photo slideshows.
- This revision is for staging review only. No production or email request. Report: .github/reports/philippines-film-revision-2026-10-23.md.
- The owner additionally requested uniform in-frame film navigation: round previous/next arrows match the photo galleries, with an in-frame counter above the native video control bar. Do not restore a separate previous/next row below the film. Browser-native fullscreen retains its own video interface.
- The film revision, including in-frame navigation, was published to noindex staging from d30ff81; Hosting workflow 39872720627 succeeded. Mobile previous/next and matching counter were observed on staging. Removed table/kayak-cut assets and the known report URL return 404. Production remains unapproved and unchanged; no mail was sent.

## Philippines production and delayed Postcard approval — 23 October 2026

- After reviewing staging, the owner explicitly requested going live with the current Philippines journal and film/gallery corrections. This supersedes their earlier staging-only restriction. Publish the reviewed static content only; retain existing backend, Auth/Rules, billing and private trip data.
- The owner explicitly requests one additional website-update Postcard for 24 October 2026 at 11:00 Europe/Amsterdam, rather than an immediate release mail. This is a specific exception to the normal Wednesday cadence. Schedule it natively in the existing free Brevo account for active, consented Postcards subscribers only; do not send immediately or send a test message.
- The English message should invite readers into the newly published photographs/films/story and announce the owner-requested 28 October coming-soon launch of the voluntary coffee/support feature, journey status and first destination. Keep that destination and all unpublished itinerary details secret. Do not describe a planned departure as confirmed travel.
- Preserve the existing scheduled campaigns #8 and #9, suppression/unsubscribe handling, paused Codex senders and disabled calendar reminder mail. No paid plan, new credentials, contact import or extra follow-up sequence is authorised.

## Philippines release and corrected Postcard schedule completed — 23 October 2026

- During preparation the owner corrected the requested mail date to **23 October 2026 at 11:00 Europe/Amsterdam**. This supersedes the 24 October request above. Campaign #11 was updated in place and is now natively Scheduled for 23 October at 11:00 (09:00 UTC); fresh provider list/activity confirmed it. Do not create another campaign, send immediately, or reschedule it back to 24 October. Scheduled does not establish delivery.
- The reviewed journal/media revision is live on the canonical /philippines route, deployed from dc05919 with successful Hosting workflow 39873647753. The linked Field Note and representative new assets return 200; the known report URL returns 404. Live public revealedStops remains empty. No destination was disclosed.
- Brevo #11 uses saved segment #1 with actual Subscribed AND existing Postcards list #3 conditions, the verified existing Postcards sender, unsubscribe and free branding. It announces the approved 28 October coffee/support, trip-status and first-destination launch without naming the destination. No test email or immediate send occurred. Existing campaigns #8/#9 retain their 28 October / 4 November 12:00 schedules; other services, security, billing, tracking, reminders and paused senders are unchanged. Evidence: .github/reports/philippines-live-release-2026-10-23.md.

## Self-service publishing preparation — owner request, 23 October 2026

- The owner asked to post new blogs, travel facts and Field Notes without Codex and clarified that only the calendar post “Ruimte voor onderweg” should be removed. That one record was backed up outside source and removed with an update-time precondition; readback was 404. Preserve the rest of the calendar and disabled reminder preference.
- Work is isolated on feature/self-service-publishing. The new editor reuses Firebase Google/TOTP, the existing Enterprise Native database and no-billing quota. No paid runtime, bucket, new credential or AI call is required. journeyApi remains false and the previously declined optional server is not activated.
- Only cmsSpaces/staging is enabled in the prototype Rules; production CMS access stays denied pending approval of this new release. Keep drafts private, public projection whitelisted and transaction-matched to a reviewed draft, media immutable/private until referenced by a current publication, and existing signed TOTP checks on all private operations. Do not relax existing Q&A, subscriber, calendar or MFA contracts. See .github/reports/self-service-publishing-2026-10-23.md and the owner guide.
- New dynamic entries use /entry/entry-ID, appear on Stories/Field Notes, and do not send newsletters. Retain image/entry size limits, no original metadata, explicit preview/consent, revision conflict checks, offline/error honesty, sign-out cleanup, download/restore and pagination. Never claim runtime lifecycle verification or static SEO/social-card parity from source checks alone.

## Self-service publishing staging available — 23 October 2026

- Final staging Hosting workflow 39978930565 succeeded at 3168e27. The owner privately signed in; the reloaded Create & publish editor visibly connected to its staging collection. Source/syntax and deployment checks passed, but no real draft/publish/edit/withdraw lifecycle or attack suite was exercised. Preserve that distinction. Production remains unchanged and unapproved for this feature.
- Public archive cards use small summaries written atomically with the publication. Unfinished text/links can be saved privately; public copies require complete content. Withdrawal removes the public copy and summary without silently saving incomplete form edits. Explicit staging/localhost hosts select staging; all other hosts select production, whose namespace remains denied. Active named-database Rules exactly matched the committed source after deployment.
- No email was sent for this task. Keep current newsletter schedules, disabled calendar reminder mail, Google/TOTP, Spark/no billing, journeyApi false and the discontinued Command Center bridge unchanged.


## Self-service journal layout and editable Postcards — 23 October 2026

- The owner requested the existing journal style in self-service content, independent cover/banner choice, automatic approximate reading time, chapters and photo placement. Shared journal CSS/reader now powers the full-window/phone-width preview and dynamic entries; manual photo galleries, enlarged previous/next, sourced fact cards and reading progress are retained. New raw-video uploads/transcoding and static per-entry SEO/social-card generation are not included. Do not claim full static-page parity or an authenticated publication lifecycle from a local visual example.
- The owner also requested automatic publication mail OR an editable admin template with Send/Schedule. Implemented the latter: explicit Prepare a Postcard from the currently published entry, private saved mail draft, branded preview/HTML download and separately reviewed delivery. Publishing alone sends nothing. Staging sending/scheduling remains forbidden in UI and Rules; production CMS, delivery flag and IAM-only enabled configuration remain unapproved/off.
- The independent background worker reuses existing GitHub/Firebase/Brevo infrastructure without a paid runtime/new credential. Immutable reviewed jobs, revision/CAS checks, fixed active-subscriber segment, pinned segment modification time, suppression and ambiguous-result hold prevent silent edits/replays. Existing campaigns and calendar reminder preferences stay unchanged.
- Staging Hosting run 40011113949 succeeded at 4830797. Active named-database Rules readback matches source; known report URL returns 404 and production admin has neither new editor. Actual owner draft/publish/edit/withdraw and mail lifecycles remain pending. A fresh owner staging sign-in is requested; never inspect passwords, QR/OTP, security material or browser tokens.
- The Brevo read-only check currently stops at GET account with HTTP403/permission_denied, confirmed in run 40012197538 at 9e51971. The existing restricted key currently permits Transactional email only. Additional Email campaigns: All, Contacts: Read and Account: Read were prepared in the provider form but not saved, pending explicit owner approval for expanded security-sensitive access. No key was created/read, no IP protection disabled or broadened, and no campaign/test/subscriber message was created/changed/scheduled/sent. After scope approval, verify the connection again; do not assume IP authorization or activate production automatically. Reports: self-service-story-layout-2026-10-23.md and self-service-postcards-2026-10-23.md.


## Owner-approved Brevo API connection completed — 23 October 2026

- The owner explicitly approved adding Email campaigns: All, Contacts: Read and Account: Read to the existing restricted server key while retaining Transactional email: All and the existing expiry. Brevo required an emailed security code; the owner completed it privately. Fresh UI readback confirmed four saved scopes. No new key was created, copied or exposed.
- After that update, the read-only check confirmed an API server-IP rejection. The owner separately and explicitly approved disabling Brevo API IP blocking after the account-wide consequence was explained: any valid API key now works from any IP, removing this extra network protection. The change is saved/read back. SMTP was already deactivated and unchanged; no authorized ranges were edited. Do not silently restore the block or imply a fixed GitHub runner address. Preserve the secret-only server key and the separate Google/TOTP admin boundary.
- Configuration-check workflow 40020203215 succeeded at 2ca1b28 after setting a real identifying User-Agent and JSON Accept header. It confirmed the existing free plan, verified sender, saved active-subscriber segment and bounded outbox query, and wrote only disabled staging delivery settings. The prior permission/IP blockers are resolved. Do not equate this check with a campaign send, inbox delivery or a completed CMS publishing lifecycle.
- Production delivery flag remains absent/off and no production mail configuration/release is activated. No campaign was created, changed, scheduled or sent in this build; Brevo's native owner verification email is separate. Campaign #11 was visibly Sent in the existing provider activity at 23 October 11:05 from its earlier approved schedule, not from this build; do not duplicate it or claim inbox receipt. Existing #8/#9 and other reminder preferences remain unchanged. Final private owner staging login and real publishing/delivery checks remain pending.
