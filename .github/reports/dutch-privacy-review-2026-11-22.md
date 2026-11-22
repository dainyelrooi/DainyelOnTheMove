# Dutch website privacy and transparency review — 22 November 2026

Owner request: check the existing travel website against Dutch requirements and correct identified issues. This technical/documentary review covers consent controls, notices, signup invitations, external players and support links. It is not a legal certification or an assertion that every Dutch law has been assessed.

Recovery source: `b0e00a0a0ba06deea2af11968b59ef99209ef0cd`, preserved on local Git branch `backup/privacy-review-pre-20261122`. This cloud workspace has no Windows/OneDrive source access; no local OneDrive backup is claimed. Git history is preserved.

## Corrections

| Finding | Change |
| --- | --- |
| Initial Analytics message lacked a direct policy link and withdrawal explanation. | Add policy/provider/data information and the exact Cookies & settings route before consent. Preserve equal accept/refuse controls and no optional tag before grant. |
| Withdrawing required opening another dialog. | Add direct Withdraw Analytics consent on settings page: persist refusal, deny Analytics storage, stop measurement, clear first-party GA cookies and reload production. |
| Browser-storage notice omitted actual first-party names/periods. | Accessible table separates 180-day choice validity, six-month GA cookie lifetime, 24-hour/30-day invitation suppression and tab-session preference. Explain that an expired local record may remain until replaced/cleared. Do not invent provider security lifetimes. |
| Weekly signup copy diverged from current plan. | Update homepage/generated Journey and embedded existing Brevo form to around two Postcards a week, including Q&A invitations and optional support links. Preserve required unticked consent, CAPTCHA, provider endpoint and immediate single opt-in. |
| Privacy notice had stale contact/ads wording and omitted exports/workflows. | Explain the public sent-Postcard archive without recipient/tracking links, up-to-24-hour public reading reserve, GitHub processing, contact forwarding state and actual Analytics-only phase. Date older Analytics retention evidence. |
| Player notices omitted withdrawal beside choice. | Add player-scoped permission, closing instructions and provider privacy links beside load step. External frames stay absent until deliberate loading. |
| Support copy asserted payment methods. | Let WhyDonate present actual methods/terms. Explain optional external support, separate from subscription/purchase and without a tax-deductible charity claim. |

## Evidence and limits

Baseline live homepage inspection confirmed the existing equal privacy choices, collapsed signup and public policy/settings links. Source inspection confirms analytics-only mode, production-host gates, no advertising tag in that phase and moderated private submissions. No Rules/Auth/security/billing release is performed.

Local validation: 45 focused Node tests passed, including direct-withdrawal persistence, stop/clear/reload, early-click safety, staging/private-route gates, invitation behavior and editor boundaries. Three public-consent Python checks, Check-Journey, Validate-PublicTrip, JavaScript syntax and whitespace checks passed. Full staging CI and browser/deployment receipts follow separately.

No subscriber/test email, real signup, CAPTCHA solution, provider campaign mutation, opt-out change, visitor-data purge, contract acceptance, advertising activation or paid service is part of this maintenance. One protective account setting was changed after native observation: Brevo per-contact tracking consent was disabled (all tracked); now enabled, with unknown-consent tracking disabled. Saved state survived reload. No contacts were granted tracking consent. Provider documentation says this limits individual opens/clicks, not every technical pixel, delivery/security record or service statistic. Single opt-in remains the owner-approved design; double opt-in is not presented as a universal Dutch requirement. Static website changes do not verify historic consent, native provider behavior or actual manual deletion.

## Open owner/provider requirements

1. Owner-confirmed full legal controller identity is still required. The owner has now confirmed a personal hobby project; business-specific duties depend on actual activity and should be revisited if it changes. Do not derive private details from account/repository metadata. Only the existing approved Dainyel/support identity is published.
2. Native hosted-form wording and unchanged single confirmation/list selection were rechecked after saving and reopening. Complete historic consent-evidence, opt-out and real unsubscribe behavior checks. The protective Brevo tracking setting is now verified as described above. Marketing permission and website Analytics permission do not automatically cover email tracking. No tracking-disabled claim can follow from website source alone.
3. Confirm applicable processor agreements and international-transfer safeguards, including actual backup provider/retention. Linked policies are not proof of signed agreements.
4. Operate the disclosed manual deletion/review schedule across records, providers and backups, and verify current Analytics account retention. No automated purge is promised or executed.
5. Confirm media licences/portrait rights and identify actual paid/gift/commission relationships beside relevant content. Do not label ordinary editorial links as paid without evidence. No webshop/direct checkout was found in reviewed public templates; consumer/business/accessibility duties depend on actual activity.

These open facts prevent claiming the entire website/business is fully compliant. Distinguish source tests, deployment, observed browser behavior and unverified operational/legal facts.

## Primary guidance consulted

