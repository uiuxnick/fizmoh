# Inbox — Flutter client

A realtime WhatsApp inbox for Oman Adventures. One codebase for the browser,
phone and desktop.

## What it does

- Conversations, newest first, with unread counts and search
- A thread that scrolls itself as messages land — but only when you are already
  at the bottom, so reading back through history is not interrupted
- Messages appear the instant you press send, and are marked if the send fails
  rather than quietly vanishing
- Typing indicator, browser notifications, and the unread count in the tab title
- Enter sends, Shift+Enter starts a new line

## Running it

```bash
flutter pub get
flutter run -d chrome                       # against production
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:3000
flutter test
```

## Serving the web build

```bash
flutter build web --release --no-wasm-dry-run
```

The output in `build/web` **must be served from the same origin as the API.**

This is not a preference. Realtime uses server-sent events, and the browser's
`EventSource` has no way to set an `Authorization` header — it can only send
cookies. Same-origin means the session cookie set at sign-in travels with the
stream. The alternative is putting the token in the query string, which would
write a credential into every proxy log and browser history entry between the
customer and the server.

The mobile and desktop builds have no such limit: they stream over an ordinary
HTTP request and send a bearer token, so they can point anywhere.

## Realtime

Server-sent events rather than websockets, because the server already speaks SSE
to the admin panel, and a second transport is a second thing to keep working.
SSE is one-way, which is all this needs — messages go out over ordinary POSTs.

The browser reconnects by itself. The native client backs off 1s, 2s, 4s … to a
30-second ceiling: fast enough that a deploy is barely noticed, slow enough that
a server which is genuinely down is not hammered by every open client.

When the stream drops and comes back, the conversation list is refetched rather
than assumed current — anything that arrived while it was down was missed.

## Notifications

Browser notifications work now, tagged per conversation so twenty messages from
one customer replace each other rather than stacking twenty alerts.

On mobile and desktop the notifier is a deliberate no-op. Real OS notifications
need a plugin and per-platform setup that has not been done and cannot be
verified here, and a stub that pretends to work is worse than one that says it
does not. The in-app banner still works. This is a contained change when wanted.

## What is not built

- Sending images, files or voice notes (the API supports them)
- The right-hand details panel from the design
- Group conversations, calls, archive and starred
