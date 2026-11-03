#!/usr/bin/env bash
set -euo pipefail
SOURCE=$(cd "$(dirname "$0")/.." && pwd)/scripts/promote-release.sh
TEST_ROOT=$(mktemp -d)
TEST_ROOT=$(cd "$TEST_ROOT" && pwd -P)
export TEST_ROOT
OLD="$TEST_ROOT/root/releases/20260909T180535Z"
NEW="$TEST_ROOT/root/releases/20260910T120000Z"
mkdir -p "$TEST_ROOT/bin" "$TEST_ROOT/systemd" "$TEST_ROOT/root/shared/invoice" "$OLD/.next/standalone" "$NEW/.next/standalone" "$OLD/public" "$NEW/public"
touch "$OLD/.next/standalone/server.js" "$NEW/.next/standalone/server.js"
ln -s "$TEST_ROOT/root/shared/invoice" "$OLD/public/invoice"
ln -s "$TEST_ROOT/root/shared/invoice" "$NEW/public/invoice"
cat > "$TEST_ROOT/bin/systemctl" <<'MOCK'
#!/bin/bash
if [[ "$1" == is-active ]]; then [[ "$3" == wptour ]]; exit; fi
if [[ "$1" == show ]]; then
  if [[ "$2" == wptour ]]; then echo 888; else echo 999; fi
  exit
fi
printf '%s\n' "$*" >> "$TEST_ROOT/actions"
MOCK
cat > "$TEST_ROOT/bin/openlitespeed" <<'MOCK'
#!/bin/bash
if [[ "${FAIL_PROXY:-0}" == 1 ]]; then echo '[ERROR] existing unrelated vhost'; fi
if [[ "${WARN_PROXY:-0}" == 1 ]]; then echo '[WARN] [123] reviewed warning'; exit 1; fi
MOCK
cat > "$TEST_ROOT/bin/curl" <<'MOCK'
#!/bin/bash
if [[ "$*" == *':3013/'* ]]; then
  echo "{\"status\":\"healthy\",\"database\":\"connected\",\"realtime\":\"${OLD_TRANSPORT:-redis}\"}"
else
  [[ "${FAIL_HEALTH:-0}" != 1 ]] || exit 22
  if [[ "$*" == *'https://'* && "${FAIL_PUBLIC:-0}" == 1 ]]; then exit 22; fi
  echo "{\"status\":\"healthy\",\"database\":\"connected\",\"realtime\":\"${NEW_TRANSPORT:-redis}\",\"release\":\"${RELEASE_ID-20260910T120000Z}\"}"
