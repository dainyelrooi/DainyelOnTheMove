# Remove the cosmetic cinematic reading mode

The owner explicitly requested either a working distinct experience or removal of this function everywhere. The existing button only toggled minor spacing, text width and photo shadows; it offered no distinct presentation. This change removes it from every shared article reader and the admin's story preview, retaining ordinary reading, actual chapter navigation, progress and photograph controls. No newsletter is authorized or needed for this UI correction.

## Changes

- `assets/story-reader.js`: remove mode button, URL changes, mode class and mode-specific history listener. Keep a compact actual chapter counter and existing mobile chapter menu.
- `assets/publishing-reader.js`: make the same removal for all CMS entry kinds and isolated private previews. Photo-history handling remains independent.
- `assets/journey-experience.css` / `assets/publishing.css`: remove mode-only decoration and the 70/90px reserved toolbar space. Retain chapter-toggle styling and hide the small chapter status in print.
- `tools/Compose-Site.py`: generate a noneditable chapter-status placeholder only for stories with actual chapter links. The existing Thailand solo journal had zero named chapter targets before this change; it now has no empty menu or misleading `Chapter 1 of 0` counter. Its full text and photographs remain unchanged.
- Use the existing `data-reading-toc` marker namespace so generated reading UI does not become a new editable paragraph. All 801 existing editor fields, group identities and defaults remain structurally identical to the original catalogues.
- CMS chapter jumps previously combined document scroll padding 90px with section margin 120px, landing the section at 210px while the counter's current-section threshold was 180px. The CMS section margin is now 30px; the chapter target remains below the header and the actual current chapter updates after native navigation.
- CMS gallery close now restores keyboard focus in the next animation frame, matching the existing ordinary gallery. This prevents native fragment-history restoration from taking focus away after Escape from an enlarged photograph opened after a chapter jump.
- Generated HTML and asset fingerprints are refreshed through the existing composer. No story text, photographs, routes, CMS data, private drafts, schedules, campaigns, Rules/Auth, provider configuration or dependencies are changed.

## Verification and scope

Recovery snapshot: `backups/website_2026-11-14_14-36-03`.

- Focused existing rendering/fallback/visitor checks: 60 PASS.
- JavaScript syntax, public journey route/assets/metadata checks and public-trip validation: PASS.
- Existing four story editor catalogues and their combined catalogue compare equal as structured data; no editor identity migration is needed.
- Browser coverage uses signed-out isolated Edge at 390/1280px: four ordinary journals, the actual Cusco CMS story and earlier Inca Trail Field Note, mobile chapter open/close and native chapter jumps, ordinary/CMS photo next/previous/Escape/focus return, old `?view=cinematic` links opening normal reading, and the same admin-preview renderer with already-public content. External providers are blocked; no form, upload, save, publication or email operation is performed by the tests.
- Local browser readback: all 16 scenarios PASS.
- Source `3e76f1590ec8cc06666f45f114ba3990b618351f`: staging Hosting `43634202138`, launch regression `43634202343` and source backup `43634202175` all successful. All 16 actual staging browser scenarios PASS; all four changed runtime/style files match source exactly. Existing Cusco article text/photo selection remains unchanged, and the report URL returns 404.
- Source `5e4142f89cc8a04e508ab4ca3f65da3265c143a1` is verified live: production Hosting `43634459459` succeeded. All 16 actual production browser scenarios PASS; all four changed runtime/style files exactly match the tested source, the existing Cusco article and twelve selected photo IDs are unchanged, and the new report URL returns 404. The mobile masthead was visually checked without the retired button or reserved toolbar space.
- This replaces the pending production status for this exact owner-requested removal. No release/test/subscriber mail or remote content/storage mutation was performed. The documentation receipt does not require a new frontend deployment.

Private browser receipts and screenshots remain outside the repository. Physical devices and authenticated admin storage are not exercised; neither storage nor authentication changes in this release.
