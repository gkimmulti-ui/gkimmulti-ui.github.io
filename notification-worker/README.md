# Separate release-alert Worker (draft; disabled until verified)

This Worker is independent from the private dashboard and its database. It is designed for Workers Free + dedicated D1 only. No R2, Queues, subscriptions, paid services, keys, real subscriptions or releases are committed. Config defaults to both alert acceptance and dispatch disabled. This service MUST NOT be deployed on the dashboard Worker or bound to the dashboard D1.

## Verification
Run npm install in this directory, then npm test (requires Node 24). The synthetic tests use in-memory SQLite and a mock push transport, not real subscribers. They verify explicit consent, validation, origin restrictions, idempotency, authenticated owner-only release, rejection of internal test links, separate Android/iOS events, disabled dispatch, no duplicate dispatch and per-platform unsubscribe. Actual Cloudflare D1, VAPID/web-push crypto, 10ms Free CPU/timing, browser permission and delivery are NOT yet tested. Do not enable release alerts before that.

## Safe setup
1. Confirm account remains Workers Free. Create separate named D1 database in the same free account. Initialize schema.sql on that database alone.
2. Copy wrangler.example.toml to wrangler.toml with the dedicated database ID. Keep both flags false. Use a new, independent VAPID keypair, random 32+ character owner secret and mailto operator subject; all go to Worker secrets via approved credential provisioning (never commit, print, log or reuse dashboard credential).
3. Deploy and verify /v1/config returns enabled:false, /v1/releases is empty, disallowed origins cannot subscribe, owner routes require secret. Test permission and delivery with a dedicated synthetic local browser environment and synthetic subscription/transport. Measure actual FREE CPU; if over limit, keep disabled. No real push during development.
4. Create an explicitly approved client config with the verified Worker URL and only then enable acceptance and dispatch. Verify one app opt-in, different app opt-in from same browser, scoped cancellation, and no duplicate public release alerts.
5. Publish the website only after client, actual D1, free plan, privacy and delivery gates pass. There is no cron trigger by default.

## Owner release workflow (do not automate without instruction)
Only after checking actual production publication and public listing URL, register a platform-specific app release with verified publication timestamps via the authenticated owner endpoint. A release record is immutable so repeat calls cannot send duplicate alerts. Approval, closed test and internal test are not publication. Public API exposes only released app slug, platform and public store link/date. A platform can become public while the other remains upcoming. Dispatch is manual and bounded to one subscription per invocation, at most 50 claims/day; pending work remains in D1 after quota exhaustion. The outbox claim prevents duplicate pushes even if response is uncertain. 201 success from a push service is acceptance, not evidence of device receipt.

## Data lifecycle
Minimal subscription key material, opaque hashed cancellation token, consent, language, platform and expiration. No account ID, personal profile, advertising identifier, IP log or analytics. Endpoint details never returned publicly. Cancel an app/platform only; other app preferences are unaffected. Expired or gone subscriptions require periodic authorized purge after tests, without affecting any other app data.
