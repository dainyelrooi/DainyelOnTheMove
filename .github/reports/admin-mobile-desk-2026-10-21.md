# Admin organisation — 21 October 2026

Owner supplied a phone screenshot of the unstyled journey form and requested a clearer admin page. Scope is staging presentation; no production release or email is authorised for this batch.

## Changes

- Five workspace views replace the single long list: Questions, Create, Location, Postcards and Published. Navigation uses native links, active location, browser history and heading focus. Changing views preserves entered form values.
- Journey fields have explicit labels, readable controls, grouped text/date/place/expense/review sections and optional media/advanced disclosures. A destination must be chosen explicitly rather than silently defaulting to the first archive destination.
- Saving/publishing remains unavailable while the existing optional journey service is disabled. The UI explains this, keeps write buttons disabled and allows the local preview after owner initialisation. Hidden/inactive controls and preview-before-publish behaviour are retained. No service was activated.
- Existing Q&A moderation, location handlers, IDs and subscriber registration separation remain. Earlier registrations and privacy housekeeping can be expanded separately. No visitor data was created, changed, published or emailed in this design task.
- Admin joins the existing template composer; its standalone CSS and navigation script are versioned by the composer. Local fonts replace the admin's external font stylesheet. Auth, Rules/indexes, Hosting security headers and noindex routing are unchanged.

## Review and limits

Pre-change backup: website_2026-10-21_08-19-44. Source branch: feature/admin-mobile-desk.

The layout was reviewed in a separate loopback-only preview containing static markup/public style assets, without Firebase account code or account records. Both the phone form and question overview were inspected, including expense-specific fields. This is visual evidence, not authenticated moderation or publication testing. No test suite was added or run for this presentation request. Production approval is still required.

Revision b255df4 was deployed successfully by staging Hosting workflow 39557994613. The staged /admin.html and /studio routes returned 200 with the new stylesheet, noindex/nofollow/noarchive and DENY frame headers. The scoped stylesheet returned 200, and the known non-sensitive report URL returned 404. The staged browser showed the new sign-in page with the dashboard still unavailable to a signed-out visitor. Production retained its previous admin version. Composer, JavaScript syntax checks and whitespace review completed without errors.

The phone layout screenshot is a clearly separate local design preview, without account data or connected Firebase code. Actual owner sign-in, moderation, storage and publication were not exercised in this presentation task. Online journey saving remains disabled as before.
