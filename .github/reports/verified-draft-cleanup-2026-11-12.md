# Verified automatic active-draft cleanup

## Owner request and safety boundary

The owner requested automatic cleanup after successful publication for all
content types, not only Field Notes. The editor previously displayed every
saved source document as an entry, including already-published copies.

Deleting those source documents would break ordinary editing, withdrawal,
version recovery, photo ownership and linked campaign checks. This change
removes the exact verified version from **Active drafts**, while preserving its
original ID, source, history, media, schedules and campaign relationships.
Published work is reachable through **Published & history**. Newer private edits
remain active. No content is automatically published, withdrawn or destroyed
by cleanup. Social planning items are unaffected: a calendar tick is not proof
of an external platform publication.

Branch: feature/verified-draft-cleanup. Pre-change backup:
website_2026-11-12_19-44-16. The owner subsequently explicitly approved
“Ja, zet deze versie live” after the actual scheduled staging test. Production
rollout is authorised. Existing live schedules and campaigns are untouched.

## Implementation

- `verify-publication.py` uses the existing complete public snapshot validator,
  including exact image bytes/hash and consistent generation/namespace. It then
  checks actual article HTTP responses, the same rendered content hash used by
  the public reader, story-card links and displayed photograph references.
  Page overrides require their actual public page, correct section markers and
  website overlay loader. Missing/partial/stale/wrong-environment content cannot
  clear a draft.
- Only opaque content hashes, fixed states, namespace/generation and times are
  written to the existing private `adminOperations/{space}/status/publicReading`
  receipt. No draft reads/deletes or provider operation exists in this worker.
  Writes are version checked; ambiguous commits are not replayed. Existing
  owner/TOTP read permissions and public write denial already cover this path;
  no Rules or Auth change is required.
- The existing independent publication clock verifies after processing, and
  checks again after public-copy deployment. The separate public-copy refresh
  also verifies after deployment. A fixed `verify` mode safely checks and saves
  evidence without publication or email steps. A failed unrelated provider
  read does not suppress website verification.
- Work is bounded (100-second read deadline, byte/row/request bounds and at most
  twenty new page checks per execution). Exact prior matches are reused and
  the next tick completes a partial batch. One unchanged generation is checked
  without a full repeat scan. No new service, credential, subscription or
  dependency is added; public CDN checks avoid repeated private-draft scans.
- `draft-publication-state.js` requires exact saved/public content and fresh
  server evidence before completion. Stories, Field Notes and facts use the
  same contract. Website text/link/photo overrides use stable key ordering.
  Postcards require the same confirmed Brevo job, immutable draft revision and
  approved email fields; Scheduled/Sent semantics remain unchanged. Newer mail
  edits cannot be silently hidden behind an older confirmed campaign.
- `publishing-desk.js` defaults to Active drafts and provides Published & history
  and All saved writing. Bounded realtime joins only inspect visible IDs;
  cache/error/sign-out states keep uncertain work active. Overview applies the
  same policy to entries, existing page sections and Postcards. The page editor
  shows verified/pending state and remains fully editable.
- Website section publish/restore now writes the existing change marker in its
  transaction, so the public copy refreshes promptly instead of waiting for
  its periodic refresh. This uses existing owner permissions.

## Tests and limits

- PASS: five new Node model/watch checks cover all article kinds, exact dates,
  photographs/layout/private changes, withdrawals, stale/wrong/malformed proof,
  exact Postcard revision/copy, bounded joins, cache/error and sign-out guards.
- PASS: six new offline worker tests cover real-route/card/photo failure,
  incomplete public generations, idempotent repeats, withdrawn content, CAS-only
  technical writes and exact JS/Python hash agreement including Unicode and
  submillisecond Firestore dates. No network/provider transport in these tests.
- PASS: headless Edge at 1280 and390px, using actual generated admin HTML and
  isolated SDK fixtures: all three entry types leave active drafts only after
  proof; future schedules, failed verification and newer edits stay; completed
  entries reopen and edited copies return to active; page sections and Postcards
  filter uniformly in Overview; sign-out clears content. No overflow/JS errors.
- PASS: read-only probe against the current public production copy confirmed
  four deployed entries, their real pages/cards and photographs. It performed
  no database or provider write. No saved page override existed in that copy;
  page-override completion was tested with isolated fixtures.
- Full staging regression 43341928891 passed:267 Node checks,182 Python checks
  and25 Rules emulator cases, including owner-only unforgeable verification
  evidence and atomic website publish/restore refresh markers. No Rules changed.
- Staging Hosting43341626104 passed. Deployed admin HTML and all six affected
  modules independently matched tested source. Both browser fixture widths
  additionally opened the real website editor and confirmed its verified state.
- Actual staging server check43342401479 ran before a disposable fact's future
  date: its schedule stayed queued and the public fallback did not contain a
  story hash. Due server run43342869488 then committed its publication. While
  Hosting was pending, the new matching stored publication still classified as
  `verifying` and stayed active. After the real public page/card were deployed,
  the private proof receipt contained its exact hash and the same stored draft
  classified as completed. A newer private-body variant stayed changed/active.
  Draft revision1 and source text remained intact. All subscriber steps were
  explicitly skipped in this staging workflow.
- Only those four exact fixture documents (draft/publication/summary/schedule)
  were removed with document-version preconditions. Technical test receipts
  remain private; a complete staging public-copy cleanup was requested.
- Native signed-owner-session and physical iOS acceptance are not claimed.

## Short owner guide

1. Open Stories & Field Notes. Active drafts shows unfinished, changed or
   unverified writing. The same behaviour applies to Travel Stories and facts.
2. Publish normally or schedule the reviewed version. The server checks the
   real public copy after publication; the matching entry then leaves this list.
3. Choose Published & history to reopen or edit it. Saving a changed private
   version makes it active again until that exact update is published/verified.
4. Overview defaults to Active drafts & pending work for all managed types.
   Its Published & history filter retains completed page edits and Postcards.
5. A pending/failed public check keeps the concept visible. Publication and email
   remain separate; cleanup never sends or reschedules a Postcard.
