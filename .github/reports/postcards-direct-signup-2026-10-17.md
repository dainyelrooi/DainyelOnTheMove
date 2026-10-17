# Postcards direct signup — 17 October 2026

## Owner request and scope

The owner explicitly approved replacing the mandatory email confirmation click with immediate signup and one informational welcome email. This is a signup configuration/copy update, not a new-content release; no subscriber campaign is sent.

## Backup

Pre-change OneDrive snapshot: `backups/website_2026-10-17_04-54-59` (source baseline `55b70e0`).

## Brevo configuration saved

- Existing Postcards website form: `6ad1328d7ff07bf6f6e9ca2a`.
- Changed Double confirmation email to Simple confirmation email; selected existing template #6, Postcards — welcome. Kept existing list #3 and public form endpoint.
- Saved success message: “You're on the list! A welcome postcard is on its way to your inbox. No confirmation click is needed. If you cannot find it, check your spam folder.”
- Welcome template #6 changes only the sentence claiming email ownership was confirmed; it now says the recipient is subscribed and no confirmation click is needed. Existing subject, sender, design, story/privacy links and unsubscribe placeholder remain.
- Required consent, CAPTCHA, opt-out automation and newsletter suppression remain. No credentials, subscriber records, bulk imports, old pending confirmations or existing opt-outs were changed.

## Website source

Updated the shared homepage/Journey signup help, embedded-form success message and Postcards privacy explanation. Re-composed root HTML using the existing authoring tool. AGENTS.md and PROJECT_HANDOFF.md record the new single-opt-in flow while retaining historical double-opt-in evidence and prohibiting silent conversion of old pending/opted-out contacts.

## Verification and release state

- Brevo UI showed saved Simple confirmation email and existing Postcards — welcome selection.
- Inspected welcome content and retained sender/unsubscribe configuration.
- No real visitor submission or CAPTCHA completed in this task; receipt of the new single-opt-in welcome flow is not yet verified. Earlier double-opt-in receipt is historical evidence only.
- Website copy deployed successfully to staging (`f2e7ee9`) using the existing Firebase CLI/Hosting staging target. The GitHub staging push succeeded, but no new Actions run was visible when inspected, so deployment was completed directly without changing workflows.
- Staging homepage dropdown visibly contains immediate-signup help, the existing required consent field and CAPTCHA. Staging embedded form, privacy and Journey pages return HTTP 200 with the revised copy. No form submitted.
- A copy of the original welcome template HTML is saved with the pre-change OneDrive snapshot. Screenshots of saved Brevo selection and staging signup are in the local media cache.
- Production website publication requires this release's explicit owner approval under AGENTS.md. Remote Brevo signup settings already apply to new submissions, as explicitly requested. Until the website-copy release, old production help/success/privacy wording can still refer to the previous confirmation step; this does not change the saved provider subscription mode.
- No Firebase Auth, Firestore, Analytics consent, question-alert or media changes.
