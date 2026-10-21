# Public Q&A automatic loading — 21 October 2026

## Request and cause

The owner reported the public answers and community conversations remaining on
“Loading…” and explicitly requested the fix to go directly live, with the existing
no-release-email instruction retained.

Reproduction on the canonical `/qa.html` showed both static loading messages and
disabled forms. The standalone page only initialized the Q&A service when a
`?question=` permalink was present or the visitor clicked a button at the top.
Ordinary page visits therefore never started the queries. Clicking that button
loaded the two real published answers and one real community conversation.

## Correction

- `assets/site-ui.js` now starts Q&A automatically on the standalone Q&A page.
  Other pages retain deferred loading, including the homepage question panel.
- The shared template no longer describes an idle, unconnected service as loading.
- A 12-second initial module/connection deadline replaces indefinite waiting with
  an honest unavailable message and a nearby retry control for each feed.
- Feed retries stop their old subscription before restarting it and ignore stale
  results. A delayed connection can still recover through the existing listener.
- The answeredAt query keeps its existing indexed createdAt fallback, now with
  proper cleanup when retrying. Direct answer lookups have a three-second deadline
  so an unavailable permalink cannot block the rest of the published answers.
- Existing real-time snapshots are retained because public moderation updates
  must continue to appear without a page reload. No polling or new automatic
  query is added to the counter or to unrelated pages.

No database records, Rules, indexes, Auth, email worker, consent, submission
contract or optional journey backend were changed. No questions were submitted
and no email was sent for this release.

## Checks

- Pre-change backup: `backups/website_2026-10-21_12-59-25`, outside the checkout.
- JavaScript syntax checks and `git diff --check` passed.
- `tools/Compose-Site.py` refreshed shared markup and asset revisions. Changes to
  other root HTML files only refresh the shared script revision.
- Local browser: the external connection did not complete, and both feeds
  correctly reached their unavailable messages with visible retry controls.
  No fabricated empty state or sample visitor records were used.
- Staging Hosting run `39589537040` succeeded for commit
  `052e823f9f2d6ae2aa099b2976c5d218f22add88`.
- A fresh staging `/qa.html` visit without a question parameter or any load-button
  click automatically displayed the existing answers and community thread at a
  390×844 viewport. Both loading messages and retry controls were hidden, the
  forms were enabled, and the conversation's actual empty-replies state appeared.
  No browser warning/error was captured for that check.

## Production

The owner explicitly authorized immediate production publication for this fix.
Commit `052e823f9f2d6ae2aa099b2976c5d218f22add88` was promoted from staging to main.
Production Hosting run `39589896203` completed successfully.

Canonical verification after deployment:

- `/qa.html`, `assets/site-ui.js` and `js/qa-live.js` returned HTTP 200 and matched
  the reviewed source after newline normalization.
- The known non-sensitive authoring report URL
  `/.github/reports/admin-review-badges-2026-10-21.md` returned HTTP 404.
- Reloading the plain canonical `/qa.html` automatically displayed both real
  published answers and the real community conversation, with no load-button
  click. Both feed statuses and retry controls were hidden; both forms enabled.
- A second fresh canonical visit at a 390×844 viewport (375px content width with
  the browser scrollbar) automatically showed one answer per carousel page,
  “Page 1 of 2”, plus the existing conversation and its real no-replies message.
- No warning/error was captured in the canonical browser check. No score or exact
  network-load-time guarantee is claimed.
- Mobile proof screenshot, outside source/Hosting:
  `C:/Users/dainy/Documents/Codex/2026-10-21/public-qa/live-community-loaded.png`.

The final documentation-only synchronization uses `[skip ci]`; it changes no
static assets after the verified code release. No email was sent.
