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

Automated first pass: 34 Node, 26 Python and 12 actual isolated emulator Rules tests passed. No cloud fallback, no mail/network in worker unit tests. Emulator is Standard; real database is Enterprise Native and requires actual owner acceptance too. Named Rules compilation and exact readback required before release.

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

In progress. Update with staging owner lifecycle, final production URL/workflow/Rules checks, cleanup and remaining limits. Do not treat source checks as actual subscriber delivery.

Separate `security/public-submission-quota` candidate remains excluded. The previous exact MapDiff twelve-photo fix is part of the approved coordinated CMS release because the same reviewed snapshot now needs scheduling. No public submission quota or email-forwarding activation is included.

## Owner guide

1. **Add new → Social post**: choose channels, title, caption/date and upload a photo. Links are optional. Save to calendar. Open the calendar item later to replace/remove its photo or delete the item.
2. **Write**: create your blog, Field Note or fact, add the cover/banner/chapters/photos, then Preview and confirm the reviewed version.
3. For later publication choose a date/time under **Publish later**, then **Schedule website publication**. It appears in Calendar immediately. Later draft edits stay private until you preview and reschedule. **Publish on website** publishes immediately and cancels that pending website schedule. **Take offline** also cancels a pending schedule.
4. To prepare its email use **Prepare a Postcard for this entry**. Edit and save the email, preview, approve the audience and choose **Schedule Postcard**. Its time must be at or after the story publication. No email is created merely by scheduling the website story.
5. Review actual statuses in Calendar/Overview/Write/Postcards. A queued email can be cancelled. Delivery accepted by Brevo does not prove receipt. Already scheduled campaigns are managed in Brevo.
6. Delete a saved entry/Postcard using its collapsed **Delete…** section. Download a backup first when needed. Deleting a website entry takes it offline and removes its website schedule. Deleting a draft does not recall an email already in Brevo.
