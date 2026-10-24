# Collections and question desk — 24 October 2026

## Requested scope

Staging presentation update only. No production publication, newsletter, test mail, provider setting, Firestore/Auth/Rules/index or delivery activation change.

## Changes

- Fixed the film-library grid conflict that squeezed/overlapped cards. Shared collections now have one consistent three/two/one-card layout.
- Replaced end-to-start scroll rewinding with a ring of existing card nodes, compensating only off-screen moves. No clones, duplicate links, media or CMS entries. Both arrow directions and native horizontal scrolling continue across the boundary. Five-second automatic collection advance remains, with reduced-motion, focus/hover, visibility and foreground-player safeguards. Removed slideshow play/pause button and persistent pause mode.
- Stories uses Travel Stories by default; Field Notes defaults to notes. Only those two category buttons remain. Latest CMS sorting and existing static fallback content are preserved.
- All About personality cards and creator-kit details start closed. Explicit deep links may still open the requested section.
- Q&A prioritizes published question cards and community topics above the forms. Existing answers start collapsed, except an explicitly shared answer link. Answer navigation is manual with circular previous/next; no timed replacement while reading and no pause control. Forms, guidelines and challenges are collapsed native details. Community replies/forms open on demand; reply listeners start only when a conversation is opened. Show three conversations, with More for additional loaded topics. No fabricated questions or changed submission/moderation contract.
- Original field IDs, validation, consent, pending status, public queries and owner notifications preserved. The Q&A website-editor catalogue was regenerated from the new structure: old section fingerprints retire rather than silently attaching a saved override elsewhere. Existing history/backups remain available; no private draft migration or deletion performed.

## Checks so far

- Required OneDrive pre-change backup: website_2026-10-24_13-13-08.
- Composer regenerated shared public documents, asset fingerprints, search/catalogue data and optional public shell.
- Syntax checks passed for affected JS. No automated test suite added or run.
- Local browser: distinct three-column film cards, boundary sequence 5/6/7 → 6/7/1 → 7/1/2, two reading filters and matching card kinds, four About details closed. Q&A collapsed forms and direct-form anchor observed; 375px Q&A had no page overflow. Local anonymous feed reads were unavailable, so real published-feed appearance remains to be reviewed on staging.

## Release

Initial staging Hosting run 40090390930 succeeded at bb05219. Five affected deployed JS/CSS files matched local source and the report URL returned404. Actual staging phone375 loaded both real published-answer pagination and one existing community topic; answers and conversation replies opened on demand, forms started closed and no overflow occurred. No submission was made. A final scoped CSS refinement isolates the Q&A decorative stamp from newsletter stamp positioning and lets short result sets fill the available row. Final deployment/readback follows. Production main remains unchanged. No email sent.
