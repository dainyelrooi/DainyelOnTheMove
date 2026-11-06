# Peru and AdSense content readiness — 6 November 2026

## Scope and release boundary

The owner explicitly shared that he is in Peru from 6 November 2026 and asked for consistent location/counts and investigation/remediation of the AdSense rejection. No city, coordinates, arrival time or future stop was supplied or inferred. Pre-change OneDrive backup: `website_2026-11-06_10-58-42`. Work is on `feature/peru-content-readiness-2026-11-06`, based on staging with current main merged. The previously reviewed navigation updates/calendar moves/underway copy are also in this staging candidate. A new production release still requires the owner's explicit approval under AGENTS.md.

No mail, subscriber change, provider scheduling change, account security change, paid service, Firestore write or Rules/Auth deployment was performed. The cancelled Postcard job remains cancelled. Ads/CMP remain disabled in analytics-only mode until Google approval and the owner's next instruction; existing Analytics consent is preserved.

## Confirmed observations

- Native signed-in AdSense inspection: **Needs attention → Low-value content**. Ads.txt is **Authorised**. Google provided no page-specific examples. The fixed-issues checkbox and Request review were not submitted.
- Read-only initial-HTML audit of all 22 production sitemap URLs returned HTTP 200. The full original Thailand, Bali and Philippines stories already contain substantial personal content. Three standalone Field Notes contained approximately 67–77 main-text words; the public archive was mostly client-rendered and its later editions lacked initial-HTML reading pages. These are discoverability/quality findings, not proof of Google's private rejection logic.
- The visited archive held 16 destinations, including countries, territories and regions. Calling them all sovereign countries would be inaccurate. An older published Curaçao check-in could override the newer static baseline after hydration.

## Implemented

1. `data/journey.json`, `data/trip.json` and authoring templates: add owner-approved Peru, 6 November 2026; retain historical destinations and Curaçao's already-public 2026 stop. All three homepage counters derive from the same 17-destination model and use the honest label **destinations**. Current location is country-only. The timestamp records the preparation of the owner's statement, not an arrival instant.
2. `js/location-live.js` and `assets/trip-data.js`: a positively dated older check-in cannot replace the newer approved baseline. Later owner check-ins still win; immediate authoritative withdrawal remains supported. No polling or new database write was added.
3. The three existing Field Notes now include separate readable paragraphs, a named author, relevant photograph/social image and direct links to their full original stories. Every added travel detail comes from the owner's already-public related story. No Peru experience, fictional advice, publication date or new trip was invented.
4. `tools/postcard_pages.py` and the existing composer: generate full, escaped, directly readable HTML for the five already-public delayed Postcard exports. Preserve the original Thailand canonical URL by matching its actual title and sent date; show each letter once. New pages have canonical/social metadata, sitemap and internal-search entries. Old hash links resolve to the matching reading page.
5. The existing public archive background workflow now composes these reading pages when public exports actually change. The loader only accepts indexed public exports, rejects unapproved fields/unsafe links and withholds any edition until at least 24 hours after actual sending. No private CMS/provider copy, mail send or manual workflow dispatch was introduced.
6. `/field-notes` and its legacy spellings redirect directly to `/stories#field-notes`; the actual filter anchors now exist. Internal links use that destination. The separate empty costs page remains accessible but is `noindex,follow` and outside the sitemap while no real expense records exist.
7. Films include context connecting actual footage to the owner's original journeys, rather than relying on embeds alone. Branding, existing stories, films, consent, Cloudflare inbox, owner authentication and admin calendar contracts are retained.

## Evidence and limits

- PASS: 205 JavaScript tests, 109 Python tests. The seven new Python checks cover 24-hour timing, projection allowlists, unlisted/duplicate export rejection, consistent trip/count data, complete note/letter HTML, canonical/search links and empty/duplicate route handling.
- PASS: public-trip validation, generated journey/link/metadata validation, affected JavaScript syntax and whitespace checks.
- Staging deployment and actual browser readback: pending in this initial report; record results below before requesting a production release.
- Production, Google recrawl/review, ad serving and physical-device testing are not proved by source tests. Google approval cannot be guaranteed. No invented minimum word count, artificial visitor activity or guaranteed approval claim is used.

## Primary guidance

Google asks for original useful content, clear navigation and added value around embedded material: [content and user experience](https://support.google.com/adsense/answer/10015918), [site readiness](https://support.google.com/adsense/answer/7299563?hl=en), [publisher spam policies](https://support.google.com/publisherpolicies/answer/11035931), [helpful people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content). The changes address concrete observed weaknesses under that guidance. Only Google can decide the subsequent review.

## Owner steps after approved production release

Open the live homepage, Journey, Atlas, Field Notes and Postcard archive. Confirm Peru is the intended broad shared location and the added story-derived text retains your meaning. After verified deployment and readback, use AdSense's **I confirm that I have fixed the issues → Request review**. Do not request review of the staging site. Leave ads disabled pending approval; do not alter payment/tax settings as a content-rejection workaround.
