#!/usr/bin/env bash
#
# Ships changed files to app.fizmoh.cloud without ever rsyncing this machine's
# tree at the server.
#
# scripts/deploy.sh rsyncs local → server with --delete. On 2026-09-01 the
# local checkout was found empty, which would have made that command erase
# production. This stages from the server's *own* current release instead, so
# the worst case is a release identical to the one already running.
#
# Every check below is a separate statement on its own line. An earlier version
# wrote `test -f .next/BUILD_ID && echo OK`, and because a failing `&&` list is
# not an error under `set -e`, a release whose build had failed was promoted
# and the site went down until it was rolled back by hand.
#
# Usage: SSHPASS=... scripts/ship.sh src/lib/db.ts src/components/foo.tsx

set -euo pipefail

HOST="root@187.127.119.207"
ROOT="/home/fizmoh-platform"
OWNER="wptou2922:wptou2922"
SSH_OPTS="-o StrictHostKeyChecking=no"

# Key auth is the normal path now. sshpass stays supported only so an
# existing SSHPASS in the environment keeps working unchanged.
if [[ -n "${SSHPASS:-}" ]]; then
  SSH="$SSH"
  SCP="$SCP"
else
  ssh -o BatchMode=yes $SSH_OPTS "$HOST" true >/dev/null 2>&1 || {
    echo "No SSHPASS set and key auth to $HOST failed."; exit 1; }
  SSH="ssh"
  SCP="scp"
fi
[[ $# -gt 0 ]] || { echo "Usage: scripts/ship.sh <file> [file...]"; exit 1; }

for f in "$@"; do
  [[ -f "$f" ]] || { echo "No such file: $f"; exit 1; }
done

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
STAGING="$ROOT/releases/_staging-$STAMP"
say() { printf "\n\033[1m→ %s\033[0m\n" "$1"; }

# Computed here, on the machine that actually has "$@" — the remote command
# below is one opaque string handed to ssh, so a "$@" written inside it would
# refer to nothing and silently expand empty.
NEEDS_INSTALL=false
for f in "$@"; do
  [[ "$f" == "package.json" ]] && NEEDS_INSTALL=true
done

say "Staging from the release that is currently serving"
$SSH $SSH_OPTS "$HOST" "set -e; mkdir -p $STAGING; rsync -a --exclude .next $ROOT/current/ $STAGING/"

say "Copying $# changed file(s)"
for f in "$@"; do
  $SSH $SSH_OPTS "$HOST" "mkdir -p $STAGING/$(dirname "$f")"
  $SCP $SSH_OPTS "$f" "$HOST:$STAGING/$f"
done

say "What differs from what is live"
$SSH $SSH_OPTS "$HOST" \
  "diff -rq --exclude=.next --exclude=node_modules $ROOT/current $STAGING 2>/dev/null | sed 's#.*/current/##;s# and .*##'" || true

say "Typecheck, tests, build"
# No pipes around the commands whose exit status matters: a pipeline reports
# the last command's status, which is how a failed build looked like a pass.
$SSH $SSH_OPTS "$HOST" "
  set -e
  cd $STAGING
  export PATH=\$PATH:/root/.bun/bin
  set -a; source $ROOT/shared/.env.production; set +a
  # Staging is an rsync of the release that's currently live, which carries
  # that release's node_modules — so a package.json naming a dependency that
  # was never installed on the server ships silently broken: the file list
  # said the dependency arrived, tsc had no way to know otherwise, and the
  # build failed on the first import of it. Skipped for the common case where
  # package.json isn't one of the files being shipped.
  if $NEEDS_INSTALL; then
    bun install
  fi
  # The Prisma client is generated from schema.prisma, so a release that
  # changes the schema must regenerate it before anything typechecks against
  # it. Generation is read-only with respect to the database — it does not
  # migrate, push or touch data.
  ./node_modules/.bin/prisma generate >/dev/null
  ./node_modules/.bin/tsc --noEmit
  bun test
  bun run build
  if [ ! -f .next/standalone/server.js ]; then echo 'No server.js — the build produced no server.'; exit 1; fi
  if [ ! -f .next/BUILD_ID ]; then echo 'No BUILD_ID — the build did not finish.'; exit 1; fi
  echo 'Build verified.'
"

say "Promoting"
$SSH $SSH_OPTS "$HOST" "
  set -e
  PREV=\$(readlink -f $ROOT/current)
  echo \"rollback target: \$PREV\"
  mv $STAGING $ROOT/releases/$STAMP
  chown -R $OWNER $ROOT/releases/$STAMP
  ln -sfn $ROOT/releases/$STAMP $ROOT/current.new
  mv -Tf $ROOT/current.new $ROOT/current
  systemctl restart wptour
  sleep 9
  systemctl is-active wptour
"

say "Checking it serves"
for path in /admin /api/health /api/tours; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://app.fizmoh.cloud$path")
  printf "  %-14s %s\n" "$path" "$code"
  [[ "$code" == "200" ]] || { echo "FAILED — roll back with scripts/rollback.sh"; exit 1; }
done
printf "\n\033[32mShipped %s.\033[0m\n" "$STAMP"
