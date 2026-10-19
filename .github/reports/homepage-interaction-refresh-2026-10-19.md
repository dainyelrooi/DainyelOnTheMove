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

## Final staging review

Content commits e932e77 and 63ff36c were pushed to staging and Firebase Hosting staging deployment completed successfully. The second commit stabilises direct fragment navigation after deferred section layout; fresh #follow-trip loads landed about 90px below the top on both desktop and a 390px viewport, below the sticky header. No production deployment was performed.

Canonical staging Home, Collaborate, Destinations (following its atlas redirect), Q&A, My Kit, Journey and Videos returned HTTP 200, with shared navigation and no print/countdown-pause controls. The staging report URL returns 404. Live production still has its prior collapsed signup/profile control, confirming this refresh has not been released.

Browser observations: hero-road-title-free.mp4 played muted with a progressing currentTime, and its pause button changed to Play video with paused=true. Keyboard focus started the road card's local preview without opening a panel; duration was 3 seconds and it ended paused, hidden and reset to time zero. Mini-atlas selections for Thailand and Bali produced their supplied archive context and relevant story links. Original homepage sections were retained. The 390px form had no horizontal overflow; 320px inspection of Collaborate/Q&A/My Kit found no horizontal overflow, the shared shell, 2026 footer and no profile print action. Viewport overrides were reset afterwards.

JavaScript syntax checks and git diff whitespace checks passed. No broad test suite, phone hardware test, new signup, CAPTCHA completion, email delivery, owner sign-in/backend exercise or Core Web Vitals score is claimed. Reduced-motion/data-saver handling was preserved in code; no synthetic measurement score is asserted. Preview screenshots were saved outside the web source in the sibling newsletter-drafts folder. No subscriber mail was prepared or sent for this design-only batch.
