# Task REBUILD-WEBSITE — Customer Site Full Rebuild + WhatsApp Simulator

**Agent**: full-stack-developer (Customer Site Rebuilder)
**Task ID**: REBUILD-WEBSITE
**Status**: ✅ Complete

## File Modified

### `src/components/views/customer-site-view.tsx` (~803 → 4,044 lines)

Complete rewrite of the customer-facing tour booking website for **Oman Adventures**. Production-quality, multi-page (11-step) experience inspired by GetYourGuide / Viator, PLUS a brand-new WhatsApp demo simulator section.

## What Was Built

### 11 pages (hash-based routing: `/#/tours`, `/#/tour`, `/#/checkout`, etc.)

| Step | Route | Page | Highlights |
|------|-------|------|-----------|
| 0 | `/` | **Homepage** | Hero w/ search bar (4-col), stats bar, 6 category cards, featured tours grid, why-choose-us (4 features), how-it-works (3 steps), WhatsApp demo CTA section, testimonials (4 cards), FAQ accordion (6 Q&A), newsletter, full footer |
| 1 | `/#/tours` | **Tour Listing** | Breadcrumb, sidebar filters (category/city/price/duration/difficulty/sort), responsive 3-col grid, empty state, mobile filter drawer |
| 2 | `/#/tour` | **Tour Detail** | Breadcrumb, image gallery (16:9 + 5 thumbs), quick-info bar (duration/difficulty/group/location), description, itinerary timeline, inclusions/exclusions, what-to-bring, meeting point (SVG map), add-ons, reviews section, sticky booking widget (date popover → slot grid → pax steppers → add-ons → live price → Book Now + Add to Cart), mobile fixed book bar + dialog, cancellation policy |
| 3 | `/#/checkout` | **Checkout** | Booking summary (gradient header), travelers, contact details form (name/phone/email/pickup/requests), payment method radio (Bank Transfer / AmwalPay), sticky order summary with coupon (WELCOME15 / EARLYBIRD20), VAT breakdown, Proceed to Payment |
| 4 | `/#/payment` | **Payment** | Bank Transfer: bank account radio cards (Bank Muscat / NBO with full details), trx ref / from bank / transfer date form, screenshot dropzone with preview. AmwalPay: card number (auto-format), expiry, CVV, simulation note. Sticky summary. Submits to `/api/orders` + `/api/payments` (bank) or `/api/amwalpay/create-session` |
| 5 | `/#/confirmation` | **Confirmation** | Animated success (pulsing emerald ring + scale), order # badge, 2×2 details grid, "What happens next?" 3-step card, download voucher/invoice buttons, View Bookings + Book Another, help line |
| 6 | `/#/account` | **Account Dashboard** | OTP login (6-digit InputOTP via WhatsApp), profile header (gradient + tier badge), 4-stat grid (points/bookings/spent/tier), 4 tabs: Bookings (status-based actions: REPAY / Rebook / Download Voucher/Invoice), Profile, Rewards (redeem code + available rewards), Preferences (language/email/WhatsApp toggles + logout) |
| 7 | `/#/cart` | **Cart** | Multi-item cart (persisted to localStorage), editable pax (±), per-item totals, remove, customer info form, payment method picker, sticky summary, Checkout All creates one order per item |
| 8 | `/#/about` | **About** | Hero, story card, stats strip (4 KPIs), mission + values cards, team grid (4 members) |
| 9 | `/#/contact` | **Contact** | Hero, 5 contact info cards (find us / call / email / WhatsApp / hours), contact form, SVG map placeholder |
| 10 | `/#/whatsapp` | **WhatsApp Simulator (NEW)** | iPhone-style phone mockup with full WhatsApp chat UI + Play Demo / Reset controls + progress bar + "How it works" steps + "Why WhatsApp" card |

### WhatsApp Simulator (the new feature — Step 10)

A pixel-faithful iPhone mockup running a simulated WhatsApp conversation:

