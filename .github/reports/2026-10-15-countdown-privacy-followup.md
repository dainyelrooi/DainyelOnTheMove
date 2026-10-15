# Countdown, public routes and privacy follow-up — 15 October 2026

The owner requested permanent redirects for the remaining retired pages, a real countdown check, correction of the About follow link, a fuller privacy notice and confirmation emails. Production publication of these corrections is explicitly authorised. Baseline: `a1255d1`; branch: `fix/countdown-privacy-follow-up`; pre-change OneDrive snapshot: `website_2026-10-15_15-16-26`.

## Findings and source changes

- Fresh production HTTP checks before editing pass for all 27 retired aliases (nine names in `.html`, bare and trailing-slash forms). Nine fresh mobile browser navigations reach the current sections/archive, show the current theme and 2026 footer, and fit the viewport. The reported old page content was not reproduced. Existing redirects, sitemap and safe noindex fallback pages are retained. Google still needs to recrawl old URLs; a redirect is not instant removal of an old search snippet.
- The existing production countdown was already ticking: actual browser text changed from 36 seconds to 35 in the recorded baseline. It depended on the optional trip JSON completing successfully. It now starts immediately from the confirmed departure `<time>` in the HTML, and can still apply the published feed later. Failed, missing and delayed feed paths all tick. A plain HTML label and honest no-JavaScript departure fallback remain readable, and the countdown section no longer uses skipped off-screen rendering. Pause/resume, visibility handling and the confirmed Netherlands departure offset are retained.
- About's “Follow the journey” now targets `/#follow-trip`; browser activation closes the panel and reaches the existing registration form. The creator-kit film link still correctly targets films.
- The privacy notice now describes consent and security interests, purposes, private/public access, retention, processors, international processing, external players, owner-only location, withdrawal/rights and complaint routes. It identifies the existing public Dainyel/Netherlands/Instagram contact. Full legal name and a public privacy email are still requested from the owner; the private admin address has not been made a public privacy address. Do not describe this as a completed legal review.
- Retention is explicit and owner-managed: unpublished submissions up to 90 days, Field Notes registrations up to 24 months or earlier withdrawal, request records up to 12 months after closure, relevant published contributions reviewed annually. The admin includes the manual review reminder. No purge job or data deletion was performed.
- The admin list now accurately calls existing email entries registrations/interests with unverified email. Its private access, queries, editing and delete actions are unchanged.

## Email dependency remains open

Inspection confirms `js/field-notes.js` only adds a consented registration to Firestore; it has no email delivery service. No verified sender/provider account or public sign-up URL is available in the current authorised configuration. The owner has been asked which provider to use, plus the public controller identity/email. These answers are still pending.

Prepared `.github/reports/field-notes-email-activation.md` with a free provider-hosted double-confirmation route, confirmation/welcome copy, consent/unsubscribe requirements and concrete activation/inbox checks. This is preparation, **not a connected mail service**. Public signup/privacy text still states that automatic email is not active. No account was created, subscriber exported, mail sent, API credential added or billing plan changed. Do not claim the user's confirmation-email request is finished until the real provider is connected and an authorised inbox test passes.

## Focused checks

- 13 browser checks pass locally: four actual ticking paths (normal/failed feed/missing feed script/delayed feed), pause/resume, departure boundary/Netherlands offset, About CTA plus required signup consent and unchanged fixture write, privacy at 320/390/768/1440px, zero focused automated axe violations, and readable no-JavaScript departure text.
- 20 generated HTML pages pass local references and unique IDs; both Hosting targets retain their 27 permanent redirects. Composition is repeatable. No new background buttons. Countdown/admin JavaScript syntax and the public trip validator pass.
- Firebase settings, Auth configuration, rules/indexes, public trip data, Q&A and registration submission contracts are unchanged. Tests use isolated service fixtures and no real database writes or emails. Changed text contains no credential patterns; `private/` was not read.
- Evidence is saved outside Hosting under the Codex output directory `countdown-privacy-followup`, including baseline, focused results, route results and mobile/no-JavaScript/privacy screenshots. Hosted checks must be recorded after deployment.

## Reference basis

Reviewed current primary guidance: [AP retention](https://autoriteitpersoonsgegevens.nl/nl/over-privacy/persoonsgegevens/bewaren-van-persoonsgegevens), [European Commission legal grounds](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data_en), [individual rights](https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en), [Firebase privacy and service retention](https://firebase.google.com/support/privacy), [data processing terms](https://firebase.google.com/terms/data-processing-terms). Some AP pages refuse automated fetches; search results and Commission guidance were used for the notice. These sources do not substitute for the owner's identity/operational retention decisions.
