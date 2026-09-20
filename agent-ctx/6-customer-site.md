# Task 6 — Customer Booking Website View

**Agent**: full-stack-developer (Customer Site)
**Task ID**: 6
**Status**: ✅ Complete

## Files Created / Modified

### New files
1. **`src/components/views/customer-site-view.tsx`** (~4,015 lines, 14 sub-components)
   The complete public-facing customer booking website that customers use to browse and book tours.
   Default export `CustomerSiteView`. `'use client'`.
   Imports: `@/lib/utils`, `@/lib/helpers` (`formatCurrency`, `formatDate`), `sonner`, `lucide-react`,
   shadcn/ui (card, badge, button, dialog, input, textarea, label, select, popover, tooltip,
   separator, skeleton, scroll-area, checkbox, progress, radio-group, calendar).

### Modified files
2. **`src/app/page.tsx`** — Replaced `<AIAssistantView />` with `<CustomerSiteView />` so the
   customer booking site is visible at the root route `/`. (AIAssistantView remains importable
   from `@/components/views/ai-assistant-view`.)

## What was built

A stunning, production-quality customer booking website for **Oman Adventures** — a premium
travel-booking experience inspired by GetYourGuide / Viator / Booking.com tours, with the full
end-to-end flow: browse → tour detail → availability → checkout → payment → confirmation.

### Tech & APIs integrated (all real, no mocks)
- `GET /api/tours` — list active tours (customer mode)
- `GET /api/tours/[id]` — tour detail with addOns + reviews
- `GET /api/avail-check?tourId=X` — get available slots for next 30 days (for calendar highlighting)
- `POST /api/orders` — create order (PENDING_PAYMENT status)
- `POST /api/payments` — submit bank transfer payment proof (triggers VLM fraud analysis)
- `GET /api/bank-accounts` — bank accounts to display for transfer
- `GET /api/orders?search=phone` — phone-based booking lookup for "My Bookings"

### Customer Journey (6 steps, single-view state machine)

**Step 0 — Home / Browse**
- Sticky header with brand logo (emerald→teal Compass icon), nav links, "My Bookings" + "Book Now" CTAs
- Hero section: "Discover Oman. Book in Seconds." headline with amber gradient accent text, decorative dot pattern, desert background image at 25% opacity over emerald→teal→emerald-900 gradient; trust badge ("#1 Rated Tour Operator · 4.8★ from 2,400+ travelers")
- Search bar: 4-column grid (Destination select / Date input / Guests stepper / Search button) in white card with shadow-2xl
- Stats strip: 50+ Tours, 2.4K+ Travelers, 4.8★ Rating
- Sticky category pills bar (top-[60px]) with horizontal scroll: All, Adventure, Desert, Water Sports, Mountain, City Tour, Family — emerald-gradient pill when active, hover lift; plus search input + city filter
- Featured tours row: 3 larger `FeaturedTourCard`s with 16:10 image, gradient overlay, badges, inline rating stars, "View Tour" CTA
- All tours grid: responsive 1/2/3/4 columns of `TourCard`s with 4:3 image (category gradient fallback), category chip, featured ribbon, duration/city/difficulty overlay, name + Arabic name, 2-line description, rating stars + review count, "From price" + "Book Now" CTA, hover lift + image scale
- Why Choose Us section: 4 feature cards (Instant Confirmation, WhatsApp Support, Best Price Guarantee, Local Experts) each with gradient icon chip, hover lift
- Reviews banner: 4.8/5 summary card with 5-star breakdown bars + 4 sample review cards with avatar initials, stars, and quotes
- Footer (mt-auto sticky bottom): brand + social icons, popular tours links, company links, contact info (address/phone/email/hours), copyright + legal links — dark stone-900 background

