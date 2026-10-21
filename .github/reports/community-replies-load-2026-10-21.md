# Community reply moderation queue — 21 October 2026

## Cause

The production screenshot shows the replies listener failing while the two
collection-scoped question queues load. `js/admin-live.js` uses the existing
`collectionGroup('replies')` query with `status == 'pending'`.

Read-only inspection of the named `dainyel-content` database confirmed that:

- The deployed Rules source matches the local source before this correction.
- It contains only the nested `/communityThreads/{threadId}/replies/{replyId}`
  permission, with no recursive collection-group permission.
- The `replies.status ASCENDING` collection-group index is already deployed.

Firebase requires an explicit recursive collection-group match for this query:
[Enterprise query and Rules documentation](https://firebase.google.com/docs/firestore/enterprise/security/rules-query#secure_and_query_documents_based_on_collection_groups).
The new orange exclamation mark correctly reports a failed queue; it is not a
pending-question count and must not be hidden or replaced with a false zero.

## Prepared correction

`firestore.rules` adds one recursive `replies` match granting `list` only when
the existing verified-owner predicate passes and the reply status is `pending`.
It grants no new direct `get`, create, update or delete permission. Existing
per-thread public published reads and constrained moderation writes are unchanged.
The collection ID `replies` remains reserved for community conversations.

No client query, index configuration, email worker, subscriber list, scheduled
edition or optional journey backend is changed. Real-time moderation retains its
existing snapshot query; the new counter creates no extra queries.

## Validation before release

- Backup: `backups/website_2026-10-21_11-51-42`, outside the source checkout.
- Firebase Rules API compilation: no issues.
- Ten synthetic Rules evaluations passed: verified owner pending list allowed;
  anonymous, unverified owner and another verified account denied; recursive
  get/create/update/delete denied; published group list denied; unrelated
  collection denied.
- Synthetic fixtures were supplied only to the Rules evaluation API. No database
  records were created, read for content, modified or deleted.
- `git diff --check` passed.

These checks validate the permission expressions. They are not an authenticated
browser collection-group query or an end-to-end moderation check. The connected
production admin tab is still signed out, so successful real queue loading has
not yet been observed.

## Approved production release

The owner explicitly approved this prepared Rules correction with “Ga maar live”.
The existing Firebase CLI successfully deployed only `firestore:rules` on
21 October 2026. The single configured database remains `dainyel-content`.
The CLI read the index configuration during preparation but did not deploy indexes.
No Hosting, Auth, backend or billing configuration was deployed. No email was sent.

Read-back of `projects/dainyelonthemove/releases/cloud.firestore/dainyel-content`
confirmed the new ruleset `a46dd8e8-289c-4f60-bc62-73a32740da39`, updated at
2026-10-21T10:03:41.646617Z. Its source matches the reviewed local file and contains
the recursive owner-only pending-reply list permission.

The source and release record are synchronized to staging/main with `[skip ci]`:
the Rules have already been released directly, and no static Hosting files changed.
The active change applies to both sites because they use the same database.

The connected browser remains signed out. An authenticated browser queue load has
not been verified; the owner should refresh the existing admin session after Rules
propagation. Do not describe the synthetic evaluations as an end-to-end test.

Rollback, if necessary, is the preceding Rules source at `a1c152e`, released only
to the same named database. Restoring it also restores the collection-group denial.
