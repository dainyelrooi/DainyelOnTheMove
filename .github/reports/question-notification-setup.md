# Private question email notifications — setup

## Status

Prepared at the owner's explicit request for email when a visitor submits a question. Not yet enabled or delivery-tested. The initial staging push performs a read-only access/query check; it does not send mail or write notification state.

Database metadata verified through Firebase: existing dainyel-content, Enterprise edition, Firestore Native API enabled, europe-west4, free tier eligible. Existing READY status/createdAt ascending collection indexes for questions and communityThreads are reused. No new database, paid service, Cloud Function, rules change or index deployment is required by this implementation.

## Behaviour

- GitHub Actions polls on a ten-minute schedule (minutes 7/17/27/37/47/57) after activation on the default branch. GitHub may delay scheduled jobs; this is not guaranteed instant delivery. Public-repository schedules can be disabled by GitHub after prolonged repository inactivity; check the workflow if alerts stop. No local computer needs to remain on.
- Includes new personal questions and community questions, whether pending or already moderated. Replies are not included. A question deleted before a polling snapshot cannot be detected.
- One aggregate mail per nonempty scan, from the existing verified postcards sender to the owner address held in a GitHub secret. Subject contains DainyelOnTheMove so the existing Gmail Website filter can match it. Mail contains only counts and the canonical admin link; no question text, nickname or visitor contact details leave Firestore in the email.
- First initialization starts at Firestore server time, skipping earlier questions. Queries project only createdAt and implicit document names. Each query/status is bounded to 100 rows; safe per-collection progress avoids skipping unread rows. All status queries share one snapshot, protecting against concurrent moderation changes.
- Private operational state is one document, _automation/questionEmail. Existing catch-all Firestore rules deny all browser access to it. The existing trusted IAM service identity updates its cursor/outbox using update-time preconditions; GitHub workflow concurrency additionally serialises jobs. It does not modify questions or their moderation state.
- Prepared/attempted outbox states survive runner failures. One UUID is reused inside Brevo's documented 30-minute idempotency window. Automatic retries stop after 25 minutes if acceptance remains uncertain, requiring comparison with Brevo logs before any replay. Definite provider rejections retain the cursor for later retry. Accepted means queued, not inbox delivery. The worker never prints response bodies, secrets, question data or private cursors.
- Standard-library Python only. Credentials are never passed to browser code. The workflow has contents:read only for GitHub; Google IAM access is the pre-existing service identity. No paid upgrades are authorised.

## Required one-time owner configuration

1. In the existing Brevo account, create a dedicated API key for website question alerts. Enter/copy credentials yourself; never paste them into chat or repository files. Prefer the narrowest sending-only permissions Brevo offers. Creating/entering a new credential is an owner handoff.
2. In dainyelrooi/DainyelOnTheMove → Settings → Secrets and variables → Actions, add repository secret BREVO_API_KEY with that value. Add secret QUESTION_NOTIFY_TO with the owner's private receiving email. Do not store the recipient in source or public workflow logs. The Firebase service-account secret already exists; do not replace it.
3. On staging, run the workflow in check mode to verify the existing identity and query shapes. Check mode is read-only and never sends email.
4. After reviewing and approving activation, make the workflow available on main. Run initialize once to establish the server-time baseline. Run verification once; it sends a clearly labelled connection message only to the configured owner and cannot duplicate an accepted verification.
5. Confirm receipt in Gmail (and Website label) before claiming delivery works. Submit an explicitly identified owner check via the normal Q&A form, then run notify or wait for the schedule. Confirm the second alert and check that a later no-new-question run sends no duplicate. Do not create fictional visitor activity.
6. Only after successful setup, set repository Actions variable QUESTION_NOTIFICATIONS_ENABLED to true. Removing/setting it false stops scheduled sends without deleting questions or state. A manual notify remains an intentional owner action.

## Recovery and operation

Use GitHub Actions → Private question email notifications. Check failures do not disable moderation or submissions. Never reset initialized cursors to fix an error: that could replay or skip notifications. For an ambiguous attempted send older than 25 minutes, reconcile the batch UUID against Brevo transactional logs before marking it accepted or deliberately retryable. Do not clear state automatically. Emails can consume the same Brevo free daily send allowance used by other mail; quota errors are reported and not represented as success.

Sources: https://developers.brevo.com/docs/heterogenous-versions-batch-emails ; https://developers.brevo.com/reference/send-transac-email ; https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule ; https://docs.github.com/en/billing/concepts/product-billing/github-actions .

Pre-change backup: website_2026-10-16_00-16-53. No actual credentials or recipient addresses are recorded here.
