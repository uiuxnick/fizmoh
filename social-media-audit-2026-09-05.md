# Facebook and Instagram attachment failures

## Follow-up: URL-fetch adjustment did not resolve delivery

The operator reported the same failures after release `20260905T061146Z`. The robots/header change must not be presented as a verified delivery fix. New uploads still lacked corresponding Meta image-download entries in the bounded access log.

Direct multipart uploads of the same failed 669669-byte JPEG to each channel's `/v21.0/{account-id}/message_attachments` endpoint returned HTTP 200 and an attachment ID. Repeating with the exact `/v21.0/me/message_attachments` endpoint also returned HTTP 200 for both Facebook and Instagram. These tests uploaded the image to the intended Meta channel accounts; they did not send messages to any recipient. Secrets were read from the live process and decrypted only by the project's decryptSecret function; no token values were printed.

The new implementation uploads local attachments directly and sends the returned attachment_id. It reads only the active tenant's upload directory, requires a valid local media filename and a nonempty file no larger than 16 MB, and preserves URL-based sending for external URLs. Only the two social adapters, a new attachment helper, and its tests are shipped. Stored messages, database schema, WhatsApp sending, and billing are not modified. Final message delivery remains to be verified with an operator send or explicit resend authorization.

Direct-upload release `20260905T061933Z` deployed successfully through scripts/ship.sh. Local/server typecheck, 172 tests (427 assertions), production build, and all three deployment health endpoints passed. The live symlink and helper checksum were checked; previous release `20260905T061146Z` is retained. Actual conversation delivery is still pending a new send.

Live inspection confirmed release `20260905T060448Z` and the `wptour` process listening on 127.0.0.1:3013. Instagram's latest OAuth attempt successfully exchanged a long-lived token and fetched the professional profile; login is now verified in server diagnostics.

The latest Instagram and Facebook failed attachments use absolute URLs under `https://app.fizmoh.cloud/api/media/`. Facebook's audit error is `(#100) Upload failed`; Instagram returns a localized provider upload error. An affected JPEG returned HTTP 200 anonymously and with the Facebook crawler user agent. The file is a valid JPEG, 1774x887, 669669 bytes. DNS resolves to the correct server with no AAAA record returned.

The site's robots.txt disallows all `/api/` URLs, including attachment URLs. The vhost explicitly writes its access log to `/opt/fizmoh-app/logs/access.log` (this is the verified OpenLiteSpeed access log, not the decoy app's process output). Bounded recent access-log inspection showed browser fetches for the failed Instagram files, but no corresponding Meta attachment downloads. Crawler blocking is a strong lead, not a confirmed end-to-end diagnosis.

## Patch

- Add a `facebookexternalhit` robots group permitting `/api/media/` while repeating existing restrictions. The wildcard search-engine policy remains unchanged.
- Return an explicit Content-Length for media responses, matching the bytes served.
- No sending-adapter, credential, tenant, billing, WhatsApp-send, database, or stored-message changes.
- Originals saved under `/Users/nick/Downloads/linetrip/backups/social-media-20260905/`.

Meta documents its crawler's robots handling and up to 24-hour robots caching at [Meta Web Crawlers](https://developers.facebook.com/documentation/sharing/webmasters/web-crawlers), inspected in the authenticated browser.

Actual delivery must be checked with fresh sends. The operator was asked to authorize one resend of a failed image per channel or send the test images themselves. No test messages have been sent by the agent.

Deployment completed as release `20260905T061146Z` via `scripts/ship.sh`. Local and server typecheck, all 167 tests, production build, and `/admin`, `/api/health`, `/api/tours` health checks passed. Live robots.txt contains the Meta-specific media allowance; an affected JPEG returns HTTP 200 and Content-Length 669669 with the crawler user agent. Previous release `20260905T060448Z` is retained. These checks verify the patch is served, not delivery through Meta; fresh-send verification is pending operator action/authorization.
