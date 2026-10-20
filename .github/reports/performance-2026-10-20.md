# Mobile homepage performance - 20 October 2026

## Authorisation and baseline
Owner supplied the mobile PageSpeed report https://pagespeed.web.dev/analysis/https-dainyelonthemove-com/eph2b3ukbv?hl=en_GB&form_factor=mobile and requested green performance, preferably above 95, with direct live publication and explicitly no subscriber email. This release includes the reviewed pending collapsed signup and compact-spacing corrections already on staging. Backup: sibling backups/website_2026-10-20_05-38-29.

Observed original PSI report (20 October 2026 05:28 CEST, Lighthouse 13.5.0, emulated Moto G Power, Slow 4G): Performance 58, Accessibility 96, Best Practices 96, SEO 100. FCP 7.1s, LCP 8.6s, TBT 80ms, CLS 0, Speed Index 7.1s. The report attributed roughly 1,389 KiB to reCAPTCHA downloads and 1,068 KiB to the homepage background MP4. No field-user data was available.

## Remediation and measured staging evidence
- The previously prepared native details signup (Home/Journey) keeps the provider iframe without a src until deliberate expansion. This prevents initial Brevo/CAPTCHA loads while retaining the real form, required consent, CAPTCHA and opt-out flow after activation.
- Before further code changes, an actual new Google PSI mobile staging run scored 97: FCP 1.0s, LCP 2.4s, TBT 0ms, CLS 0, SI 2.6s. Its SEO score is intentionally affected by staging noindex and must not be compared to production SEO.
- Added assets/hero-road-mobile-640.mp4, a silent H.264/yuv420p 640x360, 20fps derivative of the same 5.5-second title-free road clip, with metadata stripped and fast-start enabled. 358,295 bytes versus the existing desktop source's 1,094,053 bytes (67% smaller). Original desktop source retained. Existing video-autoplay.js selects the mobile data-src-mobile below 700px; no new runtime library.
- The background remains muted, looping, paused offscreen, with its existing visible play/pause control and reduced-motion handling. No audit/user-agent detection or test-specific content.
- Independent local Lighthouse 13.5.0 via installed Edge headless, mobile default throttling, before mobile derivative: 93 (FCP 1.4s, LCP 2.7s, TBT 120ms, CLS 0.001, SI 4.1s). After derivative: 96 (FCP 1.75s, LCP 2.33s, TBT 3ms, CLS 0, SI 3.60s). This is a separate local run, not the PSI server score; normal network/CPU variance applies.
- Optimized audit network log contained the mobile MP4 (~359KB transferred) and zero reCAPTCHA/Brevo requests on first load. Browser at measured 390px selected the mobile source; desktop retained its 960x540 source. Existing pause/resume worked. Signup was initially closed with no iframe src. No signup or CAPTCHA submitted.
- Authoring tools/reports are outside the web repository in sibling newsletter-drafts/performance-2026-10-20. Lighthouse was invoked from the reputable npm registry as an external authoring tool, with a separate disposable headless profile; no site dependency was added.

## Release status
Production deployment is authorised by the owner. Canonical live verification and PSI remeasurement follow; do not claim 95+ on production from staging/local evidence alone. No email is authorised for this batch.
