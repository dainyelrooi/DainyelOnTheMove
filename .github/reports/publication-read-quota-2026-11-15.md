# Publication HTTP429 repair â€” 15 November 2026

Status: final staging source6d76420 accepted; owner explicitly approved production release. Deployment and production readback are in progress.

## Confirmed cause

- A bounded real production marker read returned HTTP429 / `RESOURCE_EXHAUSTED`. The actual Google response is classified as **daily-read-quota**, not an authentication failure or brief per-minute burst. No raw response, credentials, story content or contact details are retained.
- Database metadata confirms the existing named Enterprise Native free-tier database. No migration, billing activation or Rules/Auth change.
- The same publication/reconciliation failures existed before the previous release (runs43771886979 and43772422399). Calendar run43772178412 also failed. Hosting43771953592 succeeded independently.
- Read-only Cloud Monitoring inspection identifies tens of thousands of read units under `BatchGetDocuments`; query and document polling also consume budget. Method series can overlap (`Query`/`RunQuery`), so they are not added together as a claimed invoice total or exact per-workflow attribution.
- The exporter reread every linked base64 photograph on every complete export. Photographs are immutable under both existing Rules namespaces: editing creates a new ID. Repeated read retries and provider receipt lease traffic added avoidable work once the daily limit had already been reached.

