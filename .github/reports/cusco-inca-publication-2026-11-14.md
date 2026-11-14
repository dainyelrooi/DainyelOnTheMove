# Cusco and Short Inca Trail — approved content release

## Scope and permission

The owner reviewed the staged English article and explicitly requested production publication, one accompanying subscriber email, and replacement of the soft opening photograph with `20261111_153009.jpg`. This release introduces no service, configuration, Rules/Auth, billing, audience or frontend-code change. A narrow provider transport correction was necessary to complete the approved email.

## Published content

- Existing reviewed entry identity preserved: `entry-b888e1dc935cf1b9e72a620d87e41a00`.
- Canonical route: <https://dainyelonthemove.com/entry/entry-b888e1dc935cf1b9e72a620d87e41a00>.
- The original English article, links, five sourced fact cards, ten named chapters plus the opening, approximate eleven-minute reading time and eleven chapter photographs remain intact.
- A new banner-only photograph replaces the previous banner within the twelve-photo selection. Orientation is applied before encoding; exported WebP has no EXIF/GPS metadata. Dimensions are 1200×1600, 142358 bytes, within the existing CMS limit. Original source photographs and earlier immutable media/history remain preserved.
- Existing split masthead layout shows the portrait photograph beside the title. No shared CSS or gallery behavior was changed.
- New banner identity: `photo-7a960aa1298bb759caeb5dff6835975f`.
- Public image: `/assets/public-content/e733ab6d4cb782e765034a04d2bfcb1d0c1a66c0bc61f3f22bb2313c9232e7e4.webp`.
- Production private history retains r1 (text), r2 (new banner) and r3 (approved publication). Atomic writes used current-version/create-only preconditions. No existing schedule was overwritten or invented.

## Release and verification

- Recovery source snapshots: `backups/website_2026-11-14_14-04-02` and `backups/website_2026-11-14_14-19-04`.
- Frontend source at first publication was `2ef9d7e06deff993d7be8d92d75dfd47b9a360cf`; publication uses the existing approved CMS/public-copy workflow rather than committing exported article text or media. The later worker-only correction is `3d22095720abb0195d93c5185d08a74efc2906fd`.
- Staging refresh `43629544714`: successful, including deployed-version verification.
- Independent production clock/public copy `43629912214` and explicit main reading-copy refresh `43629997758`: successful, including actual deployed-content verification.
- Actual canonical HTTP 200, full initial HTML, correct current CMS reading copy, new selected hero, twelve available WebP images, five facts and eleven valid chapter sections: PASS.
- Isolated Edge checks at 1280px and 390px: PASS; new hero decoded at the expected natural size, no horizontal overflow or application errors. Banner composition inspected at both widths.
- Real Stories page includes the new entry, sitemap includes its unchanged canonical route, Open Graph uses the new available public photo, production is indexable, and a known report URL returns 404: PASS.
- The earlier article's three scenarios (desktop, mobile, JavaScript disabled) and gallery previous/next, Escape and focus return passed before the banner replacement. Final focused banner/content checks also passed on staging and production. No physical-device, inbox-delivery, search-ranking or broad performance-score claim is made.

## One subscriber campaign

- Release job: `mail-9f7bf4527a54cfe4c5959f309e223c70`.
- One immutable send-now request, normal seven-field branded email, live article button and new live photograph; request created only after real production checks.
- Native Brevo campaign **27**: **Sent**, independently confirmed by GET-only audit `43631589549`, which found exactly one matching campaign and a real sent timestamp. The production job also reads `sent`, `complete`, `managed-id` with no provider error. Do not create a second request or resend this release.
- Recipient selection remains saved dynamic segment 1, **Postcards — active subscribers**, with the existing sender, reply address, unsubscribe and free-plan safeguards.
- Fresh GET-only Brevo audit `43629252072` found no existing matching release campaign and confirmed the earlier campaigns 24/25/26 remain natively scheduled with matching dates. Saved payload/date/campaign-identity readback is unchanged after queueing this release.
- No test emails, contact imports, individual recipient lists, resubscriptions or changes to previous campaigns were performed. Provider acceptance alone is not evidence of individual inbox receipt.

## Rejected immediate-send request and permanent correction

- The first request created campaign 27 but its immediate-send call was rejected with HTTP 400. Normal automation correctly held `dispatch-attempted` for review instead of replaying it.
- The transport was sending the JSON value `null` for a call with no request body. The [Brevo immediate-send endpoint](https://developers.brevo.com/reference/send-email-campaign-now) documents no request body. Omitting that body, while preserving explicit empty objects and ordinary update payloads, fixes the encoding.
- Fresh exact-campaign check `43631185370` confirmed the same message, unsent native Draft, only saved segment 1, no list selection and available free credit. Recovery `43631290545` acquired the normal per-mail lease and used a permanent create-only attempt marker. It targeted only the existing campaign 27, required the earlier explicit HTTP 400 rejection, checked native unsent state/content/audience/live URL again, then made one corrected bodyless request. Brevo accepted it; no new campaign or recipient change occurred. Existing confirmed/uncertain handoffs never qualify for that recovery.
- The recovery helper and its exact branch-only entry points remain on `ops/cusco-inca-live-20261114`; they were not introduced to main. Its durable attempt marker prevents a repeat. Ordinary production replay protections remain intact.
- Permanent change in main/staging `3d22095`: only the provider request-body encoding, three network-free transport tests and their routine workflow step. Explicit JSON campaign bodies are unchanged.
- Focused local transport tests: 3 PASS. Existing provider/controller checks: 29 PASS. One-off recovery safety cases: 5 PASS. Staging regression `43631476470` and provider preflight `43631476560`: successful before the permanent main update. No real test emails were sent.
- Original publication content, source dates, scheduled jobs and campaigns 24/25/26 remain unchanged. Individual mailbox delivery is not asserted from provider Sent.

Full private payload backups, receipts and screenshots remain outside the web repository. This report contains only release metadata and is excluded from Hosting.
