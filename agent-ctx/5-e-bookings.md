# Task 5-e — Bookings & Orders Management View

**Agent**: full-stack-developer (Bookings)
**Task ID**: 5-e
**Status**: ✅ Complete

## Files Created / Modified

### New files
1. **`src/components/views/bookings-view.tsx`** (~3,000 lines, 13 sub-components)
   The main Bookings & Orders management view for the Oman Adventures admin panel.
   Default export `BookingsView`. `'use client'`.
   Imports: `@/lib/store`, `@/lib/helpers`, `@/lib/utils`, `sonner`, `lucide-react`,
   shadcn/ui (card, badge, button, dialog, sheet, input, textarea, label, select,
   table, scroll-area, separator, tabs, calendar, popover, dropdown-menu, tooltip,
   skeleton, checkbox, avatar).

### Modified files
2. **`src/app/page.tsx`** — Replaced `<ToursView />` with `<BookingsView />` so the
   bookings view is visible at the root route `/`. (ToursView remains importable from
   `@/components/views/tours-view` and is still triggered via `setView('tours')` from
   the dashboard quick-actions + KPI cards.)

## What was built

A comprehensive, production-ready bookings management view with a rich order detail
sheet, multi-step new booking wizard, reschedule flow, and cancel-with-reason flow.

### Layout (5 sections)

1. **Header** — emerald/teal gradient ShoppingBag icon + "Bookings & Orders" title +
   subtitle + Refresh button + emerald-gradient "New Booking" button.

2. **Stats row** (5 clickable cards, responsive: 2-col mobile / 3-col tablet / 5-col desktop)
   - Total Orders (stone gradient) → clears filters
   - Confirmed (emerald) → status tab = CONFIRMED
   - Pending Payment (amber/orange) → status tab = PENDING_PAYMENT
   - Completed (emerald/teal) → status tab = COMPLETED
   - Cancelled (rose) → status tab = CANCELLED
   - Each card: gradient icon chip, big number, hover lift + ring

