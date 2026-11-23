# Travel tips — owner-requested implementation

The owner explicitly requested the proposed dedicated Travel tips collection, relevant Atlas country connections, one subtle latest-home tip, and three weekly publications through31December2026. Supplied questionnaire answers and the additional laundry-detergent-strips suggestion form the personal material. This authorises preparing and scheduling this website-only series; it does not authorise subscriber campaigns or changes to existing content/schedules.

## Implementation

- `/travel-tips` is a crawlable, independently labelled hub with metadata, canonical/social tags, sitemap/search entries, More/footer navigation and six-card pagination/country filtering. Facts and Field Notes remain separate.
- `tip` is an additive existing-CMS content kind, using the same editor, immutable schedule payloads, private draft/history, photographs, calendar, deletion, exact public verification and draft completion. No new service, timer, index, dependency, account or billing.
- The existing server publication/exporter renders the tip page and one compact homepage preview. Atlas country tips supplement existing narrative and fact links without creating destinations. General tips stay on the hub; they do not pretend to be about a specific country.
- Existing public catalogue freshness, future/private exclusion, withdrawal, same-space bounds and photograph validation stay intact. Tips add no Firestore subscription. The homepage preview reuses the same deduplicated public catalogue as facts.
- The only Rules change adds `tip` to the existing owner-controlled content-kind validator. All identity, TOTP, bounds, equality, privacy and publication protections remain in place. Actual activation/verification is reported below; local source alone is not a remote release.

## Content and scheduling

Seventeen complete English tips are prepared at three per week, Monday/Wednesday/Friday at12:00Europe/Amsterdam, ending30December. Private future text, full plan and deterministic IDs remain outside the public repository. Real questionnaire experiences are preserved; general advice is clearly practical rather than invented biography. Published owner photographs illustrate the tips with accurate captions; none pretends to depict unphotographed equipment.

Sources checked22November: [Peru transport advice](https://www.smartraveller.gov.au/destinations/americas/peru), [CDC altitude guidance](https://wwwnc.cdc.gov/travel/page/travel-to-high-altitudes/), [NCCIH evidence on coca tea](https://www.nccih.nih.gov/health/complementary-health-approaches-for-travelers), and [Google offline-map capabilities](https://support.google.com/maps/answer/6291838?hl=en). Medication doses and unverified promises about coca preventing altitude illness are not presented as tips.

## Recovery and checks

- Local pre-change source backup: `website_2026-11-22_22-57-10`; normal Git recovery retained. All806 existing authoring fields/groups remain exact. The new fixed footer hub link is deliberately outside the editable catalogue, preventing a stored-footer override from becoming orphaned.
- Existing free named database was freshly confirmed ENTERPRISE/FIRESTORE_NATIVE/freeTier. A document preflight encountered the daily read-unit limit; no repeated database reads followed. The catalogue was then preserved exactly, eliminating the need for an override migration. Active Rules match the prior committed baseline; its exact source/release recovery is retained privately.
- Local232Python tests and46focused Node tests pass, including tip publication with no provider calls, type separation and public renderer/withdrawal coverage. Actual staging, emulator, saved-plan and release receipts follow after execution. Do not confuse prepared content, queued plans, published content and delivered email.
