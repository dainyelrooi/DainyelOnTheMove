# Owner-approved Postcard capability activation

24 October 2026, Europe/Amsterdam. The owner's annotation “schakkel in” authorises the existing production send/schedule capability. It does not authorise sending a message now.

## Actual operations and evidence

- Required pre-change OneDrive source backup: `backups/website_2026-10-24_18-11-13` (outside web source).
- Masked fresh named-database readback: production outbox empty and both delivery settings disabled before activation. Rules exactly matched source. No public check copies remained.
- Main configuration check workflow **40110489652** succeeded. Its `check` branch only reads provider free plan, verified fixed sender and exact saved segment; validates the bounded outbox query and refreshes disabled staging settings. No campaign endpoint mutations.
- Set only `POSTCARDS_DELIVERY_ENABLED` to true, then dispatch main workflow `postcard-delivery.yml` with **activate**, never process/send. Activation **40110569112** succeeded. It additionally checks the existing Enterprise free-tier database and writes the production delivery settings. The activation branch returns before campaign processing.
- Fresh masked readback: production setting true, staging setting false, production outbox empty. `POSTCARD_ARCHIVE_ENABLED` stays true; `CONTACT_DELIVERY_ENABLED` stays false.
- Existing signed-in Google/TOTP live admin received the real settings update and visibly displayed **Subscriber delivery is connected. Review your email and confirm before sending.** No Postcard draft or delivery request was made. Save, preview and exact owner consent still guard the real buttons.
- Updated read-only release preflight to accept the approved matching production state and continue rejecting unexpected staging/contact activation. Updated owner guide.

## Boundaries

The normal scheduled worker can now process future explicit owner send/schedule requests without Codex or a running local computer. Background jobs may be delayed. No newsletter/test mail or campaign mutation was requested for this activation; existing native Brevo schedules, reminders, question alerts, saved subscriber membership/suppression, provider security and credentials are unchanged. An accepted request/provider Sent state does not prove inbox delivery. An actual send was deliberately not exercised.

My kit photo work is a separate staging-only change and is not included in this production operational update.
