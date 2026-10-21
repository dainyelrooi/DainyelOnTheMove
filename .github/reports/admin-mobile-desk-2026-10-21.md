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

Staging deployment evidence will be added after its workflow completes.
