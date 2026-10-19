# Homepage interaction and shared navigation refresh - staging only

## Owner request and scope

Owner requested removal of creator-profile print/save and countdown pause controls, coherent page design, a muted hero loop with its own pause control, a larger countdown and departure badge, an open postcard signup, interactive mini-atlas and short film-card previews. Production approval has not been given for this batch. Do not publish or send a newsletter for this design-only refresh.

Pre-change OneDrive snapshot: backups/website_2026-10-19_18-37-48.

## Findings before changes

Read-only canonical HTTP inspection found Home, Collaborate, Q&A, My Kit and Videos already using the shared header and 2026 footer. Destinations resolves to atlas.html. The print/save control was still present on Home and Collaborate. The homepage already contained a video, but the requested road film is a different source. No claim that old live designs were reproduced is warranted. The legacy JavaScript map fallback now agrees with the canonical /atlas.html target.

## Changes

- Removed profile print/save markup and its window.print handler. Removed countdown pause/resume markup and logic; clock values remain tied to actual time and resynchronise after hidden tabs/back navigation.
- Shared header: Stories, Films, Atlas, About; More retains Q&A, My Kit, Field Notes, Collaborate and Search. A visible date-derived departure link stays in the sticky bar. Full desktop links remain visible on scroll; narrower widths use the menu button. The day number is computed rather than copied from the audit.
- Homepage hero: muted, looped, poster-first video with a deliberate play/pause control, respecting viewport visibility and reduced motion. A title-free 5.5-second excerpt of road-moments-web.mp4 uses the source's actual 960x540 resolution, without upscaling. File: hero-road-title-free.mp4, 1,094,053 bytes. Earlier higher-resolution hero assets remain intact. This is a source/style change, not a resolution upgrade.
- Countdown is visually larger, with a neutral mainland Latin America silhouette from existing Natural Earth archive geometry. No country boundaries, stops or route are shown. A short pulse starts on entering view, runs twice and stops; reduced motion disables it. No future destination or trip duration was added to data, source, reports or metadata.
- Home and Journey show the existing Postcards form openly as an ivory/sand postcard with decorative stamp/postmark. Required consent, CAPTCHA, provider endpoint, immediate opt-in, privacy/support/fallback links and origin/source-checked frame resizing remain. The embedded form colour scheme matches the postcard. No Brevo account, list, sender or scheduled campaign was changed.
- Mini-atlas lazily reuses the published past-visit archive and world geometry, with highlighted selectable places, a native dropdown, personal archive context and canonical story links. Full atlas remains available and the static image/link is the fallback. Map space is reserved to limit layout shift.
- Local film cards on Home and Videos use silent three-second H.264 excerpts (640px maximum), loaded on mouse/keyboard focus or in view on touch, with at most one playing. Pause on leaving view, opening a film, hidden tab, reduced motion or data saver. Full films and controls remain intact; external YouTube/Instagram consent is unchanged.

Preview sizes: road 395,152 bytes; scooter 604,613; whale 110,326; Bali 449,751; Sak Yant 138,751. Derivatives contain no audio/source metadata and use MP4 fast start. Media authoring used a local ffmpeg package outside the repository; it is not a website/runtime dependency.

## Focused observations and limitations

Browser inspection confirmed the header badge, autoplaying muted road source and working hero pause action, ticking countdown, visible form/CAPTCHA and mini-map selection of Thailand with the correct archive memory and story link. The original homepage sections remain in the document. Mobile header/menu was inspected at a 390px viewport. Final review and staging publication are being completed; no production deployment or backend write has taken place. No broad test suite, account login, real form submission, CAPTCHA completion or performance score is claimed.