fi
MOCK
cat > "$TEST_ROOT/bin/mv" <<'MOCK'
#!/bin/bash
python3 - "$@" <<'PY'
import os,sys
os.replace(sys.argv[-2],sys.argv[-1])
PY
MOCK
cat > "$TEST_ROOT/bin/ss" <<'MOCK'
#!/bin/bash
if [[ "$*" == *':3013'* ]]; then echo "LISTEN users:((node,pid=${OWNER_PID:-888},fd=18))"; fi
if [[ "$*" == *':33018'* && "${BUSY_PORT:-0}" == 1 ]]; then echo 'LISTEN other-domain'; fi
if [[ "$*" == *':33018'* && "$*" == *'-ltnp'* ]]; then echo 'LISTEN users:((node,pid=999,fd=18))'; fi
exit 0
MOCK
cat > "$TEST_ROOT/bin/readlink" <<'MOCK'
#!/bin/bash
if [[ "$*" == *'/proc/888/cwd'* ]]; then echo "$TEST_ROOT/root/releases/20260909T180535Z/.next/standalone"; exit; fi
python3 - "$@" <<'PY'
import os,sys
print(os.path.realpath(sys.argv[-1]) if sys.argv[1]=='-f' else os.readlink(sys.argv[-1]))
PY
MOCK
for name in sleep flock; do printf '#!/bin/bash\nexit 0\n' > "$TEST_ROOT/bin/$name"; done
printf '#!/bin/bash\necho 0\n' > "$TEST_ROOT/bin/id"
chmod +x "$TEST_ROOT/bin/"*
python3 - "$SOURCE" "$TEST_ROOT" <<'PY'
from pathlib import Path
import sys
source=Path(sys.argv[1]).read_text(); root=sys.argv[2]
source=source.replace('/home/fizmoh-platform',root+'/root').replace('/usr/local/lsws/conf/vhosts/app.fizmoh.cloud/vhost.conf',root+'/vhost.conf').replace('/etc/systemd/system/',root+'/systemd/').replace('/usr/local/lsws/bin/openlitespeed',root+'/bin/openlitespeed').replace('/proc/',root+'/proc/')
Path(root+'/promote.sh').write_text(source)
PY
reset_fixture() {
  python3 - "$TEST_ROOT" "$OLD" <<'PY'
import os,sys,pathlib
root=pathlib.Path(sys.argv[1]); current=root/'root/current'
if current.is_symlink(): current.unlink()
current.symlink_to(sys.argv[2])
(root/'actions').write_text('')
for pid in ('888','999'):
    path=root/'proc'/pid
    path.mkdir(parents=True,exist_ok=True)
    (path/'environ').write_bytes(b'FIZMOH_REDIS_URL=redis://fixture-only:6379/9\0')
(root/'vhost.conf').write_text('extprocessor fizmoh-app-next {\n address 127.0.0.1:3013\n}\n')
PY
}
export PATH="$TEST_ROOT/bin:$PATH"
refuses_without_mutation() {
  local expected=$1
  shift
  reset_fixture
  if env "$@" bash "$TEST_ROOT/promote.sh" "$NEW" 33018 > "$TEST_ROOT/refusal.log" 2>&1; then echo "Expected refusal: $*"; exit 1; fi
  grep -Fq "$expected" "$TEST_ROOT/refusal.log"
  test ! -s "$TEST_ROOT/actions"
  grep -q 3013 "$TEST_ROOT/vhost.conf"
}
refuses_without_mutation "existing unrelated vhost" FAIL_PROXY=1
refuses_without_mutation "reviewed warning" WARN_PROXY=1
refuses_without_mutation "Shared realtime" OLD_TRANSPORT=invalid
refuses_without_mutation "Candidate port is occupied" BUSY_PORT=1
refuses_without_mutation "does not own" OWNER_PID=777
# A nonshared mutable file must block before service creation.
mkdir "$OLD/.next/standalone/public" "$OLD/.next/standalone/public/invoice"
refuses_without_mutation "Mutable invoice assets" OLD_TRANSPORT=redis
# Keep the unsafe fixture as evidence and use a shared path for success tests.
mv "$OLD/.next/standalone/public/invoice" "$OLD/.next/standalone/public/invoice.fixture-original"
ln -s "$TEST_ROOT/root/shared/invoice" "$OLD/.next/standalone/public/invoice"
mkdir -p "$NEW/.next/standalone/public"
ln -s "$TEST_ROOT/root/shared/invoice" "$NEW/.next/standalone/public/invoice"
for failure in FAIL_HEALTH=1 NEW_TRANSPORT=invalid RELEASE_ID= FAIL_PUBLIC=1 BROKER_MISMATCH=1; do
  reset_fixture
  if [[ "$failure" == BROKER_MISMATCH=1 ]]; then printf 'FIZMOH_REDIS_URL=redis://different-fixture:6379/9\0' > "$TEST_ROOT/proc/999/environ"; fi
  if env "$failure" bash "$TEST_ROOT/promote.sh" "$NEW" 33018 > "$TEST_ROOT/failed-cutover.log" 2>&1; then echo "Expected failed cutover: $failure"; exit 1; fi
  grep -q "start fizmoh-app-33018" "$TEST_ROOT/actions"
  test "$(readlink "$TEST_ROOT/root/current")" == "$OLD"
  grep -q 3013 "$TEST_ROOT/vhost.conf"
  ! grep -Eq 'stop|disable|kill' "$TEST_ROOT/actions"
done
reset_fixture
bash "$TEST_ROOT/promote.sh" "$NEW" 33018 > "$TEST_ROOT/success.log" 2>&1
test "$(readlink "$TEST_ROOT/root/current")" == "$NEW"
grep -q 33018 "$TEST_ROOT/vhost.conf"
! grep -Eq 'stop|disable|kill' "$TEST_ROOT/actions"
python3 - "$TEST_ROOT/actions" <<'PY'
import sys
lines=open(sys.argv[1]).read().splitlines()
assert lines.index('start fizmoh-app-33018') < lines.index('reload lsws')
PY
echo 'PASS: unsafe transport, occupied port, wrong process, unshared media and proxy errors refused; wrong/unhealthy candidates roll back; both processes retained'
