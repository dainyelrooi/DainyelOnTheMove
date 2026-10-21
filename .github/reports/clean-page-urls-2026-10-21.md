# Clean page URLs — 21 October 2026

## Request and authorization

The owner requested removing `.html` from all page addresses and links. This batch is prepared for staging review; production needs separate release approval. No newsletter or other release mail is authorized.

## Implementation

- Existing Firebase Hosting targets use `cleanUrls: true` and `trailingSlash: false`. Firebase documents the automatic extension removal and permanent redirects at https://firebase.google.com/docs/hosting/full-config#control_html_extensions . Retired blog/destination/update aliases point directly to clean destinations. Old active-route redirects back to `.html` were removed to prevent loops. Index variants redirect to `/`.
- Source and output filenames remain `.html`; ordinary static hosting is retained. Shared templates, canonical/alternate/social URLs, structured data, breadcrumbs, sitemap, archive records, generated notes/Postcards and search data use clean page URLs.
- `tools/site_urls.py` separates public URLs from source filenames, preserves query strings/fragments and leaves external links/media files unchanged. The composer normalizes generated page links and the dormant server's shared shell. No optional runtime is activated.
- Browser modules use clean links for menus, standalone-page actions, sharing, Q&A permalinks, challenges, search results and atlas story links. Story URL allowlists accept flat clean paths plus legacy HTML paths without accepting arbitrary origins or traversal. Homepage modal routing, section fragments and browser history remain in place.
- Admin clean/legacy/studio paths retain noindex and frame-denial response headers; robots includes clean admin restrictions. Incoming clean root page paths retain explicit no-cache headers. Staging noindex and all existing Hosting exclusions remain.
- The local safe preview resolves clean routes only to existing allowed HTML documents. Actual redirects, query handling and response headers must be observed against staging Hosting.
- Existing authoring validators were adapted to clean URLs. No new test suite was introduced or run. The normal composer validates its authored data while generating pages.

## Release evidence

- Backup: `website_2026-10-21_20-58-05` in the existing sibling backups folder.
- Branch: `feature/clean-page-urls`, based on the completed photo release.
- Initial code commit: `69bc25ace6976da9250c4cf84a294dff33c8c8a8`; staging workflow `39658549552`, job `119425191586`, succeeded. A browser review then found that the existing homepage interception also intercepted the generated “Open as a page” action; commit `345733e4033dcd49b69b2de60166f7111e225ade` exempts that explicit standalone action while retaining ordinary homepage panel navigation.
- Actual staging HTTP inventory: all 24 active clean page paths returned 200; their 24 legacy `.html` variants returned 301. `/atlas/` redirects to `/atlas`; index variants redirect to `/`; retired blog/destinations/updates aliases redirect to their clean replacements. Query parameters survived legacy/index/retired-route redirects.
- `/admin` and `/studio` returned the existing noindex/noarchive and `X-Frame-Options: DENY` protections. Clean root documents retained no-cache response headers; staging retained global noindex. The report URL returned 404, confirming tooling remains excluded.
- Actual browser navigation from `/atlas.html?place=belgium#map` ended at `/atlas?place=belgium#map`, with the Namur photograph loaded and the production canonical ending in `/atlas`. The rendered page had no internal `.html` links. Homepage Atlas navigation still opened its existing `/#map` panel.
- Search for “Room to breathe” displayed the generated clean result `/note-room-to-breathe`; following it loaded the correct Field Note and clean canonical. Its related story and atlas links retained their section/place details.
- Observations are stored outside the web repository at `C:/Users/dainy/Documents/Codex/2026-10-21/clean-url-release/http-observations.json`, with browser captures `atlas-clean-url.png` and `note-clean-url.png`. These were release observations, not a new automated test suite. Normal composition, JavaScript syntax checks and whitespace checks completed successfully.
- Final staging workflow `39659862271` for `345733e4033dcd49b69b2de60166f7111e225ade` succeeded. After reloading the homepage panel, clicking “Open as a page” navigated to `/atlas`, displaying the correct standalone heading and clean canonical. Final screenshot: `C:/Users/dainy/Documents/Codex/2026-10-21/clean-url-release/atlas-clean-page.png`.
- No production, email, billing, backend or database/Auth configuration action is included.

## Production release

- The owner subsequently reviewed staging and explicitly requested “ga live”. This authorizes this reviewed routing release only; no release or test email is authorized.
- Pre-release backup: `website_2026-10-21_21-18-11`. The reviewed staging tree is `554ac5b188c375a2cc76e7c8a73a79f2292ac9b5`; only this approval record is added for production.
- Production commit `2e436490eaab6fe5dfe28b6733645cc5aad7b4f7` deployed successfully through workflow `39660523453`, job `119431998556`, to the existing production target.
- The live HTTP inventory repeated the staging paths: clean pages returned 200, old `.html` paths redirected with 301, query parameters survived, protected `/admin` and `/studio` retained noindex/frame-denial headers, and the excluded report path returned 404. Evidence: `C:/Users/dainy/Documents/Codex/2026-10-21/clean-url-release/production-http-observations.json`. The 25 successful single-segment clean routes include the 24 page routes and `/studio`; 29 observed legacy HTML variants (including special/retired aliases) returned 301.
- Live `/atlas`, `/assets/site-ui.js`, `/sitemap.xml` and `/data/services.json` exactly matched their reviewed Git blobs. Local Windows checkout line endings differ from the published Git blobs; raw checkout-byte comparisons were therefore superseded by Git-blob comparisons. `journeyApi` remains false.
- In the browser, the old `/atlas.html?place=belgium#map` address redirected to `/atlas?place=belgium#map`; the Namur photo loaded, the canonical was `/atlas`, and no internal `.html` links remained on that page. The navigation Atlas link opened the clean standalone `/atlas` address. Screenshot: `C:/Users/dainy/Documents/Codex/2026-10-21/clean-url-release/atlas-live-clean-page.png`.
- No release/test email or subscriber campaign was sent. No new test suite was added or run for this deployment.
- Preserve scheduled mail and private question notifications. No billing, backend, database Rules/indexes or Auth configuration deployment is included.
