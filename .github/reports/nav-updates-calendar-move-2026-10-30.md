# Navigation updates and private calendar moves — 30 October 2026

## Scope and release boundary

Owner requested replacing the redundant underway badge with shared location/announcements and moving calendar items directly between dates. Isolated branch: feature/nav-updates-calendar-move. Required backup completed before editing: website_2026-10-30_19-22-42. This release is staging-only until explicit approval for these new changes. No mail, social-provider operation, paid dependency, Rules/Auth/App Check change or production schedule mutation.

## Implemented

- Shared header details badge rotates the owner-approved broad location and two short announcements every 6.5 seconds, with a subtle fade. All links remain available together on opening the panel. Hover/focus/open/hidden-page pauses, persistent Keep updates still, reduced-motion, Escape and BFCache safeguards are included. The accessible trigger name remains stable.
- Website → Shared header & footer → Header · announcements edits the two labels (60 characters, one line) and page/HTTPS links. Clear both fields to hide one. Footer field IDs are preserved. Shared corrections and Restore original retain the existing public live and 24-hour reserve rendering contracts. Shared markers/runtime also reach the future server-rendered shell; that dormant server is not activated.
- Location uses the existing Location workspace and siteStatus/current public document. A singleton realtime listener per open public document is required to reflect owner corrections/withdrawals; this can add one initial document read on pages previously without a check-in. It does not poll, write, access GPS or invent a city/date. Authoritative removal defeats delayed static trip data; cached absence/errors are not asserted as removal. Static trip location remains only an initial fallback.
- Social posts, tasks and appointments can be dragged to a calendar day. Dropping opens a date confirmation; opening an item → Move date provides the same control for touch/keyboard and other months. Europe/Amsterdam time, seconds and all other fields remain unchanged. Ambiguous/nonexistent DST wall times are rejected.
- Date writes reuse the existing signed-owner transaction, expected revision and saved-value readback. Unsaved edits, busy/photo operations, sign-out, stale revisions, same date/cancel and uncertain retries are guarded. Only publishAt and updatedAt change.
- Website-publication and Postcard entries retain their own Open & edit schedule controls. Moving an ordinary private calendar item never reschedules an already scheduled social-provider post, website publication or email.

## Verification

- PASS: 191 Node tests, 102 Python tests, journey/public-trip validators, changed-script syntax checks and git diff --check.
- PASS: 57 focused Node tests and four catalogue tests after independent-review alignment of control-character labels and future-shell runtime.
- PASS: independent implementation reviews; footer IDs, bounded public header editor surface and existing location privacy boundary preserved.
- PENDING: staging Hosting/regression/source backup, native header layout/rotation and signed-owner calendar move/save/reload checks.
- NOT TESTED: physical mobile devices. Browser viewport override must be measured before claiming exact device coverage.

## Owner steps (Nederlands)

1. Open **Agenda/Calendar**. Sleep een sociaal bericht, taak of afspraak naar de gewenste dag, controleer de datum en bevestig. De tijd blijft de Nederlandse tijd.
2. Op telefoon of voor een andere maand: open het punt en kies **Move date**; kies een datum en bevestig.
3. Een bericht dat al bij Instagram/Pinterest/etc. is ingepland moet je ook bij dat platform verplaatsen. De agenda bewaart je planning; ze bewijst geen publicatie.
4. Verhalen en Postcards: open **Open & edit** om de echte publicatie-/mailplanning te wijzigen.
5. Bovenbalk: **Website → Shared header & footer → Header · announcements**. Bewerk twee korte teksten en links, bekijk de preview en publiceer. Beide velden leeg verbergt die aankondiging.
6. Deel je locatie via **Location**; alleen de door jou gekozen brede plaats wordt getoond. Een bezoeker kan de wisselende teksten stilzetten via **Keep updates still**.
