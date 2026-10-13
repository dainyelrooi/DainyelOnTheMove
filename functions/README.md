# Community AI moderation

This folder contains a trusted, server-side moderation workflow for the public community conversation on DainyelOnTheMove.

## What it does

- **Community questions and replies** are reviewed by Gemini after a Firestore create event.
- Useful, respectful, travel-relevant submissions with high confidence are published automatically.
- Ambiguous, promotional, unsafe, hostile, or low-confidence submissions remain `pending` for Dainyel to review in `/studio`.
- **Personal questions** in the `questions` collection are deliberately not processed here. They remain Dainyel's own review and answer workflow.
- Each decision creates a private audit record in `moderationEvents` and an owner email document in `mail`.

## Data protection

The moderation call runs in Cloud Functions. Visitors never receive the Gemini credential and cannot approve their own contribution from browser developer tools. `GEMINI_API_KEY` is defined as a Firebase Secret and is bound only to the two moderation functions.

The `mail` collection is server-write-only. Configure Firebase's official **Trigger Email** extension with an SMTP provider to deliver these documents to `dainyelr@gmail.com`. Until the extension is installed, the documents remain a private delivery queue and no emails are sent.

## One-time Firebase setup

1. Upgrade the Firebase project to the Blaze plan and enable the **Cloud Functions API**. Cloud Functions is required for a trusted Firestore trigger.
2. In the project root, install the function dependencies:

   ```powershell
   cd functions
   npm install
   cd ..
   ```

3. Create a Gemini Developer API key securely. Do not put it in source code. Save it directly to Firebase Secret Manager:

   ```powershell
   npx -y firebase-tools@latest functions:secrets:set GEMINI_API_KEY --project dainyelonthemove
   ```

4. Configure the official Trigger Email extension with a transactional SMTP provider, using `mail` as its watched collection. Restrict the extension's sender to a verified `@dainyelonthemove.com` address.
5. Deploy just this backend:

   ```powershell
   npx -y firebase-tools@latest deploy --only functions --project dainyelonthemove
   ```

The functions run in `europe-west1`, the nearest Cloud Functions region to the Firestore database in `europe-west4`.

## Moderation threshold

Only an explicit `approve` result with confidence of at least 85% is published. Everything else stays private for manual review. This deliberately favors visitor safety and avoids accidental publication.
