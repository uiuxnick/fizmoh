# Production deployment — 10 September 2026

Release: `/home/fizmoh-platform/releases/20260910T083700Z`
Previous: `/home/fizmoh-platform/releases/20260909T180535Z`
Active service: `fizmoh-green`, loopback port 3015. `wptour` retired after verified cutover and drain. Port 3014 was occupied and left untouched.

Server backups and validation logs: `/root/fizmoh-deploy-backups/20260910T083328Z/`. Includes original web-server configs, source manifest, domain response baselines, install/test/typecheck/build logs and `addon-prices-before.json`. The previous release remains present. No releases were deleted.

Validation: 265 tests passed, zero failed; strict TypeScript and production build passed. Build ran at low priority on two cores with an unreachable database override. `SKIP_SCHEMA_SYNC=1`; no migrations or seeds. Schema hashes match. Existing static assets were retained for old browser tabs. Source before edits matched production for every source/schema file.

The user approved shared proxy repairs and the ten catalog prices. No conversations, bot states, tenant settings, historical invoices or subscription snapshots were edited by deployment. The catalog transaction was backed up and a follow-up dry run found zero legacy prices remaining.

Post-cutover: public health identifies the new release and reports connected database, local realtime. All 28 mapped-domain status responses match the baseline. Admin and hospital pages and favicon/robots return 200; unauthenticated reports, customers and restaurant stream return 401. Live patient booking UI renders; no patient lookup, OTP, message or payment was submitted. Full authenticated channel/payment workflows were not exercised.

## Rollback

Use the new release helper to promote the retained previous release, which starts it on free port 3013 and switches only the app backend. The travel vhost immutable flag was restored after deployment. Temporarily remove it for OpenLiteSpeed validation/reload, and restore it even if rollback fails:

```bash
sudo bash -c '
set -e
trap "chattr +i /usr/local/lsws/conf/vhosts/travel.fizmoh.cloud/vhost.conf" EXIT
chattr -i /usr/local/lsws/conf/vhosts/travel.fizmoh.cloud/vhost.conf
SKIP_SCHEMA_SYNC=1 bash /home/fizmoh-platform/releases/20260910T083700Z/scripts/promote-release.sh /home/fizmoh-platform/releases/20260909T180535Z
'
```

The helper requires the exact reviewed warnings file `/home/fizmoh-platform/proxy-reviewed-warnings.txt`; any new diagnostics block promotion. Existing mail docroot/license/ownership warnings were not redesigned or silently ignored. Catalog prices are independent of application rollback and should remain at the approved values; their backup is for targeted recovery only.

Realtime remains opt-in local mode. No shared Redis environment changes were applied. Individual SSE connections may reconnect during backend retirement; status checks do not prove every customer session was uninterrupted.

Retirement detail: the old wptour process exceeded its 20-second systemd stop timeout and was killed after cutover/drain. MainPID became 0 and port 3013 was free; the expected retired-unit failure flag was cleared. The new service had zero restarts and no uncaught/unhandled/Prisma error markers in its startup log.
