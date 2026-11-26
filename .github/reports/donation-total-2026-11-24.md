# Automatic donation total — 24–26 November 2026

## Approved scope and recovery

The owner chose **an automatically updated total without a target**. Add it to the existing About support card at `/about#support`, in the existing navy/sand/teal design. Keep the homepage uncluttered and preserve the shared footer's existing support link. Do not introduce a percentage, invented goal, donor list, payment widget, donation transaction, newsletter, paid plan or new service.

Source branch: `feature/donation-total-20261124`. Pre-change OneDrive backup: `website_2026-11-24_13-06-40`. Production release approval for this feature has not yet been given.

## Implementation

- `.github/cloudflare/support-total.mjs`: bounded GET of the one official public WhyDonate campaign. Extract only its EUR aggregate, convert to integer cents, validate campaign identity and reject malformed, redirected, oversized or stale data. Five-minute in-memory/edge cache, concurrent-request sharing and one-minute upstream failure backoff. No D1/Firestore query or write; no visitor credentials forwarded. Return only schema version, currency, amount and source-check time.
- `.github/cloudflare/worker.mjs`: additive read-only `/support-total` route, with the existing environment/origin boundary. Inbox, moderation, photo uploads and the existing daily admission cleanup remain unchanged. Requires no new binding, secret, scheduled job or permission scope.
- `assets/support-total.js`: lazy read when the support card is open and in/near view; refresh against the source-check time about every five minutes. Stop the refresh timer while hidden/offscreen. Format euros including cents. Display a real source-check timestamp. On failure show the ordinary campaign link, never an invented zero or an indefinitely stale amount.
- Shared support template/style: restrained amount display inside the existing card, polite accessible status, no count-up animation and usable no-JavaScript fallback. Generated About/search files are refreshed by the existing composer. All **806 existing editor fields** remain exact.
- Isolated regression tests added to the existing quality workflow. No runtime package dependency added.

This is the public campaign's raised total, **not** a verified bank balance, payout or net amount after fees/refunds. Decreases in the source total are respected. Updates also depend on WhyDonate processing the donation; this is cached polling, not an instant payment webhook.

## Evidence and remaining checks

| Check | Status | Evidence |
| --- | --- | --- |
| Official upstream and actual extraction | PASS | Campaign HTML read-only returned 50 EUR on 24 November and **150 EUR on 26 November, around 19:11 UTC**. Parser used the actual `wd-fundraiser-state` aggregate. No donor information stored or logged. |
| Worker/router and existing inbox regression | PASS | Focused tests cover totals, cents/zero/refunds, strict identity/currency, bounds, caching, concurrency, failure/backoff, CORS and storage-free reads, alongside existing private-intake/upload tests. |
| Frontend behavior | PASS | Isolated DOM fixtures cover lazy loading, shared requests, formatting, stale/error fallback, source-age refresh timing and hidden-page timer cleanup. These are not physical-device tests. |
| Existing Python checks | PASS | 239 isolated tests passed on 26 November; their fake provider/Rules messages are fixtures, not remote writes. |
| Existing authoring controls | PASS | Composer retains all 806 controls; no editing catalogue changed. |
| Cloudflare staging deployment and real endpoint | BLOCKED | Existing CLI authentication is unavailable. An attempt to renew the same previously approved four scopes reached a browser `ERR_CONNECTION_TIMED_OUT` at `dash.cloudflare.com`; the CLI callback subsequently expired. No broader rights were requested, no new credential was published and no Worker deployment is claimed. |
| Native visual/mobile verification | Pending | Browser tooling/connection must be working; actual served staging amount must be verified after Worker deployment. |
| Production | NEEDS REVIEW | No production website/Worker deployment, database/security/payment setting or provider campaign mutation for this feature. |

## Beheer (Nederlands)

De teller hoort onder **About → Support the journey**, bereikbaar via dezelfde link in de footer. Hij neemt het openbare totaal van je bestaande WhyDonate-actie over. Je hoeft geen bedragen in de admin bij te houden. Er is bewust geen doelbedrag of procentbalk. De donatieknop blijft naar WhyDonate gaan.

Bij een verbindingsprobleem blijft ‘See the total on WhyDonate’ beschikbaar. Controleer daar dan de bronstand. Verander je later de campagne-URL of de valuta, laat dan ook deze vaste koppeling aanpassen; er is geen algemene proxy voor willekeurige campagnes.

## Sources and maintenance

- [Owner's public campaign](https://whydonate.com/nl/fundraising/dainyelonthemove)
- [WhyDonate's official website integration options](https://whydonate.com/donate-button-website)
- [Cloudflare Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)

The public page state is an observed upstream format, not a promised versioned donation API. If WhyDonate changes it, strict parsing falls back to the campaign link. A real new payment, refund, payment-method flow and payout were not performed as a test.
