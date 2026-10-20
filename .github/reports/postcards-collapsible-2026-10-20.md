# Collapsible Postcards correction - 20 October 2026

Owner requested restoring click-to-fold signup after the homepage refresh. Staging only, pending production approval for this correction. Backup: sibling backups/website_2026-10-20_05-00-46.

- Kept the postcard styling and wrapped the existing iframe and signup note in native details/summary, initially closed. One source change in .github/templates/pages/index.html propagates to Home and Journey via the existing composer fragment.
- Existing assets/postcards-frame.js already supports loading the iframe only on first expansion. No new JavaScript, form endpoint, provider setting, consent, CAPTCHA or subscriber-flow changes. Closing retains the iframe rather than resetting entered data.
- Added scoped summary styling in assets/design-system.css; keyboard focus and native open/closed semantics remain. Plus cue rotates to a close cue when expanded.
- Composer and whitespace checks completed. Original iframe markup and signup note/fallback are unchanged. Generated root HTML includes the new shared CSS fingerprint.
- Staging browser: Home initially closed with no iframe src; Enter opens and assigns postcards-form.html; Enter closes and retains src. At 390px the card remains closed initially with no horizontal overflow. Journey initially closed with no src; expanding visibly loads the email field, required unchecked consent, CAPTCHA and existing submit button. Closing works and retains src. No signup submitted, no CAPTCHA solved, no newsletter sent. A temporary browser DNS failure resolved on subsequent page observation; the Journey/form URLs also returned HTTP 200.
- Screenshots outside Hosting: sibling newsletter-drafts/postcards-collapsed-2026-10-20.png and postcards-collapsed-mobile-2026-10-20.png.
- Firebase staging deployment completed. Production remains the prior approved release with its open form until this correction is approved.
