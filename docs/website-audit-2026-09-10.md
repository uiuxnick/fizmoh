# Fizmoh Cloud audit — 10 September 2026

Read-only production inspection and targeted source review. No application code, database records, tenant settings, conversations, flows, schema, or deployments were changed. Existing workspace changes were preserved. This report is the only file added.

## Coverage and confidence

- Inventoried 328 API route files and 39 page files; this is inventory, not a claim that every endpoint was tested.
- Browser-checked the signed-in dashboard, billing, automation and reports. Checked automation at desktop and 390 × 844 mobile width; reset the viewport afterward.
- Anonymous HTTP checks: pricing, signup, admin, contact, features, docs, privacy, terms and hospital booking all returned 200. These checks establish availability, not successful form submission or booking.
- Reviewed tenant resolution/database scoping, public hospital lookup, restaurant/admin SSE, billing and entitlements, deploy scripts, flow channel declarations, graph normalization entry points, reporting and customer loading.
- Local package declares Next.js ^16.1.1 and React ^19, differing from the supplied Next.js 15 overview. Local realtime uses EventEmitter, not Redis. Production source parity was not established; source-only findings must be verified against the deployed revision before remediation.
- Attempted `bun test tests/bot-automation-regressions.test.ts tests/flow-channels.test.ts tests/botflow-comprehensive.test.ts`; exited 127 because Bun is absent. Local node_modules is also absent. No regression, build or typecheck pass is claimed. No dependency installation or production test execution was performed.
- No test payments, broadcasts, patient lookups, exploit requests, flow activation or customer-record edits were performed. Flutter, real channel delivery, concurrent bookings, payment callbacks, platform administration and every role combination remain unverified.

Priority: P1 = address before the next release; P2 = planned correction. “Source” means a directly identified code path, not a reproduced production exploit.

## Findings

### 1. P1 — Public restaurant SSE fails open

**Evidence: source.** `src/proxy.ts` explicitly makes `/api/restaurant/stream` public. In `src/app/api/restaurant/stream/route.ts:12`, absent or invalid order/table tokens leave both target IDs null. The subscription filter at line 54 then forwards every restaurant order event. A valid table token also scopes only to the tenant, not the table; the selected table ID is discarded.

**Impact:** unauthenticated clients could receive order identifiers, statuses and other published order metadata across tenants; a table customer could receive other tables' events. The bus in `src/lib/realtime.ts` is shared within the server process.

**Correction:** reject unresolved tokens before subscribing; require exact tenant equality and the authorized order/table scope, including rejection of events without tenant scope. Validate with synthetic events from two tenants and two tables in an isolated test, never by listening to production traffic.

### 2. P1 — Reports can run across tenants after failed workspace resolution

**Evidence: source.** `src/lib/api-handler.ts:89` invokes the handler even when tenant resolution returns null; resolution errors are also converted to null. `src/lib/db.ts:102` deliberately allows unscoped queries. `src/app/api/reports/route.ts:16` does not require a tenant and performs aggregates and reads without explicit tenant predicates.

**Trigger:** a valid staff session with no resolved membership, or a refused workspace selection that resolves to null, reaches reports through the authenticated proxy. Its queries then lose tenant isolation. CSV uses the same report data.

**Correction:** require a valid tenant and reporting permission in this private route. Introduce explicit private-route wrappers incrementally; do not globally change public webhook/database behavior without auditing those callers. Test rejected membership, missing membership and lookup failure with two synthetic tenants.

### 3. P1 — Deploy seeds mutate customer configuration even with schema sync disabled

**Evidence: source.** `scripts/deploy.sh:113` unconditionally runs both seeds before tests/build, suppressing their failures. `prisma/seed-addons.js:40` removes RESTAURANT from every subscription snapshot and adds LIVE_CHAT. It also overwrites catalog prices and selected plan modules. `prisma/seed-hospital.js:9` overwrites a fixed tenant's hospital name and creates hospital setup records.

**Impact:** a schema-free deployment can still change entitlements and hospital configuration, including if the later build fails. Rolling back the release does not undo those database writes.

