# Full private question alerts — 21 October 2026

## Scope and implementation

Owner requested the full question inside private owner notifications and explicitly requested complete testing. No subscriber newsletter was sent. Existing scheduled Postcards editions, Auth, Firestore Rules/indexes, billing and the disabled optional journey service were not changed.

Revision 7bf8630 adds full text, topic, optional nickname, UTC timestamp and source label in plain/escaped HTML. Existing private recipient and verified sender are reused. Up to ten items per source are frozen in the existing private pending outbox for stable retries; accepted completion removes that text from operational state. Safe cursors leave any backlog eligible. Existing count-only prepared batches retain compatibility. No question text or receiving address is included in this report or public workflow logs.

Pre-change OneDrive backup: website_2026-10-21_07-26-45. The public privacy notice now explains the private Brevo notifications. It is composed from its authoring template.

## Checks and actual delivery

- Fifteen isolated standard-library Python tests passed locally and in Actions, covering both mail sources, full Unicode/multiline/maximum-length text, optional nickname, escaped visitor HTML, exact recipient scope, query projection, snapshot/batch boundaries, equal-time cursors/backlog progress, stable retry payload/key, ambiguous timeout retention, expired retry refusal, definite rejection, provider duplicate handling, completion cleanup and legacy outboxes.
- Composer and public route/Hosting exclusion checks passed. Staging forms loaded and became enabled through the existing secure service.
- Staging read-only access check run 39550700698 succeeded for the existing Enterprise database and all six indexed query shapes; mail credentials were configured. Staging Hosting run 39550700711 and production Hosting run 39551404202 succeeded.
- Two clearly labelled controlled test questions were submitted through the actual production visitor forms, one personal and one community. Both displayed successful pending-review messages; neither appeared in its public feed.
- Manual production notify run 39552078846 succeeded. Gmail independently confirmed one received aggregate email at 05:53:39 UTC containing both complete questions, both second lines, correct topics/nickname, source headings, timestamps and the admin link. Both plain and HTML parts were inspected. This verifies actual receipt, beyond Brevo's queued response. The existing Website label was applied; Inbox was absent.
- A second production notify run 39552546644 succeeded and logged “No new questions; no email sent.” Gmail still contained exactly one matching controlled-test email.
- Canonical privacy URL returned 200 with the revised notice. The known non-sensitive .github/reports/question-notification-setup.md URL returned 404, confirming authoring reports remain excluded from Hosting.

## Test-data cleanup

The two controlled test records remain private and pending. Both public feeds were checked and contained neither test. The connected production admin tab still displays the sign-in form, so owner-only queue inspection/rejection could not be completed. The owner reported signing in elsewhere, then agreed to sign in inside Codex; that connected session has not yet become authenticated. No password was read or stored. The Firebase console also did not provide access, so no configuration or permission workaround was attempted. Reject only the two clearly labelled controlled email test questions through the existing owner UI once that session is available; do not publish or permanently delete them. No real visitor records were modified.

## Operational limits

The existing default-branch GitHub schedule remains enabled. Its nominal ten-minute cadence can be delayed by hours; owner previously chose to keep that arrangement. This test used manual notify runs. A future scheduled execution of the new revision has not yet been observed. Replies are outside this notification scope. Deleted-before-snapshot questions cannot be detected. Provider quotas and ambiguous sends can pause notifications safely; never reset the cursor/outbox as a shortcut.
