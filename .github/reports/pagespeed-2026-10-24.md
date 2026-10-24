# Approved live release and PageSpeed work

Owner request, 24 October 2026: release the reviewed kit photos, no email, then aim above98 in every PageSpeed category on every page. Never claim a threshold without actual measurements or remove protections/content to attain it.

## Released photographs

- Source backup: sibling `backups/website_2026-10-24_18-28-52`.
- Main release `b6b222c`; Firebase production Hosting **40112029985** succeeded. All seven approved equipment photographs are now in the live /my-kit source. No mail request/campaign operation invoked.

## Actual baseline measurements

Official pagespeed.web.dev, Lighthouse13.5.0, public production, mobile/desktop:

| Page | Mobile P/A/BP/SEO | Desktop P/A/BP/SEO | Report ID |
|---|---|---|---|
| Home |92/100/96/100|94/100/96/100|9j1mpwo85g|
| My kit |52/96/96/100|93/96/96/100|nmbvx85a2b|
| Philippines |90/100/96/100|95/100/96/100|smpm9ahysm|

Reports and additional local diagnostic JSON stay outside Hosting under the external Codex24October pagespeed folder. The unauthenticated official PageSpeed API returned429; use the actual official browser reports instead of claiming API results. Local Edge Lighthouse is a separate diagnostic environment, not a replacement for PSI scores.

## Focused remediation prepared

- Public realtime readers no longer import/initialise Firebase Auth. A small dedicated module starts the exact same Auth instance only from the private owner sign-in desk. App Check initialisation and named Firestore listeners remain; no Rules/Auth/provider/credential or enforcement configuration change. Fresh read-only App Check configuration confirms Firestore and Authentication are ENFORCED. Keep them enforced even though automated PSI clients log verification failures. Do not suppress console/network errors merely to improve scores.
- Offscreen native video posters were loading despite preload=none. Composer now emits data-poster for non-hero films; the existing viewport observer restores the poster before the source/motion checks, including reduced-motion use. Hidden gallery slides remain deferred. Initial hero placeholders remain immediate; Philippines uses a smaller responsive660px hero poster and keeps the real fallback image behind its background film.
- Existing immutable local font files gain one-year browser caching. HTML, public updates, owner changes and JavaScript keep revalidation; no broad stale-cache rule.
- Actual My kit contrast audit found the seven light decorative gear numbers. Darken them, plus the number on the dark essentials card. Preserve real pictures, text and layout.
- Focused local video check: hero decoded time advances, offscreen films have no poster/source request, selecting Boracay Next restores the visible film poster/source and starts playback while the hidden film pauses. Existing chapter anchors and in-frame controls work. Module/composer syntax and whitespace checks passed. No mail form submission or broad new test suite.

The separate all-route local accessibility/SEO diagnostic also found a missing level-two heading above the shared Stories/Field Notes cards (98 accessibility). Add an ordinary screen-reader heading to make the card heading order meaningful without cluttering the visual layout. Recompose source-bound editor IDs and preserve all older private histories; no saved override is remapped.

Staging7a3990f Hosting40113576936 succeeded; changed modules exactly match source. Actual font/JS headers have the intended separate caching policies. The staged admin sign-in screen loads through the new Auth module. A new Google/TOTP enrollment/sign-in was not performed. The complete official matrix is recorded below. The target above98 remains unmet.

## Final focused fixes before live measurement

All22 local public-page accessibility/SEO diagnostics completed. Every SEO score was100. Five accessibility failures were My kit numbers96, Stories98 / Field Notes98 / Films98 heading order, and Thailand solo95 cookie link styling. Corrected all five shared-source causes. Local diagnostic performance is not represented as PSI measurement.

Public override/list startup now offers two animation frames for first paint before starting the same protected realtime connection. Initial original-text capture uses textContent instead of forced-layout innerText; metadata comparison still compares matching original/current text, and visible title formatting is read only during actual updates. No audit detection, artificial timed wait, service bypass or removal of real-time listeners.

Staging browser verified the new film collection H2 and actual foreground video decoding/time progression8.57s, native controls, restored poster and close/focus return. New private sign-in module renders the existing sign-in form. No credentials/OTP, mail request or permanent data operation used. Owner explicitly approved this performance/live batch; retain full App Check enforcement despite automated-client failures.

## Final release and observed outcome

