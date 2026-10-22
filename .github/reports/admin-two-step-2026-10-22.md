# Owner Google sign-in and Authenticator — 22 October 2026

## Completed owner handoff and server enforcement

The owner confirmed **“gekoppeld”** after the private setup handoff. A narrowly masked account lookup confirmed one verified, enabled owner account, linked Google sign-in, a TOTP enrollment and a subsequent sign-in. The lookup explicitly excluded password hashes/salts, tokens, seeds, QR payloads, account/factor identifiers, phone numbers and profile information. Only booleans were retained in the outside-workspace evidence; `totpInfo` is an empty status object in the official API schema.

The approved strict Rules were compiled/uploaded and activated **only** for the existing Enterprise Native `dainyel-content` database at `2026-10-22T14:30:40.481632Z`. Active Rules readback exactly matched the committed source. Ruleset: `projects/dainyelonthemove/rulesets/c525e308-a575-4b9c-a365-64a2075e0a5c`. The initial operation did not immediately confirm its final readback; a separate read confirmed activation, and the resumed command detected the already-active source and only re-read it, without creating or releasing a duplicate Ruleset.

The owner predicate now requires verified owner identity **and** Firebase's signed `firebase.sign_in_second_factor == 'totp'` claim for private data and moderation. Password-only/Google-only primary sessions cannot satisfy that predicate. Existing public submission/read contracts, indexes, IAM automation, email settings and optional disabled journey service remain unchanged.

No source/UI change, new Hosting release, new credential, factor reset or email was required for this final step. No new test suite was added or run. Account state, deployment compilation and exact active-source readback were checked; no password/QR/OTP screen or browser token was inspected. The connected admin tab was signed out, so post-deployment authenticated dashboard loading was not independently observed there. The owner's successful private setup/new sign-in and the account metadata are the evidence for the owner flow; do not claim every error/recovery/device/browser path was tested.

Billing remains unlinked and the project remains on no-cost Spark. No subscriber or extra owner message was sent by Codex. The separate calendar email preference remains disabled. A pre-change source backup was created in `website_2026-10-22_16-20-51`; the prior active Rules were also saved outside Hosting before activation.

**This completion supersedes the pending-enrollment/Rules notes below, which are retained as release history.**

## Approved activation update

After reviewing staging, the owner explicitly requested **“Ga live”**. The free console upgrade to Identity Platform was completed without billing. The console showed Spark, a limit of 3,000 DAU and a recorded peak of one active user. The TOTP provider is now enabled with one adjacent interval. Google was already enabled. Both the existing canonical production domain and staging domain were explicitly authorized for Google sign-in while retaining the existing domain list.

The guarded helper readback confirmed `IDENTITY_PLATFORM`, enabled TOTP, both authorized owner domains and `billingEnabled: false`. The helper's PATCH call was corrected to pass the JSON body and safe request options as separate arguments before activation succeeded. No credential or user factor was generated, inspected or enrolled by Codex; no mail was sent by the helper. `ENROLLMENT_ENABLED` is now true for the approved frontend release.

**The strict Rules are still awaiting the owner's private enrollment and successful sign-in.** Do not describe server-enforced two-step protection as complete yet. Deploy the approved Rules only after that handoff succeeds, following the rollout below. The production frontend must support MFA before enrollment changes the shared Auth account.

The following sections record the original staging preparation; their disabled/not-activated states describe that earlier stage.

### Production publication evidence

