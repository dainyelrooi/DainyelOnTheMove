# DainyelOnTheMove — Project hand-off

**Status:** 14 October 2026
**Canonical source:** this repository, `DainyelOnTheMove`
**Live site:** <https://dainyelonthemove.com>
**Test site:** <https://dainyelonthemove-staging.web.app>
**Repository:** <https://github.com/dainyelrooi/DainyelOnTheMove>

This document is a factual hand-off for a future Codex session. The baseline is the available conversation and repository at commit `b7a3574`; the 14 October staged redesign includes phase 1a and phase 1b in the test site. Production remains unchanged pending explicit approval. Phase reports live under `.github/reports/`. It intentionally contains no passwords, API secrets, service-account material, reCAPTCHA secrets, or private personal notes.

## 1. Project goal and architecture

DainyelOnTheMove is an English-language personal travel platform for Dainyel. Its desired experience is a cinematic, premium editorial travel documentary: real stories, personal photography and video, an interactive travel atlas, and carefully moderated visitor interaction. The brand name is **DainyelOnTheMove** and the core line is **“Take the scenic route.”**

The site is a static, multi-page website. It has no application framework, no build pipeline and no package manifest. HTML pages, vanilla CSS and vanilla browser JavaScript are deployed as-is from the repository root.

```text
Browser
  ├─ static HTML/CSS/media/vanilla JavaScript
  ├─ Firebase Authentication (owner sign-in)
  ├─ Firebase App Check with reCAPTCHA Enterprise
  └─ Cloud Firestore (Q&A, community moderation, location, Field Notes)

GitHub repository
  ├─ staging branch → Firebase Hosting staging target
  ├─ main branch → Firebase Hosting production target
  └─ pull requests → Firebase Hosting preview workflow

Firebase Hosting
  ├─ production site → dainyelonthemove.com
  └─ staging site → dainyelonthemove-staging.web.app
```

### Important directories

| Path | Purpose |
|---|---|
| `*.html` | Public pages. The root is the Firebase Hosting public directory. |
| `assets/` | Shared CSS, browser scripts, supplied photos, optimized images and videos. |
| `js/` | Firebase client setup, admin dashboard, Q&A, current location, search, Field Notes and journey tracker. |
| `tools/` | Local backup script and SEO metadata helper. |
| `.github/workflows/` | GitHub Actions deployment workflows. |
| `firebase.json` | Hosting, Auth and Firestore deployment configuration. |
| `firestore.rules` / `firestore.indexes.json` | Firestore access control and query indexes. |
| `private/` | Ignored local material. Treat as private; do not inspect, upload, copy or commit it. |

The former Codex output folder is **not** the source of truth. The working source is the OneDrive repository above and its GitHub remote.

## 2. Frameworks, services and integrations

| Area | Current implementation |
|---|---|
| Front end | Static HTML5, CSS and vanilla JavaScript. No React, Vue, Next.js, bundler or npm build process. |
| Typography | Google Fonts: Playfair Display and DM Sans. |
| Hosting | Firebase Hosting with separate `production` and `staging` targets. |
| Custom domain | Firebase Hosting serves `dainyelonthemove.com`; `www` is configured to redirect to the canonical domain. |
| Source control / automation | GitHub repository and GitHub Actions. Pushing `main` deploys production; pushing `staging` deploys staging. |
| Authentication | Firebase Authentication, email/password provider. Admin access additionally requires the configured owner email to be verified. |
| Bot / app protection | Firebase App Check backed by reCAPTCHA Enterprise. The public site key lives in the browser config by design; the provider secret must remain in Google/Firebase configuration. |
| Data | Cloud Firestore database named `dainyel-content`. The conversation records its chosen location as `europe-west4`; the edition was not verified from this repository. |
| Social / video | YouTube playlist embed, Instagram Reel embed, and external Instagram/TikTok/YouTube links. |
| Search | Client-side page/topic search in `js/site-search.js`; no external search provider. |
| SEO | Per-page title, description, canonical URL and social metadata; `robots.txt` and `sitemap.xml`; structured data on key pages. |

There is no active Cloud Functions source in this checkout, no email-delivery provider, no analytics implementation identified in the code, and no AI moderation backend. An earlier AI moderation experiment was explicitly removed because the user does not want to spend money on it.

## 3. Key design and technical decisions

### Brand and design

