# Sitewide personal-photo link review — staging candidate, 15 November 2026

The owner asked to check and apply the quieter photo presentation across all pages after reviewing the live Peru reading changes. This new review/change is staged first. It has no production-release approval.

## Actual inventory

HTTP-read 50 public addresses from the current sitemap and authored page set: 45 returned200 and five retained their existing301 redirects. Admin/private routes, draft content and external accounts were excluded. All12 published CMS bodies, two legacy public Q&A entries, the configured Cloudflare public feed and published Postcard pages/edition data were checked. The Cloudflare feed was empty at review time. No submissions, emails or private data were accessed or sent.

The audit classified links by destination and reading context, not simply the words “photograph” or “lens”:

| Area | Observed state | Action |
| --- | --- | --- |
| Stories overview | One remaining prose CTA, “Peru in pictures”, navigated away to the Atlas | Replace with one closed on-page notebook after the reading cards |
| Twelve CMS entries | No remaining personal-photo URLs in narrative copy; Peru narratives already have notebooks | Preserve all body text, media, IDs, dates, source and story/fact links |
| Thailand, Bali, Philippines | Existing photographs are integrated into stories/galleries | Preserve and exercise existing gallery controls |
| Thailand solo | Photographs are embedded; other image cards lead to stories | Preserve meaningful story navigation |
| Home and Atlas | Existing folded Peru notebook with internal place tabs | Preserve legitimate within-album navigation |
| Public Postcards | Photographs are embedded; no personal-photo prose CTA required removal | Preserve actual sent words, dates and original message links |
| Public Q&A/community | No personal-photo text URLs | No content change |
| About, films, kit, privacy, contact and remaining public pages | Photo-related words belong to story/video navigation or product imagery, not loose links to personal image files | Preserve their actual functions |

No public reader link to an individual raw personal-image file was found. This was a focused photo-link audit, not a new comprehensive accessibility, form-delivery or security certification.

## Staged change

- Stories gets the same closed notebook card and33 existing Peru photographs, grouped as Lima10, Cusco8, Inca Trail7, Machu Picchu/return8. The album stays on the overview; no duplicate media collection, page route or database feed is introduced. Its Atlas request and additional image loading remain on demand.
- Extract the existing photo viewer registration into `initReadingPhotoGalleries`. The CMS chapter reader calls it with the same layout callback and cleans it up on disposal. The overview uses only that photo function, so it cannot acquire fake chapters or reading counters. Keep Escape/focus, browser history, photo fragments and the selected Travel Stories/Field Notes filter.
- Keep Atlas as the single editable source of these photographs/captions. The overview notebook is excluded from duplicate website-editor fields. There remain801 fields:777 existing identities/defaults are unchanged; the existing24-field Stories reading group gets its normal content-derived new ID because the one paragraph default deliberately loses the removed photo CTA. No field default was changed in place under its old ID. No existing editor data was rewritten or migrated; the current public website override catalogue was empty at audit time.
- Preserve every other gallery, photograph, story/fact/source link, schedule, campaign and public route. There is no CMS-body write required for this candidate.

## Recovery and verification

Backup `backups/website_2026-11-15_11-07-03` retained. The complete read-only inventory and browser receipts are retained outside the repository in the owner's Codex workspace.

- PASS:61 focused Node checks for rendering/public reserve/withdrawal behaviour and five authoring checks, including exclusion of duplicate notebook fields.
- PASS:12 local overview/static-journal scenarios at390/1280px (closed/lazy album,33 photos, filters, viewer, Escape/focus, direct photo fragment, no-JavaScript fallback and existing journals), plus nine local CMS notebook/reader scenarios after sharing the photo registration code.
- Editor comparison and source whitespace checks passed. These viewport checks do not establish physical-device or performance-score acceptance.
- Actual staging deployment/readback is still required before the final review receipt below. No production source/content, Rules/Auth configuration, subscriber, provider, campaign, schedule, paid service or newsletter action is authorised or performed by this candidate.

Review `/stories#photo-notebooks` on the staging site. The live website retains the previously approved version until the owner approves a separate release of this additional change.
