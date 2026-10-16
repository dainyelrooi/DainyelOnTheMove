# Responsive checks and Postcards opt-out — 16 October 2026

## Scope

Follow-up to standalone-pages-audit.md. No website runtime files, Firebase configuration or production deployment changed. Pre-edit backup: website_2026-10-16_05-34-25.

## Responsive browser evidence

- Measured content widths 305, 375 and 753px, corresponding to requested viewports 320, 390 and 768px with a scrollbar. Earlier unsuccessful viewport overrides are not counted.
- Homepage, about, videos, atlas, journey, qa, my-kit, collaborate, field-notes, thailand, bali, thailand-solo and philippines: document scroll width equalled client width at each size.
- Philippines mobile heading/banner visually inspected. Navigation opened with Enter and closed with Escape. Both Q&A forms enabled; empty submissions focused an invalid required field without creating a question.
- Foreground film on the smallest viewport: dialog width 290px without overflow; decoded readyState 4, paused false, time beyond 19 seconds. Focus wrapped between last link and close control; Escape closed the dialog.
- Journey Postcards disclosure loaded its frame on demand; the narrow form body measured 219px with equal scroll width. No CAPTCHA was solved or real question submitted.
- Temporary viewport override reset. These checks do not establish physical-device behaviour, exhaustive accessibility conformance or Core Web Vitals scores.

## Real unsubscribe finding and mitigation

The owner authorised unsubscribing their own existing Postcards welcome email. Brevo displayed success, but the contact history identified a transactional unsubscribe while Email campaigns remained Subscribed. The sender-specific transactional permission was removed. Therefore the success page alone was insufficient evidence of newsletter suppression.

Created and activated Brevo automation #1, **Postcards - honour newsletter opt-outs**:

1. Trigger: Unsubscribed from emails, Transactional email.
2. Email Name filter: Postcards — welcome (#6) and Postcards — confirm your email (#5).
3. Action: Blocklist contact for Email campaigns only.
4. Re-entry after exit enabled; no email-sending action, paid upgrade or new credential.

The template filter excludes the separate operator question-alert API messages. Brevo maintains distinct campaign/transactional suppression: [official explanation](https://help.brevo.com/hc/en-us/articles/209458705-What-is-a-blacklisted-contact-).

The old unsubscribe token reported already unsubscribed and did not generate a fresh automation event. The owner deferred the new signup/CAPTCHA/DOI step. Consequently this automation is active but its fresh end-to-end execution remains unverified (activity count zero at inspection).

To honour the actual authorised opt-out now, the owner's campaign status was manually set to Blocklisted. Transactional status remained Subscribed and the existing Postcards sender permission was restored so previously authorised owner question alerts can continue. Provider UI confirmed both states. Do not automatically re-subscribe the owner to marketing; a later deliberate form signup and confirmation is required.

No campaign, fake question, fabricated subscriber or new test email was sent. Delivery of operator alerts was not re-tested in this exercise. No subscriber addresses, personal unsubscribe URLs or keys are recorded here.

## Pending by owner choice

Fresh on-site signup with CAPTCHA, DOI confirmation, new welcome mail, unsubscribe via its fresh link, and verification that automation #1 records the event and campaign blocklisting. Also still unverified: reply/forwarding receipt, duplicate signup behaviour and a separate real community-question-to-alert exercise.

Safe screenshots remain outside Hosting in the local task outputs/email-setup folder: mobile-philippines-320.png, postcards-optout-rule-active.png and owner-newsletter-suppressed.png. The older success-page screenshot is not evidence of campaign suppression.