- Dainyel approved the new navy/teal/coral/sand Cinematic Explorer palette on 14 October 2026. Phase 1b introduces shared design tokens, self-hosted DM Sans and Playfair Display, and the common shell. Long-form content keeps its structure with palette overrides.
- Use the cinematic, premium editorial style: large imagery, calm spacing, Playfair-style expressive headlines and readable body copy.
- The home page should remain focused, with one primary action per section. Avoid returning it to an overcrowded landing page.
- The shared navigation is Stories, Videos, Map, About and Collaborate, plus More for Q&A, My kit, Field Notes and Search. It is authored once in `.github/templates/header.html`; the footer is shared too.
- Motion is deliberately modest. `assets/polish.js` provides reveal effects and respects `prefers-reduced-motion`; `assets/video-autoplay.js` starts muted, looping, in-view video and pauses it outside the viewport or when reduced motion is requested.
- Accessibility and responsive layout are requirements, not optional decoration: keyboard access, focus states, semantic controls, sufficient contrast and mobile/tablet/desktop layouts must be kept intact.

### Content integrity and privacy

- Publish only real travel data and supplied content. Never invent trips, route progress, locations, quotes, partnerships, metrics, facts or Q&A activity.
- The visited archive stays in `assets/travel-data.js`. The new trip uses `data/trip.json` with only a title, departureAt, revealedStops and optional broad currentLocation. Unannounced destinations, route counts and travel duration must never appear in public files or commits. Use only "Trip to Latin America" until places are manually revealed.
- Current location is intentionally broad. The admin dashboard may request browser location, but only city and country are written to `siteStatus/current`. Exact coordinates must never be stored or shown publicly.
- Public questions, community threads and community replies begin as `pending`. The owner approves them in the private admin area. This moderation model is deliberate and must not be bypassed.
- Field Notes stores opt-in email addresses in Firestore. The site currently collects subscriptions but does not send newsletters or automated notification email.

### Deployment, staging and backups

- `main` is the production branch. GitHub Actions deploys it to the production Firebase Hosting target.
- `staging` is the review branch. GitHub Actions deploys it to the staging target, which is noindexed in `firebase.json`.
- A pull-request workflow also creates a Firebase Hosting preview path using the staging target.
- Production has noindex/X-Frame headers on `/admin.html` and `/studio`; `/studio` rewrites to `admin.html`. `robots.txt` also disallows those private routes.
- Before any source edit on the local OneDrive workspace, create a snapshot with `tools/Create-SiteBackup.ps1`. It copies the source while excluding Git internals, Firebase cache, dependencies and `private/`.
- Production deployment requires explicit user approval. Staging can be used for review first. Never quietly deploy a local change to production.

## 4. Existing features and functionality

### Public pages

| Page / route | Implemented behaviour |
|---|---|
| `index.html` | Cinematic poster/video hero, personal introduction, real mini-atlas, surprise-trip countdown/opt-in, story/film selections, community and collaboration. Hash panels hold the full About/kit, atlas/location/reveals, Q&A, film collection/players, creator profile and local contact brief. |
| `stories.html` | Travel stories and Field Notes share an accessible tabbed overview; both sections remain available without JavaScript. |
| `thailand.html` | Full original Thailand exchange article, including every existing Thailand chapter anchor. |
| `bali.html` | Existing completed personal Bali story; content retained, shared shell/theme and responsive image variants. |
| `thailand-solo.html` | Existing full solo story, chapter navigation, supplied imagery and Q&A CTA. |
| `philippines.html` | Existing whale-shark video preview; the full written story is still pending. |
| Old About, Videos, Destinations, Journey, Q&A, Kit and Collaborate `.html` routes | Hosting 301 aliases to the corresponding home section/panel, with local fallback links and legacy query/fragment resolution. |
| `blog.html` / `updates.html` | Permanent aliases to Stories / Field Notes; old Thailand chapter fragments resolve to the complete article. |
| `search.html` | Existing site search updated to the consolidated routes. |
| `privacy.html` / `cookies.html` | Factual working notices for current features; owner/legal review details remain in `.github/legal/`, excluded from Hosting. |
| `404.html` | Branded, non-indexed recovery page with home/search links. |

### Shared front-end behaviour

- `.github/templates/` is the authoring source; `tools/Compose-Site.py` produces committed static root HTML and fingerprints CSS/JS references. Standard-library Python only; no deployment build step or new browser dependency.
- `assets/design-system.css`: common tokens, typography, shell, section rhythm, panels and responsive/motion/focus states. Scoped profile/Q&A styles load outside the critical rendering path.
- `assets/site-ui.js`: responsive/compact navigation, shared hash dialogs with history/focus/inert handling, reading progress, archive tabs, service loading, external-player consent and local collaboration brief preparation.
- `assets/video-autoplay.js`: muted looped playback only in view, manual pause persistence, reduced-motion/data-saving behaviour and lazy sources. Own H.264 web variants retain original source clips.
- `assets/video-filters.js`: original Travel films / Short moments / Behind the lens filters retained inside the film collection panel.
- `assets/atlas.js`, `map-enhancements.js`, `world-country-paths.js`: existing visited geography, list selection, zoom/pan, filters and explicitly revealed stops only.
- `assets/travel-data.js`: historical visits only. `data/trip.json` / `assets/trip-data.js`: explicitly public trip data only. Shared city/country cards stay hidden when no location is published.
- External video frames are created only after a load action and removed on close. Escape is handled by page dialogs; cross-origin players can capture their own keys, so their fixed close control remains available.

