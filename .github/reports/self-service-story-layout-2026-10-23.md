# Owner story layout — 23 October 2026

The owner explicitly requested the existing journal reading experience in self-service entries, including banner/main-photo selection. This extends the staging-only self-service release; production and mail remain unapproved. Backup: website_2026-10-23_17-44-38.

## Implemented

- The renderer uses the actual shared story-editorial.css and journey-experience.css layers and existing masthead-grid, reading-layout, reading-rail, story-toc, article-chapter and article-prose classes. Entry-specific additions are scoped to cms-story; existing hand-authored journals are preserved.
- Independent overview cover (first photo), selected banner/main photograph, split journal or wide banner layout, and top/centre/bottom crop. Original-framed galleries remain separate. Each photo may appear after the opening, after a numbered chapter, or only as cover/banner.
- Chapter insertion at the text cursor, automatic chapter menu from ## headings, active chapter, mobile collapse, keyboard/focus/native fragments, cinematic reading mode, automatic approximate read time at 200 words/minute, and the shared header reading-progress bar for asynchronously loaded entries.
- Source-linked Did you know cards can be inserted at the cursor. No generated travel facts or invented chapters are inserted. Maximum 24 chapters and the existing 12 optimized-photo limit remain explicit.
- Full-window preview uses the same renderer/styles as the public entry, with a phone-width mode. Preview has its own scroll progress and local navigation; preview interactions do not change the admin hash. Public gallery enlargement uses native dialog, photo routes, previous/next, keyboard navigation, focus return and original framing; no timed advance.
- Source fields, chosen period/label and all image positions are saved with the private draft and copied only by explicit publication. The media documents remain immutable. Old records and v1 backups receive safe presentation defaults; v2 backups retain cover order, banner and chapter assignments with media IDs remapped on restore.

## Backend boundary

The existing named Enterprise Native database is retained. Realtime listeners remain necessary for cross-device drafts and immediate publication/withdrawal; no query/index change. Additional presentation fields are bounded and whitelist-validated on create/update. Every public presentation field must match the atomic draft. No owner authorization, TOTP, namespace, subscription, calendar, paid runtime, billing, metadata or upcoming-route contract changes. See the external Rules design notes for the static adversarial review. Production CMS namespace is still denied.

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for private owner drafts and explicit public projections with signed owner MFA, bounded schemas and atomic equality checks. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

## Checks and limitations

Syntax/composer and Rules syntax checks were used; no automated test suite or subscriber messages. A clearly marked staging verification copy used existing public story material, never an invented journey. The actual authenticated lifecycle was subsequently exercised as recorded below. Initial social-card/static SEO limitations from the original CMS remain: a browser-rendered article is not equivalent to server-rendered metadata. Large raw video uploads and automatic background-video transcoding are not included; the current film input is an explicit YouTube/Vimeo link.

## Release and visual observations

- Story-layout commit 3c42f10 deployed to staging in successful Hosting run 39984212698. Later admin confirmation/preview refinements deployed in successful run 40011113949 at 4830797. The current staging assets were read back; reader, owner-confirm, mail model/template and mail desk match source (normalizing line endings for the latter). Staging admin/entry remain noindex. The known non-sensitive report URL returns 404. Production admin has neither new editor.
- A local, clearly labelled layout example used existing public Philippines text/photos only, with the actual shared renderer/styles. Desktop masthead, chapter navigation and active chapter 2/2, manual gallery next-photo and enlarged gallery previous/next/close were observed. Screenshots live outside website source. No example was saved/published to Firestore. Phone-width CSS is included, but no actual mobile-device check is established by this observation.
- The old signed-in admin tab stopped responding; a fresh staging tab does not inherit its session. Owner sign-in has been requested privately. The new story/mail confirmations use accessible HTML dialogs, and empty forms no longer trigger an unsaved-content navigation prompt. The real authenticated draft/publish/edit/withdraw cycle remains pending; do not call the local visual example a successful CMS publication.
- New source changes are staging only. Production CMS permission/release still requires the owner's explicit approval. No subscriber or test mail was sent.

## Authenticated follow-up completed

The earlier pending-login/lifecycle status above is superseded by the normal signed-in staging check in self-service-signed-in-check-2026-10-24.md. Saved cover/banner/crop and chapter-photo positions survived reopening. The real preview displayed automatic reading time, chapter navigation, a sourced fact and manual/enlarged photo navigation; its phone view measured 390px without horizontal overflow. Publishing created the archive card; private saves left the public version unchanged; republishing updated an already-open public article; withdrawal removed the card and public article while retaining the private draft. Field Note and sourced fact classifications were also observed. No physical-device or exhaustive error/security check is claimed.

The check exposed status messages being replaced by the initial connection notice and preview scroll position being retained. These were corrected in 3487806. Text-only entries now say Words by Dainyel; entries containing photographs say Words & photographs by Dainyel (d01c64b). This last byline correction was checked in source and deployed-source readback; it was not visually rechecked after the owner closed the admin tab. Final functional staging Hosting run 40025483858 succeeded. All public verification copies are offline.