- Main functional/source snapshot `1f6aa64`, production Hosting **40116945947** succeeded. Earlier final functionality `13d5173` Hosting **40116711065** also succeeded. Staging Hosting **40116952603**, saved-content backup/preflight **40116952492**, and source OneDrive backup **40116952444** succeeded. No staged photo/performance source remains unpublished.
- All22 public routes returned200 with no accidental redirects. Live changed modules, My kit, search/editor catalogues matched source; fonts have one-year caching while HTML/JavaScript/data retain revalidation. Admin/studio retain noindex and DENY. Known report URL returns404. App Check remains ENFORCED for Firestore and Authentication; exact active named Rules still match unchanged source. Production subscriber capability stays enabled, staging disabled, contact forwarding disabled, and the production outbox remains empty. No send/test campaign, request, contact/question submission or provider schedule mutation was made for this task.
- Final targeted startup correction applies the paint opportunity in the shared Firebase module, including direct Journey/contact readers, before App Check then database/auth become available. It is progressive scheduling with no timed audit delay, detection or enforcement bypass. New owner Auth import renders the real sign-in screen on staging and production; the previous signed-in tab was no longer available, so no new authenticated Google/TOTP lifecycle was performed or claimed.
- Q&A's disappearing manual startup button caused real layout shift. Standalone source now starts with a bounded stable guidance area and its manual-only button hidden; homepage overlay/manual loading remains. Source retry/permission/rate-limit/consent contracts are unchanged. Staging answer-section top stayed766px before and after connection, status height40.95px, button hidden; actual final PSI mobile CLS0 rather than0.105. No fake questions/answers were created.
- Actual Film LCP culprit was the first card photograph, previously lazy despite being above the fold. Only the standalone film collection's first source photo is eager/high priority. Actual staged image loaded; final PSI mobile LCP1.6s versus the earlier10.1s and mobile Performance98 versus74. Other cards/posters stay deferred and the approved five-second circular collection behaviour remains.
- Full official public-page result: **22pages × mobile+desktop =44measurements; all44 Accessibility100 and SEO100; all44 Best Practices96; Performance73–100; zero pages exceed98 in all four categories on both devices. The owner's universal98+ target is NOT achieved and must not be represented as complete.** New Q&A mobile performance73 and Home75 remain in the final matrix even though earlier runs were higher. The matrix uses latest observed runs, not the maximum score. Original earlier low/high reports are retained externally; these are varying lab snapshots, not a controlled causality experiment or field-user results.
- Samples identify protected Google verification failures/third-party execution in Best Practices/TBT. Keep App Check/MFA, real-time publication/withdrawal, privacy and real media. No security downgrade, new public backend/runtime, billing or audit-only behaviour was approved or performed. Further architecture work needs its own concrete review; no permanent score guarantee is justified by these lab runs.
- Additional actual anonymous admin-page test (no owner credentials/private data): mobile80/100/96/66 and desktop92/100/96/66. Its66SEO is consistent with the deliberately blocked private login route; it is outside the22 indexable content pages. Do not remove noindex merely to improve this number.
- Durable external owner deliverables: `PageSpeed-overzicht.html`, `PageSpeed-scores.csv`, and normalised public `PageSpeed-scores.json` in the external pagespeed folder. They contain scores/ordinary links only, not credentials/private content. No raw audit JSON is hosted or committed. Google documentation: https://developers.google.com/speed/docs/insights/v5/about and https://web.dev/articles/optimize-lcp .

### Official public results (P / A / BP / SEO)

