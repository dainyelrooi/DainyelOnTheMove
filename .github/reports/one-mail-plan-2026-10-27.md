# Owner plan: one combined Postcard — 27 October 2026

Owner changed the delivery plan: do not send the delayed27October Field Note email separately. Keep the existing28October Brevo campaign/time and add a reference to the pre-departure story. Publish the story today if safely possible. No immediate newsletter or test send is authorized.

## Exact cancellation during the quota incident

The original linked request was independently read as queued, pinned revision6, with no phase or campaign ID. A guarded cancellation write was attempted and definitively rejected by the free daily write quota. Payload/history were not changed.

Automatic approval review rejected disabling the whole production Postcard workflow because that would affect unrelated/future jobs. That broad action was not performed. The safer alternative keeps global delivery enabled and records only exact owner-cancelled request IDs in a non-secret private repository variable. The worker validates complete IDs (no wildcards), withholds only matching requests before provider lookup/mutation, and saves cancellation using its existing CAS when storage permits. A quota rejection cannot release the hold. Existing provider-native campaigns and unrelated jobs continue normally. Any existing provider handoff needs separate reconciliation; no database state can recall a sent campaign.

`POSTCARDS_CANCELLED_JOB_IDS` was saved for the one delayed request. The matching entry-cancellation mechanism is inert unless a separate explicit entry-conversion decision is made. No entry ID is configured for it yet.

Six isolated cancellation tests and twelve scheduled-content tests passed, including quota failure/no provider call, exact targeting, preservation, non-target behavior and uncertain handoff. Worker release and actual provider campaign edit remain to be verified.

Backup before edits: website_2026-10-27_15-34-40. Static article investigation is separate; do not claim that its conversion or publication is completed here.
