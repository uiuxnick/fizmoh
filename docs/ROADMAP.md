# Oman Adventures — full system audit and production plan

Audit date: 8 August 2026, against the deployed release on `wptour.fizmoh.cloud`.
Every item cites what was actually checked. Nothing here is inferred from
naming or assumed from a feature list.

Scope: 72 API routes, 21 admin views, the customer site, the WhatsApp
integration, the payment gateway, and the deployment.

---

## A. The system reports success for things it did not do

The most serious class of defect here, because it is invisible: the panel says
sent, the customer got nothing, and no error is recorded anywhere.

| # | Issue | Evidence |
|---|-------|----------|
| A1 | ~~WhatsApp sending returns a fabricated message id.~~ **Not a defect** — all four sites already return a real failure when `NODE_ENV=production`; the simulated id is reachable only in local development. Verified `src/lib/whatsapp.ts:147,200,292,360`. |
| A2 | Payment session creation invents a fake checkout link when AmwalPay is unconfigured, so an order proceeds as though a real payment link exists. | `src/lib/amwalpay.ts:130-137` |
| A3 | *(Fixed 8 Aug)* `sendEmail` never contacted a mail server in either branch. | was `src/lib/notifications.ts:30-45` |
| A4 | *(Fixed 8 Aug)* `refundPayment` returned a fabricated refund id when unconfigured. | was `src/lib/amwalpay.ts` |

A2 is the same bug as A3 and A4, on the payment path. The rule being violated:
**never return success for work that did not happen.** A1 was checked against
this rule and passes.

## B. Security

| # | Issue | Evidence |
|---|-------|----------|
| B1 | Four public endpoints have no rate limit: `waitlist`, `coupons/validate`, `avail-check`, `amwalpay/create-session`. | `grep checkRateLimit` returns 0 for each |
| B2 | `coupons/validate` unlimited + public means discount codes can be brute-forced. | same |
| B3 | `amwalpay/create-session` unlimited + public means anyone can drive unlimited payment-link creation against your merchant account. | same |
| B4 | `POST /api/bank-accounts` writes the request body directly into Prisma. | `src/app/api/bank-accounts/route.ts:14` — `data: body` |
| B5 | The external API key is compared with `===`, which is not constant-time. | `src/app/api/external/orders/route.ts:27` |
| B6 | Four staff accounts carry seeded `$2a$10$` hashes while the real admin is `$2b$12$`. | `Staff` table |

Checked and found clean: no secrets exposed through `NEXT_PUBLIC_` variables;
`customers/[id]` PATCH correctly whitelists and discards the rest; the admin
session cookie and WhatsApp webhook signature verification are both sound.

## C. Robustness

| # | Issue | Evidence |
|---|-------|----------|
| C1 | ~~48 of 72 API routes have no error handling.~~ **Fixed 8 Aug** — all 73 wrapped. Any unexpected condition returns a 500 with a stack trace instead of a usable message. | `grep -L "try {"` across `src/app/api` |
| C2 | ~~No automated tests anywhere.~~ **Started 8 Aug** — 26 tests over pricing, gateway hash and event classification. Route-level and booking-flow coverage still absent. |
| C3 | Deployment is a manual sequence of rsync, build, chown, symlink and restart. Config drift has already happened twice. The repo's `next.config` and Prisma provider were behind production and a deploy silently overwrote them. Separately, each release carries a `.env` that **nothing reads**: the systemd unit loads `EnvironmentFile=/home/wptour.fizmoh.cloud/shared/.env.production`, and systemd's environment wins over the dotenv file, so editing the release `.env` changes nothing while appearing to work. | this session |

## D. Dead and half-built UI

Every `<Button>` in the admin was checked for a handler.

| # | View | State |
|---|------|-------|
| D1 | **Bot & Automation** | All 3 buttons dead, no write calls at all. The entire screen is a mockup. |
| D2 | **Audit Logs, Customers, Reports** | Read-only: no create, edit, export or action. |
| D3 | Customer site | 5 controls with no handler, including a date picker |
| D4 | Staff, Settings, Coupons, Content | 1 dead control each |

## E. Fixed earlier today (recorded so the plan is honest about what is left)

Order detail with payment proof and full editing · tour create/edit/duplicate/
departures · inbox conversations actually opening · inbox reading the correct
messages endpoint · realtime SSE · notification bell · AmwalPay callback
verification corrected against their reference implementation · email sending ·
mass assignment closed on order and tour routes · dead `views/heavy/` removed ·
demo conversations cleared.

