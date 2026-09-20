# B7 — Coupons, Content Management & Audit Logs

**Agent:** main (Z.ai Code)
**Task ID:** B7
**Date:** 2026-08-04

## Summary

Built 3 new admin views + 1 new API route for the Oman Adventures platform, all lint-clean (0 errors / 0 warnings) and verified against real seeded data:

1. **Coupons View** — `src/components/views/coupons-view.tsx`
2. **Content Management View** — `src/components/views/content-view.tsx`
3. **Audit Logs View** — `src/components/views/audit-logs-view.tsx`
4. **Audit Logs API** — `src/app/api/audit-logs/route.ts` (GET, with action/entity/date-range/search filters + staff relation + order/customer relations + aggregate actionCounts)

Wired all 3 into `view-router.tsx` and the sidebar nav in `src/app/page.tsx`. Added 3 new ViewKey entries (`coupons`, `content`, `audit-logs`) to `src/lib/store.ts`.

## What each view does

### 1. Coupons View (`coupons-view.tsx`, ~560 lines, 5 sub-components)

- Header: emerald→teal gradient Ticket icon, "Coupons & Promotions", last-refresh timestamp, Refresh + "Create Coupon" gradient CTA.
- 4 stat cards: Total / Active / Total Redemptions / Expired — each with gradient icon tile + tabular number + subtitle.
- Filter bar: status tabs (All/Active/Inactive/Expired with count badges) + debounced search by code + type filter (All/Percentage/Fixed).
- Grid (1/2/3 col responsive) of coupon cards, each:
  - Top color strip reflecting status (live=emerald→teal, scheduled=amber, expired=rose, paused=stone).
  - Type badge (PERCENTAGE=teal, FIXED=emerald) + LIVE / EXPIRED / SCHEDULED / PAUSED status pill.
  - Monospace code (click-to-copy via `navigator.clipboard` with toast), max 32 chars.
  - Discount value in a gradient-stone tile (15% or 5.000 OMR).
  - Usage progress bar (emerald<50%, amber<80%, rose>=80%) with `usedCount / maxUses` and "X remaining" or "Unlimited".
  - Validity date range (from → to, or "No expiry"), min order amount if set.
  - Active toggle (Switch) + dropdown menu (Copy / Activate / Pause / Delete).
  - Hover: card lifts, border turns emerald, shadow grows.
- Create dialog (max-w-md): code (auto-uppercased, no spaces), type (PERCENTAGE/FIXED), value (with % or OMR suffix badge), max uses, min order amount, valid-from/valid-to date inputs, "Activate immediately" switch.
- Empty state (different copy for "no coupons yet" vs "no matches") + error banner with retry.
- Loads the 2 seeded coupons (WELCOME15 = 15%, EARLYBIRD20 = 20%) immediately — confirmed via `curl /api/coupons`.
- Optimistic delete with Undo toast.

### 2. Content Management View (`content-view.tsx`, ~770 lines, 8 sub-components)

- Header: emerald→teal gradient FileText icon, "Content Management", subtitle referencing website + WhatsApp quick answers, "New [FAQ|Banner|Blog Post]" CTA (label adapts to active tab).
- Info banner explaining FAQs sync to WhatsApp `/faq` shortcut, banners appear on homepage hero, blog pages are SEO-indexed.
- Tabs: FAQs (HelpCircle) | Banners (ImageIcon) | Blog/SEO (Newspaper) — each with live count pill.
- Per-tab search box + Refresh button.
- **FAQs**: expandable rows (ChevronRight→ChevronDown) with category badge, question, answer (line-clamp-2 → expand full), key (mono), "WhatsApp-ready" badge, dropdown (Edit / Expand-Collapse / Delete). Category quick-pick chips in the form.
- **Banners**: 16/7 aspect cards with image preview (gradient fallback on missing/broken URL), LIVE/HIDDEN badge overlay, title, click-through link (opens in new tab), edit/delete actions.
- **Blog/SEO**: rows with Newspaper icon, title, `/slug` URL, SEO badge if seoTitle set, expandable markdown content (max-h-48 scroll), seoDescription preview (italic), edit/delete actions.
- **Form dialog** (max-w-lg, scrollable): different fields per type:
  - FAQ: question, answer (textarea), category (input + 6 quick-pick chips).
  - Banner: title, image URL (with live preview), link, active switch.
  - Blog: title, slug (auto-slug from title with manual override, prefixed `/blog/`), markdown content (textarea, monospace), SEO section (seoTitle, seoDescription, seoKeywords).
- Builds content keys automatically on create: `FAQ_<CATEGORY>_<slug>_<timestamp>`, `BANNER_<slug>_<timestamp>`, `BLOG_<slug>_<timestamp>`.
- Delete confirmation via AlertDialog (rose-themed).
- Empty states per tab + error banner with retry.
- All CRUD wired to the existing `/api/content` endpoint (GET/POST/DELETE).

### 3. Audit Logs View (`audit-logs-view.tsx`, ~620 lines, 4 sub-components)

- Header: emerald→teal gradient History icon, "Audit Logs", BRD §8 reference subtitle ("Every payment approval, booking modification, and refund — with user, timestamp & reason"), last-refresh time, Export CSV + Refresh buttons.
- 4 summary cards: Total Events / Approvals (APPROVE_PAYMENT + AMWALPAY_PAYMENT_CONFIRMED) / Rejections & Cancellations (REJECT_PAYMENT + CANCEL_ORDER) / Refunds (REFUND + AMWALPAY_REFUND) — each gradient icon tile + tabular number.
- Filter card:
  - Search input (Enter to apply, X to clear) — searches entityId, reason, action, entity.
  - Action dropdown — lists all 9 BRD-required actions (APPROVE_PAYMENT, REJECT_PAYMENT, CANCEL_ORDER, REFUND, RESCHEDULE_ORDER, COMPLETE_ORDER, MARK_NO_SHOW, AMWALPAY_PAYMENT_CONFIRMED, AMWALPAY_REFUND) + MODIFY_ORDER — each with its count from the aggregate.
  - Entity dropdown (All/ORDER/PAYMENT/TOUR/CUSTOMER/COUPON).
  - From/To date pickers + Apply button + Clear filters (only shown when filters active).
