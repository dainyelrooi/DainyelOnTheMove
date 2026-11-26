# Automatic donation total — 24–26 November 2026

## Approved scope and recovery

The owner chose **an automatically updated total without a target**. Add it to the existing About support card at `/about#support`, in the existing navy/sand/teal design. Keep the homepage uncluttered; point the existing shared footer support action to this card, with the original external donation button inside. Do not introduce a percentage, invented goal, donor list, payment widget, donation transaction, newsletter, paid plan or new service.

Source branch: `feature/donation-total-20261124`. Pre-change OneDrive backups: `website_2026-11-24_13-06-40` and `website_2026-11-26_14-23-59`. Production release approval for this feature has not yet been given.

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
| Cloudflare staging deployment and real data | PASS | Following the initial timeout, the owner signed in and the existing four scopes/refresh access were renewed normally. Official Wrangler deployment `f8be37bd-f7af-4785-8d79-7edcbc0ae4a5` retained the existing test D1 binding/private settings. The actual staging page retrieved and rendered 150 EUR plus its source-check timestamp, matching the independent official campaign read. No hardcoded amount. |
| Native visual/mobile verification | PASS | Real staging browser at 390×844 and 1280×900: 150 EUR visible, no horizontal overflow, usable donation action; no captured browser console errors. Viewport override reset afterwards. No physical phone or new payment test. |
| Production | NEEDS REVIEW | No production website/Worker deployment, database/security/payment setting or provider campaign mutation for this feature. |

## Beheer (Nederlands)

De teller hoort onder **About → Support the journey**, bereikbaar via dezelfde link in de footer. Hij neemt het openbare totaal van je bestaande WhyDonate-actie over. Je hoeft geen bedragen in de admin bij te houden. Er is bewust geen doelbedrag of procentbalk. De donatieknop blijft naar WhyDonate gaan.

Bij een verbindingsprobleem blijft ‘See the total on WhyDonate’ beschikbaar. Controleer daar dan de bronstand. Verander je later de campagne-URL of de valuta, laat dan ook deze vaste koppeling aanpassen; er is geen algemene proxy voor willekeurige campagnes.

## Sources and maintenance

- [Owner's public campaign](https://whydonate.com/nl/fundraising/dainyelonthemove)
- [WhyDonate's official website integration options](https://whydonate.com/donate-button-website)
- [Cloudflare Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)

The public page state is an observed upstream format, not a promised versioned donation API. If WhyDonate changes it, strict parsing falls back to the campaign link. A real new payment, refund, payment-method flow and payout were not performed as a test.

## Staging receipts

Functional source `5645496` retained newer main archive/video changes, including the latest public Postcard, and passed Hosting `45882944799`, regression `45882944786`, source backup `45882944912` and the existing staging publication workflow `45882944864`. These are staging checks, not a production release.

Final functional source `0a62b8b` also passed staging Hosting `45883543951`, full regression `45883544113` and source backup `45883543997`. After its footer change, all239local Python tests and the structural checker passed again; all806editor controls remain unchanged. The seven new donation tests are in the existing CI workflow, including the source-age polling guard.

Actual final browser acceptance: Stories footer **Support the journey** → `/about#support` automatically opens the card and renders the real150EUR total. Without reloading the page, returning the card into view after cache expiry refreshed its source-check timestamp from `2026-11-26T19:21:51.863Z` to a new19:28UTC check. This confirms an actual refresh, not a newly processed donation. Production About was independently read and has no new counter: no live release occurred.

The direct local shell probe to workers.dev timed out, while the actual browser request succeeded. Do not report that failed local network probe as an application error or an unauthenticated API acceptance test. Earlier missing-auth/timeout state was resolved before the successful Worker deployment above; no security check was bypassed.
