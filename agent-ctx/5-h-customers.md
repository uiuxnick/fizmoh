# Task 5-h — Customers / CRM View

**Agent**: full-stack-developer (Customers CRM)
**Task ID**: 5-h
**Status**: ✅ Complete

## Files Created / Modified

### New files
1. **`src/app/api/customers/[id]/route.ts`**
   - `GET` — returns a unified customer profile: orders (w/ tour + slot + payments + vouchers),
     conversations (w/ last message + assigned staff), consentLogs (desc), reviews (w/ tour),
     auditLogs (last 20 w/ staff), `_count` aggregates.
   - `PATCH` — updates scalar fields (tags, notes, whatsappOptIn, emailOptIn, loyaltyTier,
     loyaltyPoints, preferredLang, name, email, preferredCurrency). Auto-creates a
     `ConsentLog` entry when an opt-in flag flips, and an `AuditLog` entry when `staffId`
     is supplied. Returns the freshly-fetched consentLogs array so the UI can update
     its timeline optimistically.

2. **`src/app/api/customers/[id]/consent/route.ts`**
   - `POST` — records an explicit opt-in / opt-out event. Validates `channel`
     (WHATSAPP | EMAIL) + `action` (OPT_IN | OPT_OUT). Updates the matching boolean
     flag on the Customer record in parallel with creating the ConsentLog entry,
     then creates an AuditLog (`CONSENT_OPT_IN` / `CONSENT_OPT_OUT`) if `staffId`
     provided. Returns the updated customer + the new consentLog row.

3. **`src/components/views/customers-view.tsx`** (~1,300 lines, ~14 sub-components)
   The main Customers & CRM admin view for the Oman Adventures platform.
   Default export `CustomersView`. `'use client'`.
   Imports: `@/lib/store`, `@/lib/helpers`, `@/lib/utils`, `sonner`, `lucide-react`
   (24 icons: Users, Search, Plus, Phone, Mail, MessageCircle, Star, Crown, Award,
   Tag, Eye, UserPlus, Filter, MoreVertical, Loader2, X, RefreshCw, ShoppingBag,
   History, ShieldCheck, Languages, Sparkles, Send, CalendarPlus, StickyNote,
   ChevronRight, TrendingUp, Globe, MessageSquare, CheckCircle2, XCircle, Clock,
   Check, AlertCircle, FileText, ArrowUpRight), shadcn/ui (card, badge, button,
   dialog, sheet, input, textarea, label, select, dropdown-menu, tooltip, separator,
   skeleton, scroll-area, tabs, avatar, progress, checkbox).

### Modified files
- **`worklog.md`** — appended Task 5-h record.

## What was built

A comprehensive, production-ready CRM view that unifies every customer touchpoint
(web bookings + WhatsApp conversations + email opt-ins) into a single profile.

### Layout (5 sections)

1. **Header** (sticky, white/blur) — emerald/teal gradient `Users` icon chip +
   "Customers & CRM" title + subtitle ("Unified profiles across web bookings,
   WhatsApp & email") + live customer count badge. Right side: debounced search
   input (350ms) with clear button, Refresh button (spins while loading),
   emerald-gradient "Add Customer" button.

2. **Stats row** (5 clickable cards, responsive 2/3/5-col) — Total Customers
   (stone gradient) → sets tier filter to ALL; Bronze (amber gradient) → BRONZE;
   Silver (stone gradient) → SILVER; Gold (yellow gradient) → GOLD; Opted-in
   (WA / Email) emerald gradient card showing `X / Y` opt-in counts. Active
   filter card gets emerald ring.

3. **Filter bar** (Card) — 4-tab tier filter (All/Bronze/Silver/Gold with
   tier-colored active state) + tag dropdown (auto-populated from union of all
   customer tags) + Clear-filters button (only shown when filters active).

4. **Customer cards grid** (responsive 1/2/3-col)
   - Each card: tier-colored gradient avatar (with ring + tier-icon dot),
     name, tier badge + loyalty-points badge, dropdown menu (View profile /
     WhatsApp chat / Send email / Copy phone).
   - Contact rows: phone (mono), email, lang + currency.
   - Stats grid: bookings count + total spent (emerald).
   - Tag badges (max 3 + "+N").
   - Footer: WhatsApp opt-in icon, Email opt-in icon, conversation count icon
     (each with tooltip), last-active timeAgo.
   - Hover: card lifts (-translate-y-0.5) + emerald border + "View profile" hint.

5. **Footer** — sticky-bottom minimal footer with customer count.

### Customer detail Sheet (right side, max-w-3xl, scrollable)

**Header** — XL avatar (tier gradient + ring + tier-icon dot), name, tier badge +
points badge + tag badges (max 2), contact info row (phone / email / lang / joined
date).

**Quick actions** (4 buttons):
- Send WhatsApp → POST /api/conversations → `setView('inbox')` + `setSelectedConversation`
- Send Email → `mailto:` (disabled if no email)
- New Booking → toast + close sheet (so admin can use bookings-view)
- Add Note → opens Add Note dialog

**Tabs** (5):

- **Profile**:
  - 4 stat cards: Total Bookings, Total Spent, Loyalty Points, Avg Order
  - Tier progress card: gradient tier icon + tier label + points + "X pts to
    [next tier]" + Progress bar (emerald→teal gradient) + tier thresholds legend
  - Unified Profile card: emerald gradient background + Globe icon + explanation
    text + 3 channel tiles (Web Bookings count, WhatsApp Chats count, Email
    Opt-in status)
  - Tags & Segments editor: inline tag chips with X-remove, tag input with
    Enter-to-add, suggested segments chips (VIP/Repeat/New/Corporate/Family/
    Honeymoon/Group/Solo/Influencer/Refund-prone), Save button (only when dirty,
    shows spinner during save). PATCHes /api/customers/[id] with `{ tags, staffId }`.
  - Reviews section (if any): tour name + 5-star rating + comment + timeAgo
  - Internal Notes section (if any): whitespace-pre-wrap amber-tinted box

- **Bookings** — list of all orders: order # (mono) + channel dot badge (WEB
  emerald / WHATSAPP teal / ADMIN amber / API rose), tour name, slot date+time,
  pax count, timeAgo, amount (bold) + status badge (tier-colored per status).
  Hover lifts card.

