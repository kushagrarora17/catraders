#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SCRIPT="$ROOT/.github/scripts/postgres-firewall-drift.sh"
PASS=0

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

run_script() {
  local expect=$1
  set +e
  output=$(bash "$SCRIPT" 2>"$CASE/err")
  code=$?
  set -e
  if [ "$code" -ne "$expect" ]; then
    cat "$CASE/err" >&2
    printf '%s\n' "$output" >&2
    fail "$name exited $code, expected $expect"
  fi
  printf '%s\n' "$output"
}

new_case() {
  CASE=$(mktemp -d)
  unset DRIFT_POSSIBLE_IPS DRIFT_RULES_TSV
  export GITHUB_STEP_SUMMARY="$CASE/summary"
  : >"$GITHUB_STEP_SUMMARY"
}

rule() {
  # name start end
  printf '%s\t%s\t%s\n' "$1" "$2" "$3"
}

name="matching single-IP rules pass, ignoring order and a github-runner line"
new_case
export DRIFT_POSSIBLE_IPS="20.1.2.3, 10.0.0.5"
DRIFT_RULES_TSV="$(rule webapp-10-0-0-5 10.0.0.5 10.0.0.5; rule webapp-20-1-2-3 20.1.2.3 20.1.2.3; rule github-runner-1 1.2.3.4 1.2.3.4)"
export DRIFT_RULES_TSV
got=$(run_script 0)
grep -F "RESULT=ok count=2" <<<"$got" >/dev/null || fail "$name result"
grep -F "2 possible outbound IPs" <<<"$got" >/dev/null || fail "$name message"
grep -F "Matched 2" "$GITHUB_STEP_SUMMARY" >/dev/null || fail "$name summary"
PASS=$((PASS + 1))

name="missing and extra IPs fail and are listed"
new_case
export DRIFT_POSSIBLE_IPS="10.0.0.1,10.0.0.2"
DRIFT_RULES_TSV="$(rule webapp-10-0-0-1 10.0.0.1 10.0.0.1; rule webapp-10-9-9-9 10.9.9.9 10.9.9.9)"
export DRIFT_RULES_TSV
got=$(run_script 1)
grep -F "MISSING 10.0.0.2" <<<"$got" >/dev/null || fail "$name missing"
grep -F "EXTRA 10.9.9.9" <<<"$got" >/dev/null || fail "$name extra"
grep -F "Missing possible outbound IPs" <<<"$got" >/dev/null || fail "$name annotation"
grep -F "10.0.0.2" "$GITHUB_STEP_SUMMARY" >/dev/null || fail "$name summary"
PASS=$((PASS + 1))

name="a webapp rule that is not a single IP is extra and does not cover the start address"
new_case
export DRIFT_POSSIBLE_IPS="10.0.0.1"
DRIFT_RULES_TSV="$(rule webapp-10-0-0-0 10.0.0.0 10.0.0.255)"
export DRIFT_RULES_TSV
got=$(run_script 1)
grep -F "MISSING 10.0.0.1" <<<"$got" >/dev/null || fail "$name missing"
grep -F "EXTRA webapp-10-0-0-0 10.0.0.0-10.0.0.255" <<<"$got" >/dev/null || fail "$name extra"
PASS=$((PASS + 1))

name="empty possible outbound list fails instead of matching nothing"
new_case
export DRIFT_POSSIBLE_IPS=""
export DRIFT_RULES_TSV=""
got=$(run_script 1)
grep -F "possibleOutboundIpAddresses was empty" <<<"$got" >/dev/null || fail "$name message"
PASS=$((PASS + 1))

name="web app authorization failure names Reader and does not grant it"
new_case
cat >"$CASE/az" <<'EOF'
#!/usr/bin/env bash
echo "ERROR: (AuthorizationFailed) does not have authorization to perform action 'Microsoft.Web/sites/read'" >&2
exit 1
EOF
chmod +x "$CASE/az"
export PATH="$CASE:$PATH"
export AZURE_RESOURCE_GROUP=rg AZURE_WEBAPP_NAME=app AZURE_POSTGRES_SERVER=psql
got=$(run_script 1)
grep -F "built-in Reader role" "$CASE/err" >/dev/null || fail "$name role"
grep -F "does not grant a role" "$CASE/err" >/dev/null || fail "$name no grant"
grep -F "Microsoft.Web/sites/read" "$CASE/err" >/dev/null || fail "$name action"
PASS=$((PASS + 1))

name="firewall authorization failure names the custom role"
new_case
cat >"$CASE/az" <<'EOF'
#!/usr/bin/env bash
if [ "$1" = "webapp" ]; then
  printf '%s\n' "10.0.0.1"
  exit 0
fi
echo "ERROR: (AuthorizationFailed) does not have authorization to perform action 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules/read'" >&2
exit 1
EOF
chmod +x "$CASE/az"
export PATH="$CASE:$PATH"
export AZURE_RESOURCE_GROUP=rg AZURE_WEBAPP_NAME=app AZURE_POSTGRES_SERVER=psql
got=$(run_script 1)
grep -F 'catraders-prod Postgres firewall rule manager' "$CASE/err" >/dev/null || fail "$name role"
grep -F "firewallRules/read" "$CASE/err" >/dev/null || fail "$name action"
grep -F "does not grant a role" "$CASE/err" >/dev/null || fail "$name no grant"
grep -F "Microsoft.Web/sites/read" "$CASE/err" >/dev/null && fail "$name should not ask for the web app role"
PASS=$((PASS + 1))

name="a non-auth Azure error does not invent a role assignment"
new_case
cat >"$CASE/az" <<'EOF'
#!/usr/bin/env bash
echo "ERROR: (ResourceNotFound) the web app was not found" >&2
exit 1
EOF
chmod +x "$CASE/az"
export PATH="$CASE:$PATH"
export AZURE_RESOURCE_GROUP=rg AZURE_WEBAPP_NAME=app AZURE_POSTGRES_SERVER=psql
got=$(run_script 1)
grep -F "ResourceNotFound" "$CASE/err" >/dev/null || fail "$name error"
grep -F "does not grant a role" "$CASE/err" >/dev/null && fail "$name should not print role help"
PASS=$((PASS + 1))

echo "postgres-firewall-drift: $PASS cases passed"
