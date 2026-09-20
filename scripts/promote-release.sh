#!/usr/bin/env bash
# Run on the verified app.fizmoh.cloud host after build/tests, never locally.
# Start and health-check the alternate backend before switching this vhost.
set -euo pipefail
ROOT=/home/fizmoh-platform
VHOST=/usr/local/lsws/conf/vhosts/app.fizmoh.cloud/vhost.conf
RELEASE=${1:?Pass the built release directory}
[[ "$RELEASE" =~ ^/home/fizmoh-platform/releases/[0-9]{8}T[0-9]{6}Z$ && -f "$RELEASE/.next/standalone/server.js" ]] || exit 1
[[ $(id -u) == 0 ]] || { echo 'Root is required for service promotion'; exit 1; }
validate_proxy() {
  local output status=0
  output=$(/usr/local/lsws/bin/openlitespeed -t 2>&1) || status=$?
  if grep -q '\[ERROR\]' <<<"$output"; then printf '%s\n' "$output"; return 1; fi
  # OpenLiteSpeed 1.8 returns 1 for warning-only output too. Accept only
  # the exact warnings reviewed on this host; new diagnostics still block.
  if [[ "$status" != 0 || -n "$output" ]]; then
    [[ "$status" == 0 || "$status" == 1 ]] || return 1
    [[ -f "$ROOT/proxy-reviewed-warnings.txt" ]] || { printf '%s\n' "$output"; return 1; }
    diff -u "$ROOT/proxy-reviewed-warnings.txt" <(printf '%s\n' "$output" | sed -E '/^[[:space:]]*$/d; s/^.*\[WARN\] \[[0-9]+\] /[WARN] /') || return 1
  fi
}
# Validate before touching services or configuration, including errors the
# proxy reports with a zero exit status. Other domains are never repaired here.
validate_proxy
exec 9>"$ROOT/promote.lock"
flock -n 9 || { echo 'Another promotion is running'; exit 1; }
OLD_RELEASE=$(readlink -f "$ROOT/current")
OLD_PORT=$(python3 - "$VHOST" <<'PY'
import re,sys
text=open(sys.argv[1]).read()
match=re.search(r'extprocessor\s+fizmoh-app-next\s*\{[^}]*?address\s+127\.0\.0\.1:(3013|3015)\b', text, re.S)
if not match: raise SystemExit('Expected Fizmoh backend not found; refusing to edit vhost')
print(match[1])
PY
)
if [[ "$OLD_PORT" == 3013 ]]; then
  NEW_PORT=3015; NEW_UNIT=fizmoh-green; OLD_UNIT=fizmoh-blue
  if systemctl is-active --quiet wptour; then OLD_UNIT=wptour; fi
else
  NEW_PORT=3013; NEW_UNIT=fizmoh-blue; OLD_UNIT=fizmoh-green
fi
systemctl is-active --quiet "$OLD_UNIT" || { echo 'Active backend service is not healthy'; exit 1; }
if systemctl is-active --quiet "$NEW_UNIT"; then echo 'Alternate backend is already active; inspect before retrying'; exit 1; fi
if ss -H -ltn "sport = :$NEW_PORT" | grep -q .; then echo 'Alternate port is occupied'; exit 1; fi
BACKUP="$ROOT/vhost-before-$(date -u +%Y%m%dT%H%M%SZ).conf"
cp -p "$VHOST" "$BACKUP"
SWITCHED=0
rollback() {
  local result=$?
  trap - ERR
  if [[ "$SWITCHED" == 1 ]]; then
    cp -p "$BACKUP" "$VHOST"
    ln -sfn "$OLD_RELEASE" "$ROOT/current.recovery"
    mv -Tf "$ROOT/current.recovery" "$ROOT/current"
    systemctl reload lsws || true
  fi
  systemctl disable --now "$NEW_UNIT" || true
  echo "Promotion failed; previous backend retained. Vhost backup: $BACKUP"
  exit "$result"
}
trap rollback ERR
cat >"/etc/systemd/system/$NEW_UNIT.service" <<UNIT
[Unit]
Description=Fizmoh Cloud alternate backend
After=network.target
[Service]
User=wptou2922
Group=wptou2922
WorkingDirectory=$RELEASE
EnvironmentFile=$ROOT/shared/.env.production
ExecStart=/usr/bin/env PORT=$NEW_PORT HOSTNAME=127.0.0.1 NODE_ENV=production SKIP_SCHEMA_SYNC=1 FIZMOH_RELEASE_ID=$(basename "$RELEASE") /usr/local/bin/node .next/standalone/server.js
Restart=on-failure
RestartSec=3
TimeoutStopSec=60
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true
UMask=027
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl start "$NEW_UNIT"
READY=0
for attempt in {1..30}; do
  if curl --fail --silent --max-time 2 "http://127.0.0.1:$NEW_PORT/api/health" > /dev/null; then READY=1; break; fi
  sleep 1
done
[[ "$READY" == 1 ]]
EXPECTED_RELEASE=$(curl --fail --silent --max-time 5 "http://127.0.0.1:$NEW_PORT/api/health" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("release") or "")')
[[ -z "$EXPECTED_RELEASE" || "$EXPECTED_RELEASE" == "$(basename "$RELEASE")" ]]
systemctl enable "$NEW_UNIT"
SWITCHED=1
python3 - "$VHOST" "$OLD_PORT" "$NEW_PORT" <<'PY'
import os,re,shutil,sys
path,old,new=sys.argv[1:]
text=open(path).read()
pattern=r'(extprocessor\s+fizmoh-app-next\s*\{[^}]*?address\s+127\.0\.0\.1:)'+old+r'\b'
updated,count=re.subn(pattern,lambda match:match[1]+new,text,flags=re.S)
if count != 1: raise SystemExit('Backend changed during promotion')
temporary=path+'.candidate'
with open(temporary,'w') as output: output.write(updated)
shutil.copystat(path,temporary)
os.replace(temporary,path)
PY
validate_proxy
systemctl reload lsws
curl --fail --silent --max-time 10 --resolve app.fizmoh.cloud:443:127.0.0.1 https://app.fizmoh.cloud/api/health | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data.get("status") == "healthy" and (not sys.argv[1] or data.get("release") == sys.argv[1])' "$EXPECTED_RELEASE"
ln -sfn "$RELEASE" "$ROOT/current.new"
mv -Tf "$ROOT/current.new" "$ROOT/current"
# Existing requests get a drain window; SSE clients reconnect to the new backend.
sleep 30
curl --fail --silent --max-time 5 "http://127.0.0.1:$NEW_PORT/api/health" >/dev/null
# After cutover is verified, retiring the old service is best-effort. Do not
# roll back to a stopped backend if retirement itself reports an error.
trap - ERR
systemctl disable --now "$OLD_UNIT" || echo "Old backend needs manual retirement: $OLD_UNIT"
echo "Promoted $RELEASE on $NEW_PORT; previous release retained at $OLD_RELEASE"
