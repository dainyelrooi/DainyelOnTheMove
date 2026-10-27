# Owner plan: one combined Postcard — 27 October 2026

Owner changed the delivery plan: do not send the delayed27October Field Note email separately. Keep the existing28October Brevo campaign/time and add a reference to the pre-departure story. Publish the story today if safely possible. No immediate newsletter or test send is authorized.

## Exact cancellation during the quota incident

The original linked request was independently read as queued, pinned revision6, with no phase or campaign ID. A guarded cancellation write was attempted and definitively rejected by the free daily write quota. Payload/history were not changed.

Automatic approval review rejected disabling the whole production Postcard workflow because that would affect unrelated/future jobs. That broad action was not performed. The safer alternative keeps global delivery enabled and records only exact owner-cancelled request IDs in a non-secret private repository variable. The worker validates complete IDs (no wildcards), withholds only matching requests before provider lookup/mutation, and saves cancellation using its existing CAS when storage permits. A quota rejection cannot release the hold. Existing provider-native campaigns and unrelated jobs continue normally. Any existing provider handoff needs separate reconciliation; no database state can recall a sent campaign.

`POSTCARDS_CANCELLED_JOB_IDS` was saved for the one delayed request. The owner chose to wait for normal Field Note publication; the static candidate is not authorized for deployment. No publication cancellation or extra entry-cancellation mechanism is retained.

Five isolated cancellation tests and twelve scheduled-content tests passed, including quota failure/no provider call, exact targeting, preservation, non-target behavior and uncertain handoff. Independent read-only review found no blocker. Staging regression40524417106 and final40526325160 passed. The source-only change is active on main218dbc4; static candidate files were never committed or deployed. Global delivery remains enabled, with the one exact cancelled ID independently visible in its saved repository variable. At19:07UTC no queued or running older Postcard workflow existed; no old in-flight run was left to bypass the new guard. Database cancellation readback remains blocked by quota, so do not claim that row already says cancelled.

## Existing Brevo campaign updated

Campaign8 was edited directly without suspending, duplicating, sending or rescheduling it. Added one pre-departure section with the original /entry/ link. The rest of the HTML, subject, sources, sender, opt-out and content remained byte-for-byte unchanged outside that insertion. Original HTML backups are outside Hosting/source in the sibling newsletter-drafts folder. Real saved preview confirmed the new heading and direct link.

The saved audience remains Postcards list3 plus Email campaigns subscriptions=Subscribed. Saving that unchanged dynamic selection recalculated the stale eight-recipient estimate to twelve active recipients. No import, individual address list, resubscription or suppression change. Independent campaign-list readback at19:06UTC still showed Scheduled28October2026 at12:00Europe/Amsterdam; campaign9 remained Scheduled4November12:00. No test or immediate campaign was sent. A scheduled provider state does not establish future inbox delivery. Final UI evidence remains outside Hosting in audit-evidence/campaigns-scheduled-2026-10-27-final.png.

## Normal publication and follow-up

The owner explicitly chose waiting for normal CMS publication, so the original Field Note plan remains unchanged and the alternative static candidate stays isolated/uncommitted. On27October19:02UTC a fresh masked Firestore read still returned the free daily read-unit limit. /qa and the checked CSS/JS assets independently returned HTTP200. Missing Q&A, community, admin/CMS data and uploaded CMS media can therefore be explained by quota; do not assume every static asset failure has that cause or that existing data was deleted. No fresh visitor submission was tested.

After a separate explicit owner approval, one thread heartbeat was created for28October08:15Europe/Amsterdam (COUNT1), ID controleer-field-note-v-r-de-postcard. It checks the normal production Field Note and may start the existing current-main publication worker once if the exact queued revision6 is still eligible. It must never send the cancelled standalone mail, publish the static candidate, change campaign8's12:00schedule or bypass overdue/security checks. It reports confirmed publication or a concrete blocker before the planned mail. This is an extra Codex check; native website and provider tasks remain separate.

Backup before edits: website_2026-10-27_15-34-40. Static article investigation is separate; do not claim that its conversion or publication is completed here.
