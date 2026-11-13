# Admin calendar and navigation follow-up

## Scope and release boundary

Owner requested visible calendar deletion and a simpler workspace menu. New UI
and additive Rules are prepared for staging; they are not a production release.
No provider creation, send, cancel or reschedule operation is introduced.
The already-approved Postcards controller release remains live unchanged.

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
  This additive prototype has not been deployed remotely. Review and verify
  it before activation; it grants no provider-job permissions.
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
  restore and list/delete denial. Full CI result is recorded after staging.
- Production cancellation independently read back; other jobs not modified.
- Syntax, composer and whitespace checks run before staging publication.

Remote Rules activation and real signed-owner visibility saves remain pending
release authorization. The new UI fails closed if those permissions are absent;
existing calendar loading, editing and provider observations remain available.

## Owner guide

1. Open Calendar and click the day/item, or use Post list.
2. For a social post/task/appointment, choose Delete calendar item and confirm.
   This private item is permanently deleted; copy any wanted text first.
3. For a linked Postcard/story, choose Remove from calendar and confirm the
   warning. The mail/publication schedule continues separately.
4. Use Removed items, select its original month and choose Restore to calendar
   to bring a linked item back. For actual delivery cancellation use Brevo;
   for website scheduling use Stories & Field Notes.
