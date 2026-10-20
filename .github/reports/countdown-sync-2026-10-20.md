# Departure countdown synchronisation — staging

## Scope

Owner requested correction on the test environment only. No production release, newsletter, database or account configuration changes.

## Cause and correction

- Navigation used Math.ceil for remaining days; the detailed countdown used Math.floor. Seven days plus hours therefore appeared as eight in navigation.
- Both now display whole remaining days rounded down.
- On Home and Journey, the detailed countdown passes its exact departure timestamp and remaining milliseconds directly to the badge. This also follows a valid published trip feed without another request.
- Other pages retain the HTML departure fallback with one-second updates, suspended while hidden and resumed after returning or restoring a cached page.
- Less than one full day remains a predeparture state. The navigation says “Departing in <1 day” with an expanded accessible label. The journey-underway message begins only at or after departure.
- Static date fallback is preserved if the timestamp is invalid. Confirmed departure remains 28 October 2026, 00:00 Europe/Amsterdam.

## Implementation and evidence

- Pre-edit backup: sibling backups/website_2026-10-20_21-05-59.
- Edited assets/site-ui.js and assets/journey-summary.js; regenerated asset fingerprints through tools/Compose-Site.py.
- Independent source review found no concrete regressions in the changed clock lifecycle or snapshot handoff. No test suite was added or run.
- Firebase CLI successfully deployed only hosting:staging to dainyelonthemove-staging.
- Actual staging browser view at /#next-chapter shows navigation “Departing in 7 days” alongside detailed clock “07 DAYS”. This is an observed current-time view; future boundary cases were reviewed in source, not simulated.
- Screenshot saved outside Hosting at sibling newsletter-drafts/countdown-sync-staging-2026-10-20.png.
