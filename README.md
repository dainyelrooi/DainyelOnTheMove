# DainyelOnTheMove

Static HTML, CSS and JavaScript on Firebase Hosting. `staging` deploys the test site; `main` publishes production. Owner sign-in, moderated Q&A and Field Notes keep the existing Firebase integration.

## Publish a trip reveal (five steps)

1. Make the required OneDrive backup with `tools/Create-SiteBackup.ps1`, then start a phase/update branch from the current reviewed source.
2. Edit `data/trip.json`: add **only an already approved public reveal** to `revealedStops`, with `id`, `country`, optional `city`, `date` (`YYYY-MM-DD`), `text`, optional `photos` (`src` in `assets/`, plus `alt`) and `storyUrl`. Optional `coordinates` are an approximate country/city centre, never device GPS. Leave everything not yet revealed outside the repository.
3. Optionally set `currentLocation` to a manually approved `city`, `country` and `updatedAt`; otherwise keep it `null`. Never publish a stop count, next destination or trip duration. Keep the historical visited atlas separate in `assets/travel-data.js`.
4. Validate JSON, local links, countdown/reveal behaviour and accessibility. Commit, merge into `staging` and push; review https://dainyelonthemove-staging.web.app. Existing chapter URLs remain unchanged in phase 1a.
5. After Dainyel explicitly approves that release, merge to `main` and push. GitHub Actions publishes https://dainyelonthemove.com; verify its deployment before reporting success.

## Confirmed trip settings

Public title: **Trip to Latin America**. Departure: **28 October 2026, 00:00 Europe/Amsterdam** (`2026-10-28T00:00:00+01:00`). Only the departure date is public. The countdown handles both pre-departure and post-departure states and can be paused. No revealed stops are currently published.

## Email and moderation

Follow the trip reuses the existing private Field Notes opt-in, including explicit consent and the existing Firestore rules. It currently collects interest; no sending provider, automatic confirmation or double opt-in is configured. Do not promise email delivery or add sending services without review. Q&A moderation and owner login are preserved.

## Redesign delivery

The supplied brief requests an audit and approval between phases. The urgent phase 1a removes the public route plan from current source and adds the surprise teaser, countdown and opt-in. Later phases cover the full palette, shared navigation/footer, consolidation/modals, media optimisation and richer interactions. Production requires explicit approval for each release.

Repository visibility is public. Historical branches/commits and the existing production deployment may retain earlier route information; a source scrub does not erase history. Never add that old itinerary to reports, examples or new commits. Do not rewrite history or change repository visibility without the owner's direction.
