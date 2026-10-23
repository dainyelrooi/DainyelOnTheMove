# Command Center private calendar bridge

The owner requests executable private content calendars and staging-first website changes with a separate production approval for one tested version. This batch adds a link from the existing private calendar to the independent Command Center and a manually dispatched private importer.

The importer accepts only a UUID job reference. It retrieves draft content directly from the private dashboard using a short-lived GitHub Actions OIDC identity. The dashboard accepts only this repository's exact main-branch workflow, issuer, audience and dispatch event. The existing Firebase service-account secret remains in GitHub Actions. No credential or draft is added to public source, logs or artifacts.

Imports are restricted to the existing `dainyel-content/contentCalendar` collection, at most 30 drafts per request and 200 total. New documents use the established deterministic IDs, dates and fields, with scheduled and published false. Repeated imports preserve owner edits and completion flags. Conflicting draft content stops for review. No Firestore rules, Auth, database configuration, paid runtime, subscriber campaign or existing reminder schedule is changed.

Four isolated importer tests cover Amsterdam summer/winter time, the invalid spring clock jump, permitted Canva URLs, create-only writes, repeat imports and conflicting owner edits. The public trip validator and site composer pass.

Activation requires separate production approval: GitHub dispatches need the workflow on the default branch. Until then the dashboard must report the private upload as pending. Live end-to-end Canva generation, upload and owner reminder also require new owner Canva/Calendar grants and ChatGPT sign-in; unit tests are not evidence of these external actions.

Public staging contains only the admin explanation and link. It contains no draft captions, generated designs or future itinerary details. The existing production journal, MFA and scheduled Postcards are preserved.
