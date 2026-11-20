# Five-point visitor clarity cleanup

The owner explicitly requested fixing all five reviewed presentation issues and publishing them live. Preview and verify the candidate on staging first, then use normal main Hosting. No newsletter, campaign/provider/schedule change, remote Rules/Auth deployment, ad activation, new service or billing change.

## Changes

1. Home uses the five original travel-film cards once, with the latest YouTube and Instagram entries each retained once in the existing social diary. The Films page keeps its full seven-card collection. A shared travel-card partial prevents separate maintained copies; players, consent controls and media URLs remain unchanged.
2. Stories removes the visible legacy Thailand chapter-link block. Existing fragment IDs remain as empty hidden compatibility targets, the existing Stories-to-Thailand fragment redirect remains intact, and a single no-JavaScript Thailand link stays available. The complete story still has its own chapters.
3. About combines the two personal sections under the original Beyond the highlight reel heading with five initially closed disclosures. All five subject texts and their story/kit links remain exact. Only the redundant second heading/introduction is retired; old road-section/heading anchors remain on its first disclosure.
4. Facts keeps its existing country filter, now usable from the fresh initial HTML cards before a catalogue request finishes. Show six cards, then six more per click; reset the batch on a country change, keep country links/browser-back, count the displayed results, and move keyboard focus to the first newly exposed card. All initial HTML links remain crawlable and readable without JavaScript. Authoritative empty results and the existing24-hour expiry clear the cards and pagination; a late response cannot revive a page after leaving it. No private/draft or database query was added.
5. Reading cards use Read story, Read Field Note and Read fact consistently, including generated CMS initial HTML and live/fallback cards. Static journal cards use the same Field Note wording. Article bodies, titles, media, dates, IDs and URLs are not rewritten; Postcard email buttons/campaigns are unaffected.

## Recovery and editing compatibility

- Source branch `fix/visitor-clarity-20261120`, based on main0630919. Pre-change backup `website_2026-11-20_14-09-43` retained.
- Catalogue821to808fields: retire four duplicate Home film fields, two repeated About introduction fields and seven obsolete Stories fields. The existing content-based catalogue signatures change five groups;748unrelated fields remain intact. Twenty bounded fresh reads found no draft or published record for any old group in production or staging. No stored values, drafts or photos were migrated, deleted or rewritten. Evidence outside the website: `C:/Users/dainy/Documents/Codex/visitor-clarity-2026-11-20/editor-preflight.json`.
- Preserve later main archive/video updates and the complete current production reading copy during integration. Do not dispatch a full publication/email processor as a UI-release test.

## Validation

- PASS:296website Node tests,220Python tests, public structure/link/asset/fragment/SEO/exclusion checks and public-trip validation. New behavior tests cover pagination boundaries, country reset and URL preservation, keyboard focus, typed reading labels, expiry and late-response safety. The existing isolated reader fixture now imports the actual shared label helper.
- Staging browser, isolated access-rule CI, release receipts and live preservation checks follow below after execution. No claim that automated tests cover every website interaction.

## Staging acceptance

- Functional source `5ef67986f219fb07cba3434d0901921891f69358`. Hosting44800984522 and regression44800984453 succeeded, including25real disposable access-rule emulator tests. Combined automated acceptance:541passed. No remote Rules were deployed.
- The previous staging public catalogue was unavailable after its copy expired. Existing staging-only reading-copy sync44801038839 succeeded and produced a fresh, complete9-entry copy with5facts at19:20UTC. No draft was published or rewritten and no email worker was dispatched. This is independent staging data, not a copy of production.
- Real staging Home has5main film cards,1YouTube link and1Instagram link in its film section. Opening the original Philippines film still produces decoded playback (readyState4, advancing currentTime, no media error). Films retains its full shared collection.
- About has exactly1personal heading and5disclosures. Keyboard and pointer open/close work; original575-photograph text and story links remain present. At390×844 and1280×900 document width stays inside the viewport. Mobile screenshot retained outside source at `C:/Users/dainy/Documents/Codex/visitor-clarity-2026-11-20/staging-about-mobile.jpg`; the browser's desktop screenshot is limited by its physical pane, so no full-width screenshot is claimed.
- Stories shows no legacy chapter-link block and uses the typed reading actions. A fresh visit to `/stories#thailand-study` actually redirects to `/thailand#thailand-study`. A hash-only navigation on an already-open Stories document uses its pre-existing behavior; no new general hash-routing change is claimed.
- Facts' real country filter shows4Curaçao or1Peru result, preserves its country URL and has no mobile horizontal overflow. More is correctly hidden for5total facts.13-card batching/focus/reset is covered by the new isolated tests; real13-card browser verification follows on production, without creating synthetic public content.
- Fresh pre-release backup `website_2026-11-20_14-28-51` and recovery branch `backup/visitor-clarity-pre-live-20261120` at0630919 retained. Owner's explicit live request covers this same five-point scope.

## Production receipt

- Release source `954b3847a1397829a08fcfe4324b61093940113f` includes the tested functional commit and staging receipt. Normal main Hosting44802668944 succeeded. All three CodeQL analyses in44802669549 succeeded. No full publication/email processor was manually dispatched.
- Independent HTTP acceptance: all six changed/new runtime/style files return200 and exactly match the reviewed source after newline normalisation. The four complete production reading-copy documents preserve their contents,19entries,57photo references and13facts. Trip, journey, Postcards index and latest-video data fingerprints are unchanged. Report and Rules paths remain404. Content-free result saved outside source at `C:/Users/dainy/Documents/Codex/visitor-clarity-2026-11-20/production-verification.json`.
- Real production browser verifies6initial facts,12after the first More click and13after the second, with More hidden at the end. Focus moves to the first newly exposed fact. Peru selects6of9and resets the batch; All places returns6of13. Mobile390×844has no horizontal overflow. No synthetic public test entries were created.
- Live Home contains5travel-film cards plus exactly1YouTube and1Instagram social entry. Live About has1personal heading and5closed disclosures. Stories has no legacy chapter-link block and its static/generated/live actions read Read story, Read Field Note or Read fact. All five original personal disclosure bodies were separately compared with their previous source and remain exact.
- Screenshot proof: `C:/Users/dainy/Documents/Codex/visitor-clarity-2026-11-20/live-facts-mobile.jpg`, showing the country control and6of13status. Viewport override reset; the live Facts page remains open. All five scoped improvements are complete. This does not claim that every unrelated function on the website is fully tested or bug-free.
