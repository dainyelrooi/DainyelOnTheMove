# Same-day public Postcards and follow-up audit

The owner requested checking the website and ensuring all scheduled Brevo newsletters, including facts/discoveries, appear on the website on their sending date. The owner clarified that the full email should appear as a Postcard, rather than creating separate facts automatically. This replaces the earlier one-day archive policy for new confirmed-sent broadcasts. Preserve all existing content, URLs, sender/audience/opt-outs, schedules, cancelled jobs and private drafts. No campaign mutation, test mail, subscriber request, extra bulk send, ad activation or paid service.

## Root cause and repair

- Confirmed three separate24-hour gates in the Brevo exporter, static page loader and popup reader. The hourly archive timer added further delay. Old public dates and public editions are preserved; new editions use the actual confirmed sentDate as availableAt. Queued/scheduled/draft/cancelled campaigns and a future or timezone-less sentDate remain ineligible.
- Reuse the existing independent publication clock. Its production process tick performs a small GET-only archive probe before the Firestore quota gate. Only a newly eligible public edition or a mismatched deployed archive requests the existing archive workflow. The ordinary hourly archive remains an independent retry. No extra high-frequency runner schedule, Cloudflare deployment or credential is introduced.
- The reusable archive workflow keeps its existing narrowly scoped content/check write rights, branch/activation guards, single Hosting concurrency lock and fresh-source checks. It imports confirmed-sent Postcards from the existing sender and exact audience list3or segment1; no contacts/recipients, tracking/mirror/unsubscribe tokens or raw email HTML are projected. An interrupted deployment is retried even after its data commit succeeded. Unchanged archives are not redeployed.
- A staging-only audit mode reads campaign state/audience/public-text eligibility. It prints opaque IDs and booleans only; future copy, dates, recipient data and credentials stay out of logs/repository. It does not create/delete/send/reschedule a campaign or write a public edition.
- User-facing archive copy now describes sending-day availability rather than promising a subscriber-only24-hour window. Publication follows provider confirmation and processing; free scheduled workflows can be delayed, so no minute-exact guarantee is made. [Brevo sentDate documentation](https://developers.brevo.com/reference/get-email-campaign), [GitHub scheduled-workflow limits](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Recovery and acceptance

- Branch `fix/postcards-same-day-20261122`, based on current mainb1c9e96, preserving the later compact-reading, coffee-footer and hobby-project privacy changes. Local source backup `website_2026-11-22_11-47-18` retained. No database Rules/Auth deployment or stored-content migration.
- Initial focused acceptance:10Python archive tests,5browser-reader Node tests and actionlint pass. Tests include timezone boundaries, planned/unsent rejection, GET-only/idempotent import, public-only projection, a light unchanged clock tick and retry after a committed but failed deployment. Full regression, actual provider audit, public crawl, staging browser and any live receipt follow below after execution.

## Additional confirmed findings and repair

- Real GET-only Brevo audit45046864797:15queued campaigns, all with a valid schedule, expected Postcards audience and public-text content; none overdue.15confirmed-sent campaigns, of which3were absent from the website:22,28and29.28and29had not yet passed the old24-hour delay;22was older and its image could not be safely retained. No campaign was edited or sent by this audit.
- A failed/unverifiable image no longer suppresses an eligible public letter. Keep no unverified bytes and use the existing branded local cover. This fixed the older22copy without weakening image verification. The first sync45046867111 correctly held it; subsequent sync45047217603published it with a safe fallback. No missing-image state is misreported as an original photograph.
- Browser review found a related archive defect: approved YouTube actions disappeared from public letters and opaque entry IDs became link labels. Public links now retain only canonical YouTube videos/the owner's channel and the already-approved WhyDonate destination, alongside existing safe website paths. Drop tracking parameters, credentials, arbitrary external hosts and private routes. New labels identify the action rather than exposing a database ID. Both popup and ordinary page use the same link policy.
- Export format3upgrades only link metadata of existing public editions. All12previously public letter bodies, titles, dates, photos and URLs are confirmed unchanged;3already-sent letters are added. Source catalogue remains808fields and no stored override/content migration occurs. Future campaign IDs are absent from the public index.

## Staging acceptance and wider audit

- Final functional sourcecba3621: Hosting45047812430and regression45047812438passed.304Node,230Python and25real isolated access-rule checks passed,559total. Actionlint and structure/trip checks passed; no remote Rules were deployed.
- Staging archive sync45047814866succeeded and producedb629d6f. The actual testsite shows15editions, including today's29and the21November28letter. The popup loads full sanitized text/cover, original sent date and canonical reading page. Campaign22's actual YouTube action and29's3story actions/approved coffee action work.390×844and1280×900checks have no horizontal overflow. No test email or synthetic public broadcast was created.
- Broader production crawl:61sitemap pages returned200without unexpected redirects, each with oneH1, canonical metadata and no accidental noindex. This is an HTTP/initial-HTML check, not a full manual test of every admin interaction or a new measured PageSpeed/accessibility score.
- Recovery branch `backup/postcards-same-day-pre-live-20261122` atb1c9e96and fresh source backup `website_2026-11-22_12-13-02` retained. The owner's explicit request for public full letters on their sending date authorises this same-day archive release, preserving all existing Brevo plans. No marketing send/schedule/cancel operation is part of this release.

## Production receipt

Pending normal Hosting release, live index/page verification and an independently triggered clock receipt.
