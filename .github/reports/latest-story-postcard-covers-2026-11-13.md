# Latest travel story and distinctive Postcard covers — staging, 13 November 2026

## Owner request and scope

The owner explicitly requested both recommendations from the check-in review: keep the newest travel story visible on home even after a new fact, and give the Postcards distinctive covers. This candidate includes the still-pending homepage check-in pin. It is not production-release approval. Backup website_2026-11-13_18-50-57 precedes these edits; branch feature/home-latest-postcard-covers preserves the prior staging candidate and latest main archive changes.

## Causes and repairs

### Home

The old shortcut queried only the single newest CMS summary and hid itself if that item was a fact. A fact therefore displaced the story rather than complementing it. The new independent latestTravelStory model chooses the newest actually published blog, excluding facts, Field Notes, future dates and invalid entries. The label is now Latest travel story; those other content types keep their existing places.

Both initial HTML and the runtime use the complete approved public reading catalogue. The public renderer now fills and withdraws the story slot separately from the newest-fact slot. Repeat rendering is idempotent. A new publication updates these slots through the existing publication/public-copy workflow; a new visitor does not need a database SDK to find the story. Fresh initial HTML survives a transient catalogue request failure, with the same 24-hour expiry and no stale async response after pagehide. No extra Firestore query, listener, index, Rules change or paid service is needed; the broken one-row homepage listener has been removed. Already-open pages retain the existing public-copy freshness window, not an instantaneous-update guarantee.

For concrete testsite review, exactly one already-public Curaçao story (entry-949ccca4d79948739645d2539a0fd611) and its existing public photographs were copied create-only into the separate staging CMS, in one atomic transaction. No existing test draft was overwritten. No future content, schedule or mail job was copied. Production content and its original campaign relationship are untouched. The named database edition was read back as ENTERPRISE/FIRESTORE_NATIVE; no database configuration or migration was performed.

### Postcard covers

Five general covers now use distinct already-public owner photographs. Bytes match their original approved public image digests; no photo content was altered. They total approximately 0.62MB and stay on the website's own asset paths.

| Edition | Website photograph | Source context |
| --- | --- | --- |
| brevo-12 | Handelskade waterfront | Curaçao travel story, 2026 |
| brevo-16 | Grote Knip bay | Curaçao travel story, 2026 |
| brevo-17 | Adobe walls and reconstruction scene | Lima Field Note, 2026 |
| brevo-18 | Hiker overlooking Machu Picchu | Related Inca Trail Field Note, 2026 |
| brevo-19 | Machu Picchu terraces and mountains | Inca Trail Field Note, 2026 |

The explicit website-cover mapping now takes precedence over a generic image in the public email export. Card, popup, full reading page and sharing image agree. Captions identify the source context, including the related later Inca Trail photographs; they do not claim those photos were in the original message. Existing public edition JSON, words, URLs and actual send dates remain unchanged. The older owner-selected covers are preserved.

A second cause affected future uploads: the archive accepted only image files already present in its source checkout, whereas admin uploads use the owner's public Cloudflare JPEG route. Eligible sent editions can now retain that selected image as a bounded same-origin archive asset. Only the exact existing production image endpoint and 64-hex ID are accepted. Redirects, foreign hosts, queries, wrong MIME types, oversize/non-JPEG bytes and digest mismatch are rejected. The digest matches the Worker's SHA256 of base64 JPEG data. The archive takes at most140KiB, verifies before writing and reuses a valid existing copy. Failed imports leave the edition for the next normal hourly retry. Check mode never downloads or writes. Eligibility (actual sending plus24hours), audience and GET-only provider handling are unchanged; private unsent uploads are not collected. The existing archive workflow commits only the specific public upload-image filename pattern together with its public projection.

The admin upload help now explains that the selected photo is also used in the delayed website archive. Owners should select a recognisable photograph for future editions. If no photo is supplied, the intentional safe fallback still prevents a broken image; no unrelated or invented travel photo is automatically chosen.

## Verified before staging release

- PASS — 277Node checks, including independent newest-story selection with newer facts, future/private exclusion, public-copy/initial-HTML expiry, empty-copy withdrawal and page lifecycle races.
- PASS — 190Python checks, including real initial renderer refresh/withdrawal and separate fact timestamp preservation, explicit cover precedence with immutable original export, existing distinct cover assets, and safe future-upload importing. The full archive test uses mocked GET-only provider/image transports; it sends no real email.
- PASS — Existing public route/assets/metadata/Hosting exclusion validator; all five selected images exactly match existing public owner photograph bytes.
- PASS — Seven isolated local browser scenarios at390/1280px: latest story and latest fact visible together, five matching card/popup/full-page/sharing images with source captions, archive image decoding/responsive pagination and initial HTML without JavaScript. External browser requests were blocked. No form submission or provider action was used.
- Production release, physical-device testing and a real subscriber email are not claimed. Actual staging deployment/readback must be recorded below.
