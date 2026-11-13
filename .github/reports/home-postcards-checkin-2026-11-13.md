# Home Postcards check-in — staging, 13 November 2026

## Scope and preservation

The owner requested a pin on the map beside the homepage Postcards signup and a focused review of visitor clarity. This is a new staging candidate, not a production release approval. Local backup website_2026-11-13_18-05-48 precedes changes; feature/home-postcard-checkin starts at current mainc58190b, retaining the automated Postcard archive update.

No CMS records, visitor submissions, Rules/Auth, shared location, campaign, schedule, service configuration or email is changed. The map displays an existing manually shared broad location, not device coordinates. Existing URLs, signup dropdown/frame and independent background jobs are retained.

## Changes

- The decorative Latin America silhouette is now a compact readable map beside the signup. A golden pin marks the existing shared city reference, or an explicitly labelled country overview. Its labelled caption and keyboard-operable link open the matching country in the Atlas.
- assets/shared-place-point.js shares the original local country/city references and map projection with assets/atlas-checkin.js and assets/home-checkin-map.js. The owner-confirmed Miraflores district uses its original approximate Lima point. No external geocoder, GPS, extra Firestore listener or database polling was added.
- Coordinate files load only near the panel and are cached once per page across both maps. The larger existing city reference is not requested for a country-only check-in. A withdrawal clears the pin immediately; late network data cannot resurrect it. Outside-region locations link to the full Atlas without putting a false pin on Latin America.
- assets/home-checkin-map.css keeps the existing palette, responsive layout, visible focus and static marker. The shared template/generated homepage retains its approved no-JavaScript country fallback and Atlas link; no pin is invented without data.
- The technical reporting-timezone paragraph was removed from this visitor panel; the actual journey time handling and admin calendar timezone remain unchanged. Repeated location copy is consolidated into the map caption.

## Focused visitor review — further recommendations, not implemented

1. Keep a newest narrative shortcut on home even when a fact has just published. assets/home-latest.js currently reads the newest summary only and hides that shortcut when its kind is fact. This can leave the three authored home story cards showing the earlier Thailand/Bali/Philippines stories while recent narrative content is less prominent. A separate newest-story selection would complement the daily fact slot without mixing categories.
2. Give each public Postcard a distinctive approved cover. Several archive cards still use the intentional general Postcards illustration. It is a working fallback, but repeated covers are harder to distinguish at a glance. Prefer the linked story's approved photograph or an owner-selected upload; do not invent or silently replace historical photographs.

## Verification

- PASS — 276 Node checks, including four new meaningful reference cases: confirmed Miraflores, country-only/unrecognised-city fallback, malformed/withdrawn/no-reference inputs, and invalid city coordinate rejection.
- PASS — 183 Python checks and existing public route/asset/metadata/exclusion validators. An initial failed static-country assertion exposed that the approved no-JavaScript fallback had been removed; it was restored before the passing run.
- PASS — Twelve isolated local browser scenarios at390/1280px: off-screen lazy loading, map alignment/visible city/accessible label/layout, explicit country fallback, outside-region and withdrawn markers, keyboard Atlas navigation and exact anchor parity, an in-flight withdrawal race and usable no-JavaScript fallback. External requests were blocked and location changes were browser-only synthetic events, not saved check-ins.
- The Edge harness emits an empty-stack native InvalidStateError for cross-document view transitions under reduced motion. The exact same message was reproduced on unchanged production Did you know to Stories navigation. Only that exact pre-existing native warning is recorded separately; application exceptions still fail the check. No animation behaviour was changed to conceal it.
- Physical devices, a new signed-owner location save and production deployment are not claimed. Actual staging Hosting/regression and readback must be recorded below when complete. No mail was sent by these test/release steps.