Google documents50,000 free Enterprise read units/day, reset at midnight Pacific: [Enterprise Native quotas](https://firebase.google.com/docs/firestore/enterprise/quotas-native-mode). [Resource exhaustion guidance](https://docs.cloud.google.com/firestore/native/docs/understand-error-codes). A code repair cannot restore an already-spent quota. The next reset for this incident is16November08:00UTC /09:00Europe/Amsterdam; the candidate resumes probes two minutes later. Existing24-hour overdue review protection stays in place.

## Implemented changes

1. `public-content-snapshot.py`: validate a fresh same-space complete public reserve, including image signatures, dimensions and hashes. Reuse bytes only for the exact immutable image ID/owner still referenced by a fresh public source read. All text, publication/withdrawal state, consent and references remain authoritative at the new pinned read time. New images still read Firestore; invalid/missing/expired copies cannot authorise reuse. Removed entries/IDs are never restored by cache. Cache failure falls back to the original safe exporter.
2. `question-notifications.py` and `firestore-budget.py`: bounded Google error parsing into fixed safe reason codes. Confirmed daily quota is not retried immediately. A small optional local state records only version/reason/reset deadline; no source/customer identifier or response body. Less detailed service-identity responses containing only `Quota exceeded.` receive a15-minute persistent hold followed by a fresh probe; they never imply a confirmed daily reset. Less detailed service-identity responses containing only `Quota exceeded.` receive a15-minute persistent hold followed by a fresh probe; they never imply a confirmed daily reset. Transient throttling retains bounded retries; commits and uncertain email sends are never replayed by this change.
3. Shared composite action and six workflows: restore/save only that deadline in the existing free Actions cache, across publication, delivery reconciliation, reading-copy export, calendar, question and contact jobs. On a hold, skip authentication and database/provider-dependent steps, including Hosting deployment of an unbuilt copy. The summary explicitly says **BLOCKED** and confirms no publication/delivery/verification. A missing/evicted cache permits a normal probe. The first confirmed quota failure remains visible; later deferred ticks do not generate repeated failed-run emails for the same known hold. Other faults remain failures. The two existing clocks are preserved.
4. `postcard-controller.py`: skip cancelled/not-due observed receipts before reading/writing per-mail leases. Due/explicit-link reconciliation retains the same shared lease and identity checks. No provider mutation was added.
5. `postcard-delivery.py` and publication CLI: show fixed daily-quota categories rather than an unexplained429. Existing immutable payloads, version/CAS guards, timing, idempotency and opt-outs are unchanged.

## Verification

| Check | Result | Evidence / boundary |
|---|---|---|
| Full Python regression | PASS |209 offline tests, including schedules, provider mocks, cancellation, backup, read-copy/verification and new quota tests. Printed Rules/provider operations are synthetic mocks, not remote changes. |
| Focused Node regression | PASS |27 tests covering public export/browser contract, snapshot freshness/space/privacy, scheduling/DST, clocks, manual completion, drafts and guarded deletion. |
| Actual public cache | PASS | Full production CDN schema/hash/image validation yields50 reusable public photographs; zero Firestore or mail operations in this check. |
| Repeated export fixture | PASS | Both fixture images use zero blob database calls on second export; resulting text/images are exact. Fresh public queries still execute. |
| Withdrawal/privacy/cache failure | PASS | Withdrawal cannot be restored; wrong owners/spaces, old timestamps and corrupt bytes do not authorise reuse. |
| Actual Google error classifier | PASS | One real429 body classified in memory as daily-read-quota; only a safe content-free deadline written locally. |
| Daily hold/DST/expiry | PASS | Daily quota performs one request; later calls make zero HTTP calls, including commits. DST reset, expired/malformed cache, brief429 retries and provider independence verified. |
| No-op provider receipts | PASS | A not-due receipt opens no per-mail lease and performs no provider request. |
| Workflow syntax | PASS | Existing YAML parser and official actionlint1.7.12; no new site dependency. Official tool archive digest verified. |
| Real scheduled staging publication | BLOCKED | The shared database daily quota is already exhausted. No real fixture or email was created; simulated scheduled publication regression passed. |
| Production activation | APPROVED | Owner approved this repair; deployment/readback pending. No manual production process, subscriber/test email, campaign reschedule, Rules/Auth write or paid service. |

The first staging test exposed a second actual bug: runQuery returns its error in a JSON array, while get returns an object. The former classifier handled only objects. A real isolated query confirmed the same daily quota inside that array. Both shapes, and error rows inside a partially successful stream, now fail safely into the shared circuit breaker. Final actual staging CI/cache/deployment results will be recorded below. Workflow green with a quota hold is explicitly deferred and must never be reported as a verified publication. Native Brevo schedules remain independent of a Firebase read outage; their current delivery is not verified by this repair.

## Recovery and limits

- Local backup: `backups/website_2026-11-15_19-35-38`, source6b7d486. Dedicated repair branch keeps the previous release intact.
- No content, dates, IDs, URLs or campaign relationships were changed. No Rules/Auth or provider/account security rights changed. No new paid service/dependency.
- This reduces redundant reads; it does not promise unlimited free traffic. Free quota can still be exhausted by sufficiently high traffic, bulk uploads/backups or external tools. Already-consumed quota requires reset. Public reading copies retain their existing24-hour freshness boundary and authoritative withdrawal behavior.
- Immutable photo reuse follows the existing application contract. Out-of-band privileged maintenance must use new IDs when changing photo bytes/alt text; it must not silently overwrite immutable IDs.


## Actual staging acceptance

- Functional source16e2bd7: full isolated regression43784003091 and source backup43784002778 passed. Hosting43783824628 passed for the preceding source0075f82; later changes are background-only and excluded from Hosting. No public UI/content changed.
- First real corrected query check43783824637 observed daily-read-quota and saved the content-free deadline. Its failure is retained as the original quota alert; no mail was sent.
- The next independent question workflow43784002839 restored that deadline and explicitly deferred its database/mail step. No new database query, Google authentication or provider action executed.
- Read-only publication check43784114690 restored the same deadline: publication skipped and reading-copy job skipped. It completed with an explicit BLOCKED summary, not a publication claim.
- Public reading-copy43784002810 also restored the hold. Its authenticated sync, build, stale-check, Hosting deployment and verification steps were skipped. The isolated offline check still passed. This verifies that a quota hold cannot deploy an unbuilt copy.
- All209local Python tests and27unique focused Node tests passed; the final exporter/browser-contract test passed again after shared error-response validation. Official actionlint passes all six changed workflows.
- Real scheduled publication after reset remains BLOCKED; no safe test content can be saved until the shared daily quota resets. No subscriber/test email, production process dispatch, campaign edit, database write, Rules/Auth change or paid service was used in this repair.
- Production release approval remains pending. A safe initial main check must remain check-only; do not smoke-test by dispatching the complete production processor. Preserve the current main/source archive changes when integrating.


## Owner-approved production release

The owner explicitly approved “Ja, zet de reparatie live”. Final staging6d76420 Hosting43784384770, full regression43784384922 and source backup43784384741 passed. Recovery branch backup/publication-quota-pre-live-20261115 retains6b7d486; pre-release backup website_2026-11-15_20-10-21 retained. The pre-release public readback contains12entries,50photographs and five healthy canonical pages, without database access.

Integrate only this reviewed candidate into current main using the existing deployment. Production checks stay check-only; normal independently approved schedules continue on their existing clocks. No extra email, campaign change, new service, Rules/Auth or billing change is part of the release. Deployment receipts and actual public/gate verification follow below.
