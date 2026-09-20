# Website roadmap

**Written:** 18 Aug 2026, from what the codebase already contains.

Ordered by value per day of work. The first group is cheap because the server
side exists and only the screen is missing — each is roughly a day.

## Group 1 — built, not surfaced

| Feature | Backend that exists | Why it matters |
|---|---|---|
| Workspace status page | `/api/tenant/health` | The banner says "not configured" without saying what. Turns support tickets into self-service. |
| Invoice download | `SubscriptionInvoice` model | Businesses need invoices for their accountant. A silent churn reason. |
| Data export button | `/api/tenant/export`, role-gated | "Can I get my data out" is a sales objection and a compliance obligation. |
| Webhook delivery log | `WebhookDelivery` + retry route | Failures are invisible today. |
| API key docs page | `/api/settings/api-keys`, `/api/external/v1/*` | Keys can be issued but nobody can integrate against them. |

## Group 2 — new build

**1. Arabic and RTL.** The market is Oman, the bot templates already carry Arabic
keywords, and the admin is English-only. Biggest lever on the market actually
being sold to. Touches every view; needs a translation layer, RTL layout
handling, and Arabic number/date formatting. Two to three weeks, not a day.

**2. Message delivery visibility.** The database holds messages with
`status: FAILED` and no way for an agent to see why. When a message does not
arrive, staff currently learn it from the customer.

**3. Bot analytics.** 32 templates and no measurement — which flows fire, where
customers drop out, how many end in handoff. Without it, flow authoring is
guesswork and no tenant can be told why their bot underperforms.

**4. Usage against plan limits.** `entitlements.ts` enforces caps; nothing warns
a tenant at 80%. People hit a wall they never saw coming.

**5. Monitoring and alerting.** Not customer-facing. Both bugs found on 18 Aug —
including a cross-tenant leak — were found by the owner, not by an alert. At
three tenants that is survivable. At thirty it is not.

## Do these first

Ahead of everything above, because they are broken rather than missing:

1. **Payments work for one module of four.** `buildSession` reads only `Order`,
   so appointment and hospital links return "We could not find that booking".
2. **Flutter source regression.** The push fix, local cache and incremental sync
   are absent from `flutter_chat` — building from current source ships broken
   push again, silently.
3. **Hospital routes bypass `withErrors`**, pinning them to `DEFAULT_HOSP_TENANT`.
4. **`db.ts` fails open** when no tenant is in scope. Must follow (3).

## Not yet

More verticals. Tours, restaurant, hospital, appointments, visa and WooCommerce
already exist while hospital is pinned to one tenant and payments cover one
module. Breadth is ahead of depth.
