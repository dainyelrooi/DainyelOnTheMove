# Homepage support and coordinated invitation —26 November 2026

The owner requests a noticeable Buy Dainyel a coffee placement on Home and an invitation at ten seconds or sooner, with maximum visibility without becoming irritating. This extends the previously reviewed About donation total. Only staging is released until this combined version receives production approval. No mail, provider campaign, payment, Rules/Auth, Worker setting, billing or Analytics change is part of this task.

## Research and decision

Compared three options: an inline card only (least interruption, easy to miss); a full-screen timed modal (very noticeable but interrupts reading, especially on phones); and a permanent branded card plus a small dismissible, nonmodal invitation. Choose the third. Place the card after the personal introduction, where the reader knows who Dainyel is. Preserve a primary story/journey action in the hero.

[Nielsen Norman Group](https://www.nngroup.com/articles/popups/) describes problems with early, repeated overlays and interruptions during tasks. [Google Search Central](https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials) recommends unintrusive dialogs that leave content accessible. [WhyDonate](https://whydonate.com/donate-button-website) recommends clear button text, visible placement and the site's own branding.

These sources do **not** prove ten seconds is an ideal conversion time for this website. Ten quiet visible seconds implements the owner's chosen timing. One automatic invitation per browser session and at most once per day is our conservative frequency choice, not a claimed measured optimum. Dismissal can additionally select thirty quiet days. The permanent card remains available at all times.

## Behavior and implementation

- `.github/templates/home-support.html`, `assets/home-support.css` and Home template: one compact navy/teal/gold support card, after the personal introduction. Clear existing WhyDonate link, optional-support language, and the same genuine cached public donation total. No goal or invented percentage. The counter remains lazy and storage-independent through the already-tested existing Worker route.
- Existing Home invitation controller/model/template/style: reuse **one** promotional surface. Coffee is its current primary invitation, with a smaller Postcards action. There is no second automatic Postcards popup afterwards. Legacy date-specific copy remains available for authoring previews; no journey status is invented by a donation prompt.
- Keep the existing ten-second visible-reading/quiet-moment gate. Cookie decisions, a hidden tab, forms, open menus/dialogs and foreground films postpone it. No scroll percentage requirement. Do not cover a signup opened through a deep link, run in embedded/previews, make the page inert, dim it or move focus automatically. Escape and the visible close button dismiss it. If the permanent support card is already in view, suppress the popup for this visit.
- A shared local dismissal/session record prevents repeat invitations across topics and tabs. The new record stores only a version and expiry timestamps, not an identity, donation or subscription. Old subscriber choices remain intact. Clear the ticking timer after use/suppression. Browsers that block storage still get in-memory suppression for the current page; persistent suppression cannot then be guaranteed across later visits.
- The Postcards button opens the existing signup. Clicking the coffee button opens the fixed public campaign; neither action claims a completed donation or subscribes anyone automatically.
- Add five real authoring controls: the Home card's title, explanation and CTA, plus coffee-invitation title/explanation. All **806 previous fields/groups remain exact**; the catalogue now has811fields. Public source controls do not expose private settings or enable arbitrary hidden markup editing.

## Evidence and limits

- Pre-change source backup: `website_2026-11-26_14-32-54`; branch `feature/home-coffee-20261126`, based on the reviewed donation-total branch. Previous donation-total backups and real staging Worker are retained.
-20focused Node tests passed before the video-defer fixture extension; these cover the existing follow/date model, counter and six new controller/policy cases. The controller tests exercise a simulated clock and DOM: ten-second boundary, privacy/hidden/form/modal delay, focus preservation, one combined invitation, one/thirty-day records, Escape, cross-tab close, no-storage behavior, inline-card suppression, protected previews/deep links and the real signup action.
- The older editor test explicitly expected only four invitation groups. It was updated to require the five approved groups/ten text fields; the existing hidden/script/private-ancestor boundary tests remain. All806existing catalogue controls were independently compared against `46fa50b` and preserved exactly, with only five additions.
- Native staging mobile/desktop, actual timing, dismissal/reload, live amount, signup interaction and final CI receipts are recorded after deployment below. No conversion increase, donation receipt, real phone, screen-reader or new payment is claimed by these tests. No production release has occurred at this point.

## Beheer (Nederlands)

Op de homepage staat de koffiekaart na je introductie. De teller gebruikt dezelfde openbare WhyDonate-stand als About. Het bedrag hoef je niet zelf bij te werken.

Teksten wijzigen: open **Page text & photos / Website**, kies **Home** en zoek **Buy Dainyel a coffee.** voor de kaart, of **Homepage invitation · Coffee invitation** voor de uitnodiging. Gebruik de bestaande preview/opslag/publicatie. De oude reisfase-groepen zijn behouden; de nieuwe koffie-uitnodiging is nu de automatische hoofdvariant. De Postcards-inschrijving en sociale links blijven bereikbaar.

Na sluiten komt dezelfde automatische uitnodiging op die browser normaal 24 uur niet terug. **Hide for30days** verlengt dit. Dit is een lokale voorkeur: een andere browser, gewiste opslag of geblokkeerde opslag kan een nieuwe uitnodiging geven. Er wordt geen donateursprofiel of lijst met 'al gedoneerd' gemaakt.
