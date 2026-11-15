# Subtle photo notebooks — staging candidate, 15 November 2026

The owner requested fewer links to personal photographs in reading copy, with a neat album or integrated presentation on the test site first. Production publication is not authorised for this candidate.

## Change

- Replace the repeated standalone photograph link below Peru narratives with one closed, illustrated photo notebook. Cusco/Machu Picchu offers the existing 23 relevant photographs; Lima offers its existing ten. Other Peru location combinations select only corresponding existing groups.
- Opening the notebook reads the existing public Atlas once, on demand. Reuse its published photographs, captions and page edits rather than maintaining another media catalogue. Before opening there is no album request; browsing fetches each additional image only when selected. No database listener, credentials or paid service was added.
- Reuse the existing CMS reader's manual previous/next controls, enlarged viewer, keyboard navigation, Escape and focus return. A copied photo fragment opens its notebook. Failed loads offer a retry and the existing Atlas fallback; without JavaScript the same fallback remains available.
- Parse only the expected album fragment, neutralise resource attributes before inert parsing, reject embedded active/resource elements and allow only bounded first-party approved WebP paths. Never inject the downloaded page HTML into the story.
- Two existing staging paragraphs lose their photograph call-to-action: the Cusco story and chakana fact. Their links to the related Field Note, story and chakana fact remain. Only staging CMS copies and immutable revision history changed; original publication dates, photo IDs, sources and all production copies are preserved.

## Files and recovery

Runtime: `assets/content-destinations.js`, `assets/publishing-model.js`, `assets/publishing-reader.js`, `assets/story-photo-notebook.js`, `assets/publishing-public.js`, `assets/publishing.css`. The normal composer refreshes dependent page asset versions. Existing editor catalogue remains 801 fields across 16 page areas.

Backup: `backups/website_2026-11-15_10-19-14`. Full pre-change staging documents and the small text replacements are retained outside the repository in the owner's Codex workspace. No private draft, credentials, subscriber data or future itinerary is included in this report.

## Verification and limits

- PASS: 61 focused Node checks covering public rendering, country/album selection, fallback/withdrawal precedence and public snapshots; JavaScript syntax and diff whitespace checks.
- PASS: nine isolated local Edge scenarios at 390/1280px: two narrative albums, the shorter fact, lazy requests, image counts, previous/next, viewer, Escape/focus, retry, direct photo fragment, no-JavaScript fallback and rejection of a foreign image before loading it.
- Local screenshots inspected for closed and expanded notebooks. These are browser viewport checks, not physical-device acceptance or performance scores.
- Staging deployment and actual remote readback are pending until the final receipt below is recorded. No production release, newsletter, provider/campaign/schedule change, Rules/Auth change or billing action is part of this work.

## Review

Use the original Cusco story URL and Lima Field Note URL on `dainyelonthemove-staging.web.app`; the notebook is just before Sources & further reading at the end of each narrative. The chakana fact keeps its short reading layout and photo without a repeated album link in its prose.

## Remote acceptance follow-up

The first candidate55794d6 deployed successfully (Hosting43730536517, regression43730536599, source backup43730536571, public copy43730557588). Five runtime files matched their committed bytes; initial text, noindex, report404 and unchanged production copy were checked. Eight existing reader/gallery/legacy-link/isolated-preview staging scenarios passed.

A remote retry test exposed the existing live-failure path replacing identical initial reading HTML with its reserve copy while a reader was opening the album. The correction retains that initial DOM only after matching the complete content fingerprint against a fresh validated reserve. It preserves both existing 24-hour boundaries, version/authoritative-withdrawal precedence and normal replacement for actual text changes. Two additional isolated tests cover exact retention/withdrawal and corrected-copy/expiry behaviour. Nine local album scenarios were repeated after this change; final corrected-source remote acceptance remains required.

## Final staging receipt

Corrected source3fcd403 is verified on the actual test site. Hosting43731303194, regression43731303127 and OneDrive source backup43731303121 succeeded. All six changed runtime files match their committed bytes. Nine actual staging album scenarios and eight existing CMS reading/gallery/legacy/isolated-preview scenarios passed after the correction; closed and expanded mobile screenshots were inspected.

The complete public copy contains both exact staged paragraph changes and preserves every other saved field, source, photo identity and original publication date. Initial HTML, staging noindex and report404 passed. Production retains its original copy and does not serve the new notebook module. No production, newsletter, subscriber, campaign, schedule, Rules/Auth or billing change occurred. This receipt supersedes the pending remote-acceptance statements above. Owner approval is still required before a future production release of this candidate.
