# Philippines film revision — 23 October 2026

## Owner correction

Remove the Oslob table/arm-wrestling film. Review the actual video content for duplicates, especially El Nido. Replace long consecutive film lists with a slideshow or restrained background scenes; use appropriate drone footage as backgrounds. Prepare the revised staging page for review. No production or mail request.

## Content review and changes

- Reviewed the nine supplied films using multiple frames throughout each, plus the existing 28-second El Nido tour film.
- The 24.33-second `el-nido-kayak-cut` and 25.02-second `el-nido-kayak-full` are versions of the same kayak scene with a different crop/framing. Retained the full version once; removed the repeated cut from the page and the current hosted asset set.
- The existing El Nido tour film contains different aerial lagoon/boat scenes from the newly supplied beach flight. It is retained, alongside the zipline film and the single kayak film.
- Removed the Oslob arm-wrestling player, its incidental prose reference and both web video variants/poster. The owner's originals remain unchanged outside website source and the pre-change backup is retained.
- Boracay and El Nido now each have one manual three-film slideshow. Previous/next, counter and keyboard shortcuts on the gallery controls preserve native video seeking/fullscreen. Nonselected videos pause immediately; only the visible slide intersects the shared preload/play observers. No timed slide advance. Without JavaScript all unique figures and direct film links remain in source order.
- The owner's subsequent correction places the round previous/next arrows inside the video frame, matching the photo slideshows. The counter is also in the frame, above the native seek/control bar to keep it unobscured. There is no separate navigation row below the player. Native fullscreen still uses the browser's own video interface.
- Used the distinct El Nido beach flight for the opening background and the Chocolate Hills flight for the Bohol background. Each uses a short silent 12-second loop with an end-to-start crossfade, mobile/desktop derivatives, metadata removed and a matching poster. Full-flight links remain available. These scenic excerpts are not repeated as additional foreground players.
- Existing viewport playback, muted startup, native foreground controls, reduced-motion poster fallback, photo slideshows and chapter routes remain. No shared playback-controller changes, dependencies, new service, billing, Auth, mail or upcoming-trip changes.

## Evidence and limitations

- Pre-change backup: `website_2026-10-23_01-21-59`.
- JavaScript syntax, composer, references and whitespace checks completed. No missing referenced local assets or duplicate IDs; eight reading chapters and all 40 gallery photographs remain.
- Both local manual galleries display one film at a time. El Nido's second film was visibly playing while the first and third were hidden and paused. The portrait Boracay clip fits within the phone slideshow without cropping, with previous/next controls and counter visible.
- All four new background derivatives have a duration of 12 seconds and no audio track. Desktop variants are approximately 2.9 MB each; mobile variants approximately 1.3 MB each.
- Frame review establishes the repeated scene; it is not a claim that two encoded files are byte-identical. No broad automated test suite or measured performance/accessibility score is claimed.

## Release

Published to https://dainyelonthemove-staging.web.app/philippines from `d30ff811b60798ee8b35cc1da024f695b10359cf`. [Hosting workflow 39872720627](https://github.com/dainyelrooi/DainyelOnTheMove/actions/runs/39872720627) completed successfully.

- The staging phone view shows both round arrows and the counter inside the video frame. Previous changed Boracay from 2 / 3 to 1 / 3; Next returned it to 2 / 3 with the corresponding roof/sunset film visibly playing. Native video controls remain available; custom gallery arrows do not extend into browser-native fullscreen.
- The page, gallery script and both mobile background clips return 200 with staging noindex headers. The removed table film and kayak cut return 404; the known non-sensitive report URL under `.github/reports/` also returns 404.
- Production `main` remains `a5b7fa71d4b96149cb4ea97bc6d591d480afe599`. This journal and revision still need owner production approval. No mail was sent and existing provider schedules were not changed.
- Review screenshot remains outside website source: `C:/Users/dainy/Documents/Codex/2026-10-23/philippines-film-revision/staging-video-controls.png`.
