# Task 5-g — Reports & Analytics View

**Agent:** full-stack-developer (Reports)
**File:** `/home/z/my-project/src/components/views/reports-view.tsx`
**Status:** ✅ Complete — lint-clean, type-clean, no compile errors

## What was built
A comprehensive, data-rich Reports & Analytics dashboard for the Oman Adventures admin panel.

## Structure (5 rows)
1. **Header** — gradient icon, title, live timestamp, date-range pill selector (7D/30D/6M/ALL), Refresh + Export PDF buttons
2. **KPI row (6 cards)** — Total Revenue, Total Bookings, Avg Order Value, Web vs WhatsApp split (dual bar), Completion Rate (progress), Cancellation Rate (progress)
3. **Revenue Trend (AreaChart 2/3) + Channel Performance (BarChart 1/3)** — Revenue/Orders toggle, dual-Y-axis grouped bars
4. **Top Tours table (2/3) + Order Status Donut (1/3)** — rank badges, market-share bars, center-total donut
5. **Customer Growth (LineChart 1/2) + Payment Method Analysis (1/2)** — glow-line, radial gauges with proc-time
6. **Staff Performance grid** — agent cards with response-time/resolved/verified tiles + conversion bar

## Data sources (all real, 60s auto-refresh)
- `GET /api/reports` — summary KPIs, revenueByMonth, topTours, customerGrowth
- `GET /api/dashboard` — channelStats, statusStats, paymentMethodStats
- `GET /api/staff` — agent counts (response time / conversion are deterministic derived visuals)

## Charts (recharts)
AreaChart, BarChart, LineChart (with glow filter), PieChart (donut), RadialBarChart — all with custom white-card tooltips, gradient fills, emerald/teal/amber/rose palette (NO blue/indigo).

## Quality gates
- `bun run lint` → exit 0 (0 errors, 0 warnings)
- `npx tsc --noEmit --skipLibCheck` → 0 errors in reports-view.tsx
- Dev log: clean compilation, no runtime errors

## Sub-components
`KpiCard`, `KpiCardSkeleton`, `RevenueTrendChart`, `ChannelPerformanceChart`, `TopToursTable`, `OrderStatusDonut`, `CustomerGrowthChart`, `PaymentMethodAnalysis`, `StaffPerformanceGrid`, `EmptyChartState`

## Notes for next agent
- Component is `'use client'` and default-exports `ReportsView()`.
- Wire into admin shell via `useApp` store `view === "reports"` — store already has `"reports"` in `ViewKey`.
- Uses `formatCurrency` from `@/lib/helpers` and `prettifyStatus` for unknown statuses.
- All sections have skeleton loaders + empty states + error banner with retry.
- Sticky footer pattern (`min-h-screen` wrapper, `mt-auto` footer).
