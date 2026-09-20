# Task 5-a — WhatsApp Inbox View

**Agent**: full-stack-developer (WhatsApp Inbox)
**Date**: 2025 build
**Status**: ✅ Complete

## Files Created / Modified

### New files
1. **`src/components/views/inbox-view.tsx`** (~1100 lines)
   The main WhatsApp shared team inbox component. Default export `InboxView`. `'use client'`.
2. **`src/app/api/conversations/[id]/route.ts`**
   GET single conversation + PATCH (`botActive`, `status`, `assignedStaffId`, `labels`).
3. **`src/app/api/conversations/[id]/notes/route.ts`**
   GET (with staff relation) + POST staff notes.
4. **`src/app/api/canned-responses/route.ts`**
   GET canned responses (filterable by `category` and `lang`).

### Modified files
5. **`src/app/page.tsx`** — Replaced logo placeholder with `<InboxView />` so the inbox is visible at the root route for demo.

## Architecture

The inbox view is a single-file React component composed of 11 focused sub-components:

| Sub-component | Purpose |
|---|---|
| `InboxView` (main) | State + data loading + layout orchestration |
| `ConversationListItem` | Left-panel list row (avatar, name, last msg, badges, labels) |
| `ChatArea` | Middle column — scrollable messages with patterned bg |
| `MessageBubble` | Single message bubble (inbound green-left / outbound+bot white-right, AI badge, interactive data, timestamps, read-receipts) |
| `InteractiveData` | Renders WhatsApp buttons / list messages |
| `ChatComposer` | Textarea + canned dropdown + attach + send + handoff toggle |
| `SimulateBar` | "Send as customer" testing bar (amber themed) |
| `CustomerInfoPanel` | Right column — customer context, stats, notes, assignment |
| `QuickActionBtn` | Reusable 3-up quick action button |
| `EmptyChatState` | OA logo placeholder + welcome + feature pills |
| `ConversationListSkeleton` / `ChatSkeleton` | Loading placeholders |

## Data Flow

```
useApp() store (selectedConversationId, currentStaffId)
        │
        ▼
  InboxView state: conversations[], activeConvo, messages[], notes[], canned[], staff[], notifications[]
        │
        ├── GET /api/conversations?status=…            → left list
        ├── GET /api/conversations/[id]/messages       → middle chat (marks read)
        ├── GET /api/canned-responses                  → composer dropdown
        ├── GET /api/staff                             → assign dropdown
        ├── GET /api/notifications?unreadOnly=true     → bell badge
        │
        ├── POST /api/conversations/[id]/messages (OUTBOUND) → agent sends (optimistic)
        ├── POST /api/conversations/[id]/messages (INBOUND)  → simulate → AI auto-responds (useAI implicit)
        ├── PATCH /api/conversations/[id]              → bot toggle, status, assignee
        └── POST /api/conversations/[id]/notes         → internal note
```

## Real-time

- 5-second `setInterval` polls `/api/conversations/[id]/messages` (silent — no loading flicker) for the active conversation.
- Each poll also refreshes `/api/conversations` to update list previews + unread counts.
- New inbound messages (count grew) trigger a `sonner` toast.
- Optimistic UI for both agent sends and customer simulations; rollback on error.

## Key Decisions

- **Bot toggle in TWO places**: chat header (always visible) + composer hand-off toggle. Both reflect/control the same `botActive` state via PATCH. When admin sends an outbound message while in hand-off mode, the bot is automatically turned off (one-step takeover).
- **Simulate as customer**: posts `direction=INBOUND` — the existing API auto-generates an AI response (via `aiChat` + `detectIntent` in `src/lib/ai.ts`) when `botActive` is true. The response returns `{message, aiResponse}` so we can append both atomically.
- **Color palette**: emerald/teal primary, stone-50 background. NO blue/indigo on primary actions. Label colors per seed (`Arabic Speaker` uses teal — only as a label chip).
- **Chat background**: subtle emerald dot pattern via inline CSS `radial-gradient` — gives the WhatsApp-paper feel without copying.
- **Mobile UX**: list → chat → info flow with a back button in the chat header and an info Sheet triggered from the chat header.

## Verification

- `bun run lint` — ✅ 0 errors
- Dev server log shows all 4 API endpoints returning 200 on initial load
- `prisma:query` logs confirm Customer/Staff/Message/Notification/CannedResponse relations all loaded successfully

## Hand-off to Next Agent

If the next agent is wiring this into a larger admin shell:
- The component is self-contained and uses `useApp()` for `selectedConversationId` / `currentStaffId` only.
- The shell just needs a nav button that calls `setView('inbox')` and renders `<InboxView />` when active.
- Quick actions (View Orders, Create Booking, Transfer) currently show a toast — wire these to actual routes when those views exist.
- Consider adding WebSocket push (instead of 5s polling) when the realtime service is built — the API contract is unchanged.
