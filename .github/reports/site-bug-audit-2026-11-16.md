# Website bug audit — 16 November 2026

## Scope and release boundary

The owner requested investigation and repair of further bugs and recurring errors after the separately approved publication-quota repair. This candidate is staging-only. Preserve all production content, URLs, publication dates, campaign relationships, cancelled jobs, subscriber choices and existing schedules. No extra email, provider mutation, Rules/Auth deployment, new service or billing change. Pre-change backup: `website_2026-11-16_11-03-39`; branch: `fix/site-bug-audit-20261116`, based on `7cb3941137c445d11aa5afd8abf5f33555f8511f`.

## Confirmed findings and repairs

| Priority | Component | Evidence / cause | Repair and acceptance |
| --- | --- | --- | --- |
| P1 | Pinterest follow-up worker | Main run43860378035 failed its Pinterest job133275324341. A bounded read found13 eligible lifetime publications against a10-candidate safety limit. Already-created tasks counted again, permanently blocking the worker as the site grew. | Skip deterministic task IDs before selecting new work; process at most10 genuinely new tasks per run, preserving completed tasks and create-only duplicate protection. Paginate projected publications with stable timestamp/name cursors, bounded to500. Keep the200-item calendar capacity explicit. |
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

## Evidence limits and remaining staging acceptance

The real access-rule emulator requires Java, unavailable locally. Run the existing staging CI with Java21 and the updated test transport before acceptance; this does not deploy Rules. Deploy and inspect the exact candidate search modules, run the calendar workflow in check-only mode, and refresh the staging public reading copy using the existing staging-only sync. The old staging reading copy is beyond24hours and the admin correctly reports awaiting public verification; do not hide that warning or claim stale output healthy.

Production publication/provider workflows inspected after the quota reset are succeeding. Calendar/Pinterest is the additional confirmed recurring failure addressed here. The legacy contact-delivery workflow is deliberately disabled and skipped, not treated as a new failure. No real subscriber send, inbox receipt, social-platform publication, physical iOS/Android device test, exhaustive external-link availability or guarantee of zero future bugs is claimed.

Local reduced evidence is under `C:/Users/dainy/Documents/Codex/site-bug-audit-2026-11-16/`; it contains test summaries, public HTTP results and dependency audit outputs, not private content or credentials. Staging deployment and final acceptance receipts will be appended after they run.
