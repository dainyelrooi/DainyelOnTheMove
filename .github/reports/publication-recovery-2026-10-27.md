# Due publication recovery — 27 October 2026

Owner approval: start and publish the existing due Field Note and its linked Postcard, including new qualifying subscribers. Preserve the approved content, revision, sender, suppression and other scheduled campaigns.

## Confirmed fault and repair

- Manual production publication run 40498107627 reached the due job, but its atomic commit was not confirmed. The plan remained queued and no public document existed. The linked mail correctly waited without a provider handoff.
- The worker sent `verify`, which is not an operation in the Firestore REST v1 Write contract. The previous mock incorrectly accepted this operation.
- Replace it with an update containing the exact already-read draft fields and exact update-time precondition. The draft revision, content and owner-facing saved timestamp are preserved. Its internal update time advances. Publication, summary and completion marker still commit atomically; cancellation/deletion/edit races still abort.
- Unconfirmed worker exceptions now produce a failing job, with only an HTTP status when available. No content, subscriber details, credentials or response bodies are logged.
- REST contract and exact draft-preservation tests added. All 34 Python tests on the isolated production baseline passed; independent read-only patch review found no blocker.
- Backup before edits: `website_2026-10-27_14-44-00`. The hotfix is isolated from concurrent Pinterest staging work and unrelated owner changes.

## Audience checked

Existing segment 1 remains Email campaigns Subscribed AND member of Postcards list 3. Its current detail view showed 12 qualifying contacts, including five added 26 October. The segment-list cached count of seven was stale. Keep the existing dynamic segment rather than a frozen set of addresses. New subscribers qualify up to provider audience evaluation; subscribing after a completed send does not automatically resend an old edition.

## Runtime verification and current blocker

- Worker-only fix released on main at 6f7feb2, isolated from the concurrent Pinterest feature. No frontend, Rules, Auth, provider settings or billing release. Staging regression 40516276031 and 40516608144 passed; read-only publication preflight 40516608067 passed. An earlier staging preflight failed with its original generic diagnostic; its cause was not established.
- One production retry of the original due plan: run40516931771, job122233054429. At13:59:55UTC it reported HTTP429 and correctly failed instead of reporting a successful publication. Do not retry repeatedly while quota is unavailable.
- Direct Firebase console observation confirmed Spark/$0 and an exceeded no-cost limit. Current quota period displayed27–28OctoberGMT-7, ending28October08:00Europe/Amsterdam. Existing Pinterest staging incident documentation separately records that temporary large image writes exhausted the daily free write quota; no paid upgrade was made. Existing images/calendar cleanup is handled separately and is not part of this recovery.
- Independent masked readback after the retry: original plan still queued at revision6; public document absent; linked mail still queued at publicationRevision6, with no campaignId, phase or providerStatus. The old revision2 job remains cancelled. No Postcard delivery workflow was dispatched, no provider campaign/send/test was performed, and no subscriber was changed.
- **BLOCKED:** actual publication and send are not complete. The free quota must recover before the existing atomic writes can succeed. Native workers remain enabled and can retry, but GitHub timing is not guaranteed. The existing24-hour overdue review guard is retained; do not silently widen it, change the approved copy/date/revision, or claim inbox receipt. If the jobs enter review after delay, obtain owner guidance for the date-sensitive content before rescheduling.
- Next verification: re-read the exact plan/draft/mail state after quota recovery; if still eligible and unprocessed, publish the reviewed snapshot once; verify actual public reader and summary; then process the one linked mail and reconcile actual provider campaign/recipient count. Never issue a separate manual campaign while the original request could still send later.

Reference: https://firebase.google.com/docs/firestore/reference/rest/v1/Write
Quota reference: https://firebase.google.com/docs/firestore/enterprise/quotas-native-mode
