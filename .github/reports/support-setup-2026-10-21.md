# Support section — 21 October 2026

## Prepared for staging review

- Added the support section to the existing About page at `/about#support`.
- Added `Support the journey` to the shared footer, including the generated shell for future entries. The 24 existing documents that use the shared footer each contain the link once; redirect-only documents and admin/signup views retain their existing layouts.
- English copy and the responsive layout use the existing brand tokens. Payment-specific styling loads only on About.
- The owner confirmed that he does not yet have a WhyDonate account. The section therefore shows `Coming soon`; it has no payment button, dummy recipient, embedded payment form or third-party payment script. Contributions cannot currently be received through this section.

## Activation still required

1. The owner creates his WhyDonate account and personal fundraising page, completes the provider's required verification and payout setup, and supplies the public donation URL. Do not request bank or identity documents in chat or store them in this repository.
2. Verify that the URL belongs to his intended public page and offers iDEAL | Wero. Replace the pending notice in `.github/templates/support-section.html` with an ordinary link to that specific page and suitable payment/fallback wording. Do not link to a generic provider homepage as if it collects for the owner.
3. Run `python tools/Compose-Site.py`, check the actual donation flow on desktop/mobile without submitting a payment, and show the completed result for review. A real payment/payout has not been tested.
4. Production publication of this new feature still needs the owner's release approval. Do not infer approval from earlier unrelated releases.

## Verification

- `python tools/Check-Journey.py`: passed.
- `python tools/Validate-PublicTrip.py`: passed.
- `git diff --check`: passed.
- Focused HTML check: one footer support link on each of 24 documents, unique About fragment/IDs, honest pending message, no WhyDonate scripts or iframes.
- Staging deployment of `46a3d54` completed successfully: https://github.com/dainyelrooi/DainyelOnTheMove/actions/runs/39662400551.
- Browser check on staging at 1280px and 390px: the two-column layout stacks on phones without horizontal overflow. Clicking the footer link from Stories lands on `/about#support`, with the section below the sticky header. The pending notice is visible and no payment can be submitted.
- Staging About, Stories and the stylesheet returned HTTP 200 with staging noindex headers. The known non-sensitive report URL under `/.github/reports/` returned HTTP 404.
- Production has not been released for this feature. No payment or payout was tested.

No new route, account, backend service, database configuration or newsletter has been created or activated.
