# Shared-location presentation cleanup

The owner asked to remove repeated Peru/current-location notices and similar clutter immediately, then asked to continue. This is a narrowly scoped presentation cleanup. Preserve the real shared location, map pin/zoom, country selection, stories, photographs, past stops, dates, URLs, saved content and all scheduled publications/campaigns. No newsletter, provider edit, Rules/Auth deployment, new service or billing operation.

## Confirmed repetition and changes

- The Atlas displayed the same current check-in above the map, in a separate legacy card below the map, in a tracker-generated paragraph and in supplementary reveal copy. Retain the functional check-in bar and pin. Remove the obsolete lower card/loading button and redundant tracker paragraph; move the existing `map-location` anchor to the retained bar.
- Keep past stops in a native, initially closed Journey timeline. Empty timelines hide after the public trip is resolved. Preserve original stop dates, text, images and links, including when opened by keyboard. Clear an old rendered list before an empty refresh.
- The ordinary visited list and the revealed-trip list repeated the same destinations. The separate revealed list now appears only when the visitor selects Revealed. It remains accessible through that filter; existing map layers and country controls remain intact.
- On Home/Atlas, suppress the navigation's extra location item when a check-in already exists in the main content. Other pages retain the useful navigation check-in. Announcements, safe links, reduced-motion/still preference, withdrawal authority and subscriptions are preserved.
- Remove the homepage's second link to the same Atlas, the repeated mini-Atlas caption and redundant undated underway line. Keep genuine departure dates/countdowns and the chosen shared place. Shorten the map's precision note without pretending the approximate pin is GPS.

This does not remove legitimate mentions of Peru in historical stories, photograph captions, map labels or visited history. It does not infer a new travel location or edit the owner's location record.

## Recovery and editing compatibility

- Feature branch: `fix/declutter-location-20261117`.
- Backups retained: `website_2026-11-17_18-03-42` and `website_2026-11-20_13-40-42`.
- The removed legacy loading-button paragraph was accidentally included in the Atlas editing catalogue. Retiring it changes one catalogue group from10fields to9:812other field identities/defaults remain exact, nine unchanged Atlas controls acquire new content-based keys, and the obsolete button-text control disappears (822to821total). This follows the existing catalogue's deliberate signature rule rather than reattaching overrides to different controls.
- Real bounded checks on17and20November found neither a published override nor a saved draft for the old group `atlas-0957e7d0c38675aa` in production or staging. No content record, draft or photograph is migrated, deleted or rewritten. All other saved editing fields remain intact.
- Preserve newer automatic video-feed/thumbnail changes from current main when integrating; regenerate pages only from the shared templates.

## Validation

- PASS:292website Node tests and220Python tests, including36focused location, navigation, map, history and withdrawal checks. The two added scenarios verify the single inline check-in presentation and continued access to revealed places through the correct filter.
- PASS: journey link/asset/ID/SEO/hosting-exclusion checks and public-trip validation; clean whitespace diff. No database Rules or indexes changed.
- Browser staging/mobile/desktop and final release receipts are recorded below after execution. Do not treat successful tests or Hosting as a substitute for observed visual acceptance. Existing free-service limits and the earlier unrelated admin deletion/restore manual-test limit are unchanged.
