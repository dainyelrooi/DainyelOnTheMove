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
- Provider update/schedule verification is still in progress; a local draft alone is not evidence that Brevo has been changed.