- Source release: `2d576236d8fd97e9f3f05f348b55923826b2f99f`.
- [Production Hosting run 39788986995](https://github.com/dainyelrooi/DainyelOnTheMove/actions/runs/39788986995) completed successfully. [Staging run 39788987341](https://github.com/dainyelrooi/DainyelOnTheMove/actions/runs/39788987341) also succeeded.
- The canonical `/admin` returned HTTP 200 with `X-Robots-Tag: noindex, nofollow, noarchive` and `X-Frame-Options: DENY`. Published `admin-auth.js` matched the local source and had enrollment enabled. The local QR module returned 200 with a JavaScript MIME type. The excluded report URL returned 404.
- A fresh production browser showed the new signed-out Google/password login and trusted-browser choice; the preparation-only notice was hidden. The screenshot was saved before the owner handoff. No actual QR, secret, password or OTP screen was inspected.
- Final Auth readback still showed enabled TOTP, both authorized domains and no billing. The owner was asked to complete setup privately and confirm a successful new sign-in. **That owner step and deployment of strict Rules remain outstanding.** No enrolled-factor or successful MFA sign-in claim is made from the signed-out screenshot.
- The pre-release backup is `website_2026-10-22_15-34-42` in the sibling backups directory. Unrelated local Brevo work was not included in this release.

## Scope and current state

The owner requested both Google sign-in and Google Authenticator, entirely free. The small, locally hosted QR encoder was separately approved. This release prepares the static admin on staging. It does **not** activate MFA, enroll/change an owner credential, enable billing, deploy remote Auth/Rules settings, or publish production.

Read-only project observations: `dainyelonthemove` currently uses base Firebase Authentication (`FIREBASE_AUTH`); Google and email/password providers are already enabled; TOTP is disabled; Cloud Billing is not linked. No account record, password hash, token, QR URI, seed, recovery code or private calendar content was read for this work.

## Implementation

- `assets/admin-auth.js` isolates owner sign-in from moderation. It uses the existing Firebase SDK and project, verified owner identity, native Google/password sign-in, native TOTP resolver, reauthentication before enrollment, in-memory setup secrets, a five-minute setup timeout, and cleanup on cancellation/navigation/sign-out. No first-time account creation or email-verification sender remains in the public owner login.
- Private listeners and dashboard access wait for Firebase's signed `firebase.sign_in_second_factor == 'totp'` token claim. An enrolled owner with an older password-only session must sign in again. Account linking uses the existing owner user; it does not create a replacement owner identity.
- Trust this browser uses the Firebase SDK's local persistence only when chosen. Otherwise sign-in uses tab/session persistence. There is no local-storage MFA bypass, fixed-duration trust claim, custom token, home-grown TOTP verifier, SMS, paid runtime, or backend dependency.
- Password/code forms are handled by JavaScript, use POST as a defensive fallback, and initial login controls remain disabled until secure Auth startup completes. A twelve-second loading deadline provides a reload link if the module cannot start.
- QR encoding uses the unmodified MIT-licensed `qrcode-generator@2.0.4` module, integrity-checked against npm before copying. It is loaded only during owner setup and renders a module matrix locally. Neither QR payload nor setup key is passed to a third-party QR endpoint, logs, URL/history, Firestore, or browser storage. A manual time-based setup key supports enrollment on the same phone. License/provenance is in `assets/vendor/qrcode-generator-LICENSE.txt`.
- The local `firestore.rules` change adds a TOTP requirement to the existing owner predicate, leaving collection schemas, public moderation contracts, indexes and IAM automation paths unchanged. It has **not** been deployed. Staging Hosting does not deploy Firestore Rules.
- `ENROLLMENT_ENABLED` remains `false`. The UI explains that this is a setup preview. The flag only enables the setup UI; the server Rules are the actual private-data boundary.
- `tools/Configure-OwnerMfa.cjs --status` is read-only. The explicit enable mode checks that no billing account is linked, requires Identity Platform already enabled through the supported free console route, preserves other MFA configuration and readbacks the result. It does not enroll an owner, send mail, create credentials, or use the billing-required public initialize API.

## Checks and limits

JavaScript syntax and whitespace checks completed. The static composer regenerated the admin source and asset stamps without changing public pages. The signed-out login was visually reviewed at desktop and 393px phone width. These are source/layout observations, **not** proof of a working authenticated MFA flow. No test suite was added or run. Google account selection, enrollment, correct/incorrect codes, restored trusted sessions, Rules enforcement and recovery still need a real owner-assisted flow after activation approval. Never use screenshots or diagnostic capture while an actual QR, seed or code is visible.

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for owner-only access because they require a verified owner identity and Firebase-signed TOTP proof. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

## Free activation and safe release order — not performed

The Firebase console supports upgrading Authentication to Identity Platform on no-cost Spark without linking a billing instrument, with a limit of 3,000 daily active users for email/social providers. Use this console route; the public `initializeAuth` provisioning API requires billing and must not be used here. No SMS MFA, Blaze upgrade, card/billing account, Cloud Run or Functions service is part of this work. Stop if the actual console requires payment information.

1. Obtain current owner approval for the shared project's free Auth changes and the coordinated production admin release, as required by AGENTS.md. Staging and production use the same owner Auth account; enrolling on staging also affects future production sign-ins.
2. Review the existing project's Authentication Settings in the Firebase console and use its no-cost Identity Platform upgrade. Do not link billing or accept new legal terms on the owner's behalf without the required confirmation.
3. Enable TOTP with the prepared guarded helper only after that approval. Reconfirm Google/domain configuration and no billing. Set `ENROLLMENT_ENABLED` true, remove the preparation-only notice through that flag, regenerate the admin and deploy the approved frontend to staging and production. This must happen before enrolling so the older production admin does not strand the owner at an unsupported MFA error.
4. Hand control to the owner **before** starting real credential linking/enrollment. The owner privately signs in, confirms their identity, scans/adds the secret, preserves access and enters the six-digit code. Do not inspect a populated password field, QR, manual secret or OTP. Native Firebase enrollment revokes previous refresh-token sessions and sends its own security notification to the owner's email. This is separate from website/newsletter email, and is disclosed before the owner confirms enrollment.
5. The owner signs out/in again and confirms a real Google/password + Authenticator flow. Only then deploy the reviewed strict Rules to the existing `dainyel-content` database and verify the affected owner flow. Do not claim complete two-step protection until server enforcement and owner access are confirmed.
6. No MFA-disable/password-only bypass is offered in the admin. Lost-factor recovery requires the owner's Firebase/Google administrator access. Keep an Authenticator backup; no native recovery-code feature is claimed.

No email was sent by this implementation. Existing Postcards/question workflows remain unchanged, and the separate calendar email preference remains disabled.

## Primary references

- [Firebase TOTP MFA](https://firebase.google.com/docs/auth/web/totp-mfa)
- [Firebase Authentication with Identity Platform and Spark limits](https://firebase.google.com/docs/auth)
- [Instrumentless quotas](https://firebase.google.com/docs/auth/limits)
- [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin)
- [Persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)
- [Reserved signed token fields](https://firebase.google.com/docs/reference/admin/node/firebase-admin.auth.decodedidtoken)
- [Enrollment side effects/security notification](https://firebase.google.com/docs/reference/js/auth.multifactoruser)
- [Public initializeAuth API billing limitation](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v2/projects.identityPlatform/initializeAuth)
