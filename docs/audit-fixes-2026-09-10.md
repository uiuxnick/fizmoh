# Audit fixes — 10 September 2026

The 18 audit items have code changes or a guarded operational procedure prepared in this workspace. They were **deployed on 10 September 2026** as release `20260910T083700Z`. Production conversations, flow state, tenant settings and schema were not modified by this deployment. Ten approved add-on catalog prices were corrected with a row backup and guarded transaction. Existing Flutter edits are untouched. No commit or push was made.

## Item-by-item status

| Audit item | Prepared correction | Verification / remaining live step |
|---|---|---|
| 1. Restaurant stream scope | Reject unresolved tokens; require exact tenant/order/table; include table IDs in events; clean up cancelled streams | Scope regression tests pass; no live stream interception |
| 2. Reports tenant leak | Verify staff session against resolved workspace before queries; explicit tenant filters; strip forged identity headers in proxy | Missing/mismatched tenant and CSV guard tests pass |
| 3. Deploy seeds | Normal deployment enforces SKIP_SCHEMA_SYNC=1 and no longer invokes seeds | Shell validation; production seeds not run |
| 4. Add-on price units | Seed values use baisa; targeted correction script defaults to dry-run and requires a backup for apply | Monthly OMR prices confirmed; all ten legacy catalog entries corrected and backed up |
| 5. Paid add-on interruption | Preserve current assignment while payment is pending; invoice records intended quantity; transaction claims and activates paid quantity once | Abandoned checkout, settlement failure rollback and retry/idempotency tests pass |
| 6. Browser permissions | Allow first-party device access on all application-shell entry paths and aliases, including root; retain restrictive defaults elsewhere | Covers client-side navigation from billing/settings to inbox; browser permission consent remains required |
| 7. Patient identity disclosure | Existing OTP flow verifies phone ownership; enforce matching tenant/customer phone for identification, bookings, registration and booking submission | Synthetic tenant/phone access tests; production OTP delivery not exercised |
| 8. Hospital fallback | Preserve unambiguous single-hospital setup; reject multiple hospitals without explicit selection | Single/multiple/configured hospital cases tested |
| 9. Restart downtime | Alternate backend promotion: preflight, candidate health, proxy validation, cutover, release identity check, drain and rollback | Mocked success/failure tests pass; actual cutover completed on port 3015 after authorized proxy repairs |
| 10. Misleading realtime badge | Connection status follows EventSource open/error; removes unconditional System Online claim | Compiles; optional Redis transport tested separately |
| 11. Unlabeled controls | English/Arabic text fields, AI/flow toggles, delete actions and mobile navigation have accessible names | Browser verified bilingual names using synthetic data |
| 12. Module codes | Billing uses canonical module registry labels | Browser verified readable social, vCard and website chat names |
| 13. Add-on invoice label | New add-on invoices have descriptive line items; legacy add-on fallback no longer claims a subscription plan | Browser verified Hospital Operations (Monthly), 49.000 OMR |
| 14. Run diagnostics | Read-only details show run ID, channel, current node, dates and sanitized failure category | Diagnostics tests verify secret/patient text is not echoed in summaries |
| 15. Full customer load | Bounded cursor pages; server search/tier filter; abort stale requests; next/previous UI and explicit loading errors | Route contract tests; browser checked 50 + 5 records and search reset to page 1 |
| 16. Process-local infrastructure | Opt-in Redis pub/sub and atomic shared rate limits; bounded local fallback; deny rate-limited actions if configured Redis is unavailable | Isolated Redis cross-process delivery, local deduplication and concurrent limit test passed; enable/configure before multiple production instances |
| 17. Strict TypeScript | Enable noImplicitAny, type affected callbacks, add JWT declaration package | Strict typecheck passed; runtime regression tests still required separately |
| 18. Duplicate titles | Page metadata leaves branding to root template | Production builds pass |

## Operational boundaries

### Deployment

`deploy.sh` now calls `promote-release.sh` instead of restarting the serving process directly. The helper is specific to the verified `/home/fizmoh-platform` installation and the `fizmoh-app-next` backend in the app.fizmoh.cloud vhost. It alternates 3013/3015, retains the previous release, and validates the candidate before retiring the old backend. SSE connections reconnect when the old backend drains; this is not a promise of uninterrupted individual sockets.

The user authorized repair of the shared web-server blockers. Backed-up repairs removed unsupported redundant travel directives, supplied the existing default PHP executable path, created the missing log directory, and removed nonexistent static-file overrides so the existing application backends serve those URLs. OpenLiteSpeed returns status 1 for warnings too; promotion accepts only the exact reviewed warning baseline and rejects errors or new diagnostics. A graceful reload and application cutover preserved status responses across 28 checked domains. See `deployment-2026-09-10.md` for rollback details.

Configure and verify `FIZMOH_REDIS_URL` and a deployment-specific `FIZMOH_REDIS_PREFIX` in the protected service environment before enabling shared transport. Redis code is opt-in. Its pub/sub does not provide durable event replay; persisted message data remains the source of truth. The first transition from the existing process-local release needs supervised channel/reconnect verification.

The test used an isolated, nonpersistent Redis instance on a unique Unix socket, reached through an SSH tunnel. It did not use the production Redis data store and was shut down afterward.

### Prices

`scripts/correct-addon-prices.cjs` changes only ten named OMR catalog entries whose monthly/yearly values exactly match the erroneous seed amounts. It skips custom/already-correct prices and never edits historical invoices or subscription snapshots. It prints changes by default. `--apply` requires a new `ADDON_PRICE_BACKUP` file and uses a transaction with compare-and-update guards. Applied to production: ten exact legacy catalog entries corrected; a subsequent dry run found none remaining.

### Validation

- Existing three required bot suites: 24 tests passed in this checkout.
- Full Bun suite: 265 passed, 0 failed across 31 files (includes isolated fixture and promotion tests).
- Strict TypeScript checking: passed with noImplicitAny enabled.
- Next.js production builds: passed with a deliberately unreachable local database URL. Expected unavailable-database messages came from build-time fallback reads; no production database was used.
- Browser verification used actual components bundled with synthetic API responses, not production mutations: customer pagination/search, bilingual field names, readable billing features and invoice descriptions. Billing had no horizontal overflow at 390px.
- Live backend/schema reference hashes matched the pre-edit workspace copies for billing.ts and schema.prisma. Schema remains byte-identical.
- No live end-to-end payment, Meta message, patient OTP, multi-instance cutover, or Flutter release verification is claimed.

Pre-edit filesystem snapshot: `/tmp/fizmoh-audit-before-20260910-120309`. This is a local work backup, not a production database backup.