- Timeline (vertical line on left, max-h-70vh scrollable, ScrollArea):
  - Each row: tone-colored icon circle (action-specific: CheckCircle for approve, XCircle for reject, Ban for cancel, RotateCcw for refund, CalendarCheck for reschedule, UserX for no-show, CreditCard for AmwalPay confirmed, Undo2 for AmwalPay refund), action badge (tone-colored), entity badge, order # (mono, with tooltip showing customer + tour name).
  - Reason (if present) with "REASON:" prefix.
  - Actor: staff avatar (role-colored gradient) + name + role (or "System" with User icon if staffId null — e.g. webhook events).
  - Timestamp via timeAgo with full date tooltip.
  - Entity ID (mono, truncated) + customer name if linked.
  - Expandable JSON details (dark stone-900 background, emerald-300 mono text, max-h-64 scroll) — handles both raw objects and stringified JSON from seed data.
- Color tones: emerald (approve/complete/amwalpay-confirmed), rose (reject/cancel), amber (reschedule/modify), teal, purple (refund), stone (no-show). **NO blue/indigo**.
- Empty state (different copy for "no logs yet" vs "no matches") + error banner with retry.
- CSV export: builds CSV with headers [Timestamp, Action, Entity, Entity ID, Staff, Role, Order #, Customer, Reason, Details], triggers download via Blob+URL.createObjectURL.
- Verified against real seeded data: 5 logs (4 APPROVE_PAYMENT by Fatima Al-Hinai FINANCE + 1 AMWALPAY_PAYMENT_CONFIRMED webhook event).

## API route: `src/app/api/audit-logs/route.ts`

- GET with query params: `action`, `entity`, `entityId` (substring), `staffId`, `from` (ISO date), `to` (ISO date), `search` (substring across entityId/reason/action/entity), `limit` (default 100, max 500).
- Includes `staff` (id, name, email, role, avatar), `order` (with tour name), `customer` relations.
- Normalizes the `details` field — Prisma Json comes back as object, seed data as stringified JSON; both parsed to a consistent object on the response.
- Returns `{ logs, total, actionCounts }` — `actionCounts` is an aggregate `{ [action]: count }` for the active filter set, used by the action dropdown.
- Verified: `curl /api/audit-logs?limit=200` returns 5 logs with staff + order relations populated.

## Wiring

- `src/lib/store.ts`: added `"coupons" | "content" | "audit-logs"` to the `ViewKey` union.
- `src/components/view-router.tsx`: imported the 3 new views and added 3 cases to the switch.
- `src/app/page.tsx`:
  - Imported `Ticket` and `History` icons.
  - Added 2 nav items in the "Marketing" group: Coupons & Promotions (Ticket, amber accent), Content Management (FileText, teal accent).
  - Added 1 nav item in the "Insights" group: Audit Logs (History, emerald accent).

## Verification

- `bun run lint` — **0 errors, 0 warnings** (after removing unused `Progress` import and 2 unused `eslint-disable` directives).
- Dev server: all endpoints return 200:
  - `GET /api/audit-logs` 200 — 5 logs returned with staff + order + actionCounts.
  - `GET /api/coupons` 200 — 2 coupons (WELCOME15, EARLYBIRD20).
  - `GET /api/content?type=FAQ` 200 — 0 items (empty state renders).
  - `GET /api/content?type=BANNER` 200 — 0 items.
  - `GET /` 200 — home page renders with the new nav items.
- Fixed a lucide-react icon issue: `Blog` is not exported in the installed version → replaced with `Newspaper` everywhere in content-view.tsx.

## Conventions followed

- `'use client'` + default export on each view.
- `useEffect` + `fetch` for data loading, with `useCallback` to stabilize load functions.
- Loading skeletons, empty states (with context-aware copy), error banners with retry.
- sonner toasts for all user actions.
- shadcn/ui components used throughout (Card, Badge, Button, Input, Textarea, Label, Switch, Select, Skeleton, Dialog, AlertDialog, DropdownMenu, Tooltip, Avatar, ScrollArea, Tabs).
- Color palette: **emerald/teal/amber/rose/purple/stone** — **NO blue/indigo** anywhere.
- Sticky footer pattern N/A (these views don't have footers).
- Responsive: 1-col mobile → 2-col tablet → 3-col desktop grids.
- Touch-friendly 44px targets on icon buttons.
- ARIA labels via Tooltip/AlertDialog where appropriate.
- Optimistic UI for coupon delete + undo.
- Handles both raw Prisma Json and stringified JSON (seed data) for `details` field.

## Files created / modified

**Created:**
- `src/app/api/audit-logs/route.ts` (new API route, ~85 lines)
- `src/components/views/coupons-view.tsx` (~560 lines)
- `src/components/views/content-view.tsx` (~770 lines)
- `src/components/views/audit-logs-view.tsx` (~620 lines)

**Modified:**
- `src/lib/store.ts` (added 3 ViewKey entries)
- `src/components/view-router.tsx` (added 3 imports + 3 switch cases)
- `src/app/page.tsx` (added 2 icons to import + 3 nav items)

Total: ~2,035 lines of new view code + ~85 lines of new API code.

Ready for integration — all 3 views appear in the sidebar (Marketing group: Coupons, Content; Insights group: Audit Logs) and are immediately demoable with real seeded data.
