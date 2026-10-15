# Compact signup and Analytics follow-up — 15 October 2026

Owner requested a collapsed homepage signup and broader Analytics coverage, then asked whether tracking could always run without a consent choice.

- Backup: website_2026-10-15_23-51-07. Staging implementation commit 32dcab7; no production release authorised for this subsequent change.
- Native details/summary keeps Follow the trip collapsed by default. Signup content preserved, provider frame source assigned only on first opening. Existing hosted fallback remains usable without JavaScript. On staging, the closed frame had no src; clicking the summary expanded the content and initiated frame loading. Screenshot outside Hosting: outputs/email-setup/postcards-dropdown-staging.jpg.
- Current Analytics consent remains intact. Further public/search/panel coverage has not yet been implemented in this follow-up; do not describe it as complete. Basic public content pages already have the prior consent-controlled loader. Admin, registration frame, redirect, search and error exclusions remain as before.
- Read-only inspection of the existing Analytics account showed Google products/services sharing off, modelling/business insights on, technical support on, business recommendations on. The UI states Data Processing Terms have not been accepted. No account settings or agreements were changed. Home showed one realtime active user; its historical cards/header still showed no processed data. Do not infer complete reporting from this.
- AP guidance distinguishes limited analytics with no/little privacy impact from consent-requiring tracking. No conclusion that this installation qualifies for consent-free analytics was made. Do not remove the banner solely to promise all visitors are measurable. Account conditions and implementation require review; the owner must review/approve any binding processing terms. Browser blocking also prevents guaranteed complete measurement.

Sources: https://autoriteitpersoonsgegevens.nl/nl/onderwerpen/internet-telefoon-tv-en-post/cookies ; https://developers.google.com/analytics/devguides/collection/ga4/views . Google documents that enhanced history measurements can still send page_view events despite send_page_view:false, so avoid blindly adding duplicate manual panel pageviews before inspecting the stream configuration.

## Consented extended measurement continuation

The owner selected extended Analytics WITH consent and reports reading/accepting the processing terms. Added a visible collapsed-summary hint: “Sign up for Postcards — travel updates by email.” Extended the single loader to public search and 404 templates, sanitising paths/queries. Known panel and story-tab navigation dispatches a local event, which sends a deduplicated page_view only after consent on production. Titles distinguish map, Q&A, films, About, creator/contact and kit. Deep links within a panel map to the fixed parent panel. Admin, signup frame and redirects remain untracked to avoid private/duplicate records.

In the existing webstream Enhanced measurement UI, browser-history page changes were unchecked and automatic site-search switched off, then Save closed the editor. Normal page loads, scroll/outbound/form/video/download options remain on. This avoids duplicate pageviews and collecting arbitrary search URL queries. No credentials, sharing permissions, advertising features or account access were added. Proof: outputs/email-setup/analytics-coverage-settings.jpg outside Hosting. Account retention has not been changed or verified.

These source changes require staging publication verification and a release decision. Do not claim the new virtual views have been observed in production reports yet.
