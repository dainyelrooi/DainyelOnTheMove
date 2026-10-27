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

## Runtime verification

Pending: release the worker-only fix, re-read the due plan, publish once, verify the actual public reader, then process the original linked mail once and reconcile its provider state. A successful workflow alone is not proof of publication, send, delivery or inbox receipt.

Reference: https://firebase.google.com/docs/firestore/reference/rest/v1/Write
