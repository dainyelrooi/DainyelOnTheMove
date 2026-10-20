# Compact page rhythm and in-image photo controls - 20 October 2026

## Scope
Owner supplied a mobile Thailand screenshot and requested less blank space in banners/pages, specifically moving Previous/Next into the image frame. Staging only. The earlier collapsible Postcards correction remains included and pending production approval. Backup: sibling backups/website_2026-10-20_05-19-37. No newsletter or production deploy for this design update.

## Changes
- Thailand: previous/next are labelled 46px arrow buttons inside the existing image stage. The live counter is a small overlay pill with a complete accessible photo label. The enlargement action remains top right; arrows are separate controls so they do not open the image. Only a short caption remains beneath. The redundant visible instruction row is now assistive text.
- Image framing stays contain; portraits are not cropped to fill landscape frames. Stage height and image overlay use the same CSS variable at desktop/mobile sizes. Existing photo URLs, indices, keyboard handling, swipe, print/no-JavaScript fallback and modal behaviour remain.
- All eight public overview banners use less top/bottom padding. Empty share-status paragraphs occupy no space until populated. Their accessible live-region markup is retained.
- Home section spacing, Stories opening, article mastheads/chapters and next-story bands have tighter padding. Mobile Home and Philippines preview no longer reserve a fixed minimum banner height. The nested kit hero in public About/My Kit uses content height rather than a 420px mobile minimum. No text, images or stories removed.
- Source CSS: assets/design-system.css, public-pages.css, story-editorial.css and thailand-journal.css. Opt-in gallery enhancement in assets/photo-gallery.js. Root HTML recomposed for source fingerprints; no direct root-only edits.

## Focused authoring review
- Composer, JavaScript syntax and whitespace checks completed. No broad automated suite added.
- At 1280px, inspected About, My Kit, Collaborate, Q&A, Videos, Atlas, Journey and Field Notes. Public banners changed from 459 to 365px, or 381 to 288px for one-line titles; empty share status changed from 20px to zero. No horizontal overflow on those pages.
- At 390px, inspected those eight public pages, Home, Stories, Thailand, Bali, Thailand Solo and Philippines. No horizontal overflow. Tall article openings include actual headings/photos; their content was retained rather than arbitrarily clipped.
- Mobile public kit hero measured 276px after removing the old 420px minimum and excessive padding. The Philippines preview opening uses content height and reduced top spacing.
- Bangkok slideshow: image stage measured 292.8px and entire frame plus caption 336.4px at 390px; controls are geometrically inside the image stage. Next/Previous worked. Opening the enlarged image, moving right and closing with Escape synchronised inline slide 2/9 and returned focus to its visible enlargement button. All 26 gallery photos remain.
- No physical device, CAPTCHA/signup or new mail-provider actions. No performance scores or full accessibility claim.
- Evidence outside Hosting: sibling newsletter-drafts/thailand-compact-controls-mobile-2026-10-20.png, compact-page-banner-desktop-2026-10-20.png, and page-spacing-audit-{desktop,mobile}-2026-10-20.json.
- Firebase staging Hosting deployment completed. Production remains the previously approved version.


## Final service-wrapper correction
The final desktop Q&A screenshot exposed a 132px blank band after service initialization: its panel-body kept 60px padding on each side after the loading status became empty and the service-enable button was hidden. Added a narrowly conditional CSS rule for public pages, only when data-ui-ready is present, the direct loading status is empty, and the direct enable button is hidden. Non-empty loading/error states keep their wrapper; no-JavaScript fallback remains untouched. This removes the empty block rather than reducing meaningful form or text spacing.

Runtime follow-up: the non-empty Loading securely message remained visible while the module initialized. After it completed, the loading text was empty, the wrapper computed display:none and height 0, and the gap between overview banner and Q&A hero measured 0px. Updated the desktop banner screenshot to this final state.
