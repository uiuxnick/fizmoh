# Platform support — 10 September 2026

Scope confirmed by the user: app.fizmoh.cloud only. The main fizmoh.cloud deployment is unchanged.

## Visitor workflow

The website widget offers AI chat, support-ticket creation, and WhatsApp support at +96898314456. A new chat/ticket requires a name and international phone number; email is not required. Ticket creation additionally requires a subject and description. Visitors receive a reference and can read owner replies in the widget. This browser stores a signed, seven-day support token for resuming the current request. Closed requests allow a new request.

The platform widget uses existing SupportTicket and SupportTicketReply tables, with tenantId null. It does not attach visitors to a customer workspace or change customer conversations. No schema changes, migrations, seeds, tenant settings or channel configuration changes are required. The existing tenant widgets retain their own endpoints and settings.

## Platform owner

Open `/platform/live-support` for website requests, or `/platform/support-tickets` for the ticket list. Requests and an open transcript refresh automatically while visible. The owner can take over, reply, write private notes, set priority/status and close requests. A visible owner reply pauses AI atomically. Internal notes are excluded from visitor and tenant responses. Name and phone appear in the initial request.

AI uses the platform's configured provider and a public Fizmoh support prompt. It receives only the current public support transcript, with no tenant records or account-action tools. Provider errors preserve the message and queue the request for human support. An AI response that finishes after owner takeover is discarded.

## Verification

270 automated tests pass, including signed-token tampering, contact validation, owner authorization, internal-note exclusion, tenant isolation, AI failure/handoff race, closed-ticket handling and widget service-worker caching. Strict TypeScript and production builds passed. A real configured OpenAI provider request correctly returned the platform channels and +96898314456. Existing ticket tables were verified readable.

Local browser fixtures verified name/phone collection, AI/chat transcript, ticket submission, owner reply delivered to the visitor, WhatsApp URL, and the widget occupying exactly the 390 x 844 viewport. Live browser inspection verified the required form and ticket controls without creating test tickets or sending customer/WhatsApp messages. The owner session flow was exercised using local fixtures, not a production operator login.

The service worker now lets the unversioned widget script revalidate instead of initially showing stale cached code; unrelated caches are retained. The legacy session endpoint rejects the platform-support widget ID before any tenant lookup, protecting older cached embeds from fallback routing.

## Operations

Final release: `/home/fizmoh-platform/releases/20260910T090700Z`, served by `fizmoh-green` on port 3015. Live health confirmed this release with the database connected and zero service restarts. The previous release `20260910T085700Z` is retained. The legacy platform-widget session request returns 400 before database access; unauthenticated support and owner requests return 401.

Rollback uses `scripts/promote-release.sh` with the retained release path and `SKIP_SCHEMA_SYNC=1`, with the full system PATH including `/usr/sbin` and `/sbin`. Temporarily unlock the travel vhost for proxy validation and restore its immutable flag with an EXIT trap, as during this rollout. Do not run schema synchronization. The retired blue process exited after its connection-drain timeout; its stopped-unit failure flag was cleared only after confirming MainPID was zero.

Validation logs and the prior service worker are backed up at `/root/fizmoh-deploy-backups/20260910T085700Z/`. Rollout uses the existing alternate-backend helper with SKIP_SCHEMA_SYNC=1 and retained prior release/static assets. Individual live connections may reconnect during retirement. The shared proxy configuration is unchanged apart from app.fizmoh.cloud's backend port; the travel vhost's original immutable flag is restored after validation/reload.
