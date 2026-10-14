# DainyelOnTheMove — Project hand-off

**Status:** 14 October 2026
**Canonical source:** this repository, `DainyelOnTheMove`
**Live site:** <https://dainyelonthemove.com>
**Test site:** <https://dainyelonthemove-staging.web.app>
**Repository:** <https://github.com/dainyelrooi/DainyelOnTheMove>

This document is a factual hand-off for a future Codex session. It is based on the available conversation history and the local repository at commit `207b439`. It intentionally contains no passwords, API secrets, service-account material, reCAPTCHA secrets, or private personal notes.

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

- Preserve the existing dark green/charcoal, warm white, turquoise and yellow editorial palette. Do not replace the visual identity without a specific request.
- Use the cinematic, premium editorial style: large imagery, calm spacing, Playfair-style expressive headlines and readable body copy.
- The home page should remain focused, with one primary action per section. Avoid returning it to an overcrowded landing page.
- Navigation keeps the main route concise: Home, Stories, Videos, Map and About. Lower-priority destinations are gathered under **More** by `assets/site-ui.js`.
- Motion is deliberately modest. `assets/polish.js` provides reveal effects and respects `prefers-reduced-motion`; `assets/video-autoplay.js` starts muted, looping, in-view video and pauses it outside the viewport or when reduced motion is requested.
- Accessibility and responsive layout are requirements, not optional decoration: keyboard access, focus states, semantic controls, sufficient contrast and mobile/tablet/desktop layouts must be kept intact.

### Content integrity and privacy

- Publish only real travel data and supplied content. Never invent trips, route progress, locations, quotes, partnerships, metrics, facts or Q&A activity.
- The travel atlas and South America tracker use the shared `assets/travel-data.js` source. It contains real prior visits and a clearly labelled *planned* route. Future destinations must not become visited/completed automatically.
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
| `index.html` | Cinematic landing page, “Take the scenic route” hero, journey CTA, current/planned journey block, atlas introduction, story/video routes, community CTA, social and collaboration route. |
| `about.html` | Personal story, travel style, background, destinations, future direction and Sacred Sak Yant background video. |
| `blog.html` | Story hub for Thailand, Bali and Philippines with social/video promotion. |
| `bali.html` | Completed personal Bali story based on supplied text and imagery. It covers Denpasar study life, family/classmates, Warunk WOW and an honest view of overtourism and pollution. |
| `thailand-solo.html` | Published solo Thailand long-form story with chapter navigation, reading progress, supplied images and Q&A CTA. |
| `philippines.html` | Philippines video-led preview with whale-shark hero footage and scooter footage; the full written story is explicitly marked in progress. |
| `destinations.html` | Interactive atlas with visited destinations, story status, zoom/pan, touch support, accessible list alternative, filters for Visited / Currently exploring / Next adventures, and the planned route. |
| `journey.html` | South America journey tracker: Curaçao → Peru → Colombia → Brazil → Guatemala → El Salvador → Mexico, scheduled 28 October 2026 to approximately 24/25 March 2027. All stops remain planned until real updates exist. |
| `qa.html` | Direct questions for Dainyel, published-answer search and topic filters, three-at-a-time rotating answer carousel, and moderated community travel conversations/replies. Honeypot fields reduce basic spam. |
| `updates.html` | Travel Log / Field Notes page with short moments and Firestore-backed opt-in email capture. |
| `videos.html` | YouTube playlist, category filters, supplied scooter video and Instagram Reel embed. |
| `my-kit.html` | Travel creator gear story/cards. Keep claims aligned with the content actually supplied. |
| `collaborate.html` | Collaboration positioning, services and Instagram contact route. |
| `search.html` | Client-side search across site routes and travel topics. |
| `privacy.html` | Describes the data collection and third-party embeds. |
| `404.html` | Basic Firebase-provided 404 page, not yet brought fully into the visual system. |

### Shared front-end behaviour

- `assets/site-ui.js`: responsive main navigation, active link behaviour, `More` menu and escape handling.
- `assets/polish.css` / `assets/polish.js`: responsive polish, focus/motion/visual hierarchy improvements and media loading defaults.
- `assets/video-autoplay.js`: in-view muted, looped autoplay with preloading near viewport.
- `assets/video-filters.js`: filters the video page by travel films, short moments and behind the lens.
- `assets/map-enhancements.js` and `assets/world-country-paths.js`: atlas filters, route rendering, markers, zoom/pan and accessible travel lists.
- `assets/travel-data.js`: single editorial source for map visits and planned journey data.

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
4. **Real journey updates:** the 2026–27 route must be updated manually from actual travel. Do not change statuses from `planned` on assumption.
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
6. **Improve measurable quality:** run mobile/desktop performance and accessibility checks, then optimise the largest confirmed image/video bottlenecks without breaking the cinematic design or autoplay/reduced-motion behaviour.
7. **SEO operations:** verify Search Console, submit the existing sitemap, and monitor indexing before making claims about Google ranking. Update sitemap and canonical metadata whenever a new indexable public page is added.
8. **Release:** have Dainyel review the staging URL. Only after explicit approval, merge to `main`, let GitHub Actions deploy production, and verify the live canonical domain.

## 9. Information not available from the repository or conversation

- The current Firebase Auth user state, owner-email verification state, allowed-domain list and App Check enforcement status.
- The Firestore database edition and live data contents; this hand-off does not query production data.
- The Google Cloud IAM setup, GitHub secret values, service-account identities and domain registrar/DNS settings.
- Search Console verification/index coverage, Google Analytics configuration, visitor counts, ranking data and measured Core Web Vitals.
- The final text, selected media, captions and desired publishing date for the Philippines story or future travel updates.
- Any current newsletter provider, automated email rule, or actual Gmail label configuration.
- The user's preferred future Cloud credential model and whether OneDrive backups can be made from that environment.