- **Chats** — list of WhatsApp conversations: status badge (OPEN emerald /
  PENDING amber / RESOLVED+CLOSED stone), bot-active badge, sentiment badge,
  unread count red dot, last message preview with direction arrow (↘ inbound /
  ↗ outbound), timeAgo + assigned staff name, "Open" button → onOpenInbox.

- **Consent** — 2 toggle cards (WhatsApp teal icon + Email amber icon) showing
  current opt-in state with opt-in/out button (POSTs to /api/customers/[id]/consent);
  ConsentLog timeline below (vertical line with colored dots — emerald for opt-in,
  rose for opt-out) showing channel badge + action text + timestamp + source.

- **Activity** — AuditLog timeline (vertical line with stone dots) showing action
  label (prettified) + entity badge + timestamp + staff name + reason.

### Dialogs

- **Add Customer Dialog** (max-w-md): Name*, Phone*, Email, Preferred Language
  (en/ar select), Tags (comma-separated input), WhatsApp opt-in checkbox, Email
  opt-in checkbox. POSTs to /api/customers; on success: refresh list, open
  detail sheet, success toast.

- **Add Note Dialog** (max-w-md): Textarea (4 rows). Saves via PATCH
  /api/customers/[id] appending `"\n\n---\n{timestamp}: {note}"` to existing
  notes field. Success toast + dialog closes.

## Sub-components

| Sub-component | Purpose |
|---|---|
| `CustomersView` (main) | State + data loading + layout orchestration |
| `StatCard` | Clickable stat card with gradient icon tile |
| `CustomerCard` | Single grid card with avatar, contact, stats, tags, opt-ins |
| `CustomerDetailContent` | Fetches full record, renders header + tabs + 5 tab panels |
| `DetailStat` | Single stat tile in the detail Profile tab |
| `DetailSection` | Reusable Card with icon + title + accent color + optional count badge |
| `UnifiedChannel` | Channel tile in the Unified Profile card |
| `ConsentToggle` | Opt-in/out card with channel icon + state + toggle button |
| `EmptyInline` | Small empty-state for inline lists (bookings/chats/consent/activity) |
| `AddCustomerDialog` | New customer form |
| `AddNoteDialog` | Note input form |
| `CustomersGridSkeleton` | Loading placeholders for the grid |
| `DetailSkeleton` | Loading placeholders for the detail sheet |
| `EmptyState` | No customers / no matching filters (with Clear + Add buttons) |
| `ErrorState` | Rose error banner with Retry |

## Data Flow

```
useApp() store (setView, setSelectedConversation, currentStaffId)
       │
       ▼
CustomersView state: customers[], loading, error, search, debouncedSearch,
                    tierFilter, tagFilter, selectedId, showAddDialog, refreshKey
       │
       ├── GET /api/customers?search=X                       → filtered list (debounced)
       │       (auto-refresh every 30s)
       │
       ├── GET /api/customers/[id]                           → unified profile
       │       (orders, conversations, consentLogs, reviews, auditLogs)
       │
       ├── PATCH /api/customers/[id] { tags, staffId }       → save tags
       ├── PATCH /api/customers/[id] { notes, staffId }      → add note (append)
       │
       ├── POST /api/customers/[id]/consent
       │       { channel, action, source, staffId }          → toggle opt-in/out
       │       → returns updated customer + new consentLog → UI prepends to timeline
       │
       ├── POST /api/customers { name, phone, email, ... }   → create customer
       │       → on success: refresh list + open detail sheet
       │
       └── POST /api/conversations { customerPhone, ... }    → find-or-create WhatsApp convo
               → setView('inbox') + setSelectedConversation(convo.id)
```

