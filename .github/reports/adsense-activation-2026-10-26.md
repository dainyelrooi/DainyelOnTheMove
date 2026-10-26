# AdSense activation — 26 October 2026

## Owner request and scope

The owner annotated the statement that advertising and Analytics stay off without valid consent with “zet ze aan”. Auto ads was enabled in the existing matching AdSense account, preserving the single native Google consent message and existing visitor-choice checks. This is not permission from individual visitors and was not treated as such. No authentication, IAM, billing, tax, mail, subscriber, campaign or publication-schedule setting was changed.

Pre-change source backup: sibling `backups/website_2026-10-26_16-22-51`. Unrelated quiet-growth AGENTS/report edits are preserved.

## Actual provider action

PASS: the native Ads table initially showed Auto ads OFF. The existing site's Edit screen was opened; Auto ads was enabled, with only in-page banner ads. Anchor, side-rail and vignette formats were disabled; intent-driven and Multiplex formats remained disabled. Banner maximum was moved to the UI's lowest offered value (6), spacing to the highest offered value (60; no undocumented physical unit asserted), and Find more ad placements on article pages was disabled.

Apply to site → Apply now → Save returned Google's Success confirmation. The native table then showed Auto ads ON and Auto optimise OFF. No experiment was launched. Google's message states changes can take up to an hour to appear. Screenshot outside Hosting: `C:/Users/dainy/Documents/Codex/2026-10-26/adsense/auto-ads-enabled.png`.

The site list still showed Getting ready and ads.txt Authorised. Activation is not Google approval or proof that ads are being served. Code-level exclusions for admin, previews and dedicated forms remain unchanged, independent of the account's page-exclusion count.

## Analytics and native consent evidence

PASS: independent read-only source review confirms Analytics already starts automatically on Google's analytics-storage GRANTED signal. The shared bootstrap similarly resumes ads only on granted ad storage. There is no missing local global activation switch; unknown/denied/non-applicable/unconfigured states deliberately remain off. No source or deployed loader change was needed.

PASS: all 9 existing focused privacy-consent tests passed, including grant/refusal/revised-choice and route gating. These use simulated provider/browser objects and do not establish actual native Google or network behaviour.

PENDING: after activation, the canonical cookies page was checked using Google's documented `fc=alwaysshow&fctype=gdpr` preview. The AdSense tag was present, the retired local banner and Analytics tag were absent, and no native consent dialog was observed. Native rendering/accept/refuse/reopen and actual ad serving remain unproven. Source review found no verified local message-suppression defect; provider approval/eligibility or browser configuration must not be stated as a confirmed cause. The configured published message and owner logo remain unchanged. No consent record was forged or visitor refusal overridden.

## Primary references

- [Google: Set up Auto ads](https://support.google.com/adsense/answer/9261307?hl=en-GB)
- [Google: Privacy and Messaging API](https://developers.google.com/funding-choices/fc-api-docs)
- [Google: CMP and consent requirements](https://support.google.com/adsense/answer/7670013?hl=en)
- [Google: Pausing ad requests](https://support.google.com/adsense/answer/7670312?hl=en)

This record proves saved provider activation, not universal consent/legal compliance, ad impressions, Analytics receipt or a performance score. No email was sent.
