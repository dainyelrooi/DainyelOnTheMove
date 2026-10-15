# Inline Postcards and consent-controlled Analytics — 15 October 2026

Owner requested email entry within the website and GA4 G-EYLP0YYJMJ, explicitly approving production release after fixes. Pre-change backup: website_2026-10-15_23-39-19.

## Implementation

- Official Brevo HTML obtained from the existing form Share/HTML UI, isolated in same-origin postcards-form.html to prevent provider CSS affecting the site. Compact email/required consent/CAPTCHA/submit, inline provider messages, direct hosted fallback. Existing endpoint, double opt-in and welcome templates retained. No mail API key or CAPTCHA secret; the reCAPTCHA site key in this public embed is intentionally public. The owner reports adding the staging hostname to the key's allowlist.
- Automatic frame sizing checks origin and source; lazy loading preserves the initial homepage. No second Firestore subscription.
- One shared first-party analytics consent loader per real public page. Google tag loaded only after affirmative choice on production hosts. Advertising consent denied, signals/personalisation disabled; configured page URLs/referrer omit query and fragment. No custom email/question/account data events. Admin, signup iframe, retired redirects, search, 404 and staging/local hosts have no measurement.
- Equal reject/accept actions, persistent footer settings, six-month choice/cookie lifetime, withdrawal and Analytics cookie clearing. Analytics account retention/enhanced measurement configuration has not been inspected. No claim of legal completeness or verified reporting dashboard.
- Privacy/cookie notices and persistent instructions reflect these changes.

## Verification

Composer refreshed generated files. JavaScript syntax and git diff whitespace checks passed. Local consent can be rejected and reopened; no Google tag exists before acceptance. Localhost CAPTCHA is intentionally not allowlisted; verify the permitted staging/production host instead. Earlier provider-hosted confirmation and welcome mail receipt was confirmed by the owner. The owner completed the embedded staging CAPTCHA and confirmed both the check-inbox message and confirmation-email receipt. The CAPTCHA visibly loaded on the allowed staging host. The form rendered without horizontal overflow at the observed 726px viewport. Frame sizing settled at 475px. Staging returned noindex headers and the internal report URL returned 404.

Pending release evidence: production verification, real unsubscribe/reply receipt, and Google Analytics reporting visibility. Syntax, page-loader counts and private-credential pattern checks passed; the deliberate public CAPTCHA site key is not a secret. Whitespace from the provider export was normalised in a follow-up commit.