**Step 1 — Tour Detail**
- Breadcrumb bar below header (Home → Tour Name → Availability → Your Details → Payment)
- Hero gallery: dark stone-900 background; 16:9 main image with category gradient fallback, dark gradient overlay, top-left category + featured badges, bottom-overlay title + Arabic name + rating/city/duration; right-side thumbnail column (5 thumbs, click to swap, emerald ring on active)
- Quick info bar: 4-column grid (Duration / Difficulty / Group Size / Location) each with emerald-50 icon chip
- Two-column layout (content + sticky 400px booking widget on desktop):
  - Description text
  - Itinerary timeline: vertical emerald gradient line with 10×10 time-pilled nodes, title, description per stop
  - Inclusions (emerald-50 card, green checks) vs Exclusions (rose-50 card, red X) side-by-side
  - What to Bring: amber pill chips with camera icon
  - Meeting Point: map placeholder with grid pattern + decorative SVG roads + center MapPin marker + meeting point text
  - Cancellation Policy: amber-tinted card with Shield icon
  - Available Add-ons list (informational)
  - Reviews section: rating summary header + individual review cards with avatar initials, stars, date, comment
- Sticky `BookingWidget` (desktop, lg+): "From price" + rating badge, date popover (calendar with green dot modifiers for available dates), slot grid (2-col time buttons with "🔥 3 left" for low availability), pax steppers (adults/children), add-on checkboxes, live total with subtotal/VAT breakdown, "Book Now" CTA with total amount, trust badges
- Fixed `MobileBookBar` (mobile, <lg): total price + "Book Now" button at bottom of viewport with spacer

**Step 2 — Availability & Slot Selection**
- Tour summary card: thumbnail + name + city/duration/rating inline + back button
- "Select date & time" header with helper text
- Two-column layout: calendar (left) + slot list (right)
- Calendar: react-day-picker with `disabled` for past/future dates, green dot `hasAvail` modifier for dates with availability, stone text for `noSlots` dates; legend (Available / No tours / Next 30 days)
- Slot list: only shown when date selected; shows "X open" badge; each slot is a card with time pill (emerald gradient), price/adult, seat availability ("🔥 Only 3 seats left!" / "X seats available" / "Fully booked"), capacity progress, Select button (becomes "Selected ✓" when chosen)
- Bottom action bar: Back to tour (left) + Continue (right, disabled until slot selected) with selected date/time preview

**Step 3 — Checkout / Customer Details**
- "Your details" header
- Two-column layout: form (left) + sticky price breakdown (right)
- Booking summary card: emerald→teal-700 gradient header strip with tour thumbnail, name, date/time/city
- Travelers card: PaxStepper for Adults (price each) + Children (price each); low-availability warning if <5 seats
- Add-ons card: checkbox rows with name + per-pax/flat pricing breakdown + add-on total
- Contact details card: Full name *, Phone (WhatsApp) *, Email, Pickup location, Special requests textarea; WhatsApp confirmation note
- Payment method card: RadioGroup with 2 large options:
  - Bank Transfer (Banknote icon, teal gradient, "Recommended" badge, 2-hour verification note)
  - AmwalPay Card (CreditCard icon, emerald gradient, simulated note)
- Sticky price breakdown card: tour thumbnail, line items (adults × N, children × N, each add-on), coupon input with Apply button + quick-apply chips (WELCOME15 / EARLYBIRD20), totals box (Subtotal / Discount / VAT 5% / Total), "Proceed to Payment" CTA (disabled until name + phone filled), trust badges
- Coupon validation: WELCOME15 = 15% off, EARLYBIRD20 = 20% off (client-side validated)

