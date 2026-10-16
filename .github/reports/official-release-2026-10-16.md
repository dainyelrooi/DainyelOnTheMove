# Approved standalone-pages release — 16 October 2026

## Approval and scope

Owner explicitly authorised final important fixes, a full site check and production publication in the current turn. This supersedes the staging-only restriction for this release. Includes the eight shared-content standalone pages and targeted routing, Q&A guidance, support contact and privacy-retention improvements documented in standalone-pages-audit.md.

Pre-change OneDrive backup: website_2026-10-16_05-39-48. Previous production commit: 870e7937840d5d37a8d201a15f433d717139c309. No new story/photo release, therefore no subscriber campaign is sent for this design/structure maintenance release.

## Final small fixes

- Error-page assets and search recovery resolve from the root even when Firebase serves the error document under a nested missing URL. Composer retains asset fingerprints for root-relative CSS/JS.
- Search includes useful collection links without JavaScript, instead of an empty result area.
- Stories, Privacy and Cookies now have matching basic CollectionPage/WebPage JSON-LD; all sixteen sitemap pages have parseable structured data. No invented author dates, travel facts or rich-result claims.

## Checks before publication

- Parsed all 23 root HTML documents: no duplicate IDs, missing image alt attributes, broken local file/fragment references, or unresolved linked local assets. Checked 107 local assets including srcset candidates.
- All 16 sitemap pages have one H1, matching canonical, required description/social fields and parseable JSON-LD. Search/private routes remain outside the sitemap.
- All assets/js JavaScript files pass Node syntax checks. Public-trip validator and git diff whitespace check pass. Composer regenerated source consistently.
- Tracked text scan found no recognised private-key/Brevo/GitHub-token patterns; no private directory files or credential filenames tracked. This is a targeted check, not an exhaustive security audit.
- Staging deployment 38846754883 succeeded for 3ebb20e. Seventeen public HTML routes, isolated signup frame, robots and sitemap returned 200; all staging responses retain noindex. Blog/Destinations/Updates reached the matching collection. Nested nonexistent path and a known .github report URL returned 404; nested error page contains correct root CSS reference.
- HEAD checked 76 directly referenced deployed assets/scripts/video URLs: all 200. Other srcset alternatives checked locally.
- Browser: travel film, whale shark, Bali and Sak Yant videos reached readyState 4, playing with progressing time and decoded dimensions. Scooter previously passed the same actual playback check. Homepage background played muted/looped at 1920x1080. No background play button.
- Countdown changed seconds across observations. Cookie settings reopened, Reject analytics worked. Search Enter/input returned Bali 2, thai 3, gear 2, unknown 0 with empty state, empty query all 12 entries. No reported browser errors in the inspected search log.
- Responsive and keyboard checks at measured 305/375/753px content widths, Q&A required-field validation and film focus/Escape documented in mobile-postcards-validation.md. Actual Q&A public loading was checked previously; no fake questions or moderation changes created for testing.

## Honest limits and follow-up

- Owner deferred fresh signup/CAPTCHA/DOI/unsubscribe test for the new active Brevo opt-out workflow. Existing owner campaign subscription is suppressed; transactional owner alerts remain permitted. No claim that the new rule completed a fresh execution.
- Physical iOS/Android hardware, exhaustive assistive-technology testing, measured Lighthouse/field Core Web Vitals, real community-question-to-mail receipt, owner sign-in/moderation and support/reply delivery are not established by these non-destructive checks. Existing services/configuration are preserved.
- GitHub owner notification schedule may lag hours, as accepted by owner. No ten-minute delivery guarantee.
- Full Philippines writing, new travel feed items, additional maps/captions/gear reviews need supplied content; optional filters/search typo tolerance are not release blockers.

Production deployment and canonical-domain verification will be recorded after publication. No credentials, visitor data or unrevealed itinerary is recorded here.
