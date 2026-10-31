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
- PASS: staging Hosting/regression/source backup and native signed-owner acceptance, detailed below.
- NOT TESTED: physical mobile devices. Browser viewport override must be measured before claiming exact device coverage.

## Owner steps (Nederlands)

1. Open **Agenda/Calendar**. Sleep een sociaal bericht, taak of afspraak naar de gewenste dag, controleer de datum en bevestig. De tijd blijft de Nederlandse tijd.
2. Op telefoon of voor een andere maand: open het punt en kies **Move date**; kies een datum en bevestig.
3. Een bericht dat al bij Instagram/Pinterest/etc. is ingepland moet je ook bij dat platform verplaatsen. De agenda bewaart je planning; ze bewijst geen publicatie.
4. Verhalen en Postcards: open **Open & edit** om de echte publicatie-/mailplanning te wijzigen.
5. Bovenbalk: **Website → Shared header & footer → Header · announcements**. Bewerk twee korte teksten en links, bekijk de preview en publiceer. Beide velden leeg verbergt die aankondiging.
6. Deel je locatie via **Location**; alleen de door jou gekozen brede plaats wordt getoond. Een bezoeker kan de wisselende teksten stilzetten via **Keep updates still**.

## Staging follow-up — 31 October 2026

Native review of3095b48 found a stale pre-trip25October check-in overriding the owner-approved underway country. The location adapter now awaits the existing trip context and rejects positively dated pre-boundary check-ins for a confirmed journey with an approved fallback. It uses the existing planned release boundary, never asserts an actual departure instant, retains newer/undated records, and preserves immediate authoritative withdrawal and snapshot ordering. No production location data was changed. Independent review also found focus lost after the final calendar redraw; success now restores focus after that redraw in both views.33 focused tests passed after both corrections.

## Native owner acceptance — 31 October 2026

Functional staging commit cfa36a0: Hosting41204778375, isolated regression41204778383 and OneDrive source backup41204778366 all succeeded. Final source suite:198Node/102Python; CI includes disposable access-rules emulator checks. Main remainsb0be5c7; no production push or provider/mail operation.

- PASS: existing staging Google/Authenticator owner sign-in, reused after reload.
- PASS: one clearly labelled private test task, reminders off. Cancel did not move it. Move date changed31October16:40 to5November16:40; after reload the saved date, notes and unchecked flags were independently reopened intact.
- PASS: actual native coordinate drag5→6November opened the confirmation with6November selected. Confirmation saved16:40 and restored focus to the newly drawn grid item. List-view Move date returned it to its original31October date and restored focus to the replacement Move date button.
- PASS: test task marked Done through the normal private UI, with saved confirmation. One labelled completed fixture remains only in the isolated test calendar, reminders off; no permanent erasure or real calendar/provider entry was changed.
- PASS: Website → Shared header & footer exposes exactly two bounded optional announcement links. Native private draft/preview showed a test label and hidden second slot. Reviewed publication changed the already-open public staging page; Restore original returned both links. Private draft was also returned to the original values and saved. Test text exists only in private recovery history; none remains public or in the active draft.
- PASS: correct current shared place, actual timed message change after focus left the trigger, persistent still choice, Escape and real Postcards link. Old pre-trip data did not override the approved underway fallback; a newer shared check-in remained eligible.
- PASS:1280px and actual682px browser layouts without horizontal overflow. A390px override was accepted by the tool but not applied; do not claim390px or physical-device acceptance. The native small-width drag/date controls worked at682px.
- Proof images remain outside Hosting/Git in audit-evidence/calendar-move-review-2026-10-31.png and nav-updates-2026-10-31.png. No visitor/private calendar content was copied into source. Staging only; these new changes require their own explicit production approval.
