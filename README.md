# DainyelOnTheMove

Static HTML, CSS and JavaScript on Firebase Hosting. `staging` deploys the test site; `main` publishes production. Owner sign-in, moderated Q&A and Field Notes keep the existing Firebase integration.

## Publish a trip reveal (five steps)

1. Make the required OneDrive backup with `tools/Create-SiteBackup.ps1`, then start a phase/update branch from the current reviewed source.
2. Edit `data/trip.json`: add **only an already approved public reveal** to `revealedStops`, with `id`, `country`, optional `city`, `date` (`YYYY-MM-DD`), `text`, optional `photos` (`src` in `assets/`, plus `alt`) and `storyUrl`. Optional `coordinates` are an approximate country/city centre rounded to at most one decimal, never device GPS. `photos` may also include a caption. Leave everything not yet revealed outside the repository.
3. Optionally set `currentLocation` to a manually approved `city`, `country` and `updatedAt`; otherwise keep it `null`. Never publish a stop count, next destination or trip duration. Keep the historical visited atlas separate in `assets/travel-data.js`.
4. Run `python tools/Validate-PublicTrip.py` (standard library only), then check countdown/reveal behaviour and accessibility. The validator rejects unsupported fields, precise coordinates and broken local photo/story references; it cannot decide whether a place is approved for publication. Commit, merge into `staging` and push; review https://dainyelonthemove-staging.web.app. Legacy chapter URLs are retained through redirects and fragment migration.
5. After Dainyel explicitly approves that release, merge to `main` and push. GitHub Actions publishes https://dainyelonthemove.com; verify its deployment before reporting success.

## Confirmed trip settings

Public title: **Trip to Latin America**. Departure: **28 October 2026, 00:00 Europe/Amsterdam** (`2026-10-28T00:00:00+01:00`). Only the departure date is public. The countdown handles both pre-departure and post-departure states and can be paused. No revealed stops are currently published.

## Email and moderation

Follow the trip reuses the existing private Field Notes opt-in, including explicit consent and the existing Firestore rules. It currently collects interest; no sending provider, automatic confirmation or double opt-in is configured. Do not promise email delivery or add sending services without review. Q&A moderation and owner login are preserved.

## Redesign delivery

The supplied brief requests an audit and approval between phases. Phase 1a adds the surprise teaser, countdown and opt-in. Phase 1b introduces the new palette, shared shell, cinematic homepage, hash dialogs, Stories/Field Notes overview, redirects, media variants and privacy/cookie drafts. Phase 2 adds photo galleries, richer atlas selections, revealed-route interaction, a public-feed validator, calm scroll motion and a printable creator profile. Phase 3 adds the magazine story layout and Q&A postcards. Phase 4 adds restrained decorative finishing and measured startup/image optimisations. All phases are approved; on 15 October 2026 Dainyel explicitly approved this completed release for production after final checks. Future releases still require explicit approval.

## Edit the static pages

1. Read `AGENTS.md` and create the required backup.
2. Edit page sources in `.github/templates/pages/`, shared `header.html` / `footer.html`, or the panel partials in `.github/templates/`. Use `assets/design-system.css` for shared tokens/styles.
3. Run `python tools/Compose-Site.py`. Commit both source templates and generated root HTML. Python standard library only; visitors and Hosting need no build/runtime dependency.
4. Check routes, keyboard/mobile behaviour and the existing Firebase forms. Push the reviewed feature to `staging` for owner review.

Home panels include `#about-me`, `#kit`, `#map`, `#ask`, `#film-library`, `#creator-profile` and `#contact`. Stories and Field Notes share `stories.html`; the full exchange story now has `thailand.html`. Hosting 301 aliases preserve the older page addresses and chapter links. Do not remove the legacy resolver scripts.

External players require a deliberate load action and are removed when closed. Local films remain muted and loop only while visible, with user pause and reduced-motion support. The collaboration form only prepares a message to copy into Instagram. Public privacy/cookie notices are working drafts; review items remain in `.github/legal/privacy-review-template.md`, excluded from Hosting.

Repository visibility is public. Historical branches/commits and the existing production deployment may retain earlier route information; a source scrub does not erase history. Never add that old itinerary to reports, examples or new commits. Do not rewrite history or change repository visibility without the owner's direction.

## Phase 2 interactions

Story photographs open in a native, keyboard-accessible viewer with captions, previous/next controls, Escape, swipe and shareable `#photos-…` links. Closing returns focus to the photo. The original photographs and captions remain readable without JavaScript. Atlas photos are shown only for real supplied archive imagery or explicitly published reveal photos. No future pins or route are shipped.

The creator profile can be printed or saved as PDF from its own panel; work samples are real, with no audience or reach figures. Social previews still use deliberate click-to-load players. Motion runs once on selected headings, never hides content while waiting and honours reduced motion. No new framework, remote service, email delivery or backend data contract is introduced.

## Phase 3 reading and Q&A presentation

`assets/story-editorial.css` and `assets/story-reader.js` provide the journal layout, chapter navigation and article reading state. Edit the original page templates; keep every existing paragraph, media reference and chapter URL. The shared `.github/templates/story-next.html` shows other published stories and excludes the current one through the static `data-story` attribute. Reading time is an approximate count at 200 words per minute; recalculate it after substantial text changes.

Q&A presentation uses `assets/question-postcards.css` and the existing `js/qa-live.js` renderer. Answers start expanded. Keep the existing real-time publication/moderation listeners and pending submission contracts. The slideshow stays at one/two/three cards by viewport, rotates only when visible, has explicit pause/resume, holds during reading focus and stays manual under reduced motion. Do not add fake sample questions to the public database.

## Phase 4 finishing

Two small local SVGs provide static film texture and abstract contours on selected dark sections. They load only at idle after window load; without JavaScript this optional decoration is absent. They disappear with increased/forced contrast and in print. Reading sections stay plain. The existing film play cue responds slightly to a fine mouse pointer (maximum seven pixels), with the normal cursor retained. Touch, keyboard reading and reduced motion do not depend on that effect. No continuous noise, framework, remote request to a new service or backend change is introduced. See `.github/reports/2026-10-15-phase-4.md` for measured checks and limits.

Late decoration updates only its own surfaces. Shared scroll updates are coalesced into animation frames, and article progress avoids measuring the full story at scroll position zero. Preserve these startup safeguards when editing reading or header effects.
