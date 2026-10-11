# Complete SaaS Security, Tenant Isolation, Business Logic & Infrastructure Audit & Phased Repair Plan

**Date:** 2026-10-11  
**Repository:** `/Users/nick/Documents/ChatGPT/app.fizmoh.cloud` (`https://github.com/codingexpert123/fizmoh.cloud.git`)  
**Production Environment:** `root@187.127.119.207` (`https://app.fizmoh.cloud`)  
**Runtime & Stack:** Next.js 16.2.1 (App Router, Turbopack), Bun 1.3.11, TypeScript, Prisma 6.19.2, PostgreSQL 16, Redis 7, Nginx + systemd (`fizmoh-app-3019`, `fizmoh-baileys-worker`, `fizmoh-chat-read`, `fizmoh-cron.timer`).  
**Skills Applied:** `security-auditor`, `systematic-debugging`, `architect-review`, `database-design`, `test-driven-development`, `writing-plans`, `lint-and-validate`.

---

## 1. System Discovery & Architecture Overview

### 1.1 Multi-Tenant Architecture
- **Tenant Resolution (`src/lib/tenant-context.ts` & `src/middleware.ts`):**
  - Resolves workspace context via subdomain (`{slug}.fizmoh.cloud`), custom domain (`Tenant.customDomain`), path prefix (`/t/{slug}/...`), or staff JWT cookie (`fizmoh_staff_token` / `Authorization: Bearer`).
  - Propagates `TenantContext` (`tenantId`, `slug`, `plan`, `modules`, `features`, `isPlatform`) via Node `AsyncLocalStorage` (`withTenant()`).
- **Database Scoping (`src/lib/db.ts`):**
  - Uses a Prisma `$allModels` client extension (`scopedClient`) over a singleton `rawClient` (`PrismaClient`) that automatically injects `tenantId` filters into queries/mutations for 65 tenant-scoped models when `currentTenant()` is active and `isPlatform` is `false`.
  - Queries on `raw.*` bypass automatic tenant scoping and must be explicitly scoped.
- **Module Entitlements (`src/lib/modules.ts`):**
  - Enforces vertical feature access (`ECOMMERCE`, `RESTAURANT`, `TRAVEL`, `SALON`, `REAL_ESTATE`, `WHATSAPP_INBOX`, `EMAIL_MARKETING`, `AI_STUDIO`, `WHITE_LABEL`, etc.) via `withModule(moduleId, handler)` and `requireModule(moduleId)`.

### 1.2 Server & Infrastructure Topology (`187.127.119.207`)
- **Reverse Proxy:** Nginx with Let's Encrypt TLS (`*.fizmoh.cloud`, `app.fizmoh.cloud`), routing `/` to `127.0.0.1:3019` and `/api/chat/stream` to `127.0.0.1:4100`.
- **Services:**
  - `fizmoh-app-3019.service`: Next.js production server (`/home/fizmoh-platform/current`).
  - `fizmoh-baileys-worker.service`: Multi-tenant WhatsApp Baileys session worker (`127.0.0.1:4001`).
  - `fizmoh-chat-read.service`: High-concurrency SSE & chat read microservice (`127.0.0.1:4100`).
  - `fizmoh-cron.timer` + `fizmoh-cron.service`: Runs every 60s calling `/api/cron/run`.
- **Database:** PostgreSQL 16 (`max_connections = 100`, `wptour` database, `wptour_app` role with `connection_limit=5` per process).

---

## 2. Evidence-Based Audit Findings

### 2.1 Confirmed Defects (Prioritized by Severity)

