# Task 5-b — Dashboard View

**Agent**: full-stack-developer (Dashboard)
**Task ID**: 5-b
**Status**: ✅ Complete

## Files Created / Modified

### New files
1. **`src/components/views/dashboard-view.tsx`** (~830 lines)
   The main admin dashboard component. Default export `DashboardView`. `'use client'`.
   Imports: `recharts` (AreaChart + PieChart), `lucide-react`, `shadcn/ui` (card/badge/button/scroll-area/separator/skeleton/tooltip/progress/avatar), `@/lib/store`, `@/lib/helpers`, `@/lib/utils`, `sonner`.

### Modified files
2. **`src/app/page.tsx`** — Replaced `<InboxView />` with `<DashboardView />` so the dashboard is the first thing visible at `/`. (Inbox view remains importable from `@/components/views/inbox-view` and is still triggered via `setView('inbox')` from the dashboard quick actions + KPI cards.)

## What was built

A comprehensive, data-rich, production-ready admin dashboard — the landing view for the Oman Adventures admin panel.

### Layout (4 rows + header)

1. **Welcome header + Quick actions bar**
   - Avatar with "AH" monogram (emerald gradient)
   - "Welcome back, Ahmed 👋" with animated emoji
   - Live date + ticking clock (updates every 1s) with "Live" pulse badge
   - 4 gradient quick-action buttons:
     - New Booking → `bookings`
     - Verify Payments → `payments`
     - Send Broadcast → `campaigns`
     - Open Inbox → `inbox`

2. **Row 1 — 5 KPI cards** (responsive: 1-col mobile / 2-col tablet / 5-col desktop)
   - **Total Revenue** (emerald/teal) — `formatCurrency(totalRevenue)` + 7-day revenue sub
   - **Total Orders** (teal/cyan) — count + confirmed/completed sub
   - **Pending Verifications** (amber/orange) — pulsing red/amber dot when > 0, clickable → `payments`
   - **Open Chats** (rose/pink) — clickable → `inbox`
   - **Upcoming Tours** (emerald/green) — next-24h + active tour count
   - Each card: gradient icon chip, big number, trend pill (up/down arrow), sub-text, hover lift + ring, "View details" reveal on hover
   - Clicking any card calls `setView(...)` to navigate to the relevant view

3. **Row 2 — Revenue chart + Channel donut** (2/3 + 1/3 split)
   - **Revenue chart**: Recharts `AreaChart` of last-7-days revenue with gradient fill (`#10b981` → transparent), gradient line stroke (emerald → teal), clean minimal axes (no vertical grid, no axis lines), custom tooltip showing date + currency + order count, hover dots
   - **Channel donut**: Recharts `PieChart` (innerRadius 56, outerRadius 80) with WEB=emerald, WHATSAPP=teal, ADMIN=amber, API=rose. Center label shows total orders. Below: 2-col legend grid with color dot, channel name, count + pct.

4. **Row 3 — Top Tours + Recent Activity** (1/2 + 1/2)
   - **Top Tours**: Scrollable list (max-h-420) of top-5 tours by booking count. Each row: rank chip (1-5, gradient), tour initials avatar, name + featured star, city + rating, animated progress bar (relative to max count), booking count + total revenue. "View all" button → `tours`.
   - **Recent Activity**: Scrollable notifications feed. Each notification: colored icon chip based on type (PAYMENT_SUBMITTED=amber alert, PAYMENT_APPROVED=emerald check, NEW_BOOKING=gift, LOW_CAPACITY=amber activity, SLA_BREACH=rose clock, NEW_CONVERSATION=teal message, NEW_CUSTOMER=emerald users, NEW_REVIEW=amber star, CAMPAIGN_SENT=rose megaphone, TOUR_TOMORROW=emerald calendar-clock). Unread items get emerald left border + emerald-tinted bg + green unread dot. "Mark all read" button calls PATCH `/api/notifications` with `markAllRead: true`.

5. **Row 4 — Order Status + Payment Methods** (1/2 + 1/2)
   - **Order Status breakdown**: Horizontal progress bars per status (PENDING_PAYMENT=amber, PAYMENT_SUBMITTED=teal, CONFIRMED=emerald, COMPLETED=dark emerald, CANCELLED=rose, REFUNDED/NO_SHOW=stone). Color dot + prettified status name + count + pct, total at bottom.
   - **Payment Methods**: 2-col grid of payment method cards (AmwalPay=emerald w/ CreditCard icon, Bank Transfer=teal w/ Landmark icon). Each card shows percentage badge, count, and total amount. Below: combined stacked bar with hover tooltips per segment.

