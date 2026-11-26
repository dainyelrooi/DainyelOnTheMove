# Homepage support and coordinated invitation —26 November 2026

The owner requests a noticeable Buy Dainyel a coffee placement on Home and an invitation at ten seconds or sooner, with maximum visibility without becoming irritating. This extends the previously reviewed About donation total. Only staging is released until this combined version receives production approval. No mail, provider campaign, payment, Rules/Auth, Worker setting, billing or Analytics change is part of this task.

## Research and decision

Compared three options: an inline card only (least interruption, easy to miss); a full-screen timed modal (very noticeable but interrupts reading, especially on phones); and a permanent branded card plus a small dismissible, nonmodal invitation. Choose the third. Place the card after the personal introduction, where the reader knows who Dainyel is. Preserve a primary story/journey action in the hero.

[Nielsen Norman Group](https://www.nngroup.com/articles/popups/) describes problems with early, repeated overlays and interruptions during tasks. [Google Search Central](https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials) recommends unintrusive dialogs that leave content accessible. [WhyDonate](https://whydonate.com/donate-button-website) recommends clear button text, visible placement and the site's own branding.

These sources do **not** prove ten seconds is an ideal conversion time for this website. Ten quiet visible seconds implements the owner's chosen timing. Retain the previously accepted daily cap, with one automatic invitation per browser session and at most once per24hours; the owner had previously declined a weekly-only reminder. This is a frequency policy, not a claimed measured optimum. Dismissal can additionally select thirty quiet days. The permanent card remains available at all times.

## Behavior and implementation

- `.github/templates/home-support.html`, `assets/home-support.css` and Home template: one compact navy/teal/gold support card, after the personal introduction. Clear existing WhyDonate link, optional-support language, and the same genuine cached public donation total. No goal or invented percentage. The counter remains lazy and storage-independent through the already-tested existing Worker route.
- Existing Home invitation controller/model/template/style: reuse **one** promotional surface. Coffee is its current primary invitation, with a smaller Postcards action. There is no second automatic Postcards popup afterwards. Legacy date-specific copy remains available for authoring previews; no journey status is invented by a donation prompt.
- Keep the existing ten-second visible-reading/quiet-moment gate. Cookie decisions, a hidden tab, forms, open menus/dialogs and foreground films postpone it. No scroll percentage requirement. Do not cover a signup opened through a deep link, run in embedded/previews, make the page inert, dim it or move focus automatically. Escape and the visible close button dismiss it. If the permanent support card is already in view, suppress the popup for this visit.
- A shared local dismissal/session record prevents repeat invitations across topics and tabs. The new record stores only a version and expiry timestamps, not an identity, donation or subscription. Old subscriber choices remain intact. Clear the ticking timer after use/suppression. Browsers that block storage still get in-memory suppression for the current page; persistent suppression cannot then be guaranteed across later visits.
- The Postcards button opens the existing signup. Clicking the coffee button opens the fixed public campaign; neither action claims a completed donation or subscribes anyone automatically.
- Add five real authoring controls: the Home card's title, explanation and CTA, plus coffee-invitation title/explanation. All **806 previous fields/groups remain exact**; the catalogue now has811fields. Public source controls do not expose private settings or enable arbitrary hidden markup editing.

## Evidence and limits

- Pre-change source backup: `website_2026-11-26_14-32-54`; branch `feature/home-coffee-20261126`, based on the reviewed donation-total branch. Previous donation-total backups and real staging Worker are retained.
-20focused Node tests passed, including the video-defer fixture extension; these cover the existing follow/date model, counter and six new controller/policy cases. The controller tests exercise a simulated clock and DOM: ten-second boundary, privacy/hidden/form/modal/foreground-video delay, focus preservation, one combined invitation, one/thirty-day records, Escape, cross-tab close, no-storage behavior, inline-card suppression, protected previews/deep links and the real signup action. All239Python checks passed after the explicitly extended editor contract.
- The older editor test explicitly expected only four invitation groups. It was updated to require the five approved groups/ten text fields; the existing hidden/script/private-ancestor boundary tests remain. All806existing catalogue controls were independently compared against `46fa50b` and preserved exactly, with only five additions.
- Native staging acceptance and final CI receipts are recorded below. No conversion increase, donation receipt, real phone, screen-reader or new payment is claimed by these tests. No production release has occurred at this point.

## Beheer (Nederlands)

Op de homepage staat de koffiekaart na je introductie. De teller gebruikt dezelfde openbare WhyDonate-stand als About. Het bedrag hoef je niet zelf bij te werken.

Teksten wijzigen: open **Page text & photos / Website**, kies **Home** en zoek **Buy Dainyel a coffee.** voor de kaart, of **Homepage invitation · Coffee invitation** voor de uitnodiging. Gebruik de bestaande preview/opslag/publicatie. De oude reisfase-groepen zijn behouden; de nieuwe koffie-uitnodiging is nu de automatische hoofdvariant. De Postcards-inschrijving en sociale links blijven bereikbaar.

Na sluiten komt dezelfde automatische uitnodiging op die browser normaal 24 uur niet terug. **Hide for30days** verlengt dit. Dit is een lokale voorkeur: een andere browser, gewiste opslag of geblokkeerde opslag kan een nieuwe uitnodiging geven. Er wordt geen donateursprofiel of lijst met 'al gedoneerd' gemaakt.

## Final staging acceptance

- Final functional source `66a4bb2`: Hosting `45885743175`, full regression `45885743147` and OneDrive source backup `45885743261` all succeeded. Actual served model confirms the24hour cap. No production push or Worker change was performed.
- Real browser390×844: automatic coffee invitation appeared while staying at the top of Home, without scrolling. It used the single existing invitation surface. Focus remained `BODY`, no `aria-modal`, no horizontal overflow, visible close control, donation action and secondary signup/quiet choices. Exact ten-second/defer boundaries are covered by clock-controlled tests; this is observed browser appearance, not a separately instrumented real timing study.
- The real popup's **Join the Postcards** action closed the popup, opened the existing signup details, set `#follow-trip` and focused its summary. No address was entered or subscriber created. No second popup appeared during subsequent review.
- Actual homepage card was visually checked at1280×900 and390×844, after the existing personal introduction. Both have no horizontal overflow, the original donation destination and genuine automatically loaded150EUR total. Browser console error capture was empty. The small mobile invitation was visually checked; a separate physical-device/desktop-popup/screen-reader test is not claimed.
- Temporary viewport override was reset. New title/explanation/CTA authoring catalogue fields are present; every previous806control was independently preserved. Native signed-owner editing of these new fields was not exercised in this release.

Staging state before approval: **PASS — tested candidate**. The owner subsequently answered “ja” to publishing the About counter and this Home extension together. The completed production evidence below supersedes the earlier pending-release state in this report and the donation-total report.

## Verified production release —26November2026

- Owner-approved functional release `b740ce4` is on main. Production Hosting `45886929179` / job140139834915 succeeded. CodeQL run45886928468 passed all three JavaScript/TypeScript, Python and Actions analyses. Production inbox Worker `9c828817-84de-40dd-a57d-63c459b6a44f` retains the original production D1 binding/private settings and adds the reviewed read-only total route.
- Recovery preserved: branch `backup/home-coffee-pre-live-20261126` at03b17b8, OneDrive backup `website_2026-11-26_14-50-49`, previous production Worker87e15b48-3dd2-4bb5-8f18-ee1f391f0f41. Before release the actual public reading copy contained35CMS entries/16Postcards; its bounded hashes/IDs/dates were captured outside the repository.
- Local HTTP and in-app browser checks repeatedly timed out. The release was therefore independently checked from GitHub on an isolated diagnostic branch, without changing main's workflows or introducing a schedule. One-time run `45888089017`, job140143703785, **passed**. It used no checkout, secret, database SDK, provider credential or mutation: only fixed public HTTPS GETs, including an Origin header for the existing Worker endpoint. The diagnostic branch is `diagnostic/donation-live-20261126`; the check is triggered only by editing its one diagnostic file, not by a timer.
- Actual production Home/About/footer markup is present. Six served JavaScript/CSS assets exactly match the reviewed source after line-ending normalization. The complete public CMS, Q&A and website-edit projections preserve their full contents, normalizing only top-level generation timestamps. All35CMS IDs/publication dates and all16Postcards remain exact. A known non-sensitive internal report URL returns404.
- The actual production total endpoint returned200, EUR150, a fresh check timestamp, correct canonical-origin CORS and only the four approved aggregate fields. The independent official WhyDonate read also returned150EUR. Production health/public inbox GETs passed and a wrong-origin total request was refused403. No donor data was projected or logged.
- The source/policy and real data are verified live; final native visual/live-popup interaction remains unverified because the local browser helper timed out. Real mobile popup/signup and desktop/mobile card interaction were already exercised on staging with these identical runtime assets. Physical devices and a new payment/refund are not claimed tested. No mail, payment, campaign/schedule/provider mutation, Rules/Auth, ad activation or billing change occurred.

Current state: **PASS — approved release deployed and externally verified**. The native live-browser interaction limitation above remains explicit; it is not described as a production website failure.
