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
- Staging deployment, HTTP observations and browser review: pending at preparation time.
- No production, email, billing, backend or database/Auth configuration action is included.
