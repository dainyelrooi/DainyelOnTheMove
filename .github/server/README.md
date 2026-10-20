# Optional Journey service — not deployed

This is the smallest server addition needed for real contact delivery and controlled mobile publishing. Static pages, existing Firebase Authentication, Q&A and Brevo signup remain in place. The only server dependency is the locked Firebase Admin SDK; no frontend framework or new paid provider was introduced.

## Local checks

`node --test .github/tests/*.test.mjs` from the site root uses isolated in-memory adapters, never the real database or email provider.

`node .github/server/server.mjs` starts on loopback port 8787 with all services disabled. A disabled contact request returns 503 and cannot send mail. `python tools/Preview-Site.py` serves only public static paths on loopback port 8765; hidden/private/tooling paths are excluded.

`npm ci --ignore-scripts` within this directory installs the locked server SDK for runtime import checks. `npm start` does not enable it without explicit configuration.

## Configuration required before a reviewed release

No environment values or credentials belong in source, browser code, reports or public JSON.

- `JOURNEY_SERVICE_ENABLED=true` enables the server adapters.
- `GOOGLE_CLOUD_PROJECT`: existing Firebase project; database remains `dainyel-content` in europe-west4. Use a runtime service identity with only necessary database/Auth/App Check access; no downloaded key in the image.
- `JOURNEY_OWNER_UID`: existing verified owner UID. The server verifies signed Firebase ID tokens and revocation, UID equality and verified email. Browser-only owner checks are insufficient.
- `JOURNEY_RATE_SALT`: random server secret for keyed abuse identifiers, not a client identifier.
- `BREVO_API_KEY`, `CONTACT_FROM`, `CONTACT_TO`: existing transactional provider, verified sender and approved recipient. Do not use newsletter recipients. Configure the one approved private test destination separately before testing.
- `JOURNEY_ORIGINS`: exact approved origins, comma-separated. Cross-origin writes, missing Origin and non-JSON writes are rejected.
- `JOURNEY_PUBLIC_WRITES=true` and `JOURNEY_PUBLISHING=true` enable their separate write surfaces after review.
- `JOURNEY_PROXY_HOPS`: default zero. Set only after verifying the trusted ingress/proxy chain; never blindly trust arbitrary forwarded IP headers. Without that, clients behind the same ingress share conservative abuse limits.
- `data/services.json`: change `journeyApi` to true only after the API and Hosting rewrites have passed review. It currently remains false.

## Hosting and billing boundary

A Node HTTP container is ready in `Dockerfile`. Provisioning a Cloud Run runtime, service identity, secrets, billing and Hosting rewrites has **not** been authorized as a live change and has not been performed. Existing Hosting alone cannot execute server code. Runtime charges must be reviewed; free-tier eligibility is not a promise of no cost.

At the approved release, Hosting should route `/api/**`, `/note-*.html` and `/postcard-*.html`, and `/sitemap-updates.xml` to this service while retaining existing static files and redirects. Use the existing region/project, exact verified service ID and HTTPS same-origin rewrites; do not add a browser credential or open CORS. The latest composer writes `public-shell.json` for server-rendered entries from the same shared templates. Draft, rejected, missing and withdrawn detail records return an uncached, non-indexable 404.

Apply the pending status/answeredAt index in `firestore.indexes.json` with the approved database release before enabling the public projection query. No Firestore Security Rules change is required: the existing final deny rule protects the new collections from direct browser access. Admin SDK bypasses Rules, so the server's owner checks, validation and projections are the boundary.

## Collections and contracts

| Collection | Access | Purpose |
|---|---|---|
| journeyDrafts | IAM service; owner API only | Content/revisions/moderation; challenge edit hashes |
| journeyPublic | IAM service; public whitelist projection API | Published fields only, no email, edit hash or private notes |
| journeyMessages | IAM service only | Contact payload and idempotency claim, max 90 days |
| journeyMessageState | IAM service only | Mail acceptance/ambiguous-send state |
| journeyRate | IAM service only | Keyed hourly abuse counter, two-hour expiration marker |

GET public output is bounded to the latest 200 content records and 100 answered questions. Static archives retain their stable URLs. Pagination beyond these limits should be introduced before approaching them; no existing archive currently approaches them.

## Operational checks still required

1. Real owner login/App Check, other-account denial, runtime IAM and origin/proxy configuration.
2. Real draft → review → publish → direct detail link → update → withdraw across the named database and private preview.
3. One controlled contact test: inspect provider acceptance and actual inbox receipt. If ambiguous, reconcile the private reference; do not resend automatically.
4. Set retention cleanup/TTL and verify deletions. A timestamp field alone does not delete records.
5. Verify HTTPS security headers, API rate limits, private path 404s, and cold-start/error behavior in an approved protected environment.

Official references consulted: [Firebase ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions), [Cloud Run Node runtime](https://docs.cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service). Existing standard Firestore Q&A listeners are retained because the current moderation interface needs realtime updates; no frontend query stack migration was introduced.

The public archive feed uses short journal summaries and omits Postcard bodies; full detail pages read the separately approved public record. When the service flag is enabled for a reviewed release, the composer writes a sitemap index combining the static sitemap and the public server-entry sitemap.