**Correction:** remove seeds from ordinary release execution; make any required data adjustment a separately scoped, explicitly authorized operation with a backup and rollback plan. Preserve existing customer snapshots.

### 4. P1 — Add-on amounts appear to be stored in the wrong currency units

**Evidence: live UI plus source.** Billing displays Smart Restaurant at **0.019 OMR/month**, Hospital at **0.049**, and Extra Staff Seat at **0.005**. Seed values are 19, 49 and 5. `src/components/views/billing-view.tsx:1008` divides minor units by 1,000; `src/lib/billing.ts:412` uses the same stored amount and divides by 1,000 for gateway checkout at lines 432/453.

**Impact:** if intended prices are 19, 49 and 5 OMR, this is a 1,000× undercharge, not merely a display issue. Intended commercial prices need confirmation; no actual charge was made to verify gateway acceptance.

**Correction:** establish an explicit minor-unit contract for catalog, UI, invoice and gateway values. Correct future catalog prices through a scoped operation; preserve historical invoice amounts. Test that 19,000 baisa displays and submits as 19.000 OMR.

### 5. P1 — Repurchasing an active add-on removes access before payment

**Evidence: source.** `src/lib/billing.ts:413` reads the previous assignment, then upserts that same assignment to PENDING_PAYMENT for paid checkout. `src/lib/entitlements.ts:41` includes only ACTIVE and PAST_DUE assignments. The checkout therefore stops contributing entitlements before payment completes, even when previously active. Early gateway-not-configured recovery exists, but does not preserve access throughout a valid pending checkout.

**Correction:** retain the current paid assignment until payment succeeds; record the requested change separately or in existing invoice data. Apply it atomically and idempotently on verified settlement. Test abandoned, failed and duplicate-callback cases.

### 6. P1 — Browser policy blocks inbox voice and location features

**Evidence: live response header plus source.** Production `/billing` returns `Permissions-Policy: camera=(), microphone=(), geolocation=()`, matching the global rule in `next.config.ts:45`. `src/components/views/composer-tools.tsx:65` calls geolocation and line 143 calls microphone `getUserMedia`.

**Impact:** the global policy denies these features regardless of normal browser permission consent. Voice notes and location sharing cannot function under this policy. No microphone or location request was initiated during the audit.

**Correction:** allow only the needed capabilities on first-party authenticated pages, while retaining restrictive policies elsewhere; verify allow/deny/error states on desktop and mobile browsers.

### 7. P1 — Public patient identification discloses identity from either identifier

**Evidence: source.** `src/app/api/hospital/patients/identify/route.ts:10` looks up by MRN alone, then mobile alone, and returns full name, patient ID, MRN and masked mobile. The proxy exposes this POST publicly. Neither the route nor its wrapper applies a rate limiter or verifies phone ownership. The separate bookings endpoint requires MRN plus mobile but still has no ownership verification in the reviewed path.

**Impact:** possession or guessing of one identifier can disclose patient identity. This was not exercised against live patient data.

**Correction:** verify possession through a short-lived patient session before releasing identity or booking details; add bounded abuse protection and non-enumerating responses. Review clinical disclosure requirements separately.

### 8. P1 — Public hospital resolver silently chooses the first hospital

**Evidence: source.** Despite the “There is no default hospital” comment, `src/lib/hospital.ts:27` falls back to `raw.hospSettings.findFirst()` if no current tenant or environment setting exists. The request parameter is unused.

**Impact:** when multiple hospitals exist, anonymous booking requests without explicit configured scope can select an arbitrary hospital. The fallback depends on deployment configuration, which was not inspected.

**Correction:** resolve public hospital identity from a validated tenant-specific public link, or require explicit configuration and fail closed. Test two hospitals with the environment variable absent.

### 9. P1 — Current deploy procedure does not provide zero downtime

**Evidence: source.** `scripts/deploy.sh:89` defaults schema sync to 0, enabling `db push` unless overridden. Line 138 restarts the sole service after swapping the symlink. Health checks happen after promotion and only reject 5xx/000; failure prints a manual rollback instruction.

