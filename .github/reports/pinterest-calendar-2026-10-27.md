# Pinterest calendar and publishing follow-up — 27 October 2026

## Owner request

The owner schedules the prepared Pins himself. Import publication dates, record only the owner-confirmed scheduled items, add one task per batch and integrate future-story Pinterest preparation into the private owner workflow. Images remain in the owner's OneDrive; do not upload raster/base64 image files into Firestore again. No Pinterest API or Metricool publishing.

## Completed private data work

The existing Enterprise Native free database was confirmed via Firebase CLI. A source backup was created before changes: website_2026-10-27_12-17-32. An existing authenticated Firebase CLI IAM identity performed create-only maintenance with no credential output, security change, email or external social publishing. Deterministic IDs make retry safe.

Independent server readback confirmed 56 social publication rows, 14 owner-confirmed Scheduled flags, no assumed Published flags, and 13 batch tasks with two completed and eleven open. All per-Pin reminder flags are false; only unfinished batch tasks request reminders. Existing owner reminder preference was already enabled and preserved. All twelve pre-existing calendar rows, their fields and update timestamps exactly matched the pre-change snapshot. Actual normal owner-browser MFA writes were not tested by this IAM maintenance. Raw private data stays outside source/Hosting.

## Image archive incident and recovery

The original private image-archive approach was too heavy for Enterprise write units. Forty temporary JPG copies were saved before HTTP429 explicitly reported the free daily write limit. No billing was linked/upgraded. Further small writes and cleanup were also rejected. This can temporarily prevent other admin/worker writes until the provider resets the quota; existing data remains. The owner then explicitly said to keep images on OneDrive.

The implementation now uses only the existing calendar text/checklist data, no image copies and no additional database query. A separate, one-time thread follow-up is set for the next morning, using an external helper that deletes only the temporary uploaded copies when exact campaign/ID/SHA/updateTime match. It cannot touch calendar rows, OneDrive or website media. Cleanup remains PENDING until a zero-copy server readback is observed. No further image upload should run. Unused read-denied archive metadata is not used by the website.

## Source implementation

- Private Pinterest workspace links directly from Calendar and Write, filters existing prepared copy by board, shows actual calendar status/date and exports CSV locally. No pictures or plan data are shipped in assets. Existing signed-owner/TOTP and App Check boundaries remain. The same calendar snapshot is reused for phone/desktop status synchronization, instead of another query. Sign-out clears the view.
- New-story worker is a separate job in the existing native calendar workflow. Actual published CMS entries and new canonical article URLs get one deterministic, create-only preparation task. Saving a draft or scheduling a future publication does not trigger it. Original stories form the baseline. A task is due two local calendar days after publication at19:30, or tomorrow if late; the existing day-before09:00 combined owner mail handles reminders. This worker has no provider-mail, AI, image upload or social publication call.
- Check/staging mode is read-only. Process requires public-repository main and the existing free Enterprise database. It cannot reset completed tasks or change subscribers, provider campaigns, owner MFA, App Check, Rules, indexes or billing. The old generic reminder wording is now channel-neutral.
- The standing workflow was appended to AGENTS.md. Unrelated quiet-growth instructions/report remain unstaged.

## Verification

65 Node and39 Python checks passed; public journey/schema/reference checks also pass. Actual isolated loopback UI with server-readback Pin rows:56copy cards,13tasks,14Scheduled/0Published, board counts20/20/16, zero images, working copy/CSV, preserved open details on unchanged snapshots,390px no horizontal overflow, and lock clears the private UI. This is explicitly a read-only local presentation check, not a new signed cloud-owner lifecycle.

A production release is not performed without the current reviewed-release approval required by AGENTS.md. The imported live calendar is already available through the existing Calendar UI; the new workspace and automatic future-story worker still require their reviewed release to main. No email was sent for testing or release. The native cron and actual reminder inbox delivery are not yet verified for this change.

## Staging release checks

Functional5a18b90 staging Hosting40514933578, isolated regression40514933445 and source OneDrive backup40514933523 succeeded. Private saved-content backup40514933570 stopped safely at staging calendar seeding before its backup/check steps. The database daily write quota is already known exhausted; the remote log intentionally hides the exact response, so this particular failure is not independently classified as HTTP429. Existing backups are preserved. It must be checked again after quota recovery. Production is unchanged.

A follow-up UI fix immediately invalidates the Pinterest view when the calendar listener fails, returns unreadable data or starts a reconnect. This prevents old copy/checkmarks being displayed as current while the shared listener is unavailable.

Staging HTTP readback confirmed the private workspace and both new JavaScript assets, matching reviewed source. Admin keeps noindex and X-Frame-Options DENY, and the source report URL is404. The production admin does not yet contain the workspace. Additional isolated UI checks confirm that unavailable storage clears copy and disables export, and a valid snapshot restores all56 cards.

The existing create-only staging-calendar seed no longer rewrites every copied channel to Instagram. It preserves source channels (including Pinterest and empty task channels), kind and status fields. One focused isolated test verifies these cases, exact create-only preconditions and preservation of existing test rows. No live calendar is modified by that helper.

First native activation also baselines all currently real canonical static articles, so old stories outside the initial Pin series do not become duplicate work. Non-article placeholders are not baselined and remain eligible once published. A focused isolated test verifies this initial create-only configuration, zero old-story tasks and placeholder exclusion. Actual CMS publications after the owner-import timestamp retain their preparation tasks.

## Approved production release

On27October the owner explicitly approved the reviewed workspace and future-story tasks. The release combines the Pinterest branch with the existing live main changes, preserving the independent publication recovery fix/report. Diff from live contains only the reviewed Pinterest files. Staging regression40516645847 completed successfully, including access Rules fixtures. After combining current main, all43 Python checks and10 focused JavaScript checks pass. A sandbox temporary-directory failure on the first Python run was resolved by using the task workspace temporary directory; no source change was needed. No new Rules, Auth, indexes, billing or service are deployed. Hosting and workflow readbacks follow.

## Live result

Approved releaseb0ea5d3 is live. Production Hosting40520117211/job122244601607 succeeded. Direct canonical readback confirms /admin200 with Pinterest navigation/workspace, exact reviewed admin HTML and five JavaScript/CSS assets, noindex and X-Frame-Options DENY. The source report URL remains404 and the public homepage remains200. The main calendar workflow exactly matches reviewed source, retains its existing hourly schedule and now contains the separate Pinterest job; GitHub reports the workflow active. No private Pin copy is bundled in the page or assets.

Existing calendar data was not changed by the release. Native task initialization/creation and actual reminder inbox delivery remain unverified while the known free daily write quota is unavailable. No manual notify/test email or Pinterest publication was triggered. The separately scoped40-copy cleanup remains pending its scheduled recovery attempt; no OneDrive or public images were removed. Raw HTTP evidence is outside the hosted repository.

## Separate cleanup completion — 28 October UTC−4

The dedicated Pinterest chat subsequently completed its one-time exact ID/SHA/updateTime-guarded cleanup. Its independent result at29October01:00UTC records40temporary copies deleted and0remaining, preserving calendar records/checkmarks, OneDrive and public website media. That cleanup automation was removed. This supersedes only the earlier pending-cleanup state; no second deletion or test reminder/send was performed by this release.
