# AGENTS.md — Persistent instructions for DainyelOnTheMove

These instructions apply to every future Codex session in this repository.

## Project identity

- Build and maintain **DainyelOnTheMove**, an English personal travel site with a cinematic, premium editorial tone.
- Preserve the brand line: **“Take the scenic route.”**
- Communicate with Dainyel in Dutch unless he requests another language.
- This is a static multi-page site: HTML, CSS and vanilla JavaScript. Do not introduce a framework, build system or dependency without a clear technical reason and user approval.

## Canonical workspace and Git flow

- The canonical local source is `C:\Users\dainy\OneDrive\DainyelOnTheMove website\website` and the GitHub remote is `dainyelrooi/DainyelOnTheMove`.
- Do not treat old Codex output folders as the source of truth.
- `staging` is the review branch and deploys the noindex Firebase staging site through GitHub Actions.
- `main` is production and deploys the live Firebase Hosting site through GitHub Actions.
- Never deploy to production or push/merge to `main` without explicit user approval for that release. A request such as “ga live” is approval for the reviewed current change only.
- Before editing the local OneDrive source, run `tools/Create-SiteBackup.ps1` with a useful reason. Do not delete or overwrite backups.
- When running in a Cloud workspace without OneDrive access, do not pretend that a OneDrive backup exists. Preserve Git history and tell the user that the local backup step could not run.

## Content and product integrity

- Use only real journeys, dates, locations, images, videos and facts supplied by Dainyel. Ask when key content is missing; never fill gaps with invented travel facts, fake Q&A, fictional visitor activity, made-up metrics or placeholder claims presented as real.
- The upcoming trip is a surprise: publicly use only "Trip to Latin America" and the confirmed departure (28 October 2026, 00:00 Europe/Amsterdam). Never put unannounced places, stop counts, travel duration or route plans in source, metadata, documentation or commits. data/trip.json contains only revealedStops and an optional manually shared broad currentLocation; the visited archive stays separate. Never invent a reveal.
- Do not publish exact device/GPS location. Current-location features may store/show only a broad city and country after Dainyel chooses to share it.
- Preserve existing stories, destinations, working social embeds and public routes unless removal is explicitly requested.
- Collaboration contact is Instagram only until Dainyel supplies a public email address. Keep the creator profile free of audience/reach figures until he supplies numbers approved for publication. The contact form prepares a local message; it does not send it.
- Keep public website copy in English. Preserve the user’s voice when editing supplied writing.
- The full Philippines written story is pending. Do not pretend it has been completed.
- Do not reintroduce AI/Gemini moderation or paid moderation services. That direction was deliberately cancelled because of cost.

## Design, UX and accessibility

- On 14 October 2026 Dainyel approved the new Cinematic Explorer palette for the phased redesign: navy #0C1B25, deep teal #133C43, coral #FF7D5F, golden sand #E9B96E, warm sand #F4EADD, ivory #FDF9F2. Coral is a surface with navy text; never use coral for small text on light backgrounds. Keep legacy sections working during the phased transition.
- Avoid overcrowding the home page. Each section needs one clear primary action.
- Preserve responsive layout, keyboard access, visible focus styles, semantic controls, contrast and `prefers-reduced-motion` behaviour.
- Keep video autoplay muted, looped and only when in view; pause outside the viewport and respect reduced motion. Long background playback must have an accessible play/pause control. Never autoplay sound.
- Optimise images/videos and lazy load off-screen media. Do not claim performance or accessibility scores unless actually measured.

## Firebase, privacy and security

- For Firebase work, first read the relevant Firebase skill: Hosting for hosting/deploy/domain work, Auth for sign-in, Firestore for data/rules/indexes, and the rules-auditor skill for a security review.
- Use the existing Firebase project and targets in `.firebaserc`; do not create a new Firebase project, database or Hosting site.
- Firebase client configuration in `js/firebase.js` contains public browser identifiers by design. Do not duplicate its key values in docs, messages, commits or new files.
- Never place passwords, service-account JSON, reCAPTCHA secrets, recovery codes, API keys, access tokens or personal private notes in source control, Markdown, logs or prompts.
- Never inspect, publish, copy or commit `private/`. It is intentionally gitignored.
- Firestore’s moderation model is a security boundary: public submissions must remain `pending`; only the verified owner can publish, edit moderation state or access Field Notes data.
- If Firestore fields, queries or permissions change, update the client code, `firestore.rules` and `firestore.indexes.json` together as needed, then test the real affected user flow on staging.
- Do not deploy Firestore/Auth configuration remotely without user authorisation for that release.
- Do not add email sending, visitor tracking or analytics without explicit consent/privacy design and a user request.

## SEO and public routes

- Keep `dainyelonthemove.com` as the canonical production domain.
- Keep `/admin.html` and `/studio` non-indexed and protected by headers/robots configuration.
- For every new public indexable page, add a unique title, meta description, canonical URL, social metadata and a sitemap entry. Do not add private/admin pages to the sitemap.
- Retain the existing `robots.txt` restrictions and update only when required by a reviewed routing change.

## Implementation and release routine

- Phase 1b uses `.github/templates/header.html` and `footer.html` as the shared shell, page sources in `.github/templates/pages/`, and panel partials alongside them. Edit those sources, then run `python tools/Compose-Site.py` to refresh the committed root HTML and CSS/JS version queries. The composer uses only Python's standard library and is an authoring tool, not a deployment build dependency. Do not edit generated root HTML independently.
- `assets/design-system.css` is the common token/layout layer. Preserve hash routes, focus return, browser history, no-JavaScript fallbacks and click-to-load external players when modifying panels. Keep remote Firebase services lazy and preserve the existing submission contracts.

1. Inspect the relevant existing files before editing.
2. Make the smallest coherent change that preserves current working behaviour.
3. Create the required pre-change backup in the local workspace.
4. Run focused, non-destructive checks appropriate to the request (for example syntax/reference checks or a requested visual check). Do not invent a broad test suite for a small content edit.
5. Report changed files, what was verified and any limitations.
6. Develop each redesign phase on its own branch and publish to `staging` for review. The supplied 14 October brief requires approval between phases. Phase 0 audit and urgent phase 1a come first; do not silently mark the entire redesign complete.
7. Deploy production only after explicit approval; verify the live canonical URL afterwards.

## Known pending priorities

- Verify real owner sign-in, App Check/Auth configuration and community-reply moderation on staging.
- Complete the Philippines written blog only after Dainyel supplies final text/media.
- Decide on an email provider and unsubscribe flow before adding newsletter delivery or website-triggered email notifications.
- Use Google Search Console and measured performance checks before claiming SEO ranking or Core Web Vitals success.