- [AP: clear cookie banners](https://autoriteitpersoonsgegevens.nl/themas/internet-slimme-apparaten/cookies/heldere-cookiebanners): prior permission, equal refusal and simple withdrawal.
- [AP: cookie policy](https://autoriteitpersoonsgegevens.nl/themas/internet-slimme-apparaten/cookies/cookies-en-uw-organisatie-zorg-voor-een-goed-beleid): provider, purpose and periods.
- [AP: right to information](https://autoriteitpersoonsgegevens.nl/nl/zelf-doen/gebruik-uw-privacyrechten/recht-op-informatie): identity, purpose/basis, retention, recipients and rights.
- [AP: retention](https://autoriteitpersoonsgegevens.nl/themas/basis-avg/avg-algemeen/bewaren-van-persoonsgegevens): establish necessary periods and operate them.
- [ACM: spam](https://www.acm.nl/nl/telecom/zakelijk-abonnement-voor-bellen-en-internet/spam): prior permission and unsubscribe in each message.
- [RVO: business correspondence](https://ondernemersplein.overheid.nl/wetten-en-regels/regels-voor-bedrijfscorrespondentie/): applicable public business identification.
- [Stichting Reclame Code: FAQ](https://www.reclamecode.nl/over-de-src/faq/): recognizable sponsorship/affiliate relationships; advertising-code guidance is distinct from statute.

Pending: staging CI/deployment, live verification and remaining owner/provider facts.

## First staging receipts

Functional source `3e14ab88dda3c09cfebc97ddc8d09f06d02cfc2c`: Hosting 45000257924, isolated regression 45000257896 and OneDrive cloud backup 45000257968 succeeded. Native settings dialog acceptance followed by direct withdrawal changed the status from allowed to declined. Screenshot revealed small native policy buttons; the follow-up styles give them explicit 44px targets. No physical-device test is claimed.

[Brevo provider guidance on per-contact tracking](https://help.brevo.com/hc/en-us/articles/37114679474706-About-email-tracking-pixels-and-the-CNIL-recommendation-in-Brevo) was checked for behavior. Its CNIL recommendation is not represented as Dutch statutory guidance.

Native provider review also found the hosted form still described weekly delivery. Only its introduction and consent wording were updated to the same around-two-per-week scope; the privacy link was preserved. Existing list selection, simple welcome confirmation and required CAPTCHA/consent were retained. Final provider-page/public-form verification is recorded after completion. No subscriber was added or contacted by this edit.

## Verified final release

Functional source `efce50cc57eb070ce5b1e25a99da95ba4d8b5ffb` is live. Final staging Hosting 45000673819, regression 45000673833 and OneDrive cloud backup 45000673831 succeeded. Production Hosting 45000854070 and CodeQL/main 45000853748 succeeded. The existing scheduled website clock 45000873002 independently completed normally; it was not manually dispatched as a test.

Canonical HTTP verification matched all three exact consent/style assets, updated privacy/cookie/signup content and five main page routes. The excluded report returns 404. All five existing trip/journey/Cloudflare/Postcard/video data responses retain their baseline hashes. Production reading generation `d7ff9bfa988241dbab7218d8d2e5eef2` and its 27 public entries were preserved.

Native canonical browser check: remembered refusal loaded no GA/ad script; enabling Analytics through its unchecked settings control loaded only the Google Analytics tag; direct withdrawal reloaded with no GA/ad tag. The withdrawal target measures 44.39px high. Test-site acceptance followed by direct withdrawal changed allowed to declined. The signup iframe had no src before opening; once opened its newsletter checkbox was required and unchecked, with the updated twice-weekly scope. No CAPTCHA was solved, no registration submitted and no email sent by this review. These checks establish observed tag/control behavior, not exhaustive browser/network/provider or physical-device coverage.

Brevo native provider readback after reload confirmed per-contact tracking consent Yes / unknown-consent tracking No. The existing hosted form was saved with the same endpoint, required opt-in/CAPTCHA, existing selected list and Simple confirmation email. Reopening confirmed both updated text fields persisted. The separate public preview link was not usable through the browser (invalid URL policy rejection); no alternate network route was attempted for that preview. The embedded website form and native saved-state checks remain the stated evidence. Full real signup/unsubscribe delivery remains unexercised.

No full Dutch-law conformity claim: legal controller/business identity, actual processor/transfer agreements, media rights and operated retention/deletion still require owner/provider facts. The earlier local OneDrive limitation is separate from the verified cloud source backup run above.

## Owner clarification — personal hobby project

On 22 November 2026 the owner confirmed that DainyelOnTheMove is a hobby project. Add this factual description to the public privacy notice. Project status is resolved; full legal controller name remains unconfirmed for publication. This statement does not infer registry/tax status, determine all actual business activity, remove cookie/newsletter safeguards or establish the private-household GDPR exception for an openly accessible website. No private name/address or company numbers are invented.

Recovery point for this narrow text follow-up is `3e32cd47f358ffefe28f431e97971ca702b4baee`, retained on local `backup/privacy-hobby-pre-20261122`. No local OneDrive access is claimed. Existing pipeline cloud backup remains the source-backup route. Consent code, forms, provider settings, records and email schedules are untouched by this follow-up.

Guidance checked: [AP on personal/household use](https://autoriteitpersoonsgegevens.nl/themas/basis-avg/avg-algemeen/grondslagen-avg-uitgelegd) and [KVK registration criteria](https://www.kvk.nl/starten/moet-ik-mijn-bedrijf-inschrijven-bij-kvk/). Owner self-description is recorded without treating it as a blanket legal exemption.
