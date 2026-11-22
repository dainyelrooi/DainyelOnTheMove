# Remove unmaintained Travel costs

Owner explicitly asked to remove Travel costs from the website because expenses were not tracked. Remove this public feature, preserve ordinary travel stories and real price/budget anecdotes, and use the existing Stories collection as the destination for old links. Preview staging before completing this requested website removal on production. No email, campaign/schedule, provider, Rules/Auth or paid-service change.

- Remove homepage/footer links, static search entry and the active generated route. Replace the old page with the same noindex handoff used by retired Blog URLs. Both Hosting targets redirect `/travel-costs`, `/travel-costs/` and `/travel-costs.html` directly to `/stories` with301. The sitemap excludes the retired route, including after later automatic composition.
- Remove the unused forecast from the public journey data; actual expenses were already empty. Original source remains recoverable in Git and backup `website_2026-11-22_12-24-16`. No stored expense or database record was deleted. Existing math helpers are retained without an active public interface.
- Catalogue808to806retires the two feature links and changes only their Home/footer groups. Eight bounded checks confirmed no saved draft or published override for either old group in production or staging. Other content/editing controls remain intact. No data migration.
- Focused existing reading/route tests11passed; public structure/link/asset/metadata/exclusion checks passed. The retired route contract verifies all3redirect forms in both targets, no active costs code, no search/sitemap/Home link and the no-JavaScript handoff. Staging/live receipts follow below after execution.

## Verified release

- Source `7f706a9` passed staging Hosting run `45049912814` and full regression run `45049912822`:301 Node tests,230 Python tests and25 isolated access-rule emulator tests, all passing. No live database writes were part of these tests.
- Actual staging checks confirmed all three old URL forms return301 to `/stories`; Home, Stories and the search index have no active Travel costs destination. The visible footer and a real search for “travel costs” were checked in the browser. Other travel stories can still match that search.
- Preserved production recovery at `backup/remove-costs-pre-live-20261122` (`15ef8f6`), alongside the pre-change OneDrive backup. Normal production Hosting run `45050384692` succeeded for the exact tested source `7f706a9`; all three CodeQL analyses in `45050384595` passed.
- Confirmed the three live redirects,200 responses for Home/Stories/Postcards/an existing CMS story, no costs link in their served HTML, no costs search entry, and no public forecast. The retained reading copy remains complete with30 published CMS entries and15 public Postcards. The live browser followed the old costs URL to Stories and showed the footer without Travel costs.
- Live screenshot: `C:/Users/dainy/Documents/Codex/remove-travel-costs-2026-11-22/live-footer.jpg`. No mail, campaign, schedule, provider, database, Rules/Auth or billing changes.
