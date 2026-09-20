#!/usr/bin/env bash
#
# Deploys the admin panel to app.fizmoh.cloud.
#
# Every step below exists because it was got wrong by hand at least once:
#
#   - The release directory carries a .env that nothing reads. The service
#     loads shared/.env.production, and systemd's environment beats a dotenv
#     file, so editing the release copy appears to work and changes nothing.
#     No .env is copied into a release any more.
#   - prisma/schema.prisma, next.config.ts and tsconfig.json were once behind
#     what production ran, and rsync happily overwrote the live ones with the
#     stale copies. The build now fails loudly if the schema is not PostgreSQL.
#   - A build that fails must never be promoted. The symlink is only moved
#     after a clean build and a passing test run.
#   - The previous release is kept, so a bad deploy is one command to undo.
#
# Usage:
#   scripts/deploy.sh              build, test and deploy
#   scripts/deploy.sh --rollback   put the previous release back
#

set -euo pipefail

# Normal releases never change database structure or customer configuration.
export SKIP_SCHEMA_SYNC=1

HOST="root@187.127.119.207"
ROOT="/home/fizmoh-platform"
SHARED="$ROOT/shared/.env.production"
OWNER="wptou2922:wptou2922"
SSH_OPTS="-o StrictHostKeyChecking=no"

red()   { printf "\033[31m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }
step()  { printf "\n\033[1m→ %s\033[0m\n" "$1"; }

if [[ -z "${SSHPASS:-}" ]]; then
  red "SSHPASS is not set. Export the server password before running this."
  exit 1
fi

# ── Rollback ─────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--rollback" ]]; then
  step "Rolling back to the previous release"
  sshpass -e ssh $SSH_OPTS "$HOST" "
    set -e
    cd $ROOT/releases
    current=\$(basename \$(readlink $ROOT/current))
    previous=\$(ls -1 | grep -v '^_' | sort | grep -B1 \"^\$current\$\" | head -1)
    if [[ -z \"\$previous\" || \"\$previous\" == \"\$current\" ]]; then
      echo 'No earlier release to roll back to.'; exit 1
    fi
    echo \"\$current -> \$previous\"
    bash $ROOT/current/scripts/promote-release.sh $ROOT/releases/\$previous
  "
  sleep 8
  green "Rolled back."
  exit 0
fi

# ── Guard against the config drift that has already cost a deploy ────────────
step "Checking local configuration"
if ! grep -q 'provider = "postgresql"' prisma/schema.prisma; then
  red "prisma/schema.prisma is not set to postgresql."
  red "Deploying it would overwrite production's schema with a local one."
  exit 1
fi
if ! grep -q 'output: "standalone"' next.config.ts; then
  red "next.config.ts is missing output: \"standalone\" — the server cannot start without it."
  exit 1
fi
green "Configuration looks right."

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
STAGING="$ROOT/releases/_staging-$STAMP"

step "Copying the tree to $STAGING"
sshpass -e rsync -az --delete -e "ssh $SSH_OPTS" \
  --exclude node_modules --exclude .next --exclude .git --exclude .env --exclude flutter_chat \
  ./ "$HOST:$STAGING/"

step "Installing, testing and building on the server"
# The build runs against the real environment, so a missing variable fails here
# rather than at the first request after the symlink moves.
sshpass -e ssh $SSH_OPTS "$HOST" "
  set -e
  cd $STAGING
  export PATH=\$PATH:/root/.bun/bin
  export SKIP_SCHEMA_SYNC=1
  set -a; source $SHARED; set +a

  bun install --silent
  # The local binary, not bun x — bun x fetches the newest CLI, which once
  # generated a v7 client into this v6 project and broke the build in a way
  # that looked like a source error.
  ./node_modules/.bin/prisma generate >/dev/null
  if [ "${SKIP_SCHEMA_SYNC:-1}" = "1" ]; then
    echo 'Skipping Prisma schema sync for this schema-free release.'
  else
    # The application role is pool-limited in production. Run the read/DDL
    # schema check through the local postgres socket so deploys do not compete
    # with tenant traffic for the app role's connection ceiling.
    chmod o+x $ROOT/releases $STAGING
    # Prisma 6.19's bundled WASM parser is not supported by the server's
    # runtime. Use the project's originally declared 6.11 CLI for the
    # schema check, with the native Node runtime and a socket URL that works
    # for the postgres OS user. Do not accept data loss during deployment.
    sudo -u postgres env PATH=/usr/local/bin:/usr/bin:/bin \
      DATABASE_URL='postgresql://postgres@localhost/wptour?host=/var/run/postgresql&schema=public' \
      npx --yes prisma@6.11.1 db push --schema=prisma/schema.prisma --skip-generate
    chmod o-x $STAGING
  fi
  # Seed/data maintenance is a separate, explicitly authorized operation.

  echo '── tests ──'
  bun test

  echo '── build ──'
  bun run build

  # The artefacts must exist before anything is promoted. A build whose output
  # was piped to grep once reported success on its exit code alone, and a
  # release with no server.js in it was made live.
  test -f .next/standalone/server.js || { echo 'No .next/standalone/server.js — the build did not produce a server.'; exit 1; }
  test -f .next/BUILD_ID || { echo 'No .next/BUILD_ID — the build did not finish.'; exit 1; }
"

step "Promoting the release"
sshpass -e ssh $SSH_OPTS "$HOST" "
  set -e
  RELEASE=$ROOT/releases/$STAMP
  mv $STAGING \$RELEASE
  chown -R $OWNER \$RELEASE

  bash \$RELEASE/scripts/promote-release.sh \$RELEASE

  # Keep the five most recent releases; a rollback only ever needs one.
  cd $ROOT/releases && ls -1 | grep -v '^_' | sort -r | tail -n +6 | xargs -r rm -rf
"

step "Waiting for the service"
sleep 9

step "Checking it is actually serving"
sshpass -e ssh $SSH_OPTS "$HOST" "
  set -e
  for path in /admin /api/health /api/tours; do
    code=\$(curl -s -o /dev/null -w '%{http_code}' https://app.fizmoh.cloud\$path)
    printf '  %-14s %s\n' \"\$path\" \"\$code\"
    if [[ \"\$code\" != '200' ]]; then
      echo 'Release is not healthy — roll back with: scripts/deploy.sh --rollback'
      exit 1
    fi
  done
"

green "
Deployed $STAMP.
Roll back with: scripts/deploy.sh --rollback"
