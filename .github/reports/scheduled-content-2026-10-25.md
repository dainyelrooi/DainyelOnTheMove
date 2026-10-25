# Calendar photos, deletion and scheduled publication — 25 October 2026

Owner request: optional calendar URLs, direct editable photo upload, deletion of self-service drafts/calendar items, scheduled blogs/Field Notes in the calendar and a separately approved Postcard that waits for publication. Production release is explicitly approved after verification. **No release/test/subscriber email is authorised for this work.**

## Model and implementation

- Existing Enterprise Native `dainyel-content`, existing owner Google/TOTP, App Check and free infrastructure. No new service, dependency, bucket, credential or billing.
- Calendar photo: one optional private metadata-free WebP, at most 192000 encoded characters, max 1600 pixels per dimension, bounded description. Atomic with the calendar row; replacement/removal never changes an external social post. Original seven live IDs/checkmarks are preserved. Tasks/appointments now use the reviewed schema in production too.
- Calendar URLs stay optional. Whitespace clears them, scheme-less supported URLs gain HTTPS. Named Canva/Metricool/music allowlists remain; custom errors explain how to correct or leave empty. No native `type=url` trap for these optional fields.
- Deletion checks the exact saved revision/update time. Entry removal atomically removes draft/public projection/summary/website schedule. Saved recovery subcollections/photos stay private; deletion does not purge independent backups. Postcard deletion cancels an unprocessed request and refuses processing/uncertain work. Provider-scheduled campaigns remain in Brevo and are explicitly described as separate.
- `cmsSpaces/{space}/entrySchedules/{entryId}` is private. A schedule contains an exact complete reviewed snapshot, source draft revision and bounded future timestamp. Later private edits do not silently change that snapshot. Preview/consent is required for scheduling/rescheduling. Owner can cancel; only the existing server identity can mark completion.
- `content-publication.py` atomically commits public article, archive card and completion with compare-and-swap preconditions on schedule, current draft and prior publication. A cancelled/deleted/replaced schedule cannot be resurrected by an older worker read. Missing media/parent, invalid payload or over-one-day delay require review.
- Native GitHub schedule checks due production snapshots on main every five minutes, away from the hour. GitHub can delay/drop schedules or stop them after prolonged repository inactivity. This is independent of Codex/computer availability, **not a minute-exact delivery guarantee**. [GitHub schedule documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
- Write can prepare a Postcard from its scheduled snapshot. Its editable draft retains the linked entry. A separate saved preview, audience consent and explicit Schedule Postcard action creates the immutable production-only `after-publication` job. Due jobs wait until the same reviewed schedule revision is published; cancellation/replacement/deletion holds delivery. Existing active-subscriber segment, opt-outs, free quota and ambiguous-send hold remain.
- Calendar combines the existing manual checklist with up to 100 private website schedules and 100 delivery jobs. Document/envelope icons open the correct editor. Calendar status distinguishes actual website publication from provider acceptance/inbox delivery. No external social scheduling API is introduced.
- Saved-content backups now include private entry schedules. Website scheduled snapshots are recoverable data; a restored backup does not automatically reactivate a schedule.

## Validation

Before source edits: `backups/website_2026-10-25_14-20-25`. Working branch: `feature/scheduled-content-media`; baseline staging c3bd6d2, main b338841. Unrelated quiet-growth edits/report excluded.

Final automatic set: 35 Node, 26 Python and 12 actual isolated emulator Rules tests passed (73 total). The twelve-photo schedule and early independent-email bypass cases are included. No cloud fallback, no mail/network in worker unit tests. Emulator is Standard; real database is Enterprise Native and requires actual owner acceptance too. Named Rules compilation and exact readback required before release.

Security attack outcomes (applicable to this patch):

| Attack/check | Outcome |
| --- | --- |
| Anonymous get/list of photo, schedule, mail job or draft | DENIED in Rules tests |
| Wrong identity / missing verified signed TOTP | DENIED by preserved owner gate; existing negative tests |
| Forged published status or edited reviewed snapshot | DENIED |
| Create/update unknown fields, oversized text/photo, bad types/dimensions | DENIED |
| Past/too-near date or immutable createdAt/revision mismatch | DENIED |
| Different entry/revision/email payload, mail earlier than story | DENIED |
| Delete draft leaving a public/scheduled entry, or queued/processing mail | DENIED; complete matching transaction allowed |
| Change role/owner, other user's data, SQL/counters | Not introduced; single fixed signed owner, no new roles/SQL/public counter |
| Orphaned history/media | Intentionally owner-private after deletion; public photo access depends on current referencing publication |
| Query mismatch | Bounded owner queries tested; real cloud owner check pending below |
| Concurrent cancellation/deletion vs worker commit | Exact preconditions; simulated race rejects publication |
| Early/duplicate mail | Future/waiting/cancelled/replaced/missing publication blocks mocked provider; no real mail test |

## Release evidence

- Initial feature27240c4: staging Hosting40199049016, regression40199048981, source backup40199048997, content backup40199049038, read-only publication check40199049057 and provider configuration check40199049002 all passed. No process/send mode was invoked for mail.
- Real photo replacement exposed a map-order comparison bug: the cloud save succeeded but the UI falsely reported a conflict.3723070 compares structured maps independent of key order; actual signed-owner replacement then returned Saved privately, and the correct image survived a full reload. Staging Hosting40199538868/regression40199538838/source40199538874/content40199538844 all passed.
- Actual signed-owner staging: create social item with all URLs empty; upload, describe, save, reload/reopen, replace/re-save photograph; displayed image decoded at660px. Phone390/client375: no page overflow, dialog337px and photo257px within its bounds. Delete control visible. No real social publication.
- Actual Field Note: preview/readtime/chapter, scheduled for25October15:00Europe/Amsterdam, immediately visible as a website calendar event. Exact public record absent before due time. The actual Python worker process was exercised against that exact staging fixture through a restricted existing Firebase CLI identity bridge (not a GitHub cron run): no publication before due, atomic publication after due, second invocation performed no second write. A normal browser opened the resulting article with real readtime/chapter; normal Take offline removed publication/summary.
- Prepared/saved/previewed a linked private Postcard from that reviewed schedule; correct source title/date and waiting-for-publication explanation observed. Send/Schedule remained disabled on staging. No delivery job/campaign/test/subscriber mail created. Provider delivery is mocked in automated tests; actual inbox delivery is deliberately NOT tested.
- Additional twelve-photo scheduling initially hit the Rules expression budget. The final validator inherits the exact validated draft map's bounds and checks completeness without repeating twelve photo validators. Exact content equality remains mandatory. Final emulator tests pass12photos plus malformed/oversized/mismatched/early/non-MFA cases. Cloud compilation/readback required after this change.
- The app/browser connection restarted before the final additional authenticated12-photo/cancel/delete UI exercise. Those operations are covered by the actual emulator Rules suite, including the normal client transaction functions. Do not claim that this extra signed cloud UI path, physical iOS/Android or a fresh production owner login was completed.
- Four own labelled test records were backed up outside Hosting and removed using exact title/ID/reminder/update-time guards: one calendar item, one email draft, one schedule, one entry draft. Public article/summary and linked delivery job were confirmed absent first. Existing seven calendar records, older staging checks and immutable recovery histories remain. No real owner content was deleted.
- The previous pending exact MapDiff12-photo publication fix is now part of this explicitly approved coordinated CMS Rules release. Public submission quota candidate9115f06 remains excluded.
- Final Hosting/release verification follows below. No actual subscriber delivery claim is made.

Separate `security/public-submission-quota` candidate remains excluded. The previous exact MapDiff twelve-photo fix is part of the approved coordinated CMS release because the same reviewed snapshot now needs scheduling. No public submission quota or email-forwarding activation is included.

## Korte beheerdershandleiding

1. **Add new → Social post**: kies kanalen, titel, onderschrift en datum. Upload je foto rechtstreeks; alle ontwerp-/muzieklinks zijn optioneel. Gebruik bij ingevulde links de genoemde dienst. Open het item later in **Calendar** om de foto te vervangen/verwijderen of het item te wissen.
2. Maak je blog, Field Note of weetje in **Write**. Kies je omslag/banner, voeg hoofdstukken en foto's toe, open **Preview** en vink de bevestiging aan.
3. Kies bij **Publish later** de Nederlandse datum/tijd en druk op **Schedule website publication**. De planning staat direct in de agenda. Latere conceptwijzigingen veranderen de ingeplande versie pas als je opnieuw bekijkt en inplant.
4. **Publish on website** publiceert meteen en annuleert een nog openstaande websiteplanning. **Take offline** trekt de huidige publicatie in en annuleert een toekomstige planning. Een kalender met het historische label Published bewijst niet dat een ingetrokken artikel nog online staat; de editor controleert de echte publicatie apart.
5. Klik voor de bijbehorende mail op **Prepare a Postcard for this entry**. Bewerk en bewaar het concept, bekijk de voorbeeldmail, bevestig de doelgroep en kies **Schedule Postcard**. Kies dezelfde of een latere tijd dan het verhaal. De mail wacht op die daadwerkelijk gepubliceerde versie. Alleen een concept maken/bewaren verstuurt niets.
6. Gebruik het ingeklapte onderdeel **Delete…** om een bewaard verhaal of Postcard te verwijderen. Download zo nodig eerst een backup. Een nog niet verwerkte mailopdracht wordt geannuleerd; campagnes die al in Brevo staan beheer je daar apart. Privé-herstelversies en bestaande backups worden niet gewist.
7. De gratis achtergrondplanner werkt zonder Codex of een ingeschakelde computer, maar controles kunnen vertraagd raken. Bekijk de echte status in Write/Calendar/Postcards; een tijdstip of label is geen garantie van ontvangst bij abonnees.
