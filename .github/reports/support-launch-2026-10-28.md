# Support launch — owner-approved 21 October 2026

The owner requested publication of the coming-soon version now, automatic availability on 28 October (or a reminder if necessary), and a support/site-update section in the existing departure Postcard.

## Website implementation

- About and every shared footer keep the existing `/about#support` route.
- Before `2026-10-28T00:00:00+01:00` the visible card shows `Coming soon` and the opening date. The owner-supplied WhyDonate button is hidden.
- From that instant (27 October 23:00 UTC), `assets/support-release.js` shows the existing linked button. It rechecks on tab visibility, browser cache restoration and the date timer. No Codex reminder, server job, new runtime, API, payment script or future deployment is needed.
- This is date-based browser presentation, using the visitor's clock. It is not an access-control boundary for the already-public fundraising URL. Without JavaScript the notice/date and explanatory fallback remain visible.
- No real donation, donor-details submission or payout test has been performed.

## Checks

- JavaScript syntax, composed-page/reference checks and whitespace checks passed.
- Isolated clock checks passed immediately before, exactly at and after launch; the link stays hidden before launch and appears at the exact Amsterdam date boundary. Timer, hidden-tab resume and pageshow restoration passed.

## Departure Postcard

- Existing campaign #8 is the only intended 28 October send, scheduled for 12:00 Europe/Amsterdam. Campaign #9 must remain untouched.
- The existing local HTML draft outside this repository has an added voluntary-support section linking to `/about#support` and a concise list of already-public improvements: mobile browsing, atlas photographs, Q&A/community, Thailand chapter galleries, Postcard wall and Field Notes. Clean canonical links replace legacy `.html` URLs.
- Preserve sender, subscribed-only audience and unsubscribe, do not reveal future trip details in public source, and do not send an immediate release or test email.
- The existing Brevo campaign #8 was updated in place through its HTML editor. The original provider body matched the saved original before replacement. The support section, website links and unsubscribe placeholder were verified in the rendered provider preview and the saved campaign summary.
- The subject still clearly announces departure. Preview text now reads `The journey starts today — plus Buy me a coffee and the latest website updates.`; saved text was checked for accidental duplication.
- The recipient editor confirms existing list `Postcards from Dainyel #3` and condition `Email campaigns subscriptions = Subscribed`. No audience setting was changed. The verified sender and unsubscribe remain intact.
- The campaign list after saving confirms #8 still Scheduled for 28 October 2026 at 12:00 and #9 still Scheduled for 4 November at 12:00. No duplicate campaign, immediate send or test email was created. Scheduled is not evidence of future delivery.
- Editable HTML, its original backup and provider screenshots remain in the sibling newsletter-drafts folder outside the web repository.

## Production verification

- Owner-approved production release `120f249` completed successfully on the existing production target.
- Canonical `/about#support` visibly shows `Coming soon` and 28 October; the donation area is hidden. Live HTML contains the exact opening instant and versioned activation script. The shared footer route from Stories reaches the correct section.
- The known non-sensitive hidden report URL returned HTTP 404. No backend, billing, database/Auth configuration or new email service was deployed.
- A reminder is not needed for this implementation. The date switch runs in the visitor's browser and does not depend on the owner's computer or Codex being open. Existing paused reminder/sender automations remain untouched.