3. **Filter bar** (Card)
   - Status tabs: 6 tabs (All / Pending Payment / Payment Submitted / Confirmed /
     Completed / Cancelled) with per-tab active-tint background.
   - Channel Select (All / Web / WhatsApp / Admin / API) with channel-dot icons.
   - Search input (Search icon, Enter to submit; searches order #, customer name, phone).
   - Date-range Popover with Calendar (range mode) + Apply/Clear.
   - Clear-filters button (only shown when filters active).

4. **Orders list** (Card, responsive)
   - **Desktop (lg+)**: 11-column Table — Order # (with coupon sparkle tooltip),
     Customer (avatar + name + phone), Tour (name + date/time), Pax (total + A/C
     breakdown), Amount, Payment Method (icon + label), Payment Status badge,
     Order Status badge, Channel badge (with color dot), Created (timeAgo with
     full-date tooltip), Actions dropdown.
   - **Mobile (<lg)**: Compact cards with avatar, order # + channel badge, customer,
     tour info box, amount + pax, status badges row, timeAgo.
   - Row click opens the Order Detail Sheet.

5. **Order detail Sheet** (right side, max-w-3xl, scrollable)
   - Header: order # + channel badge + created/updated timestamps + status badges
     (order + payment) + coupon badge if any.
   - 7 sections (each in its own Card with colored icon chip):
     1. **Customer** — avatar, name, loyalty tier badge, phone, email, bookings/spent/points stats
     2. **Tour & Slot** — tour name + category/city/duration, date/time, meeting point,
        pickup location, slot capacity meter (booked/total/available)
     3. **Pax & Add-ons** — Adults/Children stat cards, add-ons list with per-pax/flat
        pricing, special requests in amber callout
     4. **Price Breakdown** — Subtotal, Discount (emerald), VAT 5%, Total (emerald, large)
     5. **Payment** — Method icon + label + status badge, "Payment Verified" emerald
        card (gateway ref, bank ref, bank name, verified-at, verified-by) when
        approved/paid, "Awaiting Verification" amber card with screenshot thumbnail
        (click → lightbox) when pending/submitted
     6. **Voucher** — Dashed emerald ticket card with QR icon, voucher code (mono),
        status badge (Valid/Used/Expired), issued date, check-in info, qrData preview
     7. **Communication** — "Open WhatsApp Conversation" (calls POST /api/conversations
        to find-or-create, then setView('inbox') + setSelectedConversation), Resend
        Confirmation (toast), Generate Invoice (toast)
   - **Audit Log timeline** — vertical line with emerald dots, action labels (mapped
     via AUDIT_ACTION_LABEL), staff name, timestamp, reason (rose callout if present),
     details (first 3 entries)
   - **Footer action bar** — contextual: Approve Payment (emerald), Reschedule (outline),
     Mark Complete (emerald outline), No-Show (stone outline), Cancel (rose outline,
     right-aligned). Only shows actions permitted by current order status.

### Dialogs

- **New Booking Dialog** (max-w-4xl, multi-step wizard)
  - 6-step wizard with progress stepper at top (numbered circles + check on completed)
  - Step 1: Tour selection — grid of tour cards (category, featured star, name, city,
    duration, base price + child price); click to select; emerald ring on selected
  - Step 2: Date & Slot — Calendar (single mode, disables past dates) + available
    slots list filtered by selected date (time, seats available, price per adult);
    sold-out slots disabled
  - Step 3: Pax & Add-ons — Adults stepper (min 1) + Children stepper (min 0) with
    per-pax price display, add-on checkboxes (with per-pax/flat pricing + auto-calculated
    total for current pax), live price preview (subtotal, VAT 5%, total)
  - Step 4: Customer Details — Name*, Phone*, Email, Pickup Location, Special Requests
  - Step 5: Payment & Channel — Bank Transfer / AmwalPay cards (with icons + descriptions),
    WEB/WHATSAPP/ADMIN/API channel selector, coupon code input
  - Step 6: Review — All selected details in a review table + price breakdown +
    amber warning about seat reservation
  - Navigation: Back/Cancel/Next/Create Booking. Per-step validation via `canProceed`.

- **Reschedule Dialog** (max-w-3xl) — Shows current slot prominently, Calendar +
  available slots list (excludes current slot + slots with insufficient seats),
  Confirm calls PATCH /api/orders/[id] with action=RESCHEDULE + newSlotId

- **Cancel Dialog** (max-w-md) — Rose warning banner (with refund note if payment
  was approved/paid), 8 preset radio reasons + "Other" with custom textarea,
  validates reason required, calls PATCH with action=CANCEL + reason

### Action handlers

- **Approve Payment** → finds SUBMITTED/PENDING payment in order.payments, calls
  POST /api/payments/[id]/verify with action=APPROVE + staffId + comment, then
  refreshes detail sheet via GET /api/orders/[id]
- **Cancel/Complete/No-Show/Reschedule** → PATCH /api/orders/[id] with action +
  staffId (+ reason for Cancel, + newSlotId for Reschedule)
- All actions show loading/success/error toasts via sonner
- After any successful action: refetch orders list + stats, refresh detail if open

## Sub-components

| Sub-component | Purpose |
|---|---|
| `BookingsView` (main) | State + data loading + layout orchestration |
| `StatCard` | Single stat card with icon, value, gradient, click-to-filter |
| `OrdersTable` | Desktop 11-column table |
| `OrderTableRow` | Single table row with all columns + actions dropdown |
| `OrdersCardList` | Mobile card list |
| `OrderCard` | Single mobile card |
| `OrderDetailContent` | Fetches full order, renders 7 sections + audit timeline + footer actions |
| `DetailSection` | Reusable Card with icon + title + colored accent |
| `PriceRow` | Reusable label/value row with optional tint |
| `NewBookingDialog` | 6-step wizard |
| `StepHeader` | Step title + subtitle |
| `ReviewRow` | Review-step label/value row |
| `RescheduleDialog` | Calendar + slot picker |
| `CancelDialog` | Reason radio + custom textarea |
| `BookingsSkeleton` | Loading placeholders (desktop + mobile variants) |
| `EmptyState` | No orders / no matching orders (with New Booking button) |
| `ErrorState` | Rose error banner with Retry |

## Data Flow

```
useApp() store (currentStaffId, setView, setSelectedConversation)
       │
       ▼
BookingsView state: orders[], allOrders[], loading, error,
                   statusTab, channel, search, dateFrom, dateTo,
                   detailOrder, newBookingOpen, rescheduleTarget, cancelTarget
       │
       ├── GET /api/orders?status=X&channel=Y&search=Z&limit=200  → filtered list
       ├── GET /api/orders?limit=500                               → stats (all orders)
       │
       ├── PATCH /api/orders/[id] { action: CANCEL|COMPLETE|NO_SHOW|RESCHEDULE, staffId, ... }
       │       → refetch orders + stats + refresh detail
       │
       ├── POST /api/payments/[id]/verify { action: APPROVE, staffId, comment }
       │       → refetch orders + stats + GET /api/orders/[id] for fresh detail
       │
       ├── POST /api/orders { tourId, slotId, paxAdult, paxChild, addOns, customerName,
       │       customerPhone, customerEmail, pickupLocation, specialRequests,
       │       paymentMethod, channel, couponCode, createdById }
       │       → on success: close dialog, refetch, open detail sheet
       │
       ├── POST /api/conversations { customerPhone, customerName }
       │       → find-or-create WhatsApp convo → setView('inbox') + setSelectedConversation
       │
       └── setInterval(fetchOrders + fetchAllOrders, 20_000) → auto-refresh every 20s
```

## Key Decisions

- **Color palette**: emerald/teal/amber/rose/purple/stone. Defined own
  `ORDER_STATUS_BADGE`, `PAYMENT_STATUS_BADGE`, `CHANNEL_BADGE`, `CHANNEL_DOT`
  maps in the component file (rather than using helpers' `getOrderStatusColor` /
  `getPaymentStatusColor`, which use blue for PAYMENT_SUBMITTED) to enforce the
  no-blue/indigo design constraint. PAYMENT_SUBMITTED uses teal/cyan instead.
- **Status badge colors**:
  - Order: PENDING_PAYMENT=amber, PAYMENT_SUBMITTED=teal, CONFIRMED=emerald,
    COMPLETED=dark-emerald, CANCELLED=rose, REFUNDED=purple, NO_SHOW=stone
  - Payment: PENDING=amber, SUBMITTED=teal, APPROVED=emerald, PAID=dark-emerald,
    REJECTED/FAILED=rose, REFUNDED=purple
  - Channel: WEB=emerald, WHATSAPP=teal, ADMIN=amber, API=rose (with matching dot color)
- **Server-side vs client-side filtering**: status/channel/search go to the API
  (matches API contract); date range is filtered client-side on the already-fetched
  filtered list (the API doesn't support date filtering). Stats use a separate
  unfiltered fetch (limit=500) so they always reflect the full dataset.
- **Auto-refresh**: 20s interval on both the filtered list and the stats fetch —
  short enough to feel real-time, long enough to avoid hammering the API.
- **Key-based remount pattern**: Used `key={detailOrder.id}` on OrderDetailContent
  (same pattern as tours-view's TourDetailContent) so state resets cleanly when
  switching between orders. Used `key={order.id}` + conditional render at the
  parent for RescheduleDialog and CancelDialog to avoid the React 19
  `react-hooks/set-state-in-effect` lint rule while keeping state isolated per order.
  Trade-off: close-animation on those two dialogs is skipped (the Dialog unmounts
  immediately when parent sets target to null). Open animation still plays. This is
  a minor UX trade-off for clean state isolation and lint compliance.
- **Approve Payment** is wired to the payments API (not orders PATCH) because the
  orders PATCH doesn't have an APPROVE_PAYMENT action — the order just transitions
  to CONFIRMED as a side-effect of the payment being approved. The detail sheet
  refetches `/api/orders/[id]` after a successful approve to get the fresh voucher
  + updated payment status.
- **Resend Confirmation / Generate Invoice** are toast-only — there's no specific
  API endpoint for these; they're represented as action buttons for completeness
  per the design spec. A future agent could wire them to a real notification /
  PDF-generation service.
- **Voucher QR display**: Since we don't have a QR-code library in the stack, the
  voucher is shown as a styled "ticket" card with a QrCode icon (lucide), the
  voucher code in mono font, and the qrData JSON below as a small mono preview.
  A future agent could swap in a real QR generator.
- **New Booking wizard** uses a stepper pattern (numbered circles with check on
  completed steps) — the user can click any completed step to go back to it.
  Per-step validation (`canProceed`) disables the Next button until required
  fields are filled.
- **Price calculation** in the new booking wizard uses the same logic as the API
  (`calculateOrderPrice` in helpers.ts): subtotal = (pricePerAdult × paxAdult) +
  (pricePerChild × paxChild) + addOnsTotal, then VAT 5% on the subtotal. The
  addOnsTotal correctly handles PER_PAX type by multiplying by total pax.

## Verification

- ✅ `bun run lint` — 0 errors 0 warnings
- ✅ Dev server log: `GET / 200`, `GET /api/orders?limit=200 200` (filtered list),
  `GET /api/orders?limit=500 200` (stats) — all endpoints healthy
- ✅ Prisma queries loading all relations (Tour, Slot, Customer, Payment, Voucher)
  correctly — confirmed in dev.log
- ✅ Auto-refresh interval firing every 20s (multiple `GET /api/orders?limit=200`
  + `GET /api/orders?limit=500` entries in the log)
- ✅ All 12 seeded orders render with their full lifecycle data (PENDING_PAYMENT →
  COMPLETED, all 4 channels, both payment methods, vouchers for confirmed/completed)

## Hand-off to Next Agent

- The bookings view is the default at `/` (page.tsx renders `<BookingsView />`).
- `setView()` navigation from other views (dashboard, inbox, etc.) is fully wired —
  the inbox's "Open WhatsApp Conversation" button in the order detail sheet calls
  `setView('inbox')` + `setSelectedConversation(convo.id)` so the receiving inbox
  view just needs to react to `selectedConversationId` from the store.
- The order status / payment status / channel color maps
  (`ORDER_STATUS_BADGE`, `PAYMENT_STATUS_BADGE`, `CHANNEL_BADGE`, `CHANNEL_DOT`)
  are defined at the top of `bookings-view.tsx` — if other views need consistent
  colors, consider promoting these to `@/lib/helpers` or a shared constants file.
- The `AUDIT_ACTION_LABEL` map centralizes audit-log action display names — extend
  it as new actions are added.
- `Resend Confirmation` and `Generate Invoice` are toast-only stubs — wire them to
  real notification / PDF-generation services when those exist.
