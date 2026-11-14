# Approved Postcards scheduling — 14 November 2026

The owner reviewed three English Postcard texts and expressly approved scheduling them. Approved copy, exact future sending instants and private route details remain in the protected production Postcards records and private owner receipts, not in this public repository report.

| Production request | Brevo campaign | Confirmed state |
| --- | --- | --- |
| mail-47412a2632a6b8e7e120728d6684898b | 24 | Scheduled |
| mail-d210a88d03d0c79f20d637a0e6b7eb02 | 25 | Scheduled |
| mail-459dd1c430e3ddd935bbd0aba44ee42b | 26 | Scheduled |

These campaigns must not be recreated, resent or rescheduled without a new owner instruction. Existing cancelled campaigns/jobs remain cancelled.

## Actions and evidence

- A fresh GET-only provider audit (`43620156120`) found eleven existing campaigns, all already Sent. The bounded production outbox was empty before the three new approved requests were created.
- The existing named Enterprise/native Firestore database, enabled production delivery and saved active-subscriber segment 1 were verified. No subscriber addresses were read/exported/imported; existing opt-outs and subscriber selection were preserved.
- Three private revision-1 drafts, their recovery histories and three immutable future-only `schedule` requests were created atomically with create-only preconditions. Stable IDs and a local attempt receipt prevent duplicate writes after an uncertain response. Exact draft/job payloads and approved timestamps were independently read back.
- Existing Postcards HTML formatting was used. Supported bold/link markup, specific inline photo-section links, the unsubscribe/footer and the approved optional coffee links were checked. Template branding/signature supplies the sign-off. The fixed footer buttons use permitted canonical public pages while the specific reviewed deep links remain in the body. All three previews fit 390px/800px; no external requests or test messages were made during preview checks.
- The existing sender was requested (`43620598125`) only after checking that the pending outbox contained solely these approved future schedules, with no immediate-send request. The ordinary empty-sweep retry interval was respected; no lease/backoff was reset or protection bypassed. The independent background clock subsequently processed the requests and confirmed provider evidence.
- Final targeted readback confirmed each native Brevo status `queued`, managed-ID identity, independent state `scheduled`, exact equality of provider date, approved date and calendar date, `dispatchMode=schedule`, and no actual-sent timestamp. A scheduled provider receipt is not proof of future inbox delivery.
- Approved text, payload fingerprints, original dates, private calendar receipts and editable source versions are retained privately. No future message copy or sending instant is reproduced here. The provider-owned schedules do not require an open admin tab or Codex session.

No newsletter or test message was sent immediately. No website deployment, source-code/Rules/Auth change, service upgrade, provider-audience edit or change to another campaign was performed. This file is excluded from public Hosting.
