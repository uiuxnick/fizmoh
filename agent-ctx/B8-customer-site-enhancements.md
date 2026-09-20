# Task B8 — Customer Site Enhancements (Account, Cart, i18n, SEO)

**Agent**: full-stack-developer (Customer Site Enhancer)
**Task ID**: B8
**Status**: ✅ Complete

## File Modified

### `src/components/views/customer-site-view.tsx` (272 → 796 lines)

Enhanced the existing step-based customer booking flow with 4 BRD §6.1 features, layered on top of the working browse→detail→checkout→payment→confirmation flow. Existing steps 0-5 behavior preserved.

## What was added

### 1. Customer Account Area (step 6)
- **OTP login** (modern 6-digit): phone input → `POST /api/auth/otp` (WhatsApp) → shadcn `InputOTP` (2 groups × 3 slots) → `POST /api/auth/verify-otp` → stores `{token, customer}` in state + localStorage.
- **Account dashboard**: profile card (avatar initials, name, phone/email, loyalty-tier badge BRONZE/SILVER/GOLD/PLATINUM with EN+AR labels) + 4-stat grid (points, bookings, spent, tier).
- **Booking history** from `GET /api/customer/account?phone=X`: order # (mono), status+payment badges (color-coded), tour, date/time/pax, total. Scrollable (max-h-28rem).
- Per-booking actions: **Download Voucher** (`/api/vouchers/[id]`, new tab), **Download Invoice** (`/api/invoices/[id]`), **Rebook** (COMPLETED/CONFIRMED only → restarts flow at step 1 with same tour).
- Logout clears session + token.

### 2. Cart / Multi-Item Booking (step 7 + slide-out Sheet)
- `CartItem` = `{id, tour, slot, paxAdult, paxChild, price, childPrice}`. Persisted to localStorage.
- Header cart icon with live emerald count badge → opens **Sheet** (right in EN, left in AR).
- Sheet: editable pax (±), per-item totals, remove, empty state, footer total (incl. 5% VAT) + "View Full Cart" / "Checkout All".
- Tour detail: added **"Add to Cart"** button alongside existing "Book Now".
- Step 7 = full cart page: items list + sticky summary (subtotal/VAT/total + inline customer form + payment-method picker). "Checkout All" creates one `POST /api/orders` per item, then routes to confirmation showing all order #s as badges.

### 3. Multi-Language EN/AR
- `T` dictionary (~85 keys × 2 langs). `t(key)` with EN fallback. Lang state persisted to localStorage.
- Header toggle (Globe + "عربي"/"EN"). Root `<div dir={isRTL?"rtl":"ltr"}>` — full RTL flip. Sheet side flips per dir.
- All visible strings translated: Book Now→احجز الآن, Search→بحث, Tours→الجولات, From→من, Adults→بالغين, Children→أطفال, Total→المجموع, Pay→ادفع, My Account→حسابي, + hero/checkout/payment/confirmation/account/cart. Loyalty tiers + toasts + empty states in Arabic. Arrow icons `rtl:rotate-180`.

### 4. SEO
- `useEffect([step, selected])` sets `document.title` + meta description per step: tour detail = "{name} — {city} | Oman Adventures" + 140-char excerpt; plus checkout/payment/confirmation/account/cart-specific titles. Creates `<meta name="description">` if missing.

## Engineering notes
- Lazy `useState` initializers for lang/cart/accountCustomer/otpState (reads localStorage without React 19 `set-state-in-effect` lint error; safe because component is `ssr:false` via view-router).
- Account-load effect placed after `loadAccount` declaration (satisfies `no-use-before-define`).
- Sticky header `top-0 z-30` (within admin shell scroll container); Sheet `z-50`.
- All API calls use relative paths. Mobile-first responsive (header collapses <sm, grids stack 1-col, Sheet full-width mobile).

## APIs reused (no new backend)
`/api/auth/otp`, `/api/auth/verify-otp`, `/api/customer/account`, `/api/vouchers/[id]`, `/api/invoices/[id]`, `/api/orders`, `/api/tours`, `/api/avail-check`, `/api/bank-accounts`, `/api/payments`, `/api/amwalpay/create-session`.

## Lint
`bun run lint` → 0 errors, 0 warnings. Dev server compiled the file with no customer-site-view errors.

## Pre-existing note (out of scope)
`POST /api/payments` currently 500s due to `PaymentWhereUniqueInput` needing `id` (uses `orderId`). This is a pre-existing bug in the payment route, not introduced by B8, and does not block the customer-site enhancements (order creation + OTP + account + cart all work independently). Flagged for a future payment-route fix task.
