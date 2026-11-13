# Admin calendar and navigation follow-up

## Scope and release boundary

Owner requested visible calendar deletion and a simpler workspace menu. New UI
and additive Rules were prepared and verified on staging first.
No provider creation, send, cancel or reschedule operation is introduced.
The already-approved Postcards controller release remains live unchanged.

The owner subsequently explicitly answered “Ja, zet dit live inclusief de
opslagrechten” for this reviewed release. Production rollout is authorised.
Pre-release local backup: `website_2026-11-12_19-28-12`. The existing immutable
Rules release guard is pinned to this exact tested candidate and the previous
released source; unknown policy changes still stop before any write.

Local pre-change backup: `website_2026-11-12_19-04-41`.

## Explicit owner-requested live record correction

The owner confirmed that the unwanted item was the 14 November Postcard,
Brevo campaign 23, already removed in Brevo. A fresh bounded GET-only audit
(43335149974) completed successfully: campaign 23 was absent, while the existing
selected sent campaigns and campaign 22's queue remained present. Its last
stored provider observation had already shown Suspended rather than Sent.

Only this existing mail job was internally cancelled with a document-version
precondition. Independent full-document readback confirmed every field except
internal status/update timestamp unchanged, including original payload,
requested date, provider evidence and campaign relationship. No document was
deleted. The deployed calendar presenter excludes cancelled jobs, so the old
14 November event is removed without deploying the new UI. Its private copy
and provider history remain. No request was sent to mutate Brevo.

## Implementation

- `content-calendar.js`: an ordinary calendar item's existing revision-checked
  Delete button is now in its visible heading. Deletion still requires explicit
  confirmation. Social media posts are unaffected.
- Linked website and provider events have **Remove from calendar**. This changes
  only private display preferences; a warning explicitly states that scheduled
  email delivery or website publication continues. **Removed items** allows
  restoration. Neither event identity nor provider/publication data changes.
- `calendar-visibility.js`: shared read/transaction contract, fixed supported
  spaces, validated linked IDs, 500-item bound, duplicate rejection and
  sign-out guards. Transaction merging preserves removals from other devices.
- `firestore.rules`: one private singleton per environment,
  `calendarSpaces/{space}/preferences/visibility`, requires existing verified
  owner/TOTP, strict fields/version/timestamp and bounded unique list. Public
  access, collection listing, arbitrary documents and deletion are denied.
  This additive prototype was tested in the emulator and then explicitly
  approved for activation. It grants no provider-job permissions. Production
  source readback and anonymous denial are recorded below.
- `content-backup.py`: include the new private preference collection in the
  existing checksum-verified backup, without changing the backup destination.
- Admin template/JS/CSS: five primary links (Overview, Add new, Calendar,
  Postcards, Inbox); collapsed Website content and Social tools groups retain
  all previous routes, focus handling and badges. An active nested route opens
  its containing group automatically. Generated admin HTML is refreshed by the
  existing composer.

## Verification

- PASS: 19 focused Node checks (calendar create/move, provider presentation and
  removal/restore/session/boundary cases).
- PASS: actual Edge headless fixture at 1280px and 390px: grouped routes,
  visible ordinary deletion with closed editor, cancellation, deletion,
  linked remove/restore, persisted removal after a full page reload, preserved
  provider record and sign-out cleanup. No horizontal overflow or JS errors.
  All external requests were blocked and Firebase replaced with disposable
  fixtures. This is not a new Google/TOTP owner session or physical iOS test.
- New Rules emulator case covers owner/TOTP, visitor denial, missing/extra
  fields, bad version/time, duplicate/oversized lists, unsupported paths,
  restore and list/delete denial. Full staging regression 43336561866 passed:
  262 Node tests, 176 Python tests and 24 isolated Rules emulator cases.
- PASS: staging Hosting 43336561891. Deployed admin HTML and the three changed
  JavaScript modules independently matched source 24904c0 after deployment.
  The Rules and this report remained excluded (HTTP 404).
- PASS: existing OneDrive source backup 43336561991 and private saved-content
  backup 43336561947. No email or provider mutation.
- Production cancellation independently read back; other jobs not modified.
- Syntax, composer and whitespace checks run before staging publication.

The owner-approved remote Rules activation is complete. A new native signed-owner
visibility save has not been performed in this session: no authenticated browser
session was available. Emulator owner/TOTP checks and fixture browser writes are
distinct from that acceptance check. The UI fails closed on unavailable storage.

## Owner-approved production result

- Released source `bff9e2d14d6536cbb55063d787f75bd011dc916d`, preserving all later
  main/public archive content. Recovery branch
  `backup/admin-calendar-pre-live-20261112` retains pre-release main.
- Full final regression 43337376601 passed, including the existing eleven
  immutable publication-guard tests. No new permissions were added after the
  reviewed 24-case Rules emulator run.
- Read-only named Rules preflight 43337416962 confirmed the exact previous
  deployed baseline. Approved apply 43337609195 retained its private immutable
  backup, activated only the tested additive candidate, and independently read
  back its exact source. Auth and App Check were unchanged.
- Production Hosting 43337554262 passed. Canonical `/admin`, both changed CSS
  files and all three changed JS modules were read back and exactly matched
  approved source. Admin retained noindex/nofollow/noarchive and frame denial.
- Public Stories/Postcards returned 200; this report and Rules URL remained 404.
  Anonymous access to private production calendar preferences returned 403.
- Final stored-state reads confirmed campaign 23's internal job still cancelled
  and campaign 22 still scheduled with its original requested provider instant
  and no error. No Brevo mutation, email, campaign reschedule or duplicate.

## Owner guide

1. Open Calendar and click the day/item, or use Post list.
2. For a social post/task/appointment, choose Delete calendar item and confirm.
   This private item is permanently deleted; copy any wanted text first.
3. For a linked Postcard/story, choose Remove from calendar and confirm the
   warning. The mail/publication schedule continues separately.
4. Use Removed items, select its original month and choose Restore to calendar
   to bring a linked item back. For actual delivery cancellation use Brevo;
   for website scheduling use Stories & Field Notes.
