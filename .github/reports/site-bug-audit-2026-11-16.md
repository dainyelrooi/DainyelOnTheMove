# Website bug audit — 16 November 2026

## Scope and release boundary

The owner requested investigation and repair of further bugs and recurring errors after the separately approved publication-quota repair. This candidate is staging-only. Preserve all production content, URLs, publication dates, campaign relationships, cancelled jobs, subscriber choices and existing schedules. No extra email, provider mutation, Rules/Auth deployment, new service or billing change. Pre-change backup: `website_2026-11-16_11-03-39`; branch: `fix/site-bug-audit-20261116`, based on `7cb3941137c445d11aa5afd8abf5f33555f8511f`.

## Confirmed findings and repairs

| Priority | Component | Evidence / cause | Repair and acceptance |
| --- | --- | --- | --- |
| P1 | Pinterest follow-up worker | Main run43860378035 failed its Pinterest job133275324341. A bounded read found13 eligible lifetime publications against a10-candidate safety limit. Already-created tasks counted again, permanently blocking the worker as the site grew. | Skip deterministic task IDs before selecting new work; process at most10 genuinely new tasks per run, preserving completed tasks and create-only duplicate protection. Paginate projected publications with stable timestamp/name cursors, bounded to500. Keep the200-item calendar capacity explicit. Store bounded processed CMS IDs so removing an already-recorded task does not recreate it. Earlier deletions without any receipt cannot be retrospectively distinguished from never-created tasks. |
| P2 | Global search | The static index response replaced archive-only Postcards if it arrived after the archive response. Facts were labelled Field Notes and Dutch `weetjes` searched the Notes synonym group. | Preserve independently loaded archive results, validate/bound rows, label facts Did you know?, and add a separate facts/weetjes synonym group. Preserve withdrawal and24-hour freshness rules. |
| P1 latent | Test-calendar email isolation | A manual staging `notify` dispatch lacked the production-branch guard already used for Pinterest. No unintended send was observed. | Staging workflow always selects check-only. The mail worker independently refuses notify outside public main before authentication, reads or writes. Production reminder preferences remain unchanged. |
| Maintenance | Existing dependency locks | Baseline npm audit:6 moderate findings in the optional, disabled server dependency graph;5 high propagated findings in isolated access-rule test dependencies. These are not evidence of a browser exploit. | Refresh the existing server lock within its allowed versions to avoid the vulnerable glob/minimatch chain. Pin the existing test-only gRPC transport through an override to1.14.6. No new direct app dependency or deployed server. Both resulting audits report0 known findings. |

Pinterest diagnostics now report a fixed, content-free failure category rather than an unexplained generic stop. No private payloads, credentials or visitor data are written to this report.

## Verification before staging deployment

- PASS:217 Python tests, including bounded backlogs of23 tasks (10/10/3/0), existing completed tasks, read-only execution,113-row tied-timestamp pagination, repeated-page refusal, and notification branch isolation.
- PASS:290 Node tests, including both search response orders, malformed archive entries, archive-only fallback and facts discovery. Existing withdrawal/expiry tests remain intact.
- PASS: actionlint for the changed workflow; journey structure and public-trip validation; clean whitespace diff. Composer preserves all822 existing website-editor fields and generates no page changes.
- PASS: read-only production crawl of44 public pages and236 local assets, plus3 extra internal routes: HTTP200, one H1 per page, no duplicate element IDs or broken local resource statuses. SVG title elements and the intentional `/#search` modal route are not HTML metadata/anchor errors.
- PASS: browser checks on staging About, search, Q&A and Collaborate;390px public layout has no horizontal overflow. About disclosures start closed. Q&A empty-form submission is blocked by native required-field validation; no question was submitted.
- PASS: owner authentication on staging observed through the existing Google/Authenticator flow. Only newly created disposable fixtures may be changed during CRUD checks; older staging drafts are preserved.

## Evidence limits and staging acceptance

The real access-rule emulator requires Java, unavailable locally. The existing staging CI supplies Java21; this does not deploy Rules. The old staging reading copy was beyond24hours and the admin correctly reported awaiting public verification. It has now been refreshed and verified through the normal staging-only sync, without changing its freshness rules.

### Actual staging receipts

- Source `bedb3656f7176ceb87edcb9e63168ec92063c44a`: Hosting43911468971, full regression43911469086 and source backup43911468983 succeeded. The regression executed217Python tests and the updated real Firestore emulator:25tests passed,0failed. Expected permission-denied messages are negative authorisation fixtures, not site errors.
- Calendar check-only43912105172: calendar-mail job succeeded without notify. The Pinterest runner's checkout timed out before application execution; retrying only that cancelled safe job succeeded as133460061185. The actual projected query and worker now complete against the production catalogue, with no task creation, Pins or email. This is a read-only worker proof, not a production repair deployment.
- Staging public sync43912110889 completed the real build, Hosting deployment and subsequent verification:9entries confirmed,0pending. Independent HTTP confirms a complete staging manifest/catalogue with matching fresh generation. Both search module sources match the candidate exactly after normalising Git checkout line endings, and private report/Rules/budget URLs return404.
- Real staging UI create/edit test saved a disposable task at20November15:15Europe/Amsterdam; independent database read confirmed14:15UTC, edited title, false scheduled/published/reminder flags. Browser control then failed externally during the deletion confirmation, later reporting a missing browser-tool kernel asset path. The deletion/restore screen flow and final updated search interaction are therefore not claimed as manually accepted. Only the exact synthetic task was removed with an update-time precondition through the authenticated existing API; absence was verified. All older items were left intact.
- The additional durable processed-ID guard has16focused Pinterest tests passing, including deletion after processing, legacy existing-task adoption, check-only non-persistence and invalid-receipt refusal. Its final source/CI receipt follows below.

Production publication/provider workflows inspected after the quota reset are succeeding. Calendar/Pinterest is the additional confirmed recurring failure addressed here. The legacy contact-delivery workflow is deliberately disabled and skipped, not treated as a new failure. No real subscriber send, inbox receipt, social-platform publication, physical iOS/Android device test, exhaustive external-link availability or guarantee of zero future bugs is claimed.

Provider-maintained runner actions still emit deprecation notices (Node20 compatibility/setup-java v4); those are maintenance warnings in successful CI, not suppressed and not represented as repaired application failures. The recovered single Firestore WebChannel warning in the public browser is likewise recorded separately from a confirmed persistent visitor error.

Local reduced evidence is under `C:/Users/dainy/Documents/Codex/site-bug-audit-2026-11-16/`; it contains test summaries, public HTTP results and dependency audit outputs, not private content or credentials. Staging deployment and final acceptance receipts will be appended after they run.
