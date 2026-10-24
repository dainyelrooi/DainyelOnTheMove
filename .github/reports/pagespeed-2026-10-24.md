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
