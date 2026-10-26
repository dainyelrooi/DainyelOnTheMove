# AdSense and one Google privacy message — 26 October 2026

## Authorised scope

The owner requested the supplied AdSense publisher code across public pages. He approved public-only placement, exclusion of administration/previews/forms and a certified Google consent setup, then explicitly requested his supplied logo and one shared Consent / Do not consent / Manage options message for both advertising and Analytics. Other calendar/social/WhatsApp changes remain options only; none were implemented in this batch. No production website release is authorised for this new batch.

Local branch: feature/adsense-consent. Pre-change source backup: sibling backups/website_2026-10-26_09-49-17. Existing unrelated quiet-growth AGENTS/report work remains unstaged.

## Implemented

- tools/site_ads.py and Compose-Site.py insert one shared privacy-consent.js bootstrap plus the exact public AdSense account verification meta. This also covers generated notes, archives and real rendered self-service entries. Source generation no longer emits the old Analytics-only banner.
- Excluded: admin, editor previews/embedded documents, sign-up iframe, dedicated contact/Q&A forms, redirects, search handoff and 404. Runtime checks also reject unknown hosts, wrong paths and any website-preview query. Test hosts make no requests to advertising/Analytics through this module.
- The supplied AdSense script is appended once on an eligible canonical production page. Ad requests start paused. This standard tag also starts Google's certified CMP. Technical requests for the consent service itself still occur; there is no zero-network-before-choice claim.
- Consent defaults are denied. Google's official CONSENT_MODE_DATA_READY/getGoogleConsentModeValues API controls both optional services. Only GRANTED enables the corresponding service. Unknown, denied, unconfigured and not-applicable stay off, including regions where Google supplies no applicable choice. This conservative behavior may limit advertising/measurement outside the European-message regions.
- The GA tag is not loaded before a granted Analytics-storage signal. Google signals/GA advertising-personalisation features stay disabled. Page locations omit queries and arbitrary hashes; new entry IDs/titles use a generic Analytics page identity. No old browser Analytics acceptance is migrated into advertising permission.
- Consent changes pause optional services while the message is open; a later revised decision reloads the document to re-read the provider record. Denied Analytics clears this site's GA cookies. Revocation does not delete already sent records. Back/forward cached documents refresh consent instead of continuing an old granted state.
- Cookies & settings reopens the same native message; no second local popup or local shadow consent record. The notices explicitly explain that Google maps TCF storage-purpose consent to Analytics; this is not a separate Analytics-only switch.
- ads.txt authorises only the supplied publisher as DIRECT, with Google's documented certification identifier. Privacy/cookie wording and the generated public search index were updated.

## Actual AdSense account setup

The existing matching publisher account was already signed in. No credentials, payment details or tax information were read or changed.

- Created one message, DainyelOnTheMove — privacy choices, for the existing dainyelonthemove.com site only; exact https://dainyelonthemove.com/privacy reference and public brand name saved.
- Owner-supplied logo uploaded and selected. The original stays outside source. A metadata-free proportional PNG derivative, 540×180, 110455 bytes, meets Google's 150KB limit. All artwork/colours/transparency remain; no crop, background removal, AI generation or paid image service.
- Consent, Do not consent and Manage options available; refusal enabled in all offered European regions. Consent-message optimisation off, preventing automatic substitution of a non-blocking limited message.
- Minimum ad-provider list: Google Advertising Products only (GVL755); automatic addition of198 common partners disabled. Existing fallback message coverage retained. RTB creative consent checks enabled; legitimate-interest controls visible but not enabled by default. Device-scanning special feature two remains off; no own-data purposes added.
- Consent mode for advertising AND Analytics enabled and saved. Google's UI explicitly maps storage-purpose1 to Analytics consent. No separate Analytics local notice remains in the new website source.
- Message status read back as Published. This publishes the consent configuration in AdSense, not this website source or a production Hosting release. Provider warns propagation can take up to an hour.
- The site still needs connection/approval in AdSense. No false “code is live” confirmation or website-review submission was made, no Auto ads layout was enabled, no ad impressions/clicks were intentionally generated.

## Validation

PASS:44 Node tests (9 new consent cases),28 Python tests (2 new public-page checks), changed JS syntax, Compose-Site, Check-Journey, Validate-PublicTrip and git diff --check. New tests use isolated fake browser/provider objects with no external requests; they prove local gating, not actual Google delivery.

PASS: actual provider UI logo selection, saved advertising+Analytics consent-mode settings and published message status. Native desktop/mobile preview is separately checked and saved outside Hosting.

PASS: staging Hosting40299491960, regression40299492266, source backup40299492183 and saved-content backup40299492199 for functional9fdec0a. Actual HTTP readback covered all21 public pages (one new loader each, no old loader, noindex), four excluded administration/form pages (neither loader), exact ads.txt and report404. Actual staging browser cookie settings showed the test-only notice, zero AdSense/GA script nodes and no old local cookie banner. Actual production homepage still has only the old loader, confirming this source has not been released live.

PASS: actual provider desktop and phone preview contained the selected logo and all three choices. Screenshot: external2026-10-26/adsense/google-single-consent-logo.png. Provider preview displays generic placeholder-purpose/vendor text; the authoritative saved account selection is one Google provider. This does not prove the native canonical visitor/network lifecycle.

PENDING: actual canonical production CMP accept/reject/reopen/network lifecycle, Google site approval and real ad serving. No production deployment, no automatic universal legal/WCAG/performance compliance claim. Rules/Auth/App Check/Brevo/calendar/reminders/other provider schedules unchanged; no email, post or WhatsApp sent.

## Owner use and release

The single message offers Consent, Do not consent and Manage options. Later choices are on Cookies & settings. Optional services stay off on the test site, so its cookie button explains that rather than loading live ads. The AdSense account preview shows the actual native message and logo. Existing deliberate external video-player buttons and necessary form-security services remain separate from optional advertising/Analytics consent.

A later explicit approval may release this reviewed website source to production. Then verify the canonical meta/ads.txt, known report404, no tag on private/forms/previews, one native message, decline with no Analytics/ad requests and granted basic-mode behavior. Submit only a truthful website connection/review request after the code is actually live. Do not turn on disruptive advertising layouts or alter billing/tax details implicitly.

## Primary references

- https://developers.google.com/funding-choices/fc-api-docs
- https://support.google.com/adsense/answer/16053245
- https://support.google.com/adsense/answer/7670312
- https://support.google.com/adsense/answer/13554116
- https://support.google.com/adsense/answer/7584263

These describe the APIs/provider requirements; they do not constitute legal approval of this site.
