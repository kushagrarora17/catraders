#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SCRIPT="$ROOT/.github/scripts/resolve-deploy-sha.sh"
SHA=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
TIP=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
PASS=0

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

new_case() {
  CASE=$(mktemp -d)
  cat >"$CASE/gh" <<'MOCK'
#!/usr/bin/env bash
printf '%s\n' "$*" >>"$GH_CALL_LOG"
if [ "$1" = "api" ]; then
  printf '%s\n' "$TIP_SHA"
  exit 0
fi
echo "unexpected gh $*" >&2
exit 1
MOCK
  chmod +x "$CASE/gh"
  GH_CALL_LOG="$CASE/calls"
  : >"$GH_CALL_LOG"
  TIP_SHA="${TIP_SHA:-}"
  export GH_CALL_LOG TIP_SHA PATH="$CASE:$PATH"
  export REPO=acme/catraders GH_TOKEN=test
}

run_script() {
  local expect="$1"
  set +e
  output=$(bash "$SCRIPT" 2>"$CASE/err")
  code=$?
  set -e
  if [ "$code" -ne "$expect" ]; then
    cat "$CASE/err" >&2
    fail "$name exited $code, expected $expect"
  fi
  printf '%s' "$output"
}

name="manual dispatch prints the requested main SHA and does not read main"
new_case
export EVENT_NAME=workflow_dispatch REQUESTED_SHA="$SHA" GITHUB_REF=refs/heads/main
got=$(run_script 0)
[ "$got" = "$SHA" ] || fail "$name got $got"
[ ! -s "$GH_CALL_LOG" ] || fail "$name called gh"
PASS=$((PASS + 1))

name="manual dispatch of another ref fails"
new_case
export EVENT_NAME=workflow_dispatch REQUESTED_SHA="$SHA" GITHUB_REF=refs/heads/feature
run_script 1 >/dev/null
grep -F "refs/heads/main" "$CASE/err" >/dev/null || fail "$name message"
PASS=$((PASS + 1))

name="workflow_run prints the SHA when it is still the tip of main"
new_case
export EVENT_NAME=workflow_run REQUESTED_SHA="$SHA" GITHUB_REF=refs/heads/main TIP_SHA="$SHA"
got=$(run_script 0)
[ "$got" = "$SHA" ] || fail "$name got $got"
grep -q 'commits/main' "$GH_CALL_LOG" || fail "$name should read main"
PASS=$((PASS + 1))

name="workflow_run prints nothing when main has moved on"
new_case
export EVENT_NAME=workflow_run REQUESTED_SHA="$SHA" GITHUB_REF=refs/heads/main TIP_SHA="$TIP"
got=$(run_script 0)
[ -z "$got" ] || fail "$name should skip, got $got"
grep -F "Skipping deploy" "$CASE/err" >/dev/null || fail "$name should explain the skip"
PASS=$((PASS + 1))

name="normalizes uppercase SHAs"
new_case
upper=$(printf '%s' "$SHA" | tr '[:lower:]' '[:upper:]')
export EVENT_NAME=workflow_dispatch REQUESTED_SHA="$upper" GITHUB_REF=refs/heads/main
got=$(run_script 0)
[ "$got" = "$SHA" ] || fail "$name got $got"
PASS=$((PASS + 1))

name="rejects a non-SHA"
new_case
export EVENT_NAME=workflow_dispatch REQUESTED_SHA=main GITHUB_REF=refs/heads/main
run_script 1 >/dev/null
grep -F "unexpected revision" "$CASE/err" >/dev/null || fail "$name message"
PASS=$((PASS + 1))

echo "resolve-deploy-sha: $PASS cases passed"