### Sub-components
| Sub-component | Purpose |
|---|---|
| `DashboardView` (main) | State + data loading + layout orchestration |
| `KpiCard` | Single KPI card with icon, value, trend, hover effects, pulse |
| `KpiCardSkeleton` | Loading placeholder for KPI cards |
| `RevenueChart` | Recharts AreaChart for 7-day revenue |
| `ChannelDonut` | Recharts PieChart (donut) for channel breakdown + legend |
| `TopToursTable` | Scrollable list of top tours with progress bars |
| `NotificationsFeed` | Scrollable notification feed with type-based icons |
| `StatusBreakdown` | Horizontal bar list of order statuses |
| `PaymentMethodSplit` | 2-col cards + combined stacked bar for payment methods |
| `EmptyChartState` | Reusable empty-state placeholder |

### Data Flow
```
useApp() store (setView)
       │
       ▼
DashboardView state: data (DashboardData|null), notifications[], loading, error, now
       │
       ├── GET /api/dashboard   → all KPIs, channel/status/payment stats, top tours, revenue by day
       └── GET /api/notifications → recent notifications feed
       │
       └── PATCH /api/notifications  (markAllRead: true) → mark all read
       │
       └── setInterval(fetchData, 30_000) → auto-refresh every 30s
       └── setInterval(setNow, 1000) → live clock
```

### Key Decisions
- **Color palette**: emerald/teal primary, amber for warnings, rose for critical, stone for neutral. NO blue/indigo anywhere (status colors that previously used blue are mapped to teal). All gradients use this palette.
- **KPI click targets**: All 5 KPI cards are clickable `<button>` elements that navigate via `setView`. Pending Verifications → `payments`, Open Chats → `inbox`, Total Revenue → `reports`, Total Orders → `bookings`, Upcoming Tours → `tours`. WCAG-compliant buttons with full-card hover state.
- **Pulse animation**: Pending Verifications card uses Tailwind `animate-ping` + `animate-pulse` rings when `pendingVerifications > 0` to draw the admin's eye.
- **Charts**: Used Recharts `AreaChart` for revenue (gradient fill + gradient stroke) and `PieChart` donut for channels. Tooltips are fully custom React components for consistent styling. Center label on donut shows total orders.
- **Real-time**: Dashboard refetches both `/api/dashboard` and `/api/notifications` every 30 seconds. Live clock ticks every 1 second.
- **Loading state**: Every section has its own skeleton loader (KPI cards, charts, tables, feeds) so the UI never jumps — sections populate independently as data arrives.
- **Error state**: A rose-colored banner at the top with a Retry button if the initial fetch fails.
- **Responsive**: 
  - Mobile (1 col): all sections stack vertically
  - Tablet (sm: 2 col): KPIs in 2 cols, rest stacked
  - Desktop (lg+): KPIs in 5 cols, revenue chart 2/3 + donut 1/3, top tours + notifications 1/2 + 1/2, status + payments 1/2 + 1/2
- **Notifications**: Mark-as-read uses optimistic UI (immediately sets `isRead: true` locally) + shows a success toast.

## Verification

- ✅ `bun run lint` — 0 errors
- ✅ Dev server log: `GET / 200`, `GET /api/dashboard 200`, `GET /api/notifications 200` — all endpoints healthy
- ✅ No runtime errors after initial Fast Refresh swap (the "Fast Refresh had to perform a full reload" message in the log was from swapping the page.tsx default export from InboxView to DashboardView during hot reload — the subsequent render is clean)
- ✅ All 5 KPI cards render with seeded data (12 orders, 5 customers, ~OMR revenue)
- ✅ Revenue chart, channel donut, top tours table, notifications feed, status breakdown, payment method split all wired and rendering

## Hand-off to Next Agent

- The dashboard is the default view at `/`. Other views (`tours`, `bookings`, `payments`, `inbox`, `campaigns`, `reports`, etc.) should render via the same `useApp` store when their `view` value matches.
- `setView()` navigation is fully wired from all KPI cards and quick-action buttons — the receiving views just need to exist.
- Notification type → icon mapping is centralized in the `NOTIF_META` constant at the top of `NotificationsFeed`; extend it as new notification types are added.
- Channel and status colors are centralized in `CHANNEL_COLORS` and `STATUS_COLORS` constants — reuse these in other views for consistency.
