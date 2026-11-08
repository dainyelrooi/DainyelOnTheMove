# Compact calendar days

Owner request: keep the admin month grid compact instead of stretching every day to fit all appointments. One chronological item remains visible; a +N counter at its upper-right opens all matching items for that date. Two items show +1, five show +4.

Changes: `assets/content-calendar.js`, `assets/content-calendar.css`, shared calendar template and composed `admin.html`. A day overview reuses the existing protected item dialog and editor routes. The normal post list stays complete. Website/Postcard entries still open their original editors. No new reads, writes, storage schema, publication or provider operation is introduced. A small move-dialog focus fallback keeps a hidden item reachable after moving it; existing date/revision safeguards remain.

Backup: `website_2026-11-07_18-32-59`. Isolated branch: `fix/compact-calendar-days`. Production approval from the preceding publishing repair does not approve this new visual release.

Verified:

- Syntax checks and 18 focused existing calendar/owner-flow checks pass, including one added keyboard-focus regression for moving a hidden item. Public structure, references, metadata and Hosting exclusions pass.
- Actual browser with the real renderer and CSS, synthetic local snapshots and blocked storage writes: 42 day cells all 172px on desktop; busy days display +4/+2; long titles do not increase height.
- +4 opens five chronological items, including website and Postcard schedules. A hidden social item opens its full existing editor. Close and Escape return focus to the visible +4 counter. Programmatic opening of an otherwise hidden item works. Its Move date dialog opens and cancels without writes.
- Narrow browser measurement: actual viewport375px, document375px, all day cells124px. The requested viewport override was390px, but actual measured375px is the tested width. Full day-list titles remain readable; no horizontal page overflow. Viewport override reset after testing.
- Filtered scheduled items recalculate +4 to +1, and the original Post list remains available.

No production data, real schedules, subscriber messages or social posts were changed. Local layout fixtures are ignored, not deployed and not evidence of a new authenticated cloud save. The visual candidate is for staging review; the unchanged storage/move safeguards were exercised separately by the existing isolated tests.

## Owner-approved production release — 8 November 2026

The owner explicitly requested ‘ga live’ after staging review. Pre-release source backup: `website_2026-11-08_15-33-16`; previous production preserved at `backup/pre-compact-calendar-live-2026-11-08` (`84a1d0b`). Staging Hosting `42426760623` and full regression `42426760664` passed for the exact candidate `3aafeb0`. Production Hosting `42520754012` then completed successfully at that same commit.

Canonical `/admin` returns HTTP200. The deployed calendar renderer, compact CSS, dialog heading hook and +N help text were read back from the live domain. Production data, dates, publishing jobs, provider plans and subscribers were not edited by this visual release. No additional newsletter or social post was triggered. The prior local browser/layout and keyboard checks above remain the functional evidence; no new authenticated production save is claimed for a visual-only change.