**Impact:** process restart interrupts requests/SSE; an unhealthy release is already live before checks run. The script itself does not guarantee automatic recovery or schema-free deployment.

**Correction:** enforce `SKIP_SCHEMA_SYNC=1` for normal deployments; build/test before promotion, validate a candidate on another port, switch traffic only when ready, drain connections and roll back automatically on failed readiness. Preserve channel state and confirm the actual server topology before choosing the rollout mechanism.

### 10. P2 — Realtime status does not measure connection health

**Evidence: live UI plus source.** Dashboard, billing and reports showed “System Online” while the notification control said “Connecting…”. `src/components/app-shell.tsx:746` renders the online badge unconditionally. `src/components/notification-center.tsx:101` sets live only upon a business event. `src/lib/use-realtime.ts` does not expose open/error state or listen to the ready event.

**Impact:** an idle healthy connection can look disconnected, while a previously active disconnected connection can continue looking live.

**Correction:** expose EventSource connection state, update on open/error, and represent connecting, live, retrying and offline independently of message arrival.

### 11. P2 — Automation text fields and icon controls lack accessible names

**Evidence: live DOM plus source.** The first four automation textareas have no ID, associated labels, aria-label or aria-labelledby. `src/components/views/bot-messages-editor.tsx:117` renders the two language fields beneath an unassociated span. Mobile accessibility output also contains unnamed navigation and per-flow icon buttons.

**Correction:** associate labels containing field purpose and language; name icon actions with their target flow. Verify keyboard operation and screen-reader announcements at both widths.

### 12. P2 — Billing exposes internal module identifiers

**Evidence: live UI plus source.** Included features display SOCIAL_INBOX, DIGITAL_VCARD, LIVE_CHAT, SETTINGS and others. `src/components/views/billing-view.tsx:78` has an incomplete display-name map and line 468 falls back to raw identifiers.

**Correction:** share a complete user-facing module catalog across pricing, onboarding and billing. Explain included capabilities and limits without exposing implementation names.

### 13. P2 — Add-on invoices are labeled as subscription plans

**Evidence: live UI plus source.** An ADDON-prefixed invoice displays “Enterprise (Monthly)”. The fallback at `src/components/views/billing-view.tsx:635` uses the linked plan name. Add-on checkout creates the invoice without descriptive line items in the reviewed creation path.

**Correction:** record/render the actual purchased add-on and quantity, while preserving original invoice totals and historical accounting data.

### 14. P2 — Failed automation runs lack actionable diagnostics in the UI

**Evidence: live UI plus source.** Recent runs include FAILED and EXPIRED entries, but display only name, timestamp and status. `src/components/views/bot-builder-view.tsx:160` renders static rows without a drill-down action or failure reason.

**Impact:** operators cannot identify the failed node/channel or distinguish expected expiry from delivery errors. The cause of the observed failures is unknown; this report does not attribute them to the engine.

**Correction:** add a read-only run detail panel with node, channel, sanitized error, version and timestamps. Keep replay/send actions separate from inspection so investigation cannot accidentally message customers.

### 15. P2 — Customer list loads all contacts

**Evidence: source.** `src/app/api/customers/route.ts:27` fetches every matching customer with relation counts and no take/cursor. Live Enterprise billing advertises a 200,000-contact limit.

**Impact:** response size, database work and client rendering grow with the whole tenant, rather than the visible page. No load test was run against production.

**Correction:** cursor pagination, bounded search, suitable indexes after query-plan review, and virtualized rendering. Keep bulk export as a separate bounded/background operation.

### 16. P2 — Realtime and rate limiting are process-local

**Evidence: source.** `src/lib/realtime.ts` uses an in-process EventEmitter. `src/lib/rate-limit.ts` uses a Map with no expired-key sweep; expiry only takes effect when that same key is reused.

**Impact:** a second application process will not receive the first process's events; restart loses transient events. Rate limits multiply across workers and unique keys accumulate in long-lived processes. This is a scale/readiness concern, not proof that today's single-instance delivery is failing.