| Page | Mobile | Desktop | Official mobile report |
|---|---|---|---|
| About | 99 / 100 / 96 / 100 | 84 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-about/ub90gobk37?form_factor=mobile) |
| Atlas | 100 / 100 / 96 / 100 | 94 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-atlas/3f1280vpa1?form_factor=mobile) |
| Bali | 92 / 100 / 96 / 100 | 99 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-bali/sr7msra0y1?form_factor=mobile) |
| Contact & collaborate | 99 / 100 / 96 / 100 | 89 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-collaborate/etpcep9jqk?form_factor=mobile) |
| Cookies | 89 / 100 / 96 / 100 | 94 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-cookies/fberpks1j4?form_factor=mobile) |
| Field Notes | 100 / 100 / 96 / 100 | 90 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-field-notes/2au6qhgg9w?form_factor=mobile) |
| Home | 97 / 100 / 96 / 100 | 99 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com/b6hqe19rjn?form_factor=mobile) |
| The next chapter | 95 / 100 / 96 / 100 | 100 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-journey/l6ckcjm6bq?form_factor=mobile) |
| My kit | 94 / 100 / 96 / 100 | 92 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-my-kit/cz0trb2xdq?form_factor=mobile) |
| A local place became a ritual | 90 / 100 / 96 / 100 | 95 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-note-a-local-place-became-a-ritual/b0w5czzwca?form_factor=mobile) |
| More to tell from the road | 92 / 100 / 96 / 100 | 92 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-note-more-to-tell-from-the-road/vj2djapz07?form_factor=mobile) |
| Room to breathe | 100 / 100 / 96 / 100 | 95 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-note-room-to-breathe/ly5byyr3r0?form_factor=mobile) |
| Philippines | 96 / 100 / 96 / 100 | 92 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-philippines/uv92kzivjg?form_factor=mobile) |
| Thailand photo journal | 100 / 100 / 96 / 100 | 97 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-postcard-thailand-photo-journal/lndoxo2e65?form_factor=mobile) |
| Postcards | 96 / 100 / 96 / 100 | 100 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-postcards/1fanosahsr?form_factor=mobile) |
| Privacy | 93 / 100 / 96 / 100 | 98 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-privacy/c8uvhnzczr?form_factor=mobile) |
| Q&A | 73 / 100 / 96 / 100 | 100 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-qa/cuntsakasi?form_factor=mobile) |
| Stories | 95 / 100 / 96 / 100 | 100 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-stories/svp2sq5eml?form_factor=mobile) |
| Thailand solo | 99 / 100 / 96 / 100 | 93 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-thailand-solo/bso9nztr14?form_factor=mobile) |
| Thailand | 90 / 100 / 96 / 100 | 99 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-thailand/d3ki7azy20?form_factor=mobile) |
| Travel costs | 96 / 100 / 96 / 100 | 100 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-travel-costs/ha88lqwpf8?form_factor=mobile) |
| Films | 100 / 100 / 96 / 100 | 95 / 100 / 96 / 100 | [Google](https://pagespeed.web.dev/analysis/https-dainyelonthemove-com-videos/43y4h3xpsc?form_factor=mobile) |


## Continued remediation after the owner requested “Ga verder”

- Required pre-change source backup: sibling `backups/website_2026-10-24_22-58-59`. Functional release `1df4b106f8482340f7747a2a4863ee8bd42042c6`: staging Hosting **40132505187**, production Hosting **40132621225**, OneDrive source backup **40132505081** and saved-content backup/preflight **40132505296** succeeded. Live carousel/module/page text matched local source after normalising line endings.
- The normal anonymous live Q&A actually loaded published answers and community conversations; no errors/warnings were captured in that ordinary browser check. This confirms a successful read in that browser, not universal device/provider availability. No form was submitted and no visitor payload was saved in this report.
- A targeted local Lighthouse trace identified repeated carousel layout work. `collection-carousel.js` now caches card stride, viewport width and page size, remeasures on existing content/filter/ResizeObserver refreshes, avoids rewriting an unchanged counter, and avoids a duplicate settle paint. It retains the real-node ring, native touch scrolling, five-second rotation, visibility/focus/hover/player/reduced-motion safeguards and live content updates. No dependency, security, database/query, mail, consent or media change.
- Manual local/staging/live checks passed: eight forward steps traversed the seven-card ring and returned in sequence; Previous worked; the one-film filter hid redundant controls; phone width375 had no page overflow; backward wrap7→automatic1 worked; desktop three-card layout and Field Notes filtering remained correct. No test suite or new authenticated owner flow was added/performed.
- The updated table above replaces only Home/Films with the latest actual official post-change runs. Their prior 75/78 and98/97 Performance results remain in the external `final` files, and new raw page-backed readings use `after-carousel` filenames. The other20 rows are the earlier complete44-measurement public audit, not falsely represented as new post-change measurements.
- Actual new official scores (Performance/Accessibility/Best Practices/SEO): Home mobile **97/100/96/100**, desktop **99/100/96/100**; Films mobile **100/100/96/100**, desktop **95/100/96/100**. Home mobile LCP2.0s/TBT30ms, Films mobile LCP1.7s/TBT50ms. These are variable lab snapshots; lower desktop Films95 is retained, not replaced with an earlier higher run. Source-specific local timings from different local/live origins are diagnostic, not a controlled speedup claim.
- Fresh official error details still include App Check403, captcha storage permission denial and Firestore listener timeouts in the automated client. Fresh safe server readback confirms both App Check services remain **ENFORCED**, exact named Rules match source, production Postcard capability enabled/staging disabled, contact forwarding off, and no production mail requests. No sender/process/notify operation or campaign mutation was invoked. Unrelated existing native schedules remain unchanged.
- Universal above98 remains **unmet**. Further removal of verification/realtime overhead is not a small safe setting change: do not disable enforcement, suppress real errors, expose private/admin routes, delay required corrections/withdrawals, or silently introduce an unreviewed public backend/billing model for a score. Owner-facing HTML/CSV/JSON now disclose measurement phases and the latest four results.
