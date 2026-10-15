# Postcards email activation — 15 October 2026

## Current status

The owner confirmed receipt of the confirmation email and, after confirming, the welcome email. Brevo domain/sender verification and the CAPTCHA-protected form are saved. The website integration is deployed and verified on staging only; production is unchanged until release approval.

- Newsletter: **Postcards from Dainyel**. Sender/reply-to: **Dainyel on the Move <postcards@dainyelonthemove.com>**.
- Public privacy identity approved by the owner: **Dainyel**, contact **support@dainyelonthemove.com**. A surname or private postal address has not been approved; do not infer or publish one. This is not a claim of complete legal review.
- Existing Brevo list and form were reused. Form editor: https://app.brevo.com/contact/forms/subscription/edit/6ad1328d7ff07bf6f6e9ca2a . Required unticked consent, privacy link, reCAPTCHA v2, double confirmation with template #5, welcome with #6, hide-after-submit and honest check-inbox message are saved.
- The owner created and entered the dedicated CAPTCHA credentials directly; no secrets were read or written into this repository.
- New website sign-ups follow a normal public link to the hosted form; they work without site JavaScript and do not trigger an additional Firestore registration or load provider scripts on the homepage.
- Earlier Firebase registrations remain private and accessible to the owner. No migration, campaign or bulk email was sent. The owner submitted the inbox test himself.
- Homepage, story CTA, privacy/cookie notice and admin guidance were updated. Q&A, Auth, Firestore rules and existing records are unchanged.

## Checks still outstanding

- Actual unsubscribe behaviour, duplicate sign-up and reply receipt at postcards, plus support forwarding receipt. Two received emails do not prove these flows.
- Optional open/click tracking: per-template UTM switches were off, broader provider tracking has not been fully verified. The notice describes technical activity records without claiming tracking is disabled.
- Any further sender/controller postal identity required for the owner’s circumstances; no private profile data may be published without permission.
- Production release requires owner approval.

Local review: the homepage rendered without horizontal overflow at 1280px; the Postcards CTA opened the real hosted form with the consent checkbox and CAPTCHA. The homepage contained no legacy signup form or Brevo iframe. Generated files were refreshed with Compose-Site.py and git diff --check passed.

## Operation

Manage new subscribers, messages and opt-outs in Brevo, accessible from the private admin hub. Confirmation is required before a visitor joins the confirmed list. Honour unsubscribe requests and avoid re-importing opted-out addresses. Manually review newsletter registrations after 24 months or earlier withdrawal, retaining only the minimum suppression record needed to honour opt-out. There is no automatic deletion job. Preserve the earlier Firebase registrations until properly reviewed, without treating their old status as double opt-in.

A free provider-hosted form avoids mail API credentials in browser code, a new backend and a Firebase billing upgrade. Provider limits still apply. Sources: [Brevo forms](https://help.brevo.com/hc/en-us/articles/208771869-Create-a-sign-up-form-in-Brevo), [free limits](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan).

## Evidence and backup

Safe screenshots are outside Hosting under the Codex task outputs/email-setup folder: brevo-sender-verified.jpg, brevo-confirmation-template.jpg, brevo-records-green.jpg, brevo-welcome-preview.jpg. The CAPTCHA-prepared image predates credential creation and contains no keys. The owner’s inbox result is reported by the owner, not an agent-observed mailbox inspection.

Pre-integration OneDrive backup: `website_2026-10-15_23-30-49`. Initial setup documentation backup: `website_2026-10-15_22-22-49`. No credentials or subscriber data are included here.

## Staging deployment

Commit `b9a6a2fd8c5e15bdafd31df4287718434ff89e81` was pushed to staging without a force-push after confirming no remote divergence. GitHub Actions staging run 38810701708 succeeded. The deployed /#follow-trip visibly shows Postcards and the new CTA, without the legacy form. Screenshot: outputs/email-setup/postcards-staging.jpg outside Hosting. The viewport override did not consistently apply to the intended tab, so no mobile verification is claimed for this change. No production deployment or backend rules change occurred.

## Superseding inline signup release

The owner requested on-site email entry and Analytics, explicitly approving production release after fixes. See postcards-analytics-release.md for the embedded form replacing the direct-link primary action. The owner confirmed the inline staging CAPTCHA/check-inbox/confirmation-mail path on 15 October. The earlier staging-only release restriction does not override this explicit approval.
