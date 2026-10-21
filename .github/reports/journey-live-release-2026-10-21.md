# Journey frontend — owner-approved live release, 21 October 2026

## Request and changes

The owner asked to remove the digital passport/new search-filter experience, retain the previous atlas page presentation, publish live, send one test to the previously supplied own mailbox, and send no change-summary campaign to subscribers. This supersedes the earlier staging-only restriction for this corrected frontend release.

- Removed passport page, generated template, browser storage/UI module, links in the footer/home/Field Notes, privacy description, search entry and sitemap route. Removed its obsolete isolated test file with the deleted feature.
- Removed atlas replay/year/trip/content selectors, replay module and related styles. Restored the pre-feature atlas implementation and shared map layout while retaining simple approved place deep links, existing map layers/zoom, optional check-in loading and truthful planned-departure language.
- Kept the other reviewed journey frontend changes, including shared countdown, Story Mode, genuine archive notes/Postcards and honest planning-cost view.
- Before production, added an indexed-query fallback for existing Q&A when the prepared answeredAt index is unavailable. The fallback uses the previous status/createdAt query and sorts the returned public records by answer time; it retains the existing 100-record cap. No database configuration was deployed and this is not a claim of complete historical answer ordering beyond that cap.
- Recorded owner approval and updated the owner guide/route inventory.

Pre-change backup: sibling `backups/website_2026-10-21_05-57-10`. Corrected release commit: `4faeb8fd3bfe56a2e096663c5f17f701aa75aade`. Both staging and main were fast-forwarded normally; no unrelated remote work was overwritten.

## Publication and checks

- Existing [staging workflow](https://github.com/dainyelrooi/DainyelOnTheMove/actions/runs/39542398121) succeeded.
- Existing [production workflow](https://github.com/dainyelrooi/DainyelOnTheMove/actions/runs/39542414172) succeeded, using only Hosting target production in the existing Firebase project.
- Canonical home, atlas, Postcards archive, costs and a Field Note returned HTTP 200 and matched released Git blobs byte for byte. Home/atlas contained no passport links or replay host. Production had no staging noindex response header.
- Production service flag, atlas JS and Q&A JS matched the release. The new service flag remained false.
- Deleted `/passport.html` and `/assets/passport.js` returned 404. The non-sensitive `/.github/reports/journey-staging-release-2026-10-21.md` URL also returned 404. No private directory was inspected.
- Staging atlas also matched the corrected release.
- Browser: live atlas selected Spain, showed the existing map/sidebar, contained no new replay/passport controls or links, and had no horizontal overflow at the default desktop width. Proof screenshot: sibling `review-evidence/journey-experience/live-simple-atlas-2026-10-21.png` outside Hosting.
- Browser: explicit Load questions and forms connected successfully; the existing published-answer renderer showed two cards and enabled the question form. No question/reply was submitted.
- Composer completed; six remaining generated archive/cost routes passed existing route/metadata/asset/Hosting-boundary validation. Public trip validation, changed JavaScript syntax and diff whitespace checks passed. No new unit test run or new PageSpeed score is claimed for this correction.

## Exactly one provider mail test

- Used the existing active Brevo welcome template #6, Preview & test → Send test email. Selected exactly the previously supplied own mailbox from the existing one-entry test list, then clicked Send Test once. No contact was added and no template setting was saved.
- The connected Gmail search subsequently found one matching welcome message dated 21 October 2026 at 04:15:39 UTC, with INBOX/UNREAD labels. Provider sending and inbox receipt are established for this test. Private recipient and message identifiers are intentionally omitted from this report.
- This was an isolated provider/template test. It did not submit or verify the undeployed website contact API and did not subscribe or resubscribe a contact. Contact sending, new challenge submissions and mobile content persistence remain disabled.
- No release campaign, subscriber email, new scheduled edition or alteration of existing scheduled editions was performed. Existing question notifications were left as configured.

## Remaining scope and recovery

No new backend/runtime, billing, Auth, Firestore Rules or index deployment occurred. The server integration and retention requirements in `../server/README.md` remain outstanding. The homepage performance limitation from the local implementation report remains unproven by this release smoke check.

Previous production source was `658ab90`; preserve the prior Hosting version and Git history for recovery. Roll back only the intended website release without resetting unrelated later work. The passport/replay features were explicitly rejected and must not be reintroduced as routine maintenance.
