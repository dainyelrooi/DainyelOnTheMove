# Admin review counters and release — 21 October 2026

Owner requested an orange number beside Questions for new questions/notifications, then direct live publication of the reviewed admin. Subscriber mail is explicitly prohibited. Pre-change OneDrive backup: website_2026-10-21_10-28-00.

## Implementation

- Aggregate the existing personal-question, community-question and community-reply pending snapshot sizes. Add a matching counter to each review heading. No extra query, read-state flag, database write, poller, mailing or browser push permission was added.
- Counts represent pending review and persist when changing workspace views. They decrease as records leave pending through the existing live streams. Confirmed zero hides the badge; unavailable counts show an exclamation mark or a partial count. Loading is distinct from an empty queue.
- Reset on sign-out or owner-session changes. Session guards prevent old listener responses from restoring counts after reset. The asynchronous reply-card renderer also ignores obsolete snapshot render results.
- Orange pills use dark text, accessible navigation labels, per-heading screen-reader text and one polite count-only announcement. No names, question bodies or credentials are included in the counter state or its messages. Display caps at 99+; accessible text retains the full number.
- The preceding admin workspace/layout release is included. The optional journey runtime, database/Auth settings, Rules/indexes, existing private mail worker and subscriber campaigns remain unchanged.

## Review and limits

Composer, JavaScript syntax and whitespace checks completed. A separate local static preview demonstrated one sample count and clearing to zero, using the actual presentation module without Firebase account code/data. Its mobile screenshot is a sample layout, not a real pending count. No new submissions or test emails were created. No test suite was added or run for this request, and authenticated snapshot delivery was not exercised in the connected browser.

Revision d825dcb was deployed successfully on staging (Hosting run 39571049632) and production (Hosting run 39571334253). On both environments, the served admin HTML, count module and admin data module matched the reviewed local source. On production, /admin.html and /studio returned 200 with noindex/nofollow/noarchive and DENY frame headers. The new stylesheet and both JavaScript files returned 200; the known non-sensitive report URL returned 404. The production browser showed the new admin title, versioned stylesheet, badge markup and a hidden signed-out dashboard. The owner session in this connected browser is still not signed in, so no authenticated count was read or claimed as tested. No subscriber mail, private test mail or new question record was created for this release.
