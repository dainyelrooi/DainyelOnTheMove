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
- PASS: staging candidate 923c359: Hosting42254106986, isolated regression42254106713, public archive GET-only check42254106903 and OneDrive source backup42254106757. Follow-up map/search copy f4dac41: Hosting42254469404, regression42254469418 and source backup42254469509. Final functional candidate e123c19: Hosting42255337247, isolated regression42255337209 and OneDrive source backup42255337212 all succeeded. Native readback confirmed the meaningful latest-letter excerpt after that deployment; the complete dated body remained intact. Proof: audit-evidence/postcard-reading-2026-11-06.png.
- PASS: read-only HTTP verification of all 24 current sitemap pages: HTTP200, canonical metadata, staging noindex headers; all four checked legacy Field Notes/Updates redirects are HTTP301 directly to /stories#field-notes. Costs contain noindex,follow; the non-sensitive report URL is HTTP404. Evidence stays outside Hosting/Git: audit-evidence/peru-staging-http-2026-11-06.json.
- PASS: native staging browser: Journey shows Peru, shared 6 November, country-only; revealed cards show Curaçao and Peru with their approved dates/text. The header shows Shared · Peru after the older live check-in has hydrated. Full Atlas selects the Peru polygon (visited/revealed/selected), the homepage mini-map offers/selects Peru and all three totals show17. Measured1280px layout has no horizontal overflow; this is not physical-device coverage.
- PASS: native archive has five unique direct reading links, newest first. Clicking the latest opens its full dated letter; the old #edition-brevo-9 link resolves to the same reading route. Legacy /field-notes redirects to the selected Field Notes filter, and its Philippines card opens the complete expanded note, image, author and related-story links. No ad/CMP/Analytics provider script loads on staging.
- Proof screenshots outside Hosting/Git: audit-evidence/peru-journey-2026-11-06.png and peru-home-2026-11-06.png. Original historical Postcard wording is preserved and dated; it is not presented as the latest country check-in. Archive excerpts use the existing meaningful public index excerpt rather than the letterhead or greeting.
- Production, Google recrawl/review, ad serving and physical-device testing are not proved by source tests. Google approval cannot be guaranteed. No invented minimum word count, artificial visitor activity or guaranteed approval claim is used.

## Primary guidance

Google asks for original useful content, clear navigation and added value around embedded material: [content and user experience](https://support.google.com/adsense/answer/10015918), [site readiness](https://support.google.com/adsense/answer/7299563?hl=en), [publisher spam policies](https://support.google.com/publisherpolicies/answer/11035931), [helpful people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content). The changes address concrete observed weaknesses under that guidance. Only Google can decide the subsequent review.

## Owner steps after approved production release

Open the live homepage, Journey, Atlas, Field Notes and Postcard archive. Confirm Peru is the intended broad shared location and the added story-derived text retains your meaning. After verified deployment and readback, use AdSense's **I confirm that I have fixed the issues → Request review**. Do not request review of the staging site. Leave ads disabled pending approval; do not alter payment/tax settings as a content-rejection workaround.

## Owner-approved release and Postcard refinement

The owner explicitly approved this candidate going live and the subsequent AdSense re-review, and requested images on the two image-less editions, always a website image in future, and compact click-to-open reading. Backup before this refinement: website_2026-11-06_12-45-00. No mail is authorised by this release.

- `data/postcards/covers.json` supplies the two missing covers: the existing Curaçao archive photograph with its2019 context, and a frozen local thumbnail from the owner's already-public2026 First Days in Curaçao film. The frozen file cannot silently change when the latest YouTube video changes.
- A local illustrated Postcards cover in the site's palette is the fallback for any future edition without a usable photo. The public sanitized mail exports stay unchanged. The composer resolves a suitable existing photo, explicit cover or the generic illustration; caption/alt text never asserts a fictional photo location/date. Only local approved image paths are accepted in the cover settings.
- The archive progressively enhances the full reading links into a native keyboard-accessible dialog, with original sent date/text, cover, caption, previous/next, Escape, focus return, independent scrolling and an Open as a page link. Public JSON is fetched only after choosing a letter, validated against itsID and actual24-hour boundary, and rendered as text/safe links. No raw provider HTML or private fields are rendered.
- The grid shows six editions per page with newer/older navigation when needed. Without JavaScript all initial HTML links remain available and open the complete canonical reading pages. Old #edition links now open the same popup directly; direct reading URLs remain indexable. There are no autoplay timers or subscriber/provider changes.
- Current native acceptance, final CI, production release and Google submission are recorded in the release follow-up after those actions actually complete.

### Final pre-production acceptance

- Functional source53d3e01 passed staging Hosting42266605491, isolated regression42266605444 (including the new public-archive tests and disposable rules emulator), and OneDrive source backup42266605323. The preceding full local suite passed208Node/110Python; the final added cover-origin regression also passed, bringing the source suite to209Node/110Python.
- Native browser confirmed all five grid images fully loaded, no horizontal overflow at the measured1280px viewport, the full original letter in a dialog, both captioned Curaçao covers, next/previous including5→1 wrapping, Escape returning the URL and focus to the original card, direct #edition linking, and Open as a page showing the full dated letter and image. Six-card pagination was exercised with a20-item isolated fixture; production currently has five editions, so its pager correctly stays hidden.
- Browser QA caught the new cover files initially being requested from production before deployment. Static and popup images now resolve within the current Hosting origin, tested separately and natively before release. No mail, provider schedule or Firebase/Cloudflare configuration change was made.
