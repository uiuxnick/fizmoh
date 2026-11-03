#!/usr/bin/env bash
# Run on the verified app.fizmoh.cloud host after build/tests, never locally.
# Start and health-check the alternate backend before switching this vhost.
set -euo pipefail
ROOT=/home/fizmoh-platform
VHOST=/usr/local/lsws/conf/vhosts/app.fizmoh.cloud/vhost.conf
RELEASE=${1:?Pass the built release directory}
NEW_PORT=${2:?Pass the explicitly reserved alternate backend port}
[[ "$NEW_PORT" =~ ^[0-9]{4,5}$ && "$NEW_PORT" -ge 1024 && "$NEW_PORT" -le 65535 ]] || exit 1
NEW_UNIT="fizmoh-app-$NEW_PORT"
OLD_UNIT=${FIZMOH_ACTIVE_UNIT:-wptour}
[[ "$OLD_UNIT" =~ ^(wptour|fizmoh-blue|fizmoh-green|fizmoh-app-[0-9]{4,5})$ ]] || exit 1
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
[[ "$OLD_RELEASE" =~ ^/home/fizmoh-platform/releases/[0-9]{8}T[0-9]{6}Z$ && "$OLD_RELEASE" != "$RELEASE" && "$(readlink -f "$RELEASE")" == "$RELEASE" ]] || { echo 'Expected distinct canonical release directories'; exit 1; }
OLD_PORT=$(python3 - "$VHOST" <<'PY'
import re,sys
text=open(sys.argv[1]).read()
match=re.search(r'extprocessor\s+fizmoh-app-next\s*\{[^}]*?address\s+127\.0\.0\.1:([0-9]{4,5})\b', text, re.S)
if not match: raise SystemExit('Expected Fizmoh backend not found; refusing to edit vhost')
print(match[1])
PY
)
[[ "$NEW_PORT" != "$OLD_PORT" ]] || { echo 'Candidate needs a different port'; exit 1; }
systemctl is-active --quiet "$OLD_UNIT" || { echo 'Active backend service is not healthy'; exit 1; }
OLD_PID=$(systemctl show "$OLD_UNIT" -p MainPID --value)
[[ "$OLD_PID" =~ ^[1-9][0-9]*$ ]] || exit 1
ss -H -ltnp "sport = :$OLD_PORT" | grep -q "pid=$OLD_PID," || { echo 'Active unit does not own the vhost port'; exit 1; }
OLD_CWD=$(readlink -f "/proc/$OLD_PID/cwd")
[[ "$OLD_CWD" == "$OLD_RELEASE" || "$OLD_CWD" == "$OLD_RELEASE/.next/standalone" ]] || { echo 'Active process differs from current release'; exit 1; }
if systemctl is-active --quiet "$NEW_UNIT"; then echo 'Candidate backend is already active; inspect before retrying'; exit 1; fi
if ss -H -ltn "sport = :$NEW_PORT" | grep -q .; then echo 'Candidate port is occupied'; exit 1; fi
curl --fail --silent --max-time 5 "http://127.0.0.1:$OLD_PORT/api/health" | python3 -c 'import json,sys; d=json.load(sys.stdin); ok=d.get("status")=="healthy" and d.get("database")=="connected" and d.get("realtime") in ("redis", "local", "upstream"); sys.exit(0 if ok else "Shared realtime must be healthy before a two-process cutover")'
# Mutable invoice signatures must survive both cutover and rollback. Copying
# once is insufficient: an upload could arrive immediately after the copy.
python3 - "$ROOT" "$OLD_RELEASE" "$RELEASE" <<'PYMEDIA'
from pathlib import Path
import sys
root,old,new=map(Path,sys.argv[1:])
shared=(root/'shared').resolve()
for relative in ('public/invoice', '.next/standalone/public/invoice'):
    target=new/relative
    if not target.exists() or shared not in target.resolve().parents:
        raise SystemExit('Mutable invoice assets must use persistent shared directory before promotion')
PYMEDIA
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
  # Keep the candidate alive for any requests accepted before rollback.
  # Retiring either process is a separate, explicitly verified operation.
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
[[ "$READY" == 1 ]] || false
EXPECTED_RELEASE=$(curl --fail --silent --max-time 5 "http://127.0.0.1:$NEW_PORT/api/health" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("release") or "")')
RELEASE_BASENAME=$(basename "$RELEASE")
[[ "$EXPECTED_RELEASE" == "$RELEASE_BASENAME" ]] || false
curl --fail --silent --max-time 5 "http://127.0.0.1:$NEW_PORT/api/health" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("status")=="healthy" and d.get("database")=="connected" and d.get("realtime") in ("redis", "local", "upstream")'
NEW_PID=$(systemctl show "$NEW_UNIT" -p MainPID --value)
[[ "$NEW_PID" =~ ^[1-9][0-9]*$ ]] || false
ss -H -ltnp "sport = :$NEW_PORT" | grep -q "pid=$NEW_PID," || false
python3 - "$OLD_PID" "$NEW_PID" <<'PYREDIS'
from pathlib import Path
import sys
def transport(pid):
    values=dict(part.split(b'=',1) for part in Path(f'/proc/{pid}/environ').read_bytes().split(b'\0') if b'=' in part)
    return values.get(b'FIZMOH_REDIS_URL'), values.get(b'FIZMOH_REDIS_PREFIX', b'fizmoh:production')
a,b=map(transport,sys.argv[1:])
if a!=b:
    raise SystemExit('Running backends must share the same realtime broker and namespace')
PYREDIS
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
# Keep the old process and files available for existing requests and rollback.
# Do not impose an arbitrary timeout on active chat streams or prune releases.
trap - ERR
echo "Promoted $RELEASE on $NEW_PORT; retained $OLD_UNIT ($OLD_RELEASE). Verify stream continuity before any separate retirement."