---

## Phases

Ordered by risk. Each phase ships independently and leaves the system
deployable.

### Phase 1 — Never lie about delivery ✅ *shipped*
All of it: no simulated checkout in production, rate limits on the four open
endpoints, whitelisted bank-account writes, constant-time key comparison, and
real bcrypt passwords with an admin reset path.

### Phase 2 — Errors that help instead of leaking ✅ *shipped 8 Aug*
1. ~~A shared route wrapper~~ — `src/lib/api-handler.ts`, logs with method and path, maps Prisma errors to real statuses.
2. ~~Apply it across the routes~~ — all 73 wrapped, verified: a malformed body now returns `{"error":"Malformed request body"}` with a 400 instead of an HTML 500.
3. ~~Tests~~ — 26 passing (`bun test`) across pricing, the AmwalPay integrity hash including replay-tampering, and event classification.

### Phase 3 — Finish the half-built screens ✅ *mostly shipped*
1. ~~Bot & Automation~~ — edits real flows, and now writes them from a prompt.
2. ~~Customers~~ — edit, tag, opt-in control, CSV export. **Merging duplicates is still not built.**
3. ~~Reports~~ — real date range and CSV export. The `status` filter had been parsed and then never used.
4. ~~Audit logs~~ — already had filters; the original entry was wrong.
5. ~~Dead controls~~ — the count was inflated by dropdown triggers and multi-line handlers. The real ones are fixed.

### Phase 4 — Inbox as a real agent tool ✅ *shipped*
Outbound media from the device including camera and recorded voice notes, live
location, labels, agent assignment, canned responses, and the 24-hour window
shown plainly before anything is typed. Inbound media renders — it never did,
because Meta's media id was being stored as though it were a URL.

### Phase 5 — AI that knows the business *(partly shipped)*
1. **Not built.** Knowledge base: pasted text, documents, website crawl, FAQ pairs.
2. **Not built.** Retrieval grounded into the reply path. The assistant answers
   from live tours, availability and the customer's own orders, but has nothing
   to say about policies, FAQs or anything not in the database.
3. ~~Language~~ — replies in whatever language the customer wrote in, Omani
   dialect for Arabic rather than formal MSA.
4. ~~Voice notes~~ — transcribed and answered as ordinary messages, in any
   language. The recording is kept either way so an agent can listen.

### Phase 6 — Operations *(partly shipped)*
1. ~~One-command deploy~~ — `npm run deploy` and `npm run rollback`. It refuses a
   non-PostgreSQL schema or a config missing standalone output, runs tests and
   the build on the server before the symlink moves, copies no decoy `.env`, and
   uses the pinned Prisma binary rather than whatever `bun x` fetches.
2. **Not built.** Structured error reporting. Failures go to the log with method
   and path, which is enough to find them and not enough to be alerted to them.
3. **Not built.** Backup verification. Ad-hoc backups were taken before each
   destructive change in this session; nothing is scheduled or restore-tested.
4. **Not built.** Load check on the booking path. Seat holding under concurrent
   bookings has never been tested with more than one customer at a time.

### Still open elsewhere
- **Carousel** templates are built and validated, but no carousel has been
  submitted to Meta or sent to a customer.
- **Customer merge** for duplicate records.
- **WhatsApp Commerce catalogue and calling** — both need the verified Omani
  number; neither works on a test number.

---

## Blocked on credentials, not code

| Item | Status |
|------|--------|
| WhatsApp access token | ~~Expired~~ — replaced with a permanent System User token that does not expire. |
| SMTP credentials | Absent. Email code is correct but has no server. |
| AmwalPay notification URL | 0 callbacks ever received. Verification is now correct; confirm the URL is registered against MID 189552. |


---

## What is still worth doing before real customers

1. **Move to the verified Omani number.** Everything is on Meta's test number,
   which cannot message anyone not on its allow-list, cannot carry a commerce
   catalogue, and cannot place calls. This gates more than anything else here.
2. **Prove the payment path.** The AmwalPay callback has never been received
   from the gateway. Verification is now correct and tested against the real
   key, but no live payment has completed end to end.
3. **Configure SMTP.** Email is honest about being unconfigured, which means
   every confirmation currently goes out over WhatsApp only.
4. **Watch the assistant's claims.** Three guards now exist because it narrated
   an action instead of taking it — booking, handing over, sending photographs.
   Anything else it can only do through a tool deserves the same treatment.
