# Private question email notifications — setup

## Status

Activated on 16 October 2026 after the owner's explicit approval to enable the integration and send a verification mail. Source ece1029 is on main. Initialization run 38817744884 succeeded. Verification run 38817910629 succeeded and Brevo accepted the mail; Gmail independently confirmed receipt under the existing Website label, without the INBOX label. Repository variable QUESTION_NOTIFICATIONS_ENABLED=true was visibly confirmed. No credential values, receiving addresses or visitor data are recorded here. The initial staging check 38816485132 was read-only. Post-initialization notify run 38818071767 completed its real bounded snapshot/cursor queries: no new questions, no email sent. A full real visitor submission-to-alert exercise and the first scheduled trigger remain unverified; no fictional visitor question was created.

Database metadata verified through Firebase: existing dainyel-content, Enterprise edition, Firestore Native API enabled, europe-west4, free tier eligible. Existing READY status/createdAt ascending collection indexes for questions and communityThreads are reused. No new database, paid service, Cloud Function, rules change or index deployment is required by this implementation.

## Behaviour

- GitHub Actions polls on a ten-minute schedule (minutes 7/17/27/37/47/57) after activation on the default branch. GitHub may delay scheduled jobs; this is not guaranteed instant delivery. Public-repository schedules can be disabled by GitHub after prolonged repository inactivity; check the workflow if alerts stop. No local computer needs to remain on.
- Includes new personal questions and community questions, whether pending or already moderated. Replies are not included. A question deleted before a polling snapshot cannot be detected.
- One aggregate mail per nonempty scan, from the existing verified postcards sender to the owner address held in a GitHub secret. Subject contains DainyelOnTheMove so the existing Gmail Website filter can match it. The 21 October revision includes each full question, topic, optional nickname, UTC submission time, source label and the canonical admin link. HTML escapes visitor content. This is a private owner notification, never a subscriber campaign. The public privacy notice explains this processing.
- First initialization starts at Firestore server time, skipping earlier questions. Queries project createdAt, topic, question and displayName, plus implicit document names. Each query/status is bounded to 100 rows; each mail includes at most ten questions per source, advancing only through included records so a backlog remains eligible. All status queries share one snapshot, protecting against concurrent moderation changes.
- Private operational state is one document, _automation/questionEmail. Existing catch-all Firestore rules deny all browser access to it. The existing trusted IAM service identity updates its cursor/outbox using update-time preconditions; GitHub workflow concurrency additionally serialises jobs. It does not modify questions or their moderation state.
- Prepared/attempted outbox states survive runner failures. One UUID is reused inside Brevo's documented 30-minute idempotency window. Automatic retries stop after 25 minutes if acceptance remains uncertain, requiring comparison with Brevo logs before any replay. Definite provider rejections retain the cursor for later retry. Accepted means queued, not inbox delivery. The worker never prints response bodies, secrets, question data or private cursors.
- New outboxes freeze the question text before the first provider attempt, keeping retries stable. Accepted completion removes that text from operational state; lastAccepted stores only identifiers and counts. Existing count-only outboxes retain their original payload/key for compatibility. Question records and moderation remain untouched by the worker. Owner-managed email retention still applies; there is no automatic mailbox purge.
- Standard-library Python only. Credentials are never passed to browser code. The workflow has contents:read only for GitHub; Google IAM access is the pre-existing service identity. No paid upgrades are authorised.

## Setup procedure (completed for this installation; preserve for recovery)

1. In the existing Brevo account, create a dedicated API key for website question alerts. Enter/copy credentials yourself; never paste them into chat or repository files. Prefer the narrowest sending-only permissions Brevo offers. Creating/entering a new credential is an owner handoff.
2. In dainyelrooi/DainyelOnTheMove → Settings → Secrets and variables → Actions, add repository secret BREVO_API_KEY with that value. Add secret QUESTION_NOTIFY_TO with the owner's private receiving email. Do not store the recipient in source or public workflow logs. The Firebase service-account secret already exists; do not replace it.
3. On staging, run the workflow in check mode to verify the existing identity and query shapes. Check mode is read-only and never sends email.
4. After reviewing and approving activation, make the workflow available on main. Run initialize once to establish the server-time baseline. Run verification once; it sends a clearly labelled connection message only to the configured owner and cannot duplicate an accepted verification.
5. Confirm receipt in Gmail (and Website label) before claiming delivery works. Verification receipt was confirmed through Gmail. A complete visitor submission-to-alert exercise remains unverified; do not invent visitor activity to simulate it. Run notify to verify bounded post-baseline queries without creating questions; no-new-question scans must send no mail.
6. Only after successful setup, set repository Actions variable QUESTION_NOTIFICATIONS_ENABLED to true. Removing/setting it false stops scheduled sends without deleting questions or state. A manual notify remains an intentional owner action.

## Recovery and operation

Use GitHub Actions → Private question email notifications. Check failures do not disable moderation or submissions. Never reset initialized cursors to fix an error: that could replay or skip notifications. For an ambiguous attempted send older than 25 minutes, reconcile the batch UUID against Brevo transactional logs before marking it accepted or deliberately retryable. Do not clear state automatically. Emails can consume the same Brevo free daily send allowance used by other mail; quota errors are reported and not represented as success.

Sources: https://developers.brevo.com/docs/heterogenous-versions-batch-emails ; https://developers.brevo.com/reference/send-transac-email ; https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule ; https://docs.github.com/en/billing/concepts/product-billing/github-actions .

Pre-change backup: website_2026-10-16_00-16-53. No actual credentials or recipient addresses are recorded here.


## Follow-up diagnosis, 16 October 2026

Scheduled run 38830654901 sent a real personal-question alert; Gmail receipt under Website and absence of the Inbox label were independently confirmed. The alert counted one personal question and no community questions. No visitor content was read/copied into this report. GitHub delayed its nominal ten-minute schedule by hours. Owner explicitly chose to retain GitHub with possible delays rather than introduce an external scheduling service. Manual run 38843692955 succeeded and found no further unnotified questions, so sent no duplicate. Both question collections remain included, but real community-submission receipt is not yet verified. Never reset the cursors to fix schedule delays or claim instant delivery.

## Full-text revision and complete mail-path test, 21 October 2026

Supersedes the initial counts-only behaviour and earlier unverified community-delivery status. At the owner's request, revision 7bf8630 was checked on staging and activated on main. One controlled question submitted through each production form reached the owner mailbox in one aggregate message containing both full bodies. A second notify scan found no new questions and sent no duplicate. The test questions remain private/pending while the connected owner admin session awaits sign-in for rejection. No subscriber campaign was sent. See question-notification-full-text-2026-10-21.md for run evidence, checks, privacy changes and exact remaining limitations.
