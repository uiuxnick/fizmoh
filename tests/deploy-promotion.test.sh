#!/usr/bin/env bash
set -euo pipefail
SOURCE=$(cd "$(dirname "$0")/.." && pwd)/scripts/promote-release.sh
TEST_ROOT=$(mktemp -d)
trap 'rm -rf "$TEST_ROOT"' EXIT
export TEST_ROOT
mkdir -p "$TEST_ROOT/bin" "$TEST_ROOT/systemd" "$TEST_ROOT/root/releases/20260909T180535Z/.next/standalone" "$TEST_ROOT/root/releases/20260910T120000Z/.next/standalone"
touch "$TEST_ROOT/root/releases/20260909T180535Z/.next/standalone/server.js" "$TEST_ROOT/root/releases/20260910T120000Z/.next/standalone/server.js"
cat > "$TEST_ROOT/bin/systemctl" <<'MOCK'
#!/bin/bash
printf '%s\n' "$*" >> "$TEST_ROOT/actions"
if [[ "$1" == is-active ]]; then [[ "$3" == wptour ]]; fi
MOCK
cat > "$TEST_ROOT/bin/openlitespeed" <<'MOCK'
#!/bin/bash
if [[ "${FAIL_PROXY:-0}" == 1 ]]; then echo '[ERROR] existing unrelated vhost'; fi
if [[ "${WARN_PROXY:-0}" == 1 ]]; then echo '[WARN] [123] reviewed warning'; exit 1; fi
exit 0
MOCK
cat > "$TEST_ROOT/bin/curl" <<'MOCK'
#!/bin/bash
[[ "${FAIL_HEALTH:-0}" != 1 ]] || exit 22
echo '{"status":"healthy","release":"20260910T120000Z"}'
MOCK
cat > "$TEST_ROOT/bin/mv" <<'MOCK'
#!/bin/bash
python3 - "$@" <<'PY'
import os,sys
os.replace(sys.argv[-2],sys.argv[-1])
PY
MOCK
for name in sleep ss flock; do printf '#!/bin/bash\nexit 0\n' > "$TEST_ROOT/bin/$name"; done
printf '#!/bin/bash\necho 0\n' > "$TEST_ROOT/bin/id"
chmod +x "$TEST_ROOT/bin/"*
python3 - "$SOURCE" "$TEST_ROOT" <<'PY'
import pathlib,sys
source=pathlib.Path(sys.argv[1]).read_text(); root=sys.argv[2]
source=source.replace('/home/fizmoh-platform',root+'/root').replace('/usr/local/lsws/conf/vhosts/app.fizmoh.cloud/vhost.conf',root+'/vhost.conf').replace('/etc/systemd/system/',root+'/systemd/').replace('/usr/local/lsws/bin/openlitespeed',root+'/bin/openlitespeed')
pathlib.Path(root+'/promote.sh').write_text(source)
PY
reset_fixture() {
  rm -f "$TEST_ROOT/root/current" "$TEST_ROOT/actions"
  ln -s "$TEST_ROOT/root/releases/20260909T180535Z" "$TEST_ROOT/root/current"
  printf 'extprocessor fizmoh-app-next {\n address 127.0.0.1:3013\n}\n' > "$TEST_ROOT/vhost.conf"
}
export PATH="$TEST_ROOT/bin:$PATH"
reset_fixture
if FAIL_PROXY=1 bash "$TEST_ROOT/promote.sh" "$TEST_ROOT/root/releases/20260910T120000Z" > "$TEST_ROOT/proxy.log" 2>&1; then echo 'Invalid proxy must refuse promotion'; exit 1; fi
test ! -e "$TEST_ROOT/actions"
reset_fixture
if WARN_PROXY=1 bash "$TEST_ROOT/promote.sh" "$TEST_ROOT/root/releases/20260910T120000Z" > "$TEST_ROOT/warning.log" 2>&1; then echo 'Unreviewed warning must refuse promotion'; exit 1; fi
test ! -e "$TEST_ROOT/actions"
printf '[WARN] reviewed warning\n' > "$TEST_ROOT/root/proxy-reviewed-warnings.txt"
WARN_PROXY=1 bash "$TEST_ROOT/promote.sh" "$TEST_ROOT/root/releases/20260910T120000Z" > "$TEST_ROOT/reviewed.log" 2>&1
rm "$TEST_ROOT/root/proxy-reviewed-warnings.txt"
reset_fixture
if FAIL_HEALTH=1 bash "$TEST_ROOT/promote.sh" "$TEST_ROOT/root/releases/20260910T120000Z" > "$TEST_ROOT/health.log" 2>&1; then echo 'Unhealthy candidate must refuse promotion'; exit 1; fi
test "$(readlink "$TEST_ROOT/root/current")" == "$TEST_ROOT/root/releases/20260909T180535Z"
grep -q 3013 "$TEST_ROOT/vhost.conf"
reset_fixture
bash "$TEST_ROOT/promote.sh" "$TEST_ROOT/root/releases/20260910T120000Z" > "$TEST_ROOT/success.log" 2>&1
test "$(readlink "$TEST_ROOT/root/current")" == "$TEST_ROOT/root/releases/20260910T120000Z"
grep -q 3015 "$TEST_ROOT/vhost.conf"
python3 - "$TEST_ROOT/actions" <<'PY'
import sys
lines=open(sys.argv[1]).read().splitlines()
assert lines.index('start fizmoh-green') < lines.index('reload lsws') < lines.index('disable --now wptour')
PY
echo 'PASS: invalid proxy and unhealthy candidates leave old backend intact; healthy candidate starts before cutover and retirement'
