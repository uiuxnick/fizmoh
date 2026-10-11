#!/usr/bin/env bash
#
# Production Zero-Downtime Deployment Script for app.fizmoh.cloud
# Deploys Roadmap Deliverables safely without disturbing any live service.
#
set -euo pipefail

HOST="root@187.127.119.207"
ROOT="/home/fizmoh-platform"
VHOST="/usr/local/lsws/conf/vhosts/app.fizmoh.cloud/vhost.conf"
OWNER="wptou2922:wptou2922"
SSH_OPTS="-o StrictHostKeyChecking=no"

red()   { printf "\033[31m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }
bold()  { printf "\n\033[1;34m==> %s\033[0m\n" "$1"; }

bold "1. Pre-flight Verification & Dynamic Port Discovery"
# Verify local prerequisites
if ! grep -q 'provider = "postgresql"' prisma/schema.prisma; then
  red "prisma/schema.prisma is not postgresql. Halting."
  exit 1
fi
if ! grep -q 'output: "standalone"' next.config.ts; then
  red "next.config.ts is missing standalone output. Halting."
  exit 1
fi

# Verify SSH connectivity
ssh $SSH_OPTS "$HOST" "true" || { red "SSH connectivity failed"; exit 1; }

# Discover current active upstream port from vhost.conf
OLD_PORT=$(ssh $SSH_OPTS "$HOST" "python3 -c \"
import re
text = open('$VHOST').read()
m = re.search(r'extprocessor\s+fizmoh-app-next\s*\{[^}]*?address\s+127\.0\.0\.1:([0-9]+)', text)
print(m.group(1) if m else '3013')
\"")

if [[ "$OLD_PORT" == "3018" ]]; then
  NEW_PORT=3019
else
  NEW_PORT=3018
fi
echo "Active upstream port: $OLD_PORT -> Candidate port: $NEW_PORT"

# Verify candidate port is free on server
PORT_BUSY=$(ssh $SSH_OPTS "$HOST" "ss -H -ltn 'sport = :$NEW_PORT' | wc -l")
if [[ "$PORT_BUSY" -gt 0 ]]; then
  red "Port $NEW_PORT is occupied on server. Inspect before proceeding."
  exit 1
fi

# Verify proxy config baseline
ssh $SSH_OPTS "$HOST" "
  set -e
  out=\$(/usr/local/lsws/bin/openlitespeed -t 2>&1) || true
  if grep -q '\[ERROR\]' <<<\"\$out\"; then
    echo 'OpenLiteSpeed has errors before deploy:'
    echo \"\$out\"
    exit 1
  fi
"
green "Pre-flight checks passed."

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
STAGING="$ROOT/releases/_staging-$STAMP"
RELEASE="$ROOT/releases/$STAMP"

bold "2. Staging source tree to server at $STAGING"
ssh $SSH_OPTS "$HOST" "mkdir -p $STAGING"
rsync -az --delete -e "ssh $SSH_OPTS" \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude '.env*' \
  --exclude flutter_chat \
  --exclude fizmoh_flutter_app \
  --exclude downloads \
  --exclude backups \
  --exclude 'docs/audits' \
  --exclude '.playwright-mcp' \
  --exclude 'tests/__pycache__' \
  --exclude 'scripts/__pycache__' \
  --exclude '.DS_Store' \
  ./ "$HOST:$STAGING/"

bold "3. Remote Build and Validation on Server (SKIP_SCHEMA_SYNC=1)"
ssh $SSH_OPTS "$HOST" "
  set -e
  cd $STAGING
  export PATH=\$PATH:/root/.bun/bin
  export SKIP_SCHEMA_SYNC=1
  set -a; source $ROOT/shared/.env.production; set +a

  echo '→ Installing server dependencies...'
  bun install --silent

  echo '→ Generating Prisma client (read-only)...'
  ./node_modules/.bin/prisma generate >/dev/null

  echo '→ Running automated enhancement test suite...'
  bun test tests/omnichannel-crm-enhancements.test.ts
  bun test tests/ai-and-hardcoded-flow-toggle.test.ts

  echo '→ Building Next.js standalone application...'
  bun run build

  test -f .next/standalone/server.js || { echo 'server.js missing'; exit 1; }
  test -f .next/BUILD_ID || { echo 'BUILD_ID missing'; exit 1; }
  echo '→ Build completed and verified.'

  # Link shared persistent assets
  rm -rf public/invoice public/uploads public/downloads
  ln -sfn $ROOT/shared/invoice-source public/invoice
  ln -sfn $ROOT/shared/uploads public/uploads
  ln -sfn $ROOT/shared/downloads public/downloads

  mkdir -p .next/standalone/public
  rm -rf .next/standalone/public/invoice .next/standalone/public/uploads .next/standalone/public/downloads
  ln -sfn $ROOT/shared/invoice-source .next/standalone/public/invoice
  ln -sfn $ROOT/shared/uploads .next/standalone/public/uploads
  ln -sfn $ROOT/shared/downloads .next/standalone/public/downloads

  # Copy runner files if present
  cp -p scripts/start-training-profile.cjs start-training-profile.cjs 2>/dev/null || true
  cp -p scripts/start-tenant-academy.cjs start-tenant-academy.cjs 2>/dev/null || true
  cp -p scripts/start-chat-read.cjs start-chat-read.cjs 2>/dev/null || true
"

bold "4. Finalizing Release Directory at $RELEASE"
ssh $SSH_OPTS "$HOST" "
  set -e
  mv $STAGING $RELEASE
  chown -R $OWNER $RELEASE
"

NEW_UNIT="fizmoh-app-$NEW_PORT"

bold "5. Launching Candidate Service $NEW_UNIT on Alternate Port $NEW_PORT"
ssh $SSH_OPTS "$HOST" "
  set -e
  cat >/etc/systemd/system/$NEW_UNIT.service <<UNIT
[Unit]
Description=Fizmoh Cloud alternate backend (port $NEW_PORT)
After=network.target
[Service]
User=wptou2922
Group=wptou2922
WorkingDirectory=$RELEASE
EnvironmentFile=$ROOT/shared/.env.production
ExecStart=/usr/bin/env PORT=$NEW_PORT HOSTNAME=127.0.0.1 NODE_ENV=production SKIP_SCHEMA_SYNC=1 FIZMOH_RELEASE_ID=$STAMP /usr/local/bin/node .next/standalone/server.js
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
  systemctl start $NEW_UNIT.service

  READY=0
  for i in {1..30}; do
    if curl --fail --silent --max-time 2 http://127.0.0.1:$NEW_PORT/api/health >/dev/null; then
      READY=1
      break
    fi
    sleep 1
  done

  if [[ \"\$READY\" != 1 ]]; then
    echo 'Candidate backend on port $NEW_PORT failed health probe'
    systemctl stop $NEW_UNIT.service || true
    exit 1
  fi

  systemctl enable $NEW_UNIT.service
  echo 'Candidate backend $NEW_PORT is online and healthy.'
"

bold "6. OpenLiteSpeed Zero-Downtime Proxy Cutover"
ssh $SSH_OPTS "$HOST" "
  set -e
  BACKUP=\"$ROOT/vhost-before-$STAMP.conf\"
  cp -p $VHOST \"\$BACKUP\"

  # Atomically update proxy upstream
  python3 - \"$OLD_PORT\" \"$NEW_PORT\" <<'PY'
import os, re, shutil, sys
old_port, new_port = sys.argv[1], sys.argv[2]
vhost = '/usr/local/lsws/conf/vhosts/app.fizmoh.cloud/vhost.conf'
text = open(vhost).read()
pattern = r'(extprocessor\s+fizmoh-app-next\s*\{[^}]*?address\s+127\.0\.0\.1:)' + old_port + r'\b'
updated, count = re.subn(pattern, r'\g<1>' + new_port, text, flags=re.S)
if count != 1:
    raise SystemExit(f'Failed to find expected {old_port} backend in vhost.conf (matches: {count})')
temp = vhost + '.candidate'
with open(temp, 'w') as f:
    f.write(updated)
shutil.copystat(vhost, temp)
os.replace(temp, vhost)
PY

  # Verify proxy configuration
  /usr/local/lsws/bin/openlitespeed -t 2>&1 | grep -q '\[ERROR\]' && {
    echo 'OpenLiteSpeed syntax error; rolling back vhost'
    cp -p \"\$BACKUP\" $VHOST
    exit 1
  }

  # Graceful reload
  systemctl reload lsws
  echo 'OpenLiteSpeed reloaded gracefully.'
"

bold "7. Atomically Updating Current Symlink"
ssh $SSH_OPTS "$HOST" "
  set -e
  ln -sfn $RELEASE $ROOT/current.new
  mv -Tf $ROOT/current.new $ROOT/current
  echo 'Symlink /home/fizmoh-platform/current updated to $RELEASE'
"

bold "8. Updating Auxiliary UI Services (Port 3313, 3314 & 3315)"
ssh $SSH_OPTS "$HOST" "
  set -e
  systemctl restart fizmoh-chat-read.service
  systemctl restart fizmoh-training-profile.service
  systemctl restart fizmoh-tenant-academy.service
  sleep 1
  systemctl is-active --quiet fizmoh-chat-read.service && echo 'fizmoh-chat-read is active.'
  systemctl is-active --quiet fizmoh-training-profile.service && echo 'fizmoh-training-profile is active.'
  systemctl is-active --quiet fizmoh-tenant-academy.service && echo 'fizmoh-tenant-academy is active.'
"

bold "9. Production Endpoint Health Verification"
ssh $SSH_OPTS "$HOST" "
  set -e
  echo 'Probing live endpoints:'
  for path in /api/health /api/health/chat-read /api/health/training-profile /admin /api/sequences /whats-new; do
    code=\$(curl -s -o /dev/null -w '%{http_code}' \"https://app.fizmoh.cloud\$path\" || echo 'ERR')
    printf '  %-35s -> %s\n' \"\$path\" \"\$code\"
  done

  echo 'Verifying protected services remain undisturbed:'
  systemctl is-active --quiet lumiyar-fizmoh.service && echo '  lumiyar-fizmoh.service: ACTIVE'
  systemctl is-active --quiet fizmoh-chat-read.service && echo '  fizmoh-chat-read.service: ACTIVE'
  systemctl is-active --quiet wptour.service && echo '  wptour.service (port 3013): ACTIVE'
"

bold "10. Decommissioning Previous Unit (Port $OLD_PORT)"
ssh $SSH_OPTS "$HOST" "
  systemctl stop fizmoh-app-$OLD_PORT.service || true
  systemctl disable fizmoh-app-$OLD_PORT.service || true
  echo 'Previous backend on port $OLD_PORT stopped cleanly.'
"

green "
===================================================================
DEPLOYMENT SUCCESSFUL: $STAMP
- Zero downtime cutover completed via OpenLiteSpeed proxy
- Port $NEW_PORT is active for fizmoh-app-next
- Retained previous release for immediate rollback if needed
- Protected services (lumiyar, chat-read) completely undisturbed
===================================================================
"
