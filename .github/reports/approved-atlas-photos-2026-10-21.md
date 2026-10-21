# Approved atlas photographs — 21 October 2026

## Scope and approval

The owner approved all ten photographs in the numbered local review sheet after explicitly asking to approve the selection before website changes. They were first placed on the test environment. After reviewing staging, the owner explicitly requested “zet ze live, verstuur geen mail”, authorizing this production photo release and prohibiting any accompanying email.

The selection addresses existing destinations without an atlas photograph. No destination, visit year, travel story or itinerary was invented. Germany, Sweden and Vatican City remain without an approved photograph. This was a targeted selection, not a complete review or download of the 335 GB library.

| Review number | Existing destination | Approved source filename | Website derivative |
| --- | --- | --- | --- |
| 1 | Belgium / Namur | 20230328_143744.jpg | belgium-namur.webp |
| 2 | Aruba | 20230731_102047.jpg | aruba-rocks.webp |
| 3 | Italy / Rome | 1000011090.jpg | italy-colosseum.webp |
| 4 | Scotland | 20230320_110202.jpg | scotland-hillside.webp |
| 5 | Spain / Barcelona | 20240308_114619.heic | spain-barcelona-square.webp |
| 6 | Portugal | 20230719_181408.jpg | portugal-tower-gardens.webp |
| 7 | Poland | 20231022_174320.jpg | poland-historic-square.webp |
| 8 | Denmark | 20230924_103438.jpg | denmark-courtyard.webp |
| 9 | Curaçao | 20190620_121308.jpg | curacao-beach.webp |
| 10 | Tunisia | 20240103_093313.heic | tunisia-rooftops.webp |

## Implementation

- Sources are the locally retained OneDrive preview images the owner actually reviewed. They remain outside the website source, together with the approval sheet. No private sharing URL or access credential is committed.
- The ten website assets are under `assets/optimized/atlas/`. Derivatives preserve aspect ratio, never upscale, fit within 1280 × 800, and are encoded as WebP from fresh pixel images without copying EXIF/GPS, comments or color-profile metadata. Combined size is approximately 1.23 MiB; only the selected destination image loads through the existing atlas renderer.
- `data/journey.json` is the authoring source. The standard composer regenerates `assets/travel-data.js`. Existing stories, archive entries and photo galleries remain intact.
- The new photos use `fit: "contain"` so a portrait or wide landscape stays completely visible within the existing atlas frame. The renderer resets this per selection; existing photos retain the previous styling. Authoring validation restricts the optional fit value to cover/contain.
- English alternative descriptions and captions identify the approved destination and the photograph's own visit year, preserving destinations' multiple-visit history.
- Owner publishing is explicitly declined for activation and remains on its separate branch. This release must not include its proposed server or editor changes. `journeyApi` remains false.

## Release evidence

- Pre-change backup: `website_2026-10-21_19-30-45` in the existing sibling backups folder.
- Implementation branch: `feature/approved-atlas-photos`, based on the deployed staging/main commit `5308d4f`.
- Staging deployed successfully from `387c02db48cf437dc58abaab03c166fd4cb657f4`, GitHub Actions run `39645142214`, job `119378598533`. Only the existing staging Hosting target was deployed.
- All ten staged WebP files were retrieved and their SHA-256 hashes matched the committed local files. Staged journey data and atlas renderer matched the source; `journeyApi` remained false. The known non-sensitive report URL returned HTTP 404.
- Actual staged atlas rendering was observed for Belgium and Spain, including the complete portrait framing and correct captions. Selecting the existing Bali entry restored its previous `cover` framing. No claim of a physical-phone test or PageSpeed measurement is made.
- Browser screenshot saved outside source: `photo-approval/atlas-staging-belgium.png` in the local 21 October Codex artifacts folder. The user-facing review link opens the real staging atlas with Belgium selected.
- Remote main remained at `5308d4f46392b2064472b376e19b2f6e37f7beb6`. No production, backend, database/Auth configuration, billing or mail action was performed.

## Authorized production release

- Owner approval is limited to the reviewed ten-photo atlas batch, with no release email. Existing scheduled Postcards and private question notifications remain unchanged.
- Pre-release backup: `website_2026-10-21_19-53-45` in the existing sibling backups folder.
- Public files are identical to the reviewed staging implementation. No owner-publishing feature changes are included.
- Production deployment and canonical verification: pending at release preparation.
