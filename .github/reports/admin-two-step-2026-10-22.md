# Owner Google sign-in and Authenticator preparation — 22 October 2026

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
