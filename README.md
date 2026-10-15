# DainyelOnTheMove

Static HTML, CSS and JavaScript on Firebase Hosting. `staging` deploys the test site; `main` publishes production. Owner sign-in, moderated Q&A and Field Notes keep the existing Firebase integration.

## Publish a trip reveal (five steps)

1. Make the required OneDrive backup with `tools/Create-SiteBackup.ps1`, then start a phase/update branch from the current reviewed source.
2. Edit `data/trip.json`: add **only an already approved public reveal** to `revealedStops`, with `id`, `country`, optional `city`, `date` (`YYYY-MM-DD`), `text`, optional `photos` (`src` in `assets/`, plus `alt`) and `storyUrl`. Optional `coordinates` are an approximate country/city centre, never device GPS. Leave everything not yet revealed outside the repository.
3. Optionally set `currentLocation` to a manually approved `city`, `country` and `updatedAt`; otherwise keep it `null`. Never publish a stop count, next destination or trip duration. Keep the historical visited atlas separate in `assets/travel-data.js`.
4. Validate JSON, local links, countdown/reveal behaviour and accessibility. Commit, merge into `staging` and push; review https://dainyelonthemove-staging.web.app. Legacy chapter URLs are retained through redirects and fragment migration.
5. After Dainyel explicitly approves that release, merge to `main` and push. GitHub Actions publishes https://dainyelonthemove.com; verify its deployment before reporting success.

## Confirmed trip settings

Public title: **Trip to Latin America**. Departure: **28 October 2026, 00:00 Europe/Amsterdam** (`2026-10-28T00:00:00+01:00`). Only the departure date is public. The countdown handles both pre-departure and post-departure states and can be paused. No revealed stops are currently published.

## Email and moderation

Follow the trip reuses the existing private Field Notes opt-in, including explicit consent and the existing Firestore rules. It currently collects interest; no sending provider, automatic confirmation or double opt-in is configured. Do not promise email delivery or add sending services without review. Q&A moderation and owner login are preserved.

## Redesign delivery

The supplied brief requests an audit and approval between phases. Phase 1a adds the surprise teaser, countdown and opt-in. Phase 1b introduces the new palette, shared shell, cinematic homepage, hash dialogs, Stories/Field Notes overview, redirects, media variants and privacy/cookie drafts. Phase 2 is the next review step for galleries, further map/reveal interactions and motion. Production requires explicit approval for each release.

## Edit the static pages

1. Read `AGENTS.md` and create the required backup.
2. Edit page sources in `.github/templates/pages/`, shared `header.html` / `footer.html`, or the panel partials in `.github/templates/`. Use `assets/design-system.css` for shared tokens/styles.
3. Run `python tools/Compose-Site.py`. Commit both source templates and generated root HTML. Python standard library only; visitors and Hosting need no build/runtime dependency.
4. Check routes, keyboard/mobile behaviour and the existing Firebase forms. Push the reviewed feature to `staging` for owner review.

Home panels include `#about-me`, `#kit`, `#map`, `#ask`, `#film-library`, `#creator-profile` and `#contact`. Stories and Field Notes share `stories.html`; the full exchange story now has `thailand.html`. Hosting 301 aliases preserve the older page addresses and chapter links. Do not remove the legacy resolver scripts.

External players require a deliberate load action and are removed when closed. Local films remain muted and loop only while visible, with user pause and reduced-motion support. The collaboration form only prepares a message to copy into Instagram. Public privacy/cookie notices are working drafts; review items remain in `.github/legal/privacy-review-template.md`, excluded from Hosting.

Repository visibility is public. Historical branches/commits and the existing production deployment may retain earlier route information; a source scrub does not erase history. Never add that old itinerary to reports, examples or new commits. Do not rewrite history or change repository visibility without the owner's direction.