## Key Decisions

- **Color palette**: emerald/teal primary, amber-700 for Bronze, stone-400 for
  Silver, yellow-500 for Gold, rose for opt-out/cancel, purple for refunded,
  stone for neutral. Zero blue/indigo anywhere — enforced via the `TIER_CONFIG`
  map (badge + gradient + ring + text + dot + icon per tier).
- **Tier progress**: computed client-side via `getTierProgress(points, tier)` —
  BRONZE→SILVER (0→500), SILVER→GOLD (500→2000), GOLD→max (100%). Shows "X pts
  to [next tier]" + threshold hint.
- **Tags parsing**: `parseTags()` helper handles both raw arrays (Prisma Json)
  and stringified JSON (the seed script stores `JSON.stringify(["VIP", "Repeat"])`).
  Defensive try/catch around `JSON.parse`.
- **Tags editor**: inline add/remove with Enter-to-add, suggested segments
  chips for quick segment tagging, Save button only enabled when dirty. Avoids
  accidental writes when user just opens/closes the sheet.
- **Consent toggle UX**: each toggle POSTs to a dedicated `/consent` endpoint
  (not the PATCH) so the ConsentLog entry is created atomically with the flag
  flip — the PATCH route also creates consent logs, but the dedicated endpoint
  is cleaner for a single-action button. Returns the new consentLog row so the
  UI prepends it to the timeline without refetching.
- **Auto-refresh**: 30s interval on the customer list (longer than bookings-view's
  20s — CRM data changes less frequently and we don't want to hammer the API).
- **Detail tab navigation**: 5 tabs (Profile / Bookings / Chats / Consent /
  Activity) keeps the sheet scannable instead of one giant scroll. Each tab has
  an icon + count badge in its label.
- **Unified profile concept**: explicit card in the Profile tab with Globe icon
  + explanation text + 3 channel tiles (Web Bookings count, WhatsApp Chats
  count, Email Opt-in status) — makes the "unification" visible without being
  preachy.
- **New Booking action**: shows a toast + closes the sheet (so the admin lands
  back on the bookings-view flow). A future agent could wire this to
  `setView('bookings')` + open the new-booking wizard pre-filled with the
  customer's phone — but the bookings-view's wizard is currently triggered
  internally, so we leave the cross-view hand-off as a stub.
- **Cross-view navigation**: Send WhatsApp uses the same `POST /api/conversations`
  → `setView('inbox')` + `setSelectedConversation` pattern as bookings-view
  (verified consistent with the existing agent-ctx notes).

## Verification

- ✅ `bun run lint` — 0 errors 0 warnings
- ✅ TypeScript types align with Prisma schema (Customer + relations)
- ✅ API routes follow existing patterns (NextRequest / NextResponse, params:
  Promise<{id}>, db client import, createAuditLog helper)
- ✅ Existing `/api/customers` (list) endpoint unchanged — the [id] route is
  purely additive
- ✅ All 6 seeded customers (John Smith, Aisha Al-Mansouri, Mohammed Al-Farsi,
  Emily Johnson, Raj Patel, Sara Al-Balushi) will render with their tier colors,
  tags (VIP/Repeat for the 3 high-bookers, New for the others), and unified
  profile data (orders + WhatsApp conversations + email opt-ins)

## Hand-off to Next Agent

- The customers view is **not** currently rendered at `/` (page.tsx still
  renders `<CustomerSiteView />` from Task 6). It's reachable via
  `setView('customers')` from the dashboard sidebar once that nav is wired up.
- The `TIER_CONFIG` map (badge / gradient / ring / text / dot / icon per tier)
  is defined at the top of `customers-view.tsx`. If other views need consistent
  tier colors, consider promoting it to `@/lib/helpers` or a shared constants
  file.
- The `parseTags()` helper handles both Prisma-Json (array) and stringified-JSON
  (the seed format) — useful for any other view that consumes customer tags.
- The `getTierProgress()` helper computes pct + nextTier + points-to-next —
  reusable if the dashboard wants to show overall tier-distribution progress.
- The 2 new API routes (`/api/customers/[id]` and `/api/customers/[id]/consent`)
  are purely additive — no changes to existing endpoints.
- "New Booking" from the detail sheet is a toast-only stub. A future agent
  could wire it to `setView('bookings')` + open the bookings-view's new-booking
  wizard pre-filled with the customer's phone (the wizard currently lives
  inside bookings-view.tsx as `NewBookingDialog`).
EOF
