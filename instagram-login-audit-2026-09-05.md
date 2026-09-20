# Instagram Login audit — 5 September 2026

## Verified deployment

Read-only inspection confirmed `app.fizmoh.cloud` proxies to `127.0.0.1:3013`, served by systemd `wptour`, PID 364290 at audit start. The release was `/home/fizmoh-platform/releases/20260904T211118Z`. The local and deployed `social-oauth.ts` hashes matched. The active database's configured Graph version is `v21.0`; Instagram app ID is `1038272018909541` (distinct from parent Meta app `1789999432450413`). No secrets were printed.

## Findings

1. **The token lifetime inference is unsupported.** Meta's current Business Login documentation explicitly includes permissions in the short-lived token response. Permissions or an IGAA prefix do not prove a 60-day lifetime. Production skipped the exchange and assigned 60 days without an expiry returned by Meta.
2. **The exchange URL differs from the documented endpoint.** Production's exchange used `graph.instagram.com/{version}/access_token`. Meta documents `graph.instagram.com/access_token`, without a version. The previous failures do not rule out this untested endpoint. This is a concrete correction, but its effect on the live token still needs a fresh OAuth attempt.
3. **Fields had already changed.** Production was already requesting `id,username,name`; the handoff's `user_id,username,name` description was stale. Logs do not include field sets, so individual old failures cannot reliably be assigned to that change.
4. **Account IDs are not interchangeable.** Meta documents `id` as app-scoped and profile `user_id` as the professional-account ID matching webhook entries. The old callback could fall back to the token exchange's app-scoped ID. A bare profile response containing only `id` must not be accepted as a webhook-ready connection. IDs exceeding JavaScript's safe-integer range also require lossless parsing if returned as JSON numbers.
5. **Instagram permission check is not live.** The endpoint returns the requested permission list with `checkable: false`; no Instagram equivalent of `checkFacebookPermissions()` is implemented. It also requires an existing SocialAccount, so cannot diagnose the current pre-save failure. Token-granted scopes do not establish App Review approval.
6. **Meta dashboard inspected after operator login.** The Instagram use case includes **API setup with Instagram login**, named `Wptour - IG`, with Instagram app ID `1038272018909541`, matching the live configuration. Its embed URL uses the correct Fizmoh Instagram callback. The account/token-generation section contains only **Add account**, with no account rows. The permissions table shows `instagram_business_basic` and `instagram_business_manage_messages` as **Ready for testing**, each with 0 API calls; `instagram_business_manage_comments` shows **Add to App Review**. These are the exact UI labels, not evidence of Advanced Access approval. **App roles → Instagram Testers** has no rows. The roles page warns that additional roles may exist through Meta Business Suite, so tester eligibility for the specific connecting account is not conclusively established by this empty list. No dashboard settings, roles, permissions, or tokens were changed or generated.

## Patch scope

Only the Instagram callback implementation delegates to a new `instagram-login.ts` helper. Facebook functions, Instagram sending adapter, webhook handlers, WhatsApp, billing, schema, and configuration are unchanged.

- Exchange the authorization code using the existing endpoint, then request a long-lived token at the documented unversioned endpoint and use the returned expiry.
- Fetch `/me` with `user_id,username`. On field/node error 100, inspect `id,username` and then a bare lookup; no POST or Facebook-host fallback.
- Require a professional-account `user_id` and username before saving. Fail closed if only an app-scoped ID is returned.
- Preserve large numeric identifiers and handle the documented single-item data wrapper.
- Use 10-second per-request timeouts and no-store requests. Diagnostics contain allowlisted metadata and a correlation ID, never tokens, provider bodies, or credential-bearing URLs.
- Add focused tests for token exchange, returned expiry, distinct IDs, JSON precision, field fallbacks, and credential-safe failures.

The existing release is retained as the rollback target. Local original: `/Users/nick/Downloads/linetrip/backups/instagram-audit-20260905/social-oauth.ts.bak`. Shipping uses only `scripts/ship.sh` with the two implementation files and new test file.

## Remaining live verification

### Fresh attempt after deployment

Follow-up attempt `b2af1887-ce71-4314-b326-891994bf40ef` again returned HTTP 400/code 100 at long-token exchange, trace `AJWAtugVHilaUBshro_1vsz`. Diagnostic release `20260905T060448Z` now performs up to three read-only short-token `/me` projections on exchange failure and logs redacted provider error messages. It still fails without saving a short-token account. Typecheck, 167 tests, build, and all three HTTP health checks passed. Previous release retained. No fresh OAuth attempt against these enhanced diagnostics has been verified yet.

Live Meta roles inspection subsequently showed **JIMC Studio — Tester — Pending**, explaining why the earlier invitation was not an Instagram invitation. After the correct Instagram tester form was prepared and the operator submitted it, Meta now confirms **jimcstudio — Instagram Tester — Pending**. The operator reports not seeing the acceptance UI yet. Meta's own row directs users to Instagram Apps and Websites. No invitation was accepted by the agent, and the existing regular tester role was left unchanged.

The operator identified the intended account as `@jimcstudio` and clarified the product is a SaaS. Meta's **Add account** dialog explicitly states that it invites a professional Instagram account into the Instagram tester role, and that the account must accept before generating test tokens; token generation requires a public account. The dialog was opened but Continue was not submitted, and no role was granted. This is only a development validation path. Production customer onboarding must use Instagram Business Login with Advanced Access approved for the requested basic, messaging, and comments permissions, rather than adding every customer as a tester.

Operator retried Connect at approximately 09:56 Muscat time. Correlation ID `369839c8-8b8a-4cef-8e70-b4e177df868e`: authorization-code exchange succeeded and returned the three requested business permissions; the corrected **unversioned** long-token exchange returned HTTP 400, code 100, Meta trace ID `AWF0c0iJDZwjkz5Vr8RNN_i`. Thus correcting the URL did **not** resolve the connection. This attempt stopped before profile requests, so the new minimal-field projections remain untested against a live token. No account was saved by this failed callback. The next step is identifying the connecting Instagram username and verifying its testing eligibility; absence from the dashboard lists is a lead, not proof of the API failure's cause.

Deployment completed successfully through `scripts/ship.sh`: release `20260905T055210Z`, serving PID 443621 on port 3013. Local typecheck, server typecheck, all 165 tests (402 assertions), and production build passed. `/admin`, `/api/health`, and `/api/tours` returned HTTP 200. Deployed helper checksum matches the local file; prior release `20260904T211118Z` remains present. Only the three specified files differed during staging. No fresh operator OAuth attempt has yet been verified.

After deployment, the operator must complete Settings → Facebook & Instagram → Instagram → Connect. Inspect the new correlated `[instagram-oauth]` events in `/home/fizmoh-platform/logs/app-error.log` for `short-token`, `long-token`, `profile`, and `profile-verified`. If the exchange or all profile projections fail, use the recorded Meta trace ID with the dashboard's Instagram Login setup, account membership, and access-level checks. Do not paste tokens into reports or logs.

Successful deployment health checks do not prove Instagram connection or messaging. A successful connection also needs the webhook subscription result and account routing verified before claiming Instagram messaging is working.

## Primary sources inspected in the browser

- [Meta Business Login for Instagram](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login) — updated March 13, 2026; documents short-token permissions, unversioned exchange, expiry, and Standard/Advanced Access requirements.
- [Meta Get Started](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/get-started) — documents `/me`, supported fields, and the distinction between `id` and `user_id`.

The generic error 100 does not itself establish a product mismatch, missing App Review, incorrect HTTP verb, or deprecated field. The original root cause remains unconfirmed until a fresh token is exercised.
