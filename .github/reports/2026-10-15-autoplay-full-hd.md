# Autoplay and homepage Full HD — 15 October 2026

The owner explicitly requested card autoplay, further quality changes only to the homepage video, and immediate production publication after verification. This approves the prepared video maintenance and this follow-up; it is not blanket approval for future changes. Pre-change OneDrive backup: `website_2026-10-15_14-14-43`. Branch: `fix/home-video-original-quality`; previous staging: `3b3eb94`; previous production: `2a2d84c`.

## Changes

- A film-card click or keyboard activation now starts the muted film synchronously from that same gesture through `siteVideoControl.playPanel`. This hydrates the lazy source even with data saver/reduced motion when a visitor explicitly chooses a film. Background/unsolicited motion still respects those preferences. Keep native controls, automatic pause outside the viewport/on close, and manual retry for actual failures or browser vetoes.
- The supplied original montage in the parent media directory is 3840×2160, H.264, approximately 59.94fps. Earlier work used the existing 720p web copy; the original is now the source of the homepage-only improvement. It is not upscaling. No source original is copied into the repository.
- New ten-second, silent, fast-start H.264 High 4.1/yuv420p/30fps files: `assets/hero-travel-desktop-1080.mp4`, 1920×1080, 7,404,478 bytes; `assets/hero-travel-mobile-1080.mp4`, 1080×1920, 5,656,203 bytes. The portrait derivative uses the same centred visible region as the existing mobile cover layout, using actual detail from the original frame. The other videos' encodes are unchanged.
- The homepage template specifies `data-src-mobile`; the controller selects one source at hydration (up to 700px uses portrait). Resizing does not discard and redownload a playing clip. Poster-first/idle startup remains. Artificial grain over the homepage hero is removed; text/readability gradient and the rest of the design stay intact.
- The owner's approved YouTube channel fallback and previous local-video recovery stay in this release. Backend configuration, queries, moderation, stories and public trip data are unchanged. No new libraries, services or real submission writes.

## Verification

Local verification passes:

- Thirty playback checks show advancing decoded time/frames: all nine video locations in normal/reduced-motion/data-saving modes, plus desktop Full HD, keyboard film activation and the actual homepage scooter card. Chosen films start from the opening card without a second play click. No JavaScript errors.
- Simulated source 404 exposes retry/direct link and recovers; simulated autoplay veto retains manual recovery. Closing/out-of-view pause, native controls, explicit pause/resume and background motion preferences remain functional. The manual fallback has zero axe violations in the focused check.
- Desktop and portrait files fully decode without errors. Resolution, silent stream, 30fps, H.264/yuv420p and moov-before-mdat fast-start are confirmed. A browser requests only its selected hero file and does not redownload the alternative on resizing.
- Existing focused form/panel/history/focus/search/filter/consent/pending/no-JavaScript checks pass with service fixtures; zero real database writes. Backend files, other film encodes and story copy remain unchanged. Local references/IDs across twenty pages, source syntax, whitespace and repeatable HTML composition pass. Changed text has no credential patterns; `private/` is not read.

Final hosted verification follows publication. Evidence is saved outside Hosting in the Codex output folder `video-autoplay-quality-live`.

## Limits

Browsers/OS power-saving settings can still veto playback; a website cannot guarantee autoplay on every device. Keep the fallback rather than bypassing those settings. The explicit card gesture starts the chosen film; reduced-motion/data-saving visitors do not receive unsolicited background video. Tests use desktop Edge with mobile viewport/touch/preferences simulation, not physical Samsung/iPhone/Safari. Higher resolution increases video bytes; no 4K file is served and only the selected Full HD derivative is requested.
