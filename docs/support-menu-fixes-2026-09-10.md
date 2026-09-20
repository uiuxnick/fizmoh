# Support origin and mega-menu repair

Scope: app.fizmoh.cloud only. Follow-up to the user's live screenshots.

## Changes

The live proxy repeats the Origin header, observed through the public widget configuration response as `https://app.fizmoh.cloud, https://app.fizmoh.cloud`. The support allowlist rejected that combined value while the direct backend accepted the original single value. Support origin handling now accepts repeated identical approved origins and emits a single CORS origin; mixed or unknown origins still fail. Public platform widget configuration also emits the normalized value. No customer widget routing or channel settings change.

Finance, real estate and education now link to their existing matching solution pages. Three dedicated industry pages cover SaaS, logistics and agencies. The menu now exposes Botflow Studio, broadcast campaigns, payments, salons, supermarkets and automotive. Dropdowns are centered in the viewport, scroll when their contents exceed the available height, expose expanded state and support Escape.

Ten resource pages cover knowledgebase, technical support, bug reports, feature requests, community feedback, tutorials, WooCommerce, priority support, website chat and Telegram enquiries. Support actions open the existing widget or WhatsApp +96898314456. The Telegram page explicitly describes its current availability rather than promising an unsupported flow-engine channel. Community and tutorials describe working feedback, simulator and demonstration options rather than claiming a forum or video library exists. Resource pages are included in the sitemap.

## Verification and rollout

Regression coverage checks repeated and mixed origins, and resolves every mega-menu destination against an existing route or its content registry. Existing visitor-token, private-note, tenant-isolation and channel tests remain in the full suite. Rollout uses SKIP_SCHEMA_SYNC=1, an isolated build with database access disabled, retained prior assets and the alternate-backend promotion helper. No schema, tenant settings or customer conversation edits.

Build verification: 272 tests passed (819 assertions), strict TypeScript and production build passed. All 38 distinct mega-menu destinations returned 200 from the built preview. Browser checks confirmed the support-page action opens the widget, Escape closes the menu, dropdown content scrolls within a 1024 x 500 viewport, and the mobile widget occupies exactly 390 x 844 without horizontal page overflow. These checks did not submit a new production ticket or send WhatsApp messages.

Candidate release: `/home/fizmoh-platform/releases/20260910T092000Z`. Previous release retained at `/home/fizmoh-platform/releases/20260910T090700Z`. Logs and vhost backup: `/root/fizmoh-deploy-backups/20260910T092000Z/`.

Live verification: release 20260910T092000Z is healthy on fizmoh-blue (port 3013), with zero restarts. A browser POST from the real app origin now reaches input validation (400 for deliberately empty fields) instead of the former origin rejection. The live response emits a single approved CORS origin; a mixed origin still returns 403. All 38 menu destinations returned 200 through HTTPS. All 28 domain HTTP/TLS checks matched the pre-deployment baseline. The isolated preview service was stopped after verification.