**Correction:** use shared bounded rate limiting and a shared event transport before adding replicas. Define reconnect catch-up using existing persisted messages/events. Avoid a blind transport replacement during active channel traffic.

### 17. P2 — TypeScript is not fully strict

**Evidence: source.** `tsconfig.json:11` enables strict but explicitly sets `noImplicitAny: false`. Tests are excluded from that compilation scope.

**Correction:** assess the current error baseline in an isolated install; tighten implicit-any handling through targeted changes and independently typecheck tests. Do not declare strict compliance from the single strict flag.

### 18. P2 — Legal-page titles duplicate the brand

**Evidence: live anonymous HTML.** `/privacy` returns “Privacy Policy | Fizmoh | Fizmoh”; `/terms` returns “Terms of Service | Fizmoh | Fizmoh”.

**Correction:** provide an unbranded page title when the root metadata template already appends the brand. Verify the rendered title and canonical together.

## SaaS and product enhancement priorities

These are recommendations for incremental improvement, not claims that every listed capability is absent throughout the product.

1. **Billing trust:** explicit amount units, accurate add-on invoices, upcoming renewal date/amount, downgrade impact preview, and preservation of paid entitlements until a replacement is settled. Acceptance: displayed price equals invoice and gateway amount for each supported currency.
2. **Operations confidence:** channel-specific connection health, webhook delivery lag, sanitized failure details and reconnect status. Acceptance: a disconnected Meta channel cannot look healthy merely because the app process is online.
3. **Flow safety:** extend existing draft/publish behavior with visible version comparison, per-channel validation and a read-only execution trace. Preserve normalizeFlowGraph as the normalization boundary. Test every required node across all three channels; TEMPLATE remains WhatsApp-only.
4. **Tenant administration:** an unmistakable workspace selector, permission-aware actions, and tenant-isolation tests on all private routes and streams. Keep support impersonation visibly identified and audited.
5. **Onboarding:** an industry-aware checklist with independently verified channel, payment, template and test-flow readiness; distinguish incomplete configuration from service outages.
6. **Inbox productivity:** add or refine assignment collision handling, SLA indicators, channel badges, search pagination and failure-aware attachment actions. Verify Flutter and web behavior against the same event/API contract.
7. **Hospital and restaurant journeys:** tenant-specific public links, patient identity verification, clear booking/hold expiry states and payment retry states that cannot duplicate bookings. Verify concurrency on synthetic inventory.
8. **UI consistency:** shared feature names, labeled bilingual controls, mobile access to diagnostics, and contextual help that can be collapsed. The mobile automation help bubble overlaps run content in the observed viewport; it is dismissible, but its default footprint could be reduced.
9. **Analytics:** channel-complete reporting and explicitly defined revenue/order denominators, with tenant-local date boundaries. The reviewed report uses UTC day boundaries and WEB/WHATSAPP counts; assess the order-channel model before adding social-channel attribution.

## Safe remediation and verification sequence

1. Match the deployed revision to a clean isolated checkout; preserve the current dirty workspace. Restore an isolated Bun/dependency environment using the lockfile and a non-production database.
2. Add targeted tests for report scoping, invalid SSE tokens, hospital identity, active add-on checkout and amount units. Fix isolation and entitlement issues before cosmetic changes.
3. Run the three required regression suites, then the full suite, strict typecheck and production build. Record actual counts and failures; the claimed 255+ tests were not verified here.
4. Exercise all mandated nodes across WhatsApp, Facebook and Instagram using mocks or authorized test accounts; verify non-empty interactive text, valid IDs and limits. Source declarations currently retain all three channels and required social node types, but that is not end-to-end proof.
5. Validate payment signature/idempotency, duplicate webhooks, booking capacity races, SSE reconnect and membership revocation with synthetic tenants. Do not reset live state.
6. Deploy only the reviewed changes with `SKIP_SCHEMA_SYNC=1`, no seed writes, readiness checks and a rollback path. Recheck affected user-visible behavior after promotion.

This is a broad initial audit with concrete findings, not an exhaustive certification of all 328 APIs, every screen, every role or every live integration.
