# Postcards controller — staging review, 12 November 2026

The owner requested reliable provider confirmation, an active-only Postcards
desk and a private calendar. Production publication of this release requires
the owner's explicit approval. No campaign/test/subscriber email is authorised
by this maintenance release. Campaigns 17, 19 and 22 must never be resent,
cancelled or rescheduled as part of this repair.

## Existing records and evidence

- Read-only initial provider audit: Actions 43246013002.
- The three exact owner-selected records were reconciled: Actions 43252923558.
  All three identities were checked before writing any record. The operation
  called only GET at Brevo. Campaigns 17 and 19 were actually Sent; campaign 22
  was provider-queued for the exact owner-approved future instant.
- Independent readback: Actions 43253521544. All three records reported
  `originalPayloadAndDatesPreserved: true`. Original draft revisions, payloads,
  requested timestamps and their REST timestamp types remain intact. The exact
  provider times, binding and immutable baseline are stored privately, not in
  this public repository report.
- The existing public campaign-17 article and archive index returned 200 and
  still contained the original edition. Current main/archive history was
  merged into the staging candidate, retaining the existing public exports.

No Firestore draft was deleted. In the new interface all three confirmed
records qualify to leave the active desk. The current production frontend
continues to show its old draft list/requested dates until release approval;
the new calendar reads the provider-confirmed times instead.

## Behaviour

`postcard-controller.py` has a GET-only provider adapter. It validates the
campaign ID, fixed sender and subject, and the immutable job name or verified
manual binding. Automatic manual-campaign discovery also requires matching
message content and CTA, a complete bounded discovery result and a unique
candidate. Ambiguity asks for an owner link; it never creates a campaign.

Provider `sent` plus a valid actual `sentDate` is required for Sent. A native
future queue can be Scheduled only with the exact approved instant. Accepted,
Processing, a saved draft date and a successful Action are insufficient.
Late queued campaigns remain pending. Changed schedules, failed campaigns and
uncertain reads stay visible for review. Last attempted/successful checks and
fixed error codes remain visible; old evidence and actual sent dates survive
outages and provider regressions.

Each existing mailJob is the persisted calendar receipt, with a deterministic
view ID derived from the original Postcard ID. Status/calendar updates are one
CAS commit, with a unique campaign-to-Postcard mapping and private immutable
provider transition history. Draft/history content is retained. Calendar
details display saved text and provider evidence directly in the dialog; the
calendar cannot send or reschedule. Missing original drafts open the retained
delivery snapshot read-only. Both calendar and desk clear private DOM state on
sign-out and ignore obsolete listener callbacks.

The desk joins only the displayed draft page to live provider receipts. The
calendar queries the selected Amsterdam month by confirmed provider time, so
older months do not disappear behind the latest 100 global jobs. Queries remain
bounded at 100 receipts per month and disclose an actual full-window limit.
No additional composite index is required for the single-field date range.

## Autonomous execution and duplicate prevention

The reviewed production candidate reuses the existing ten-minute delivery
workflow and the independent publication clock. The provider controller has
its own sweep lease, shares the mutation worker's per-mail lease and rereads
the current record before processing. It skips stored future retry deadlines,
rotates bounded historical/draft/link pages, and preferentially checks due
receipts. Future schedules are normally observed within 30 minutes and after
their due time; final sends are checked daily, then weekly. Delays remain
possible; there is no exact-time GitHub scheduling guarantee.

Only reads get bounded transient retries; Retry-After is respected. Ambiguous
provider mutations and Firestore commits are not blindly replayed. The sender
refuses incomplete discovery responses, duplicate immutable names across
pages, existing same-subject campaigns and uncertain dispatches. Persistent
provider outages and genuine storage failures retain failure alerts. A
temporary provider outage first leaves explicit private pending/review state.

Existing production delivery stays enabled. The new periodic read-only controller
starts only when the owner-approved code reaches main; no extra credential,
repository-variable permission or service is needed. It continues checking
existing campaigns if the sender is disabled. Staging reconcile/check/test modes
run independently of an open browser and remain isolated from production sweeps.

## Rules, backups and workflow errors

The production Rules candidate retains signed owner Google/TOTP controls and
server-only provider results, mappings and history. It adds bounded owner link
requests and protects records after provider handoff. These are candidate Rules
for the reviewed release; full production activation remains pending.

Only the additive private staging link/history/status extension was activated:
Actions 43255900551. The helper backed up the actual current named Rules
privately, preserved every existing source byte outside that staging-only block,
checked concurrent release changes and read back the exact active named source.
No production permission or Auth setting was changed by that operation.

The source-backup failure was an unnecessary existence probe of the old remote
website working folder. The owner confirmed that folder moved/was renamed.
The source is the checked-out Git commit, so only the real backup destination
needs to exist. Native source backup 43254358605 uploaded an immutable archive
successfully. Native saved-content backup 43250270357 uploaded and independently
verified its checksum; production backup 43258730487 did the same after the
three record corrections (198 saved-content documents). The new backup worker also includes mailJobs, campaign
bindings, link requests and provider history after release. The Windows local
OneDrive backup tool could not run in this Cloud workspace; no local Windows
backup is claimed. Git baseline `backup/postcards-staging-20261112` was retained.

The actual publication failure 43201299043 was Firestore HTTP 503. Existing
optional reading-copy probe handling is retained, and safe per-read retries now
cover transient Firestore reads without replaying publication commits or mail.
The separate Dependabot run 43130099502 reported GitHub HTTP 400 /
`dependency_file_not_supported` while updating the optional server lockfile.
The concrete affected dependency was fast-xml-parser 5.11.2, advisory
GHSA-474x-hrwr-fgx4. Its compatible lockfile update to 5.12.0 (and its required
is-unsafe 2.0.3) is prepared on staging. The parser advisory disappeared from the
independent npm readback. No direct dependency or runtime was added/enabled.
The old rejected run remains historical; six other moderate optional-server
advisories remain reported. No dependency/security alert was disabled.

The completed three-record repair is not exposed as a continuing workflow mode.
Routine diagnostics emit opaque identifiers, status/proof booleans and fixed
error codes, without planned/sent instants or private calendar text.

## Validation and remaining release work

- 165 Python tests, 258 JavaScript tests, 23 full-candidate emulator cases and
  four focused staging-overlay cases passed locally.
- Real isolated Firestore staging lifecycle: 43250269057 and 43251698654.
  Save/request, exact future schedule, repeat processing, stable calendar ID,
  actual sent time, uncertain read and retained draft passed with the actual
  Brevo transport forbidden. All disposable Firestore fixtures were removed
  using exact-version checks; existing records/history were retained.
- Chromium measured 390px and 1280px: active filtering, save/preview/recovery,
  manual link request without mail creation, Scheduled-to-Sent update, unchanged
  event ID on repeats, direct read-only calendar dialog, historical fallback and
  sign-out cleanup passed. No horizontal overflow or page JavaScript errors.
  These browser checks used isolated SDK fixtures; they are not a new owner
  Google/TOTP login or a physical iOS/Safari acceptance test.
- Public structure/reveal validators and syntax checks passed. Staging Hosting
  remains noindex and hidden tooling/report files remain excluded.

After explicit production approval: recheck current main, preserve any later
public archive commits, publish the reviewed Hosting/Rules candidate, run the
initial main-branch GET-only backfill/readback and verify the existing clocks. Verify the
native owner desk/calendar after activation. Do not send a release newsletter,
test email or replay any existing campaign. Existing future provider schedules
continue independently of this code release.