### Firebase-backed feature model

| Firestore path | Use | Public visibility |
|---|---|---|
| `questions/{id}` | Personal questions and owner answers | Only `published` entries; owner sees the moderation queue. |
| `communityThreads/{id}` | Public community discussion prompts | Only approved threads. |
| `communityThreads/{id}/replies/{id}` | Visitor replies to an approved thread | Only approved replies. |
| `fieldNotes/{id}` | Opt-in email records | Owner only. |
| `siteStatus/current` | Broad shared current city/country and timestamp | Public read; owner write/delete only. |

`admin.html` is the single owner dashboard. After verified owner sign-in it can manage broad location, direct questions/answers, community threads/replies and Field Notes subscribers. The Firestore rules require the configured owner account and verified email, reject unrecognised fields, and restrict public writes to the pending moderation path.

## 5. Open tasks, pending content and known validation risks

### Confirmed pending content / product work

1. **Philippines written blog:** its current page is deliberately a video preview. The full story still needs Dainyel’s written text and selected media.
2. **Travel Log publishing workflow:** the page is present, but there is no authoring interface or OneDrive-album slideshow integration. The earlier OneDrive slideshow idea was exploratory only and has not been built.
3. **Newsletter delivery:** Field Notes captures consented email addresses, but there is no email sender, unsubscribe automation, Gmail label/rule configuration or new-question notification workflow in the repository.
4. **Real journey updates:** reveal a place only after Dainyel explicitly chooses to publish it. Keep the next place, duration and stop counts out of public files. The owner-facing update steps are in README.md.
5. **My Kit / collaboration proof:** use specific supplied gear, portfolio examples, contact channel and collaboration metrics before adding factual claims or logos.
6. **Search visibility operations:** on-page SEO is present, but Google Search Console property verification, sitemap submission, indexing status, analytics and measured Core Web Vitals are not present in this checkout.
7. **404 visual consistency:** `404.html` is still the stock Firebase page and could be redesigned to match the site when requested.

### Reported issues that require live verification

1. **Admin sign-in / App Check:** the user previously received a Firebase sign-in failure even with the expected password. Current code maps App Check errors to a useful message and loads App Check with the configured public site key, but this session did not authenticate a real account. Verify Email/Password is enabled, the configured owner account is verified, the production/staging domains are authorised, and the reCAPTCHA Enterprise/App Check configuration matches the public client key.
2. **Community replies review queue:** the user previously saw “I could not load community replies.” The client now queries pending replies through a collection group and the repository contains a matching index. It still needs an authenticated live-admin check against Firestore, including a real pending reply.
3. **Domain and redirect monitoring:** production was previously reachable and the custom domain marked connected, but DNS/SSL/`www` should be rechecked after any domain-provider change. This hand-off does not contain a current DNS audit.
4. **Performance claims:** image/video lazy loading and in-view playback are implemented, but no repeatable Lighthouse or real-user Core Web Vitals result is stored. Do not claim target scores without measuring.

## 6. Important user instructions and preferences

- Communicate with Dainyel in Dutch; public website copy is generally English.
- Use the current colours and premium editorial/cinematic style. Keep pages polished but not visually overloaded.
- Dainyel values interaction, personal storytelling, real travel media and easy use on mobile as much as visual impact.
- Preserve existing routes, stories, destinations, social embeds and working moderation unless the user explicitly asks to remove them.
- Ask for missing personal facts, original text, images or video rather than inventing them. Bali, Thailand solo and Philippines were identified as story priorities; the Philippines written story remains pending.
- Do not create or reactivate paid AI moderation. The earlier Gemini-based moderation attempt was intentionally removed due cost.
- Do not expose private location data, visitor emails, admin data, passwords, recovery codes, reCAPTCHA secrets, Firebase service accounts or any contents of `private/`.
- Use only supplied or clearly authorised media. Preserve reasonable `alt` text and lazy loading.
- Create a backup before source changes in the local OneDrive workflow. The latest pre-documentation snapshot is `C:\Users\dainy\OneDrive\DainyelOnTheMove website\backups\website_2026-10-14_05-08-57`.
- Treat Git history as the collaboration history and use staging for review. Do not deploy production without an explicit request such as “ga live”.

