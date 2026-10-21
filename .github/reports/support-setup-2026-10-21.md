# Support section — 21 October 2026

## Connected for staging review

- Added the support section to the existing About page at `/about#support`.
- Added `Support the journey` to the shared footer, including the generated shell for future entries. The 24 existing documents that use the shared footer each contain the link once; redirect-only documents and admin/signup views retain their existing layouts.
- English copy and the responsive layout use the existing brand tokens. Payment-specific styling loads only on About.
- Initially the owner had no account, so the first preview showed `Coming soon`. He has now supplied `https://whydonate.com/nl/fundraising/dainyelonthemove`. This is the donation button's exact destination; the pending notice has been removed.
- `Buy me a coffee` opens the owner's public WhyDonate page in a new tab, with an accessible new-tab notice and `noopener noreferrer`. The visitor chooses the amount on WhyDonate; there is no payment iframe, script, invented recipient or new website payment backend.
- The public fundraising title and story match DainyelOnTheMove. The provider's donation form opened successfully and accepted a proposed EUR 5 amount. Inspection stopped at the mandatory donor-details step without entering personal details, accepting terms, creating a payment or paying. The actual payment-method screen and payout have not been tested; iDEAL | Wero is the provider's advertised option.

## Remaining release step

Production publication of this feature still needs the owner's release approval. Earlier release approvals apply to their reviewed batches. No payment or payout test is required to follow the donation link; do not submit a donation as routine checking.

## Verification

- `python tools/Check-Journey.py`: passed.
- `python tools/Validate-PublicTrip.py`: passed.
- `git diff --check`: passed.
- Focused HTML check: one footer support link on each of 24 documents, unique About fragment, exact owner-supplied donation URL and safe new-tab attributes, no pending notice or WhyDonate scripts/iframes.
- Staging deployment of `46a3d54` completed successfully: https://github.com/dainyelrooi/DainyelOnTheMove/actions/runs/39662400551.
- Initial browser check on staging at 1280px and 390px: the two-column layout stacks on phones without horizontal overflow. Clicking the footer link from Stories lands on `/about#support`, with the section below the sticky header. The first preview's pending notice has since been replaced by the linked button.
- Staging About, Stories and the stylesheet returned HTTP 200 with staging noindex headers. The known non-sensitive report URL under `/.github/reports/` returned HTTP 404.
- Production has not been released for this feature. No payment or payout was tested.

No new website route, account, backend service, database configuration or newsletter has been created or activated by this integration. The owner created and supplied his own public fundraising page.
