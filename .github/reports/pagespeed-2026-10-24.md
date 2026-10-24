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

Staging7a3990f Hosting40113576936 succeeded; changed modules exactly match source. Actual font/JS headers have the intended separate caching policies. The staged admin sign-in screen loads through the new Auth module. A new Google/TOTP enrollment/sign-in was not performed. Full final live verification and the official route matrix remain pending; the target above98 has not been established.

## Final focused fixes before live measurement

All22 local public-page accessibility/SEO diagnostics completed. Every SEO score was100. Five accessibility failures were My kit numbers96, Stories98 / Field Notes98 / Films98 heading order, and Thailand solo95 cookie link styling. Corrected all five shared-source causes. Local diagnostic performance is not represented as PSI measurement.

Public override/list startup now offers two animation frames for first paint before starting the same protected realtime connection. Initial original-text capture uses textContent instead of forced-layout innerText; metadata comparison still compares matching original/current text, and visible title formatting is read only during actual updates. No audit detection, artificial timed wait, service bypass or removal of real-time listeners.

Staging browser verified the new film collection H2 and actual foreground video decoding/time progression8.57s, native controls, restored poster and close/focus return. New private sign-in module renders the existing sign-in form. No credentials/OTP, mail request or permanent data operation used. Owner explicitly approved this performance/live batch; retain full App Check enforcement despite automated-client failures.
