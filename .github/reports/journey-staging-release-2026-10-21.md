# Journey experience — staging release, 21 October 2026

## Approval and scope

The owner explicitly approved the reviewed complete local version for the test environment, with the new server features still disabled. This supersedes the local-only status in the implementation report for staging only. No production release or email was requested.

- Implementation commit: `06a52bb`.
- Released commit with recorded approval: `cf877a5846c5afd9ea38185531c220c1c99f5deb`.
- Branch: `staging`; fast-forwarded from `9a2b132`, no remote changes discarded.
- Existing Firebase project `dainyelonthemove`, Hosting target `staging`, site `dainyelonthemove-staging`.
- Deployment succeeded through the existing [staging GitHub workflow](https://github.com/dainyelrooi/DainyelOnTheMove/actions/runs/39537710175). No direct duplicate deploy was run.
- Public review: https://dainyelonthemove-staging.web.app/index.html#next-chapter
- Pre-release backup: sibling `backups/website_2026-10-21_05-13-23`.

## Verification after publication

- All seven new pages and existing home, atlas and Thailand routes returned HTTP 200 with staging noindex headers.
- Home, atlas, Thailand, journey data, service flag, shared status/site UI modules and the three principal new archive pages matched the released Git commit byte for byte. Local Windows line endings differ from committed LF files; comparison used Git blobs.
- The known non-sensitive `/.github/reports/journey-implementation-2026-10-20.md` URL returned 404.
- `data/services.json` returned `{"journeyApi":false}`. The contact UI showed disabled inputs and an explicit direct-sending-unavailable message.
- Browser inspection confirmed the navigation badge and detailed clock both showed six whole remaining days on 21 October, using the shared actual-time snapshot.
- Postcards signup remained closed with its iframe source absent initially. No signup was submitted.
- Atlas year 2024 filter and Start/Next replay selected the first of eight matching moments, with the chosen year and moment represented in the URL.
- Passport Save Spain survived a page reload. The test bookmark was then removed; no other saved discoveries were cleared.
- Costs showed the real EUR 8,000–10,000 planning range, the preference to stay below it and no invented actual spending/daily average.
- Thailand cinematic mode retained its URL state across chapter navigation; manual slideshow advance updated the counter. At 375px the loaded photograph was visible, the arrows/counter remained in its frame and no horizontal overflow was detected. Desktop checks also showed no overflow. Temporary viewport override was reset.
- Existing 24 isolated Node unit/HTTP tests passed again; both public-route and public-trip validators passed, and `git diff --check` passed. These remain local tests, not proof of real backend/provider integration.
- Production homepage returned HTTP 200 and exactly matched unchanged `origin/main:index.html` at `658ab90`. No push to main or production deploy occurred.

Screenshots are outside Hosting in sibling `review-evidence/journey-experience`: `staging-home-2026-10-21.png`, `staging-atlas-2026-10-21.png`, and `staging-mobile-2026-10-21.png`. The mobile screenshot was taken after the selected photo finished loading. No new public PageSpeed score is claimed by this smoke check; the local performance measurements and homepage limitation remain in the implementation report.

## Services and email

Only static Hosting was released. No new runtime, billing, Firestore index/rules or Auth settings were deployed. New contact delivery, challenge submissions and mobile content persistence remain disabled pending their configured and verified backend. Existing owner authentication, Q&A and Brevo signup contracts were retained.

No test message, subscriber campaign or new scheduled email was sent or created. Existing scheduled Postcards editions and question-notification configuration were not modified. Source, backend preparation, remaining integration requirements and owner workflow are documented in `journey-implementation-2026-10-20.md`, `journey-owner-guide.md` and `../server/README.md`.

## Rollback

Previous staging source was `9a2b132`; preserve history and the prior Firebase Hosting version for a staging-only rollback if required. Do not reset unrelated later work. Production remains a separate owner-approved release.
