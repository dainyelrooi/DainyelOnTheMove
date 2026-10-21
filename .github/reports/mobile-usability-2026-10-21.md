# Phone usability — 21 October 2026

## Scope

Owner request in voice: make the website as usable as practical on a phone. Changes are prepared for staging review. No new production approval, provider mail test, subscriber campaign, server activation or database configuration is included.

Starting source: clean staging `a600303`, matching the completed approved production source. Pre-change backup: sibling `backups/website_2026-10-21_06-34-32`.

## Observed problems and corrections

- The mobile departure badge was 36px high with 9.12px text and the menu button 40px square. Both now have a 44px minimum target; badge text is larger. At 320px, only the visual brand text hides; the logo and existing accessible home-link name remain.
- Menu labels were 12.8px. They are now 16px with 48px targets. The expanded menu has its own scrolling area bounded by the viewport, including landscape. Outside clicks, the logo/departure links and Escape close it; closing also resets the More disclosure.
- Homepage actions now use readable full-width stacked buttons. The pause control moves into normal flow so it cannot overlap the actions. The requested muted video and pause control remain.
- The home trip anchor previously combined 110px scroll margin with 90px document scroll padding. Phone margin is now 16px, retaining header clearance without the doubled blank gap.
- Map zoom buttons were only 40px wide and map labels very small. Existing layer controls are retained in a three-column row with 48px minimum targets and larger labels. No passport or rejected replay/search filters return.
- Q&A text fields measured 14.4px and contact fields 13.6px. Mobile/tablet fields now use at least 16px and 48px height; checkboxes retain larger labels. This addresses the usual iOS focus-zoom threshold; it is not a physical Safari/keyboard test.
- The existing compact CAPTCHA was scaled to 80%. It now uses native scale and still fits the narrow embedded form. Consent and provider endpoint are unchanged. The signup privacy disclosure has a 44px target.
- Enlarged photo view uses dynamic viewport height on phones. Photo framing, gallery arrows inside the photo, native dialog/history/focus, manual advance and reduced-motion behavior remain.

## Browser evidence

- 50 rendered layout inspections: ten pages at 320×568, 375×812, 430×932, 812×375 and 1440×900. Pages: home, atlas, Thailand, Q&A, videos, stories, collaborate, Postcards archive, costs and search. No document/header horizontal overflow; no rendered mobile text field below 16px in the final pass. The first pass identified the remaining Q&A/contact overrides, which were corrected before the final pass.
- At 812×375 the expanded menu measured 270px tall, bottom 356px within the 375px viewport, with 528px scrollable content. The last Search link remained reachable and opened its page.
- At 375px the signup stayed closed with no iframe src initially. On explicit expansion, compact CAPTCHA computed transform was none, iframe/body width 270px with no internal horizontal overflow, required consent remained true and the privacy summary was 44px tall. No CAPTCHA completed or signup submitted.
- At 375px the enlarged gallery opened, manually advanced to photo 2/9, and closed back to the original chapter URL. Viewer height 796px within the 812px viewport, next button approximately 49px high.
- Composer, existing public route/asset/metadata/Hosting-boundary validator, changed JavaScript syntax and diff whitespace checks passed. No unit test suite or new performance benchmark was run for this presentation change. No physical-device, Safari or score guarantee is claimed.

Machine-readable checks are outside Hosting in sibling `review-evidence/mobile-usability/layout-checks.json`. Staging verification and screenshot locations will be recorded after deployment.

## Release state

Prepared for existing Firebase Hosting staging target only. Production stays at the owner-approved simple-atlas release until separate approval. Existing service-disabled state, consent, scheduled Postcards and question notifications are preserved.