## 7. Required Codex Cloud configuration

Codex Cloud should use the GitHub repository as its workspace. It cannot assume access to this Windows user profile or OneDrive path.

### Minimum setup for safe feature work

1. Connect the GitHub repository `dainyelrooi/DainyelOnTheMove` with read/write access.
2. Start new work from `staging`, or create a feature branch from `staging`.
3. Provide a modern Node.js runtime for static checks such as `node --check`; no dependency install or build command is required.
4. Do **not** mount or copy the local `private/` directory into Cloud. It is intentionally ignored by Git.
5. For ordinary website changes, commit/push to `staging` and use the existing GitHub Action to deploy the noindex staging site. This route does not require a Firebase service-account secret in Codex Cloud.
6. Before a production release, obtain explicit approval, merge/fast-forward the reviewed code to `main`, and let the existing `main` workflow deploy production.

### Only if Cloud must deploy or manage Firebase directly

- Give the Cloud environment Firebase access through a securely injected, least-privilege Google service-account credential or an approved Firebase authentication mechanism. Never put it in the repository, source code, markdown, issue text or terminal output.
- Use the existing Firebase project ID and hosting targets from `.firebaserc`; do not create a new project or database.
- The identity needs the appropriate Firebase Hosting deployment permissions. Firestore rules/index deployment also needs the appropriate Firebase Rules/Firestore deployment permission. Avoid broad owner roles when narrower roles work.
- Authorised domains, App Check/reCAPTCHA Enterprise configuration and Auth provider settings are remote Firebase/Google configuration. Cloud needs relevant console/API permission only if the task explicitly requires changing them.
- If a Cloud session cannot execute the local OneDrive backup script, do not silently skip the user’s backup preference. Preserve Git history and tell the user that a OneDrive snapshot cannot be made from Cloud before making source changes.

## 8. Concrete continuation plan

1. **Start safely:** read `AGENTS.md`, this file, current Git status and the active branch. Confirm the task scope. Create a local backup if operating in the OneDrive workspace.
2. **Verify operations:** test owner sign-in on staging, then check personal Q&A, community moderation/reply review, Field Notes subscription and broad location update. Record only errors, not credentials or private data.
3. **Fix confirmed backend/configuration issues:** if sign-in or replies fail, inspect Firebase Auth domain/App Check settings and Firestore indexes/rules using the Firebase skills; make rules/client changes together and test on staging.
4. **Complete the Philippines story only when content arrives:** request final English text, intended structure, selected files and captions. Do not manufacture the missing narrative.
5. **Decide on email intentionally:** choose an email provider and explicit consent/unsubscribe design before implementing notifications or newsletter sending. A Gmail label is an inbox setting, not something the static website can guarantee by itself.
6. **Continue the approved phased brief:** review phase 1b before starting phase 2 (galleries, further map/reveal interactions and motion), followed by phase 3 (magazine stories/Q&A postcards) and optional phase 4 (decorative effects). Do not silently proceed or release production.
7. **Improve measurable quality:** run mobile/desktop performance and accessibility checks, then optimise the largest confirmed image/video bottlenecks without breaking the cinematic design or autoplay/reduced-motion behaviour.
8. **SEO operations:** verify Search Console, submit the existing sitemap, and monitor indexing before making claims about Google ranking. Update sitemap and canonical metadata whenever a new indexable public page is added.
9. **Release:** have Dainyel review the staging URL. Only after explicit approval, merge to `main`, let GitHub Actions deploy production, and verify the live canonical domain.

## 9. Information not available from the repository or conversation

- The current Firebase Auth user state, owner-email verification state, allowed-domain list and App Check enforcement status.
- The Firestore database edition and live data contents; this hand-off does not query production data.
- The Google Cloud IAM setup, GitHub secret values, service-account identities and domain registrar/DNS settings.
- Search Console verification/index coverage, Google Analytics configuration, visitor counts, ranking data and measured Core Web Vitals.
- The final text, selected media, captions and desired publishing date for the Philippines story or future travel updates.
- Any current newsletter provider, automated email rule, or actual Gmail label configuration.
- The user's preferred future Cloud credential model and whether OneDrive backups can be made from that environment.

## Phase 1b owner decisions

Collaboration contact remains Instagram only. Publish the creator profile without audience/reach statistics. No public business email was supplied. The contact form prepares text locally; the visitor copies it into Instagram. No automatic email provider, double opt-in or unsubscribe delivery has been added. See `.github/reports/2026-10-14-phase-1b.md` for measured results and limitations.
