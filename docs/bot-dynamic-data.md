# Connecting the bot to live business data

**Status:** design, 18 Aug 2026
**Audience:** whoever works on the flow engine next

## What already exists

The picture is better than it looks from the builder. Three layers are in place.

**The engine** (`src/lib/botflow-engine.ts`) walks a flow, bounded at 25 steps so a
cycle cannot hang the webhook. Before *every* node it calls `loadFlowRuntimeData`,
so a record written by one node is visible to the next. Of 41 declared node kinds,
40 are referenced; only `JUMP` is declared and never handled.

**The data seam** (`src/lib/flow-runtime-data.ts`) loads the current customer's live
workspace data and flattens it into ~35 `{{tokens}}`: `customer.*`, `order.latest.*`,
`appointment.latest.*`, `restaurant.latest.*`, `hospital.patient.*`, and
`hospital.next_booking.*`, plus `customer.custom.*` from `customFields`. Every query
is tenant-scoped. The same flat map is passed to the AI node as a readable context
block, capped at 5000 characters.

**The nodes** (`src/lib/flow-nodes.ts`) implement all 33 delegated kinds. The hospital
ones correctly hand off to `hospital-booking-flow.ts`; `TOUR`, `TOUR_DETAILS`,
`RESTAURANT_MENU`, `RESTAURANT_ORDER_STATUS` and `APPOINTMENT` all read the database.

So the answer is not "build a chatbot". It is "finish four nodes and expose what is
already there".

## What is actually missing

### 1. Four nodes are prompt-only stubs

They send a hardcoded message, return `wait: "reply"`, and never touch the database.
The customer is asked a question that nothing is listening for.

| Node | Asks for | Does with it |
|---|---|---|
| `TOUR_AVAIL` | a preferred date | nothing — never queries `Slot` |
| `APT_RESCHEDULE` | an appointment reference | nothing — never looks it up |
| `RESTAURANT` | table or menu | menu button works; table booking goes nowhere |
| `VISA` | visa type | nothing — three buttons, no follow-through |

This is the gap that shows up as "the bot asked me for a date and then ignored it".

### 2. The builder advertises 7 capabilities out of 33

`FLOW_CAPABILITIES` (`src/lib/flow-capabilities.ts`) lists restaurant, hospital and
payment nodes only. Tours and appointments are absent, so a tenant building a flow
cannot discover the tour nodes that already work.

### 3. Tokens are not discoverable

~35 live tokens exist and nothing in the builder lists them. An author has to read the
source to learn that `{{hospital.next_booking.date}}` is available.

### 4. Per-module coverage is uneven

`loadFlowRuntimeData` returns the *latest* record per module. There is no "next tour
departure", no restaurant reservation (only kitchen orders), and no menu availability.

## Design

Three principles, each chosen against a specific failure already seen in this codebase.

**Tenant scoping stays with the scoped client.** Every new query goes through `db`,
never `raw`. The scoped client fails open when no tenant is in scope, so nodes must
only ever run inside `withErrors`.

**A stub node must not ask a question it cannot answer.** Better to render nothing than
to prompt for a date and drop the reply. Each node below either completes its job or
hands to a flow that will.

**Tokens are data, not templates.** `loadFlowRuntimeData` stays flat and string-valued
so the same map serves `{{token}}` interpolation and the AI context block. Nested
objects would need two code paths and would drift.

## Phases

### Phase 1 — finish the four stub nodes
- `TOUR_AVAIL`: parse the reply date, query `Slot` for that tour and date, reply with
  real availability and seats left; fall through to `booking-flow.ts` to take the booking.
- `APT_RESCHEDULE`: look the reference up in `Appointment`, scoped to the customer;
  offer reschedule or cancel against real slots.
- `RESTAURANT`: wire "Book a Table" to `RestaurantTable` availability.
- `VISA`: connect the three buttons to `visa-flow.ts`, which already exists.

### Phase 2 — expose what exists
- Extend `FLOW_CAPABILITIES` to all 33 delegated kinds, with module and description.
- Add a token reference panel to the builder, generated from `loadFlowRuntimeData`
  so it cannot drift from the runtime.

### Phase 3 — deepen the data
- `tour.next_departure.*`, `restaurant.reservation.*`, `hospital.bed.*`.
- Decide `JUMP`: implement it or delete it from `NodeKind`.

### Phase 4 — AI grounding
- Give the AI node the module catalogue (tours, menu, doctors) rather than only the
  customer's own records, so it can answer "what tours do you have on Friday".

## Risks

- **Tenant leakage** through a node that queries outside scope. Mitigated by using `db`.
- **Webhook latency**: `loadFlowRuntimeData` runs before every node, up to 25 times per
  message, each firing 5 queries. Worth measuring before Phase 3 adds more.
- **Flow authors seeing tokens that are always empty** for their vertical — a tour
  business has no `hospital.*`. The token panel should hide modules the tenant lacks.
