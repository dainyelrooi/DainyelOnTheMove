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
- The full Philippines written story is pending. Do not pretend it has been completed.
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
- Complete the Philippines written blog only after Dainyel supplies final text/media.
- Postcards uses the owner’s free Brevo account and provider-hosted double opt-in; website-triggered question notifications are a separate feature.
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

- Keep homepage Follow the trip collapsed by default using native details/summary. Load the embedded form only on first expansion; retain its existing content, double opt-in, CAPTCHA, direct fallback and source/origin-checked resize. Keep the hosted-form fallback usable without JavaScript.
- The owner asked about removing Analytics consent. No removal has been approved as privacy-compliant; inspect actual account/data-sharing configuration before asserting that the limited-analytics exception applies. Do not promise complete measurement of all visitors.

- The owner chose extended Analytics WITH consent after discussing the limited-analytics alternative, and reports accepting the Data Processing Terms on 15 October 2026. The site dispatches site:route-view events on supported route changes; analytics-consent.js sends deduplicated page_view events only for consented production visits. The stream’s automatic browser-history page-view option was disabled to avoid duplicate manual route views; keep normal page loads. Automatic site-search query collection was also disabled so arbitrary URL search terms are not collected. Scroll/outbound/form/video/download enhancements remain enabled.

## New-content publication and Postcards mail — standing owner instruction, 16 October 2026

- The owner explicitly requests one approval for both publication and the accompanying subscriber email. When the owner approves going live with a new blog, Field Note, or visitor-facing photo/gallery update prepared by Codex, that approval ALSO authorises sending its corresponding Postcards newsletter to the confirmed, active subscribers of the existing Brevo Postcards from Dainyel list. Do not ask for a second mail approval. Honour an explicit exception such as “do not email this update”.
- This is an agent-assisted publishing workflow: prepare the newsletter as part of the release, publish the approved content, verify its canonical live URL and media, then send through the existing Brevo account. No automatic backend/webhook/cron publication-to-email trigger is currently installed. Do not claim that changes made outside this workflow independently send mail.
- Prepare the newsletter BEFORE requesting release approval, and include a reviewable subject, short English preview, one representative approved photo when useful, and a link/button to the actual new content. Retain the Postcards brand, postcards@ sender, required sender identity and working unsubscribe link. Use only the approved public material; do not reveal unpublished routes, private location details, draft text or other unreleased content.
- Send at most one coherent email per approved content release/batch. A group of photos gets one update, not one email per photo. Do not send newsletters for staging, design/SEO/code fixes, spelling corrections, deployment retries, rollbacks or unchanged content. For mixed releases, describe only the newly published visitor content.
- Use only confirmed and still-subscribed Brevo recipients. Never import or contact the unverified legacy Firestore interest records, pending confirmation contacts or opted-out addresses. Do not expose recipient addresses in docs or public pages.
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