**Step 4 — Payment**
- "Payment" header with method-specific subtitle
- Two-column layout: payment form (left) + sticky order summary (right)

  **If Bank Transfer:**
  - Bank account cards: RadioGroup of 2 banks (Bank Muscat default, NBO) with full details (account name, #, IBAN, SWIFT, default badge); amber info banner with exact amount to transfer
  - Transaction details form: bank transaction reference *, from bank, transfer date *
  - Screenshot upload: dashed-border dropzone (Upload icon + "Click to upload" + "PNG, JPG up to 4MB"); on file selected, FileReader.readAsDataURL → preview thumbnail with "Screenshot attached" success state + Replace button

  **If AmwalPay:**
  - Mock card form: card number (auto-formats with spaces, CreditCard icon), expiry (auto-formats MM / YY), CVV (password-masked); amber "Simulation mode" banner; encryption note

- Order summary card (right, sticky): tour thumbnail, line items, subtotal/discount/VAT/total, customer/payment info box
- Submit button: "Submit Payment Proof" (bank transfer) or "Pay X.XXX OMR" (AmwalPay); on click:
  1. Validates method-specific fields
  2. POST /api/orders with full payload (tourId, slotId, pax, addOns, customer, paymentMethod, channel=WEB, couponCode, discount)
  3. POST /api/payments with orderId, screenshotUrl, bankReference, transferDate, bankName (bank transfer only — triggers VLM fraud analysis on backend)
  4. On success: toast + onOrderCreated → step 5

**Step 5 — Confirmation**
- Animated success: pulsing emerald ring + scale animation, emerald→teal gradient circle with white check (strokeWidth 3), "Booking Received!" headline, personalized thank-you message, "Order #ORD-XXXX" emerald pill badge
- Order details card: 2×2 grid (Tour / Date & Time / Customer / Payment method), separator, total amount + "Awaiting verification" amber badge
- "What happens next?" card (emerald gradient bg): 3 numbered steps with gradient icon circles (Shield: verify payment <2hrs → MessageCircle: WhatsApp + email confirmation → QrCode: show voucher at check-in)
- Action buttons: "View My Bookings" (outline emerald) + "Book Another Tour" (emerald gradient)
- Help line card: WhatsApp / Email / Phone links

### My Bookings Dialog
- Triggered from header (sm+) and confirmation step
- Phone number input with Search button + sample phone hint (`+447700900123`, `+96891234567`)
- Calls `GET /api/orders?search=phone&limit=50` and renders scrollable list of order cards (order #, status badge, tour name, date/time/pax, total amount, payment method)

### Design Polish
- **Color palette**: Emerald/teal primary, amber accents (featured badges, low-availability warnings, warnings), rose for exclusions/cancellations/full slots, warm stone backgrounds — NO blue/indigo anywhere
- **Typography**: Bold display headlines, balanced text, uppercase tracking-wide labels
- **Imagery**: Real tour cover images (`/tours/*.jpg`) with graceful fallback to category gradient on error
- **Animations**: Hover lifts on cards (translate-y + shadow + image scale), pulsing success animation, animated pings on confirmation check, smooth transitions between steps
- **Sticky patterns**: Header (top-0), category pills bar (top-[60px]), booking widget (top-24 on lg), mobile bottom book bar (bottom-0)
- **Responsive**: Mobile-first throughout — 1-col mobile → 2-col tablet → 3-4-col desktop grids; mobile gets fixed bottom book bar instead of sticky sidebar widget
- **Accessibility**: Semantic `<header>`/`<main>`/`<footer>`/`<nav>`/`<section>`/`<article>`, ARIA labels on icon buttons, sr-only where needed, keyboard-accessible buttons, 44px+ touch targets
- **Sticky footer**: Parent uses `min-h-screen flex flex-col` + `main flex-1` + `footer mt-auto` — footer sticks to viewport bottom when content is short, pushes down naturally when long
- **Skeletons**: Tour grid skeletons while loading, bank account skeletons while fetching
- **Toast feedback**: Coupon applied/removed, screenshot attached, payment submitted/processed, errors

### Tech notes
- All state managed locally with `step: 0-5` and full booking state (`tour`, `slot`, `paxAdult`, `paxChild`, `addOns`, `customer`, `paymentMethod`, `couponCode`, `order`)
- `parseJsonArray` helper handles both raw arrays (Prisma Json) and stringified JSON (API responses) for media/itinerary/inclusions/exclusions/whatToBring
- Custom `Receipt` icon defined inline (lucide-react Receipt not imported to avoid bloat)
- Lint-clean: 0 errors, 0 warnings. Removed unused eslint-disable directives via `bun run lint --fix`
- Avoided React 19 `set-state-in-effect` rule by not resetting `activeImage` on tour change (TourDetailStep remounts when step transitions, so the state naturally resets)
- Dev server log: `GET / 200`, `GET /api/tours 200` repeating healthily — no errors

## Verification
- `bun run lint` — ✅ 0 errors 0 warnings
- Dev log shows `GET / 200` and `GET /api/tours 200` (active tours only, customer mode) healthy
- File: `src/components/views/customer-site-view.tsx` (~4,015 lines, 14 sub-components)
- Page wired: `src/app/page.tsx` renders `<CustomerSiteView />` at `/`