#### Finding F-01 `[CRITICAL]` — Unauthenticated Payment Settlement Bypass on Kitchen / Website-Builder Orders
- **Location:** [`src/app/api/amwalpay/return/[reference]/route.ts`](../../src/app/api/amwalpay/return/[reference]/route.ts#L104-L162)
- **Practical Impact:** Any unauthenticated user or customer who cancels payment (or visits `GET /api/amwalpay/return/KIT-<orderId>`) immediately marks the restaurant/website-builder order as `paymentStatus: "PAID"`, triggers a fake `"Paid Online!"` SSE alert to kitchen staff, and sends a WhatsApp payment receipt without paying.
- **Evidence & Reproduction:**
  ```ts
  // src/app/api/amwalpay/return/[reference]/route.ts:110-114
  const txn = await fetchTransaction(orderNumber).catch(() => null)
  const isPaidConfirmed = txn
    ? (txn.responseCode === "00" || txn.isCaptured === true)
    : true // <-- Defaults to TRUE when txn is null!
  ```
  1. `fetchTransaction(orderNumber)` is invoked *outside* `withTenant()`, so for any tenant order (`KIT-<id>`), `fetchTransaction` has no tenant context or AmwalPay credentials and returns `null`.
  2. When `txn` is `null`, the ternary `txn ? (...) : true` evaluates to `true` and unconditionally updates `kitchenOrder` to `paymentStatus: "PAID"`.
- **Root Cause:** Unsafe default (`: true`) when `txn` is `null`, combined with calling `fetchTransaction` outside `withTenant(tenant, ...)`.
- **Proposed Fix:** Resolve the tenant via `tenantOf(kitchen.tenantId)` and call `fetchTransaction(orderNumber)` inside `withTenant(tenant, ...)`. Change `isPaidConfirmed` to `Boolean(txn && (txn.responseCode === "00" || txn.isCaptured === true))` so unverified transactions remain `PENDING` and redirect with `payment=pending` or `payment=failed`.
- **Verification:** Unit/integration regression test verifying that `GET /api/amwalpay/return/KIT-<id>` with `null` or failed `fetchTransaction` never marks `paymentStatus = "PAID"`.

---

#### Finding F-02 `[CRITICAL]` — Missing Role & Module Authorization on Agency Reseller Sub-Tenant Provisioning
- **Location:** [`src/app/api/agency/reseller/route.ts`](../../src/app/api/agency/reseller/route.ts#L118-L304)
- **Practical Impact:**
  1. `PUT /api/agency/reseller` does not check `sessionFromRequest(request)`, staff role, or `WHITE_LABEL` entitlement—allowing any caller within a tenant context to overwrite agency reseller branding/config.
  2. `POST /api/agency/reseller` checks `session?.staffId`, but **never checks `WHITE_LABEL` module entitlement or admin role (`OWNER`/`SUPER_ADMIN`/`ADMIN`)**. Any low-privilege `AGENT` or `VIEWER` staff member on any starter/trial tenant can provision unlimited active `Tenant` workspaces with `Subscription(status: "ACTIVE")` and `SUPER_ADMIN` accounts.
- **Evidence:** Lines 118–166 (`PUT`) have no `sessionFromRequest` call; lines 173–304 (`POST`) only check `if (!session?.staffId)` without verifying `session.role` or `currentModules().includes("WHITE_LABEL")`.
- **Root Cause:** Missing role and module entitlement guard on `PUT` and `POST` handlers.
- **Proposed Fix:** Enforce `sessionFromRequest(request)` with role in `["OWNER", "SUPER_ADMIN", "ADMIN", "PLATFORM"]` AND `WHITE_LABEL` module entitlement on both `PUT` and `POST /api/agency/reseller`.
- **Verification:** Regression tests confirming `401` when unauthenticated, `403` when role is `AGENT`/`VIEWER`, and `403` when workspace lacks `WHITE_LABEL` module.

---

#### Finding F-03 `[CRITICAL]` — Cross-Tenant Live Chat Widget Fallback & Unscoped Message/Stream Reads
- **Location:**
  - [`src/app/api/widget/session/route.ts`](../../src/app/api/widget/session/route.ts#L42-L46)
  - [`src/app/api/widget/messages/route.ts`](../../src/app/api/widget/messages/route.ts#L38-L47)
  - [`src/app/api/widget/stream/route.ts`](../../src/app/api/widget/stream/route.ts#L22-L54)
- **Practical Impact:**
  1. When `POST /api/widget/session` is called with `widgetId: "default"` or an unrecognized `widgetId`, lines 42–46 execute `await db.tenant.findFirst({ orderBy: { createdAt: "asc" } })`, dumping anonymous visitor chats and customer records into the oldest tenant's workspace!
  2. `GET /api/widget/messages?sessionId=<conversationId>` returns all messages for *any* `conversationId` in the database without checking `conversation.channel === "LIVE_CHAT"`, allowing enumeration/reading of WhatsApp/Instagram/Facebook conversation messages if a CUID is known.
- **Root Cause:** Development fallback `db.tenant.findFirst()` left in production widget session route, and missing `channel: "LIVE_CHAT"` validation in `GET/POST /api/widget/messages` and `GET /api/widget/stream`.
- **Proposed Fix:**
  1. In `POST /api/widget/session`, require a valid `widgetId` (matching a tenant `SystemSetting` `widget_config` or tenant `id`/`slug`) and return `404` if no matching tenant is found (never fall back to `db.tenant.findFirst`).
  2. In `GET /api/widget/messages`, `POST /api/widget/messages`, and `GET /api/widget/stream`, verify `conversation.channel === "LIVE_CHAT"` (and when `visitorId` is provided or stored on the conversation, verify `conversation.externalUserId`).
- **Verification:** Regression tests verifying `POST /api/widget/session` returns `400`/`404` for unknown `widgetId` and `GET /api/widget/messages` refuses non-`LIVE_CHAT` conversations (`403`/`404`).

---

#### Finding F-04 `[HIGH]` — Website Builder Checkout Arbitrary Tenant Fallback & Fake Payment Redirect
- **Location:** [`src/app/api/website-builder/checkout/route.ts`](../../src/app/api/website-builder/checkout/route.ts#L57-L61) & lines `128-136`
- **Practical Impact:**
  1. If `POST /api/website-builder/checkout` is called with a missing or invalid `tenantSlug`, lines 57–61 fall back to `raw.tenant.findFirst()`, creating kitchen orders and customer records inside an arbitrary first tenant in PostgreSQL!
  2. If `CARD_ONLINE` payment session creation fails (e.g., tenant has not configured AmwalPay/Paymob), lines 128–136 return a fake `/api/amwalpay/hosted-checkout?status=pending...` URL instead of reporting a checkout configuration error.
- **Root Cause:** Fallback to `raw.tenant.findFirst()` and silent error swallowing during `createPaymentSession`.
- **Proposed Fix:** Remove `raw.tenant.findFirst()` fallback—return `404` (`"Store workspace not found"`) if `tenantId` cannot be resolved from `tenantSlug` or `currentTenant()`. When `paymentMethod === "CARD_ONLINE"` and `paymentUrl` cannot be created, return `400`/`502` with a clear error message instead of a fake URL.
- **Verification:** Regression test confirming `POST /api/website-builder/checkout` with invalid `tenantSlug` returns `404` and never calls `raw.tenant.findFirst()`.

---

#### Finding F-05 `[HIGH]` — Raw SQL Interpolation (`$queryRawUnsafe`) & Unscoped SQL Updates
- **Location:**
  - [`src/app/api/subscribers/route.ts`](../../src/app/api/subscribers/route.ts#L224-L231)
  - [`src/app/api/orders/[id]/route.ts`](../../src/app/api/orders/[id]/route.ts#L161-L163) & lines `222-224`
- **Practical Impact:**
  1. `src/app/api/subscribers/route.ts` constructs a raw SQL string using `${tenantId.replace(/'/g, "")}` with `db.$queryRawUnsafe(query)`, and if `tenantId` is null, queries `FROM "Customer" WHERE tags IS NOT NULL` across **all tenants**.
  2. `src/app/api/orders/[id]/route.ts` runs `db.$executeRaw\`UPDATE "Slot" ... WHERE id = ${order.slotId}\`` without `AND "tenantId" = ${order.tenantId}`.
- **Root Cause:** Manual string concatenation in SQL instead of parameterized `Prisma.sql` / `$queryRaw`, and missing `tenantId` predicate in raw `UPDATE "Slot"`.
- **Proposed Fix:** Replace `db.$queryRawUnsafe` in `src/app/api/subscribers/route.ts` with parameterized `db.$queryRaw` strictly scoped to `const tenantId = currentTenant()?.tenantId ?? PLATFORM`. Add `AND "tenantId" = ${order.tenantId}` to both `$executeRaw` `Slot` updates in `src/app/api/orders/[id]/route.ts`.
- **Verification:** Regression tests verifying `$queryRawUnsafe` is completely eliminated from `src/app/api/` and `Slot` updates include `tenantId`.

---

#### Finding F-06 `[HIGH]` — Reflected XSS in Hosted Checkout HTML & Unvalidated Analytics Script IDs
- **Location:**
  - [`src/app/api/amwalpay/hosted-checkout/route.ts`](../../src/app/api/amwalpay/hosted-checkout/route.ts#L189-L455)
  - [`src/components/analytics-scripts.tsx`](../../src/components/analytics-scripts.tsx#L41-L102)
- **Practical Impact:**
  1. `GET /api/amwalpay/hosted-checkout` interpolates URL query parameters (`ref`, `amount`, `currency`) and customer fields directly into raw HTML (`#${refParam}`, `value="${refParam}"`, `value="${orderAmount}"`) with `Content-Type: text/html` and no HTML escaping—enabling reflected XSS via crafted checkout URLs (`/api/amwalpay/hosted-checkout?ref="><script>...`).
  2. `src/components/analytics-scripts.tsx` interpolates `gtmId`, `gaId`, and `metaPixelId` into `<Script dangerouslySetInnerHTML={{ __html: ... }}>` without regex validation.
- **Root Cause:** Unescaped template literal HTML interpolation and unvalidated tracking ID strings.
- **Proposed Fix:** Add a strict `escapeHtml()` helper in `src/app/api/amwalpay/hosted-checkout/route.ts` and escape all dynamic interpolations (`refParam`, `orderAmount`, `orderCurrency`, `customerName`, `customerEmail`, `customerPhone`, `redirectUrl`). Validate `gtmId` (`/^(GTM|G)-[A-Z0-9]+$/i`), `gaId` (`/^(G|UA|AW)-[A-Z0-9-]+$/i`), and `metaPixelId` (`/^[0-9]{5,25}$/`) in `src/components/analytics-scripts.tsx`.
- **Verification:** Regression test passing `<script>alert(1)</script>` in `ref`, `amount`, and `currency` to `GET /api/amwalpay/hosted-checkout` and asserting no unescaped `<script>` tags appear in the response HTML.

---

#### Finding F-07 `[HIGH]` — Email Marketing Routes (`src/app/api/v1/email/**`) Missing `withTenant` Context & Broken Tenant SMTP Delivery
- **Location:**
  - [`src/lib/email-marketing/guard.ts`](../../src/lib/email-marketing/guard.ts#L1-L72)
  - [`src/lib/notifications.ts`](../../src/lib/notifications.ts#L71-L115)
  - [`src/app/api/v1/email/smtp/test/route.ts`](../../src/app/api/v1/email/smtp/test/route.ts#L1-L55)
  - [`src/app/api/v1/email/campaigns/[id]/send/route.ts`](../../src/app/api/v1/email/campaigns/[id]/send/route.ts#L1-L155)
  - [`src/app/api/v1/email/campaigns/[id]/test/route.ts`](../../src/app/api/v1/email/campaigns/[id]/test/route.ts#L1-L82)
  - [`src/app/api/v1/email/track/click/[token]/route.ts`](../../src/app/api/v1/email/track/click/[token]/route.ts)
  - [`src/app/api/v1/email/track/open/[token]/route.ts`](../../src/app/api/v1/email/track/open/[token]/route.ts)
  - [`src/app/api/v1/email/track/unsubscribe/[token]/route.ts`](../../src/app/api/v1/email/track/unsubscribe/[token]/route.ts)
- **Practical Impact:**
  1. `requireEmailMarketingAuth()` resolves `tenant` from the staff session or `x-tenant-id`, but **never enters `withTenant(tenant, ...)`** when executing the route handler.
  2. When `POST /api/v1/email/smtp/test`, `POST /api/v1/email/campaigns/[id]/test`, or `POST /api/v1/email/campaigns/[id]/send` calls `sendEmail()` (via `SmtpEmailProvider`), `currentTenant()` inside `sendEmail()` is `null`, causing `sendEmail()` to read `smtp_host`, `smtp_user`, `smtp_password`, and `smtp_from` from `PLATFORM` (`__platform__`) instead of the tenant's configured SMTP settings!
  3. Furthermore, `sendEmail()` in `src/lib/notifications.ts` ignores a custom `from` address passed by `SmtpEmailProvider`, and the email tracking endpoints (`click`, `open`, `unsubscribe`) update `emailCampaignRecipient`, `emailCampaign`, and `emailSubscriber` by ID without scoping to `tenantId: payload.tId`.
- **Root Cause:** `requireEmailMarketingAuth` returns a plain object instead of running inside `withTenant`, `sendEmail` lacks an optional `from` field and `tenantId` fallback, and tracking endpoints omit `tenantId: payload.tId` in `updateMany`/`findFirst`.
- **Proposed Fix:**
  1. Update `sendEmail()` in `src/lib/notifications.ts` to support an optional `from` override and optional `tenantId` parameter (falling back to `currentTenant()?.tenantId ?? PLATFORM`), and pass `from: message.from` from `SmtpEmailProvider`.
  2. Wrap `POST /api/v1/email/smtp/test`, `POST /api/v1/email/campaigns/[id]/send`, and `POST /api/v1/email/campaigns/[id]/test` execution inside `withTenant(auth.tenant, ...)`.
  3. Scope `track/click/[token]`, `track/open/[token]`, and `track/unsubscribe/[token]` queries/mutations by `tenantId: payload.tId`.
- **Verification:** Regression tests verifying tenant-scoped SMTP settings are used during Email Marketing campaign/test sends and tracking tokens cannot mutate records belonging to a different `tenantId`.

---

#### Finding F-08 `[MEDIUM]` — Operational & Backup Hardening Verification
- **Location:** `scripts/ops/` & `docs/audits/SAAS_FULL_AUDIT_AND_REPAIR_PLAN_2026-10-11.md`
- **Practical Impact:** Production deployments and database maintenance require a repeatable pre-deploy verification and backup health check script so operators can verify PostgreSQL connection budgets, backup freshness, systemd service status, and health endpoints before and after any release.
- **Proposed Fix:** Provide a non-destructive `scripts/ops/verify-production-readiness.sh` script that checks local build/test/typecheck gates and (when run on or against the server) inspects DB connection counts, systemd service states, and `/api/health`.

---

## 3. Phased Implementation Plan & Live Checklist

| Phase | Scope | Files Affected | Risk | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 0** | Initial Multi-Tenant DB Pool, `fizmoh-chat-read`, `SystemSetting` Isolation, Payment Credential Fallbacks (Commit `882cd1ae`) | `src/lib/db.ts`, `src/lib/amwalpay.ts`, `src/lib/paymob.ts`, `src/lib/ai-provider.ts`, `src/lib/bot-messages.ts`, `src/lib/notification-preferences.ts`, `src/app/api/content/route.ts`, `src/app/api/website-builder/**` | Low | ✅ Completed |
| **Phase 1** | Critical Security: Payment Settlement Bypass (`F-01`), Agency Reseller Auth (`F-02`), Live Chat Widget Isolation (`F-03`), Raw SQL Hardening (`F-05`), Hosted Checkout XSS (`F-06`) | `src/app/api/amwalpay/return/[reference]/route.ts`, `src/app/api/agency/reseller/route.ts`, `src/app/api/widget/{session,messages,stream}/route.ts`, `src/app/api/subscribers/route.ts`, `src/app/api/orders/[id]/route.ts`, `src/app/api/amwalpay/hosted-checkout/route.ts` | Low | ✅ Completed |
| **Phase 2** | Core Workflows & Business Logic: Website Builder Checkout Tenant & Payment Handling (`F-04`), Email Marketing Tenant Context, SMTP Delivery & Tracking Isolation (`F-07`) | `src/app/api/website-builder/checkout/route.ts`, `src/lib/notifications.ts`, `src/lib/email-marketing/providers.ts`, `src/app/api/v1/email/smtp/test/route.ts`, `src/app/api/v1/email/campaigns/[id]/{send,test}/route.ts`, `src/app/api/v1/email/track/{click,open,unsubscribe}/[token]/route.ts` | Low | ✅ Completed |
| **Phase 3** | Database Correctness, Query Hygiene & Raw SQL Elimination Verification (`F-05`) | `src/app/api/subscribers/route.ts`, `src/app/api/orders/[id]/route.ts`, `tests/saas-phase1-security-audit.test.ts` | Low | ✅ Completed |
| **Phase 4** | Frontend Security & Analytics Script Sanitization (`F-06`) | `src/components/analytics-scripts.tsx` | Low | ✅ Completed |
| **Phase 5** | Deployment & Operational Readiness Tooling (`F-08`) | `scripts/ops/verify-production-readiness.sh` | Low | ✅ Completed |
| **Phase 6** | Full Regression Verification (All Test Suites + TypeScript Check + Production Build) | `tests/*.test.ts` | None | ✅ Completed |

### Phase Acceptance Criteria & Rollback Strategy
- **Acceptance Criteria:**
  1. New TDD regression test suites (`tests/saas-phase1-security-audit.test.ts` and `tests/saas-phase2-workflows.test.ts`) pass 100%.
  2. Existing 56 test files (`bun test tests/*.test.ts`) pass with 0 regressions.
  3. `./node_modules/.bin/tsc --noEmit` exits `0` with 0 errors.
  4. `bun run build` completes cleanly.
- **Rollback Approach:**
  - Code level: `git revert <commit-sha>` per phase commit.
  - Production release level: Atomic symlink switch `/home/fizmoh-platform/current -> /home/fizmoh-platform/releases/<previous-release>` followed by `systemctl restart fizmoh-app-3019.service fizmoh-baileys-worker.service fizmoh-chat-read.service`.
