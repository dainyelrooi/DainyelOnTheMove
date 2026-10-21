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

Machine-readable checks are outside Hosting in sibling `review-evidence/mobile-usability/layout-checks.json`. Actual staging screenshots are in the same directory: `staging-phone-home.png` and `staging-phone-menu.png` (375×812).

## Release state

Published to the existing Firebase Hosting staging target from `706561b73c1e07b3801b22c0dbd29bc58b84fb45`. The [existing staging deployment workflow](https://github.com/dainyelrooi/DainyelOnTheMove/actions/runs/39546277190) completed successfully.

Staging home, atlas, Q&A, signup frame, stylesheet and shared UI module returned HTTP 200, matched the released Git files byte for byte and retained staging noindex headers. This non-sensitive report URL returned 404. The canonical production homepage still matched unchanged origin/main exactly; no production push or deploy occurred.

At 375px on staging, primary actions measured 320×49px with 14px text, the menu target was 44px and signup remained closed with no iframe src. Following the departure link closed both menu and More, positioned the section at approximately 102px below the viewport top with the header ending at 72px, and retained the shared six-day badge/countdown. A tap outside the open menu also closed it. Temporary viewport override was reset and the staging home retained for review.

Production stays at the owner-approved simple-atlas release until separate approval. Existing service-disabled state, consent, scheduled Postcards and question notifications are preserved. No mail or form was submitted in this batch.

## Owner-approved production release

The owner subsequently explicitly approved this reviewed mobile version for live publication and stated that no email should be sent. This supersedes the historical staging-only state above for this batch only.

Pre-release backup: sibling `backups/website_2026-10-21_06-59-12`. Reviewed UI source remains `706561b`; release including approval: `0e6f6d08a2551e160fad01713e7592097deff716`. Main was fast-forwarded from `a600303` and staging synchronised without discarding unrelated work. The [existing production Hosting workflow](https://github.com/dainyelrooi/DainyelOnTheMove/actions/runs/39547028007) completed successfully; the matching staging workflow also succeeded. No duplicate direct deploy was run.

Canonical home, atlas, Q&A, Thailand, signup frame, stylesheet, shared UI module and service flag returned HTTP 200 and matched the approved release Git blobs byte for byte. Production had no staging noindex header. The service flag remained false. This non-sensitive report URL returned 404; no private path was inspected.

Browser verification at 375×812 on the canonical live homepage confirmed the 16px expanded menu, menu bottom within the viewport, no horizontal overflow, closed signup with no iframe src and a working menu close button. Actual live screenshot: sibling `review-evidence/mobile-usability/live-phone-home.png`. The temporary viewport override was reset. No new performance score or physical-device result is claimed.

No email, signup or question submission is part of this release. No Brevo campaign/test or scheduled-mail change was made. New service enablement, Auth/Firestore configuration and billing remain outside this static Hosting release.
