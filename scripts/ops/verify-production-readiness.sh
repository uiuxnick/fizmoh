#!/usr/bin/env bash
set -euo pipefail

# Fizmoh SaaS Production Readiness & Operational Health Check Script
# Usage:
#   ./scripts/ops/verify-production-readiness.sh [--remote root@187.127.119.207]

REMOTE_HOST="${1:-}"
if [[ "$REMOTE_HOST" == "--remote" ]]; then
  REMOTE_HOST="${2:-root@187.127.119.207}"
fi

echo "==> [1/3] Running TypeScript static analysis..."
./node_modules/.bin/tsc --noEmit
echo "    PASS: 0 TypeScript errors."

echo "==> [2/3] Running SaaS security & regression test suites..."
bun test tests/saas-phase1-security-audit.test.ts tests/saas-phase2-workflows.test.ts tests/saas-audit-isolation.test.ts
echo "    PASS: SaaS security & tenant isolation suites green."

if [[ -n "$REMOTE_HOST" ]]; then
  echo "==> [3/3] Checking remote production health on ${REMOTE_HOST}..."
  ssh -o BatchMode=yes -o ConnectTimeout=10 "$REMOTE_HOST" '
    set -euo pipefail
    echo "--- Systemd Services ---"
    systemctl is-active fizmoh-app-3019.service fizmoh-baileys-worker.service fizmoh-chat-read.service fizmoh-cron.timer
    echo "--- PostgreSQL Connection Budget ---"
    sudo -u postgres psql -Atc "SELECT usename, count(*) FROM pg_stat_activity GROUP BY usename ORDER BY count(*) DESC;"
    echo "--- HTTP Health Check ---"
    curl -fsS http://127.0.0.1:3019/api/health
    echo ""
  '
else
  echo "==> [3/3] Remote check skipped (pass --remote user@host to inspect production server)."
fi

echo "==> All readiness checks passed."
