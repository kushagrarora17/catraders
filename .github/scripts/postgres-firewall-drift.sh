#!/usr/bin/env bash
# Read-only. Compare the web app's possibleOutboundIpAddresses with the live
# Postgres firewall rules named webapp-<ip>. Does not create, change, or delete
# rules, and does not grant roles. github-runner-* rules are ignored.
#
# Tests pass DRIFT_POSSIBLE_IPS (comma-separated) and DRIFT_RULES_TSV
# (lines of "name<TAB>start<TAB>end") and do not call az.
set -euo pipefail

# Roles that already exist in iac/app/github.tf. Printed only when Azure refuses
# the read. This script does not assign them.
WEB_READ_ROLE="Reader"
FIREWALL_READ_ROLE="catraders-prod Postgres firewall rule manager"

explain_web_read() {
  cat <<EOF >&2
The deploy identity cannot read the web app (Microsoft.Web/sites/read).
Assign the built-in ${WEB_READ_ROLE} role on the web app or on the resource group.
Website Contributor on the web app also includes that action.
id-catraders-prod-github-deploy already has both in iac/app/github.tf
(Reader on the resource group, Website Contributor on the web app).
This workflow does not grant a role.
EOF
}

explain_firewall_read() {
  cat <<EOF >&2
The deploy identity cannot list Postgres firewall rules
(Microsoft.DBforPostgreSQL/flexibleServers/read and
Microsoft.DBforPostgreSQL/flexibleServers/firewallRules/read).
Assign the custom role "${FIREWALL_READ_ROLE}" on the Postgres server
(iac/app/github.tf already does), or the built-in ${WEB_READ_ROLE} role on that server.
This workflow does not grant a role.
EOF
}

is_auth_failure() {
  local file=$1
  grep -Eq 'AuthorizationFailed|Authorization_RequestDenied|does not have authorization' "$file"
}

fetch_possible_ips() {
  local err out
  err=$(mktemp)
  if ! out=$(az webapp show -g "$AZURE_RESOURCE_GROUP" -n "$AZURE_WEBAPP_NAME" --query possibleOutboundIpAddresses -o tsv 2>"$err"); then
    cat "$err" >&2
    if is_auth_failure "$err"; then
      explain_web_read
    fi
    rm -f "$err"
    return 1
  fi
  rm -f "$err"
  printf '%s\n' "$out"
}

fetch_rules_tsv() {
  local err out
  err=$(mktemp)
  if ! out=$(az postgres flexible-server firewall-rule list \
    -g "$AZURE_RESOURCE_GROUP" \
    -s "$AZURE_POSTGRES_SERVER" \
    --query "[?starts_with(name, 'webapp-')].[name,startIpAddress,endIpAddress]" \
    -o tsv 2>"$err"); then
    cat "$err" >&2
    if is_auth_failure "$err"; then
      explain_firewall_read
    fi
    rm -f "$err"
    return 1
  fi
  rm -f "$err"
  printf '%s\n' "$out"
}

# One IPv4 per line, sorted.
normalize_ips() {
  local raw=$1
  printf '%s\n' "$raw" | tr ',' '\n' | tr -d ' \t\r' | grep -E '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' | sort -u || true
}

# Reads rules TSV. Writes covered IPs to $2 and extra descriptions to $3.
split_rules() {
  local rules=$1
  local covered=$2
  local extra=$3
  : >"$covered"
  : >"$extra"
  local name start end
  while IFS=$'\t' read -r name start end; do
    name=${name//$'\r'/}
    start=${start//$'\r'/}
    end=${end//$'\r'/}
    [ -n "$name" ] || continue
    case "$name" in
      webapp-*) ;;
      *) continue ;;
    esac
    if [ "$start" = "$end" ] && printf '%s\n' "$start" | grep -Eq '^[0-9]{1,3}(\.[0-9]{1,3}){3}$'; then
      printf '%s\n' "$start" >>"$covered"
    else
      printf '%s %s-%s\n' "$name" "$start" "$end" >>"$extra"
    fi
  done <<<"$rules"
}

write_summary() {
  local body=$1
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    printf '%s\n' "$body" >>"$GITHUB_STEP_SUMMARY"
  fi
}

# compare POSSIBLE_RAW RULES_TSV
# Prints RESULT=ok or RESULT=drift plus MISSING/EXTRA lines. Returns 1 on drift.
compare() {
  local possible_raw=$1
  local rules=$2
  local work missing extra count other
  work=$(mktemp -d)
  normalize_ips "$possible_raw" >"$work/expected"
  split_rules "$rules" "$work/covered" "$work/extra-other"
  sort -u "$work/covered" -o "$work/covered"
  comm -23 "$work/expected" "$work/covered" >"$work/missing"
  comm -13 "$work/expected" "$work/covered" >"$work/extra-ips"

  if [ ! -s "$work/expected" ]; then
    echo "::error title=Firewall drift::possibleOutboundIpAddresses was empty, so every webapp-* rule would be wrong. Refusing to treat that as a match."
    write_summary $'## Postgres firewall drift\n\n`possibleOutboundIpAddresses` was empty.'
    rm -rf "$work"
    return 1
  fi

  if [ ! -s "$work/missing" ] && [ ! -s "$work/extra-ips" ] && [ ! -s "$work/extra-other" ]; then
    local count
    count=$(wc -l <"$work/expected" | tr -d ' ')
    echo "RESULT=ok count=${count}"
    echo "Postgres firewall matches the web app: ${count} possible outbound IPs, each with a webapp-* rule."
    write_summary "## Postgres firewall drift"$'\n\n'"Matched ${count} possible outbound IPs."
    rm -rf "$work"
    return 0
  fi

  echo "RESULT=drift"
  missing=$(paste -sd ', ' "$work/missing" || true)
  extra=$(paste -sd ', ' "$work/extra-ips" || true)
  if [ -s "$work/extra-other" ]; then
    local other
    other=$(paste -sd ', ' "$work/extra-other")
    if [ -n "$extra" ]; then
      extra="${extra}, ${other}"
    else
      extra=$other
    fi
  fi
  if [ -s "$work/missing" ]; then
    echo "MISSING ${missing}"
    echo "::error title=Firewall drift::Missing possible outbound IPs (no webapp-* rule): ${missing}"
  fi
  if [ -n "$extra" ]; then
    echo "EXTRA ${extra}"
    echo "::error title=Firewall drift::Extra webapp-* rules (not in possibleOutboundIpAddresses): ${extra}"
  fi
  write_summary "## Postgres firewall drift"$'\n\n'"Missing: ${missing:-none}"$'\n\n'"Extra: ${extra:-none}"
  rm -rf "$work"
  return 1
}

main() {
  local possible rules status
  if [ -n "${DRIFT_POSSIBLE_IPS+x}" ] || [ -n "${DRIFT_RULES_TSV+x}" ]; then
    if [ -z "${DRIFT_POSSIBLE_IPS+x}" ] || [ -z "${DRIFT_RULES_TSV+x}" ]; then
      echo "Set both DRIFT_POSSIBLE_IPS and DRIFT_RULES_TSV, or neither." >&2
      exit 1
    fi
    possible=$DRIFT_POSSIBLE_IPS
    rules=$DRIFT_RULES_TSV
  else
    : "${AZURE_RESOURCE_GROUP:?}"
    : "${AZURE_WEBAPP_NAME:?}"
    : "${AZURE_POSTGRES_SERVER:?}"
    possible=$(fetch_possible_ips)
    rules=$(fetch_rules_tsv)
  fi
  set +e
  compare "$possible" "$rules"
  status=$?
  set -e
  exit "$status"
}

main "$@"