- **Phone frame**: stone-900 rounded-[2.5rem] with notch (camera + speaker), status bar (signal/wifi/battery icons), WhatsApp chat header (Najwa avatar with online dot, name + AI badge, video/phone call icons), chat area with WhatsApp's signature beige background + dot pattern, input bar (smile/attach/camera + mic), home indicator bar
- **Conversation script** (`WA_SCRIPT`, 14 messages):
  1. Customer: "Hi"
  2. AI: "Hello! 👋 I'm Najwa..." greeting
  3. Customer: "What tours do you have?"
  4. AI: 4 tour cards (image + name + price) — `type: "tours"`
  5. Customer: "Do you have desert safari tomorrow?"
  6. AI: 3 slots (time + price + seats, with 🔥 for low availability) — `type: "slots"`
  7. Customer: "Book for 2 adults at 2pm. Name is Ahmed"
  8. AI: asks for email
  9. Customer: "ahmed@email.com"
  10. AI: ✅ Booking created summary card (order # / total / payment options 1=Bank Transfer, 2=AmwalPay) — `type: "summary"`
  11. Customer: "1"
  12. AI: Bank transfer details (Bank Muscat, account #, IBAN)
  13. Customer: image attachment (`payment_screenshot.jpg`) — `type: "image"`
  14. AI: "✅ Payment received! Verifying..."
- **Play Demo button**: auto-plays the conversation step by step with:
  - AI messages: typing indicator (3 bouncing dots) for 1.1s → message appears → 1.2-1.8s pause → next
  - Customer messages: appear immediately → 0.9s pause → next
  - Pause button to halt mid-play
  - Reset button to restart
  - Progress bar (X / 14 messages)
- **Recursive playback** via `useRef` pattern (assigns function in `useEffect` to avoid "Cannot access variable before it is declared" lint error)
- **Auto-scroll** to bottom on new messages / typing indicator
- **Cleanup** of all timers on unmount
- **Empty state**: phone shows "Press Play Demo" prompt before first play
- **Right sidebar**: Demo Controls (Play/Pause/Reset + progress), How It Works (6 numbered steps with icons), Why WhatsApp card (4 benefits)

### Design & UX Polish

- **Color palette**: Emerald/teal primary, amber accents (featured badges, low-availability, warnings), rose for exclusions/cancellations, warm stone backgrounds — **NO blue/indigo anywhere**
- **Sticky header** with scroll behavior (transparent → white/95 backdrop-blur + shadow on scroll)
- **Sticky footer** (`mt-auto` on footer, `min-h-screen flex flex-col` on root) — sticks to viewport bottom when content is short, pushes down naturally when long
- **Mobile-first responsive**: 1-col mobile → 2-col tablet → 3-4-col desktop grids throughout
- **Mobile book bar** (fixed bottom) on tour detail page for <lg screens, with dialog for full booking widget
- **Skeletons**: tour grid, bank accounts, account bookings, slot list, tour detail
- **Toast notifications** via sonner: coupon applied/removed, screenshot uploaded, payment submitted, added to cart, OTP sent, etc.
- **Empty states**: no tours found, empty cart, no bookings, no reviews — each with icon + helpful copy + CTA
- **Hover effects**: card lifts (-translate-y-1 + shadow), image scale (group-hover:scale-110), button color transitions
- **Animations**: pulsing success ring on confirmation, animated typing dots in WhatsApp sim, gradient glows
- **Accessibility**: semantic `<header>`/`<main>`/`<footer>`/`<nav>`/`<section>`/`<article>`, ARIA labels on icon buttons, sr-only where needed, 44px+ touch targets, keyboard-accessible

### i18n (EN + AR with RTL)

- 130+ string keys × 2 languages in `T` dictionary
- Header language toggle (Globe + "عربي" / "EN")
- `dir={isRTL ? "rtl" : "ltr"}` on root div — full RTL flip
- Arrows rotate 180° in RTL (`rtl:rotate-180` class)
- Cart Sheet side flips per dir (left in AR, right in EN)
- All visible strings translated: hero, nav, buttons, forms, labels, status badges, loyalty tiers, toasts, empty states

### SEO

- `useEffect([step, tour, order])` sets `document.title` per step (11 distinct titles)
- Creates `<meta name="description">` if missing, updates content per step
- Tour detail: `"{name} — {city} | Oman Adventures"` + 140-char excerpt

### Hash-Based Routing

- `hashToStep()` / `stepToHash()` map between URL hash and step number
- `navigate(step)` updates both state and `window.location.hash` + smooth-scrolls to top
- `hashchange` event listener for browser back/forward support
- Lazy `useState` initializer reads initial hash on mount (no set-state-in-effect)

### Hidden Admin Access

- `AdminAccessWatcher` component listens for `popstate` + `hashchange`
- When URL contains `?admin=1`, calls `setAuthMode("admin")` + `setView("dashboard")` to switch to admin shell
- No visible UI — purely URL-driven

### Engineering Notes

- **No set-state-in-effect violations**: Used lazy `useState` initializers for `lang`, `cart`, `step` (reading localStorage / hash on mount). Used "adjust state during render" pattern for `loadingTour` reset on `selectedTourId` change (tracks `prevTourId`). Used `key={selectedTourId}` on `TourDetailPage` to force remount + reset internal state naturally.
- **No "component created during render" violations**: Moved `FilterSection` from inline arrow function to module-level declaration.
- **No "accessed before declared" violations**: Refactored WhatsApp simulator's recursive `playNext` from a `useCallback` self-reference to a `useRef` pattern — function body assigned inside `useEffect` (refs must not be mutated during render), references itself via `playNextRef.current?.(index + 1)`.
- **JSX ternary grouping**: Fixed 3 "Parsing error: '}' expected" by wrapping multi-element ternary branches in `<>...</>` fragments (Add-ons button, Cart checkout button, Contact submit button).
- **Use selectors** for `useApp` (no destructuring) per task requirement: `useApp((s) => s.setAuthMode)`, `useApp((s) => s.setView)`, `useApp((s) => s.setSelectedTour)`, `useApp((s) => s.customerUser)`, `useApp((s) => s.setCustomerAuth)`, `useApp((s) => s.logout)`.
- All API calls use relative paths. All images use `/tours/*.jpg` with graceful category-gradient fallback on error.

### APIs Integrated

- `GET /api/tours` — homepage + listing
- `GET /api/tours/[id]` — tour detail (with addOns + reviews)
- `GET /api/avail-check?tourId=X` — slot list for calendar + booking widget
- `POST /api/orders` — create order (single + cart multi)
- `POST /api/payments` — submit bank transfer proof (triggers VLM fraud analysis)
- `POST /api/amwalpay/create-session` — AmwalPay redirect
- `POST /api/coupons/validate` — coupon validation (with client-side fallback for WELCOME15 / EARLYBIRD20)
- `GET /api/bank-accounts` — bank radio cards in payment
- `POST /api/auth/otp` — send OTP via WhatsApp
- `POST /api/auth/verify-otp` — verify OTP, returns `{token, customer}`
- `GET /api/customer/account?phone=X` — customer profile + booking history
- `GET /api/reviews?tourId=X` — tour reviews
- `/api/vouchers/[id]` + `/api/invoices/[id]` — download links (new tab)

## Verification

- `bun run lint` → **0 errors, 0 warnings** ✅
- `bun run lint --fix` auto-removed 12 unused `eslint-disable` directives
- Dev server log: `GET / 200`, `GET /api/tours 200`, `GET /api/bank-accounts 200` healthy, no errors
- File: `src/components/views/customer-site-view.tsx` — 4,044 lines, 11 page components + ~15 sub-components
- Page wired: `src/app/page.tsx` renders `<CustomerSiteView />` at `/` (unchanged — view-router dynamically imports it with `ssr: false`)

## Architecture Summary

Single `'use client'` component exporting `CustomerSiteView()`. Internal state machine with `step: 0-10`. All state managed locally (no Zustand for booking state — only `useApp` selectors for auth mode + view switching). Hash-based URL navigation with `popstate`/`hashchange` support. Lazy `useState` initializers read localStorage + initial URL hash on mount. Recursive WhatsApp playback via `useRef` pattern. Mobile-first responsive throughout. Full EN/AR i18n with RTL support. SEO meta tags per step. Hidden admin access via `?admin=1`.
