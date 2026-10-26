# Homepage invitations and independent Analytics — 26 October 2026

## Scope and release boundary

The owner requested a homepage departure invitation with existing social links, a later Postcards reminder triggered by reading time rather than weekly frequency, a predeparture invitation, and Analytics independent of pending AdSense approval. This batch is prepared on `feature/home-follow-analytics` for staging. Production release requires approval for this reviewed batch. No email, campaign, subscriber, calendar, provider setting, journey fact, Firebase Rules, Auth or billing change belongs to this batch.

Pre-change recovery: `backups/website_2026-10-26_22-28-55`, outside the web source; Git parent `4e90b45`. Existing unrelated quiet-growth changes in AGENTS.md and its report are preserved and excluded.

## Reading invitation

- A small nonmodal homepage card, with no backdrop, focus capture or page scroll lock. Existing signup and public Instagram/YouTube/TikTok links are reused. It does not inspect or claim actual social/newsletter membership.
- Before planned departure: **Ready for the next chapter?** From the planned date without confirmed departure: **A new chapter is beginning.** Actual owner-confirmed departure days1–3: **We're on the move.** Thereafter: **Already coming along?** Ended/unavailable journeys show no invitation. Reporting days use the existing trip timezone. No destination is revealed or departure fabricated.
- First display requires45seconds of visible, unblocked homepage reading,25%maximum reading depth, and1.8seconds without interaction. Background tab time, privacy choices, forms, menus, dialogs, foreground films and focused controls do not count. Initial article/section deep links and editor frames do not get automatic invitations.
- One invitation per browser session, with a24hour local cooldown. **I'm already following** is an explicit local30day suppression preference, not a server subscription action. No weekly recurring popup or Codex automation.
- Privacy choice must be resolved first; acceptance and refusal both permit the later reading invitation. Opening privacy settings hides an existing invitation. Reduced motion is respected. Browser-back cache retains the pending invitation timer while excluding time away.
- Website editor exposes exactly8copy fields in4named homepage groups. The hidden-content exception is limited to those direct-body, known-phase public fields; private/hidden content otherwise remains excluded. An inert same-origin owner preview supports only those groups.

### Timing evidence

[Google Search Central](https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials) advises small banners that preserve access to content rather than intrusive full-page promotions. It does not prescribe45seconds. The45seconds+25%threshold is a conservative starting judgment for a reading-focused travel site, not an experimentally proven optimum. There is no site-specific conversion test or fabricated engagement estimate. Adjust after real feedback rather than promise a perfect delay.

## One Analytics-only choice now; advertising later

- `tools/site_ads.py` emits one guarded `privacy-consent.js` bootstrap with explicit `data-privacy-mode="analytics-only"` on existing eligible public pages. Account verification metadata and ads.txt remain. Admin, embedded signup, editor previews, redirects, search, dedicated contact/Q&A and errors remain excluded. New CMS entries must actually render a public article before initializing.
- This mode never loads the AdSense/CMP tag. It offers one first-party banner with the owner-approved proportional logo, equal Consent / Do not consent / Manage options. Manage options contains an unchecked Analytics switch for a new visitor. Cancel/Escape cannot grant consent.
- No GA tag before explicit acceptance. Only exact canonical production hosts may start GA; local/staging display the real choice UI but never load Analytics or ads. Refusal/revocation pauses measurement, clears GA cookies and reloads production after withdrawal. Metadata remains sanitized and advertising signals/personalization stay denied.
- A scoped180day first-party preference is independent of the earlier Google CMP choice and cannot be reused as advertising consent. Storage denial is explained and applies the explicit decision only on the current page. Cross-tab withdrawal/clear returns to refusal/pending as appropriate.
- The native Google CMP branch is retained for a later deliberate advertising release. Switching modes must replace the temporary banner, never run both. Account Auto ads settings are unchanged; this website mode still suppresses the ad tag entirely. Future activation needs a real native consent lifecycle check.
- Public Cookies and Privacy text describe the actual phase and suppression preferences. [Google's consent guidance](https://developers.google.com/tag-platform/security/concepts/consent-mode) permits a custom banner and basic consent implementation. This is not a legal-completeness claim.

Analytics collection does not depend on an approved AdSense application. [Google setup guidance](https://support.google.com/analytics/answer/9304153) describes installation and Realtime verification; [data freshness guidance](https://support.google.com/analytics/answer/11198161) explains processing delays. A missing tag cannot be repaired by merely waiting. Actual production collector receipt/Realtime is not proved by these staging checks.

## Implementation

| Files | Purpose |
|---|---|
| `.github/templates/home-follow-popup.html`, homepage template | Four editable copy phases, invitation and existing channel links |
| `assets/home-follow-popup{,-model}.js`, `.css` | Phase/read-time policy, caps, safe interaction and responsive presentation |
| `tools/website_editor.py`, generated catalogues | Narrow8field owner-editable copy exception |
| `assets/privacy-consent.js`, new `analytics-choice.js`, `privacy-choices.css`, `consent-logo.png` | Explicit independent Analytics consent mode and logo |
| `tools/site_ads.py`, privacy/cookies templates and generated public HTML | One bootstrap and truthful phase information |
| Scoped JS/Python tests, launch-quality workflow | Model, choice, bootstrap isolation and editor-boundary regression checks |

## Verification

- PASS:27focused JavaScript checks:6trip/timing/suppression,9choice lifecycle,12bootstrap/native/provider/host gates. No live provider request from test fixtures.
- PASS:32Python checks, including4narrow editor-boundary cases. Composer produces691fields across16pageareas.
- PASS: final full62Node tests, both journey validators and `git diff --check`. Final staging build recorded below after release.
- PASS: actual local desktop and390×844 browser. Initial privacy banner with owner logo; Manage/Cancel retains pending; accept/reject resolves; no ad/CMP/GA script on either local origin. No horizontal document overflow. Automatic predeparture card appears after real reading time/depth, without focus movement. Escape closes. Console warnings/errors empty in observed local session.
- PASS: independent read-only review found no P0/P1/P2; its P3back-cache timer cleanup issue was corrected.
- NOT TESTED: real production GA collector/Realtime for this new mode, physical iOS/Safari/screen reader, comprehensive performance rerun, future copy preview in an authenticated owner session, and measured popup conversion. Future trip phases are model-tested, not published fake travel facts.
- No test signup, email, subscriber mutation or social follow was performed.

## Staging result

Pending deployment and rendered checks. Production remains the previous reviewed release until explicit approval.

