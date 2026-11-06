# Postcard cover correction — 6 November 2026

The owner requested replacing the visibly soft cover of **Tomorrow, somewhere new.** immediately after the approved live Postcards release. This is a narrowly scoped cover correction within that release; no text, mail, subscriber, schedule or AdSense setting is changed.

Pre-edit backup: website_2026-11-06_13-13-38. Based on current main20c98c4, preserving the intervening automatic public-archive/latest-video refresh.

The previous frozen YouTube thumbnail was480×360. The owner's already-public **First Days in Curaçao** film supplies a different1280×720 original cover via the official i.ytimg.com source for the same videoID. It was inspected visually and its actual dimensions verified. The new64KB JPEG is stored under a new immutable1280 filename so existing browser/CDN caches cannot keep showing the smaller image. The alternative frame shows Dainyel with his keys; alt text now describes that image. The existing source-film/year caption stays accurate. No enlargement, generative edit, new service or paid processing was used.

Only the brevo-9 cover setting, its generated archive/detail/social/search projections and the new static asset change. The full-page and popup share the same approved cover source. The old asset remains available for existing links. Verification and release results follow after actual checks.

The intervening automatic archive refresh added the already-sent public editionbrevo-12, which correctly uses the generic SVG cover. Its first appearance exposed an over-specific test assertion that looked for an absolute cover URL anywhere in the detail page (previously satisfied by JPEG social metadata). The test now verifies the actual same-origin image element in both archive and reading page, including the SVG fallback. No content/export schema, image-selection behaviour or delay boundary changed.
