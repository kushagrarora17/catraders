#!/usr/bin/env bash
# Exercises the Dependabot follow-up dispatch against a fake gh.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SCRIPT="$ROOT/.github/scripts/dispatch-ci-after-automerge.sh"
HEAD=1111111111111111111111111111111111111111
MERGE=2222222222222222222222222222222222222222
OTHER=3333333333333333333333333333333333333333
BRANCH=dependabot/all-9afd102819
REPO_NAME=acme/catraders
PASS=0

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

new_case() {
  CASE=$(mktemp -d)
  GH_DIR="$CASE"
  GH_CALL_LOG="$CASE/calls"
  : >"$GH_CALL_LOG"
  mkdir -p "$CASE/bin"
  cat >"$CASE/bin/gh" <<'MOCK'
#!/usr/bin/env bash
printf '%s\n' "$*" >>"$GH_CALL_LOG"
case "$1" in
  pr)
    case "$2" in
      list)
        cat "$GH_DIR/pr-list.json"
        ;;
      view)
        if [ ! -f "$GH_DIR/pr-view.json" ]; then
          echo "unexpected pr view" >&2
          exit 1
        fi
        cat "$GH_DIR/pr-view.json"
        ;;
      *)
        echo "unexpected pr $2" >&2
        exit 1
        ;;
    esac
    ;;
  api)
    case "$2" in
      */commits/main)
        cat "$GH_DIR/main-sha"
        ;;
      */pulls)
        if [ ! -f "$GH_DIR/pulls.json" ]; then
          echo "unexpected pulls lookup" >&2
          exit 1
        fi
        cat "$GH_DIR/pulls.json"
        ;;
      *)
        echo "unexpected api $2" >&2
        exit 1
        ;;
    esac
    ;;
  run)
    if [ ! -f "$GH_DIR/runs.json" ]; then
      echo "unexpected run list" >&2
      exit 1
    fi
    cat "$GH_DIR/runs.json"
    ;;
  workflow)
    if [ -f "$GH_DIR/main-sha-after" ]; then
      cp "$GH_DIR/main-sha-after" "$GH_DIR/main-sha"
    fi
    if [ -f "$GH_DIR/runs-after.json" ]; then
      cp "$GH_DIR/runs-after.json" "$GH_DIR/runs.json"
    fi
    ;;
  *)
    echo "unexpected gh $*" >&2
    exit 1
    ;;
esac
MOCK
  chmod +x "$CASE/bin/gh"
}

write_pr() {
  local dest="$1" number="$2" author="$3" state="$4" head="$5" merge="$6" merged_by="$7" auto="$8"
  jq -n \
    --argjson number "$number" \
    --arg author "$author" \
    --arg state "$state" \
    --arg head "$head" \
    --arg merge "$merge" \
    --arg merged_by "$merged_by" \
    --argjson auto "$auto" \
    '{
      number: $number,
      author: {login: $author, is_bot: true},
      state: $state,
      headRefOid: $head,
      mergeCommit: (if $merge == "" then null else {oid: $merge} end),
      mergedBy: (if $merged_by == "" then null else {login: $merged_by} end),
      autoMergeRequest: (if $auto then {mergeMethod: "SQUASH"} else null end),
      url: "https://example.test/pull/\($number)"
    }' >"$dest"
}

write_list() {
  write_pr "$GH_DIR/pr-one.json" "$@"
  jq -s '.' "$GH_DIR/pr-one.json" >"$GH_DIR/pr-list.json"
}

common_env() {
  export GH_DIR GH_CALL_LOG
  export REPO="$REPO_NAME"
  export HEAD_BRANCH="$BRANCH"
  export HEAD_SHA="$HEAD"
  export GH_TOKEN=test
  export POLL_INTERVAL=0
  export CONFIRM_INTERVAL=0
  export POLL_ATTEMPTS=3
  export CONFIRM_ATTEMPTS=2
  export PATH="$CASE/bin:$PATH"
}

run_script() {
  local expect="$1"
  shift
  set +e
  output=$(bash "$SCRIPT" 2>&1)
  code=$?
  set -e
  if [ "$code" -ne "$expect" ]; then
    echo "$output" >&2
    fail "$name exited $code, expected $expect"
  fi
  printf '%s\n' "$output"
}

assert_dispatched() {
  local log="$1"
  grep -F "workflow run ci.yml --repo $REPO_NAME --ref main -f expected_sha=$MERGE" "$log" >/dev/null \
    || fail "$name did not dispatch $MERGE"
  local count
  count=$(grep -c '^workflow run ' "$log")
  [ "$count" -eq 1 ] || fail "$name dispatched $count times"
}

assert_not_dispatched() {
  if grep -q '^workflow run ' "$1"; then
    fail "$name dispatched CI"
  fi
}

prepare_merged() {
  local author="${1:-app/dependabot}" merger="${2:-app/github-actions}"
  new_case
  write_list 29 "$author" MERGED "$HEAD" "$MERGE" "$merger" true
  printf '%s\n' "$MERGE" >"$GH_DIR/main-sha"
  echo '[]' >"$GH_DIR/runs.json"
  jq -n '[{databaseId: 1, event: "workflow_dispatch", status: "queued"}]' >"$GH_DIR/runs-after.json"
  common_env
}

name="dispatches the merge SHA when github-actions merged"
prepare_merged
output=$(run_script 0)
assert_dispatched "$GH_CALL_LOG"
grep -F "CI workflow_dispatch is queued for $MERGE" <<<"$output" >/dev/null || fail "$name missing confirmation"
PASS=$((PASS + 1))

name="accepts dependabot[bot] and github-actions[bot] logins"
prepare_merged "dependabot[bot]" "github-actions[bot]"
run_script 0 >/dev/null
assert_dispatched "$GH_CALL_LOG"
PASS=$((PASS + 1))

name="does not dispatch when a person merged"
prepare_merged app/dependabot kushagrarora17
run_script 0 >/dev/null
assert_not_dispatched "$GH_CALL_LOG"
if grep -q 'commits/main' "$GH_CALL_LOG"; then
  fail "$name should stop before reading main"
fi
PASS=$((PASS + 1))

name="does not dispatch a major update that was left open"
new_case
write_list 29 app/dependabot OPEN "$HEAD" "" "" false
common_env
run_script 0 >/dev/null
assert_not_dispatched "$GH_CALL_LOG"
PASS=$((PASS + 1))

name="does not dispatch a non-Dependabot author"
new_case
write_list 29 octocat OPEN "$HEAD" "" "" false
common_env
run_script 0 >/dev/null
assert_not_dispatched "$GH_CALL_LOG"
PASS=$((PASS + 1))

name="does not dispatch when CI already exists for the merge commit"
prepare_merged
jq -n '[{databaseId: 9, event: "push", status: "queued"}]' >"$GH_DIR/runs.json"
run_script 0 >/dev/null
assert_not_dispatched "$GH_CALL_LOG"
PASS=$((PASS + 1))

name="does not dispatch when main has moved on"
prepare_merged
printf '%s\n' "$OTHER" >"$GH_DIR/main-sha"
run_script 0 >/dev/null
assert_not_dispatched "$GH_CALL_LOG"
PASS=$((PASS + 1))

name="does not dispatch a stale CI sha"
new_case
write_list 29 app/dependabot OPEN "$OTHER" "" "" true
common_env
output=$(run_script 0)
assert_not_dispatched "$GH_CALL_LOG"
grep -F "stale" <<<"$output" >/dev/null || fail "$name should report a stale head"
PASS=$((PASS + 1))

name="waits until auto-merge finishes and then dispatches"
new_case
write_pr "$GH_DIR/pr-one.json" 29 app/dependabot OPEN "$HEAD" "" "" true
jq -s '.' "$GH_DIR/pr-one.json" >"$GH_DIR/pr-list.json"
write_pr "$GH_DIR/pr-view.json" 29 app/dependabot MERGED "$HEAD" "$MERGE" app/github-actions true
printf '%s\n' "$MERGE" >"$GH_DIR/main-sha"
echo '[]' >"$GH_DIR/runs.json"
jq -n '[{databaseId: 1, event: "workflow_dispatch", status: "queued"}]' >"$GH_DIR/runs-after.json"
common_env
run_script 0 >/dev/null
assert_dispatched "$GH_CALL_LOG"
grep -q 'pr view' "$GH_CALL_LOG" || fail "$name should poll with pr view"
PASS=$((PASS + 1))

name="fails when auto-merge stays enabled and the PR never merges"
new_case
write_list 29 app/dependabot OPEN "$HEAD" "" "" true
cp "$GH_DIR/pr-one.json" "$GH_DIR/pr-view.json"
common_env
export POLL_ATTEMPTS=2
output=$(run_script 1)
assert_not_dispatched "$GH_CALL_LOG"
grep -F "::error::" <<<"$output" >/dev/null || fail "$name should error"
PASS=$((PASS + 1))

name="finds the PR from the commit association after the branch lookup misses"
new_case
echo '[]' >"$GH_DIR/pr-list.json"
jq -n --arg sha "$HEAD" --arg branch "$BRANCH" \
  '[{number: 29, user: {login: "dependabot[bot]"}, head: {ref: $branch, sha: $sha}}]' >"$GH_DIR/pulls.json"
write_pr "$GH_DIR/pr-view.json" 29 app/dependabot MERGED "$HEAD" "$MERGE" app/github-actions true
printf '%s\n' "$MERGE" >"$GH_DIR/main-sha"
echo '[]' >"$GH_DIR/runs.json"
jq -n '[{databaseId: 1, event: "workflow_dispatch", status: "queued"}]' >"$GH_DIR/runs-after.json"
common_env
run_script 0 >/dev/null
assert_dispatched "$GH_CALL_LOG"
grep -F "/commits/${HEAD}/pulls" "$GH_CALL_LOG" >/dev/null || fail "$name should query commit pulls"
PASS=$((PASS + 1))

name="exits cleanly when there is no pull request"
new_case
echo '[]' >"$GH_DIR/pr-list.json"
echo '[]' >"$GH_DIR/pulls.json"
common_env
run_script 0 >/dev/null
assert_not_dispatched "$GH_CALL_LOG"
PASS=$((PASS + 1))

name="fails closed when main moves after the dispatch is accepted"
prepare_merged
printf '%s\n' "$OTHER" >"$GH_DIR/main-sha-after"
echo '[]' >"$GH_DIR/runs-after.json"
output=$(run_script 1)
grep -F "workflow run ci.yml --repo $REPO_NAME --ref main -f expected_sha=$MERGE" "$GH_CALL_LOG" >/dev/null \
  || fail "$name should still have dispatched"
grep -F "::error::" <<<"$output" >/dev/null || fail "$name should error after main moves"
PASS=$((PASS + 1))

name="warns instead of failing when the queued run is not visible yet and main is unchanged"
prepare_merged
echo '[]' >"$GH_DIR/runs-after.json"
output=$(run_script 0)
assert_dispatched "$GH_CALL_LOG"
grep -F "::warning::" <<<"$output" >/dev/null || fail "$name should warn"
PASS=$((PASS + 1))

name="ignores a branch that is not from Dependabot"
new_case
common_env
export HEAD_BRANCH=feature/not-dependabot
output=$(run_script 0)
grep -F "not a Dependabot branch" <<<"$output" >/dev/null || fail "$name message"
[ ! -s "$GH_CALL_LOG" ] || fail "$name should not call gh"
PASS=$((PASS + 1))

# The workflow files have to keep this chain. A refactor that drops it should fail CI.
deploy="$ROOT/.github/workflows/azure-deploy.yml"
ci="$ROOT/.github/workflows/ci.yml"
auto="$ROOT/.github/workflows/dependabot-auto-merge.yml"
grep -q 'workflow_dispatch:' "$deploy" || fail "deploy is missing workflow_dispatch"
grep -q "workflow_run.event == 'push'" "$deploy" || fail "deploy must accept push CI"
grep -q "workflow_run.event == 'workflow_dispatch'" "$deploy" || fail "deploy must accept dispatched CI"
grep -q "github.ref == 'refs/heads/main'" "$deploy" || fail "manual deploy must target main"
grep -q 'resolve-deploy-sha.sh' "$deploy" || fail "deploy must resolve the CI SHA"
if grep -Eq '^[[:space:]]*push:' "$deploy"; then
  fail "deploy must not also trigger on push (that double-deploys human merges)"
fi
if grep -q "event == 'pull_request'" "$deploy"; then
  fail "deploy must not release pull-request CI"
fi
grep -q 'expected_sha' "$ci" || fail "CI must pin the dispatched SHA"
grep -q 'GITHUB_SHA' "$ci" || fail "CI pin must compare GITHUB_SHA"
grep -F -q 'workflows: [CI]' "$auto" || fail "auto-merge must chain off CI via workflow_run"
grep -q 'dispatch-ci-after-automerge.sh' "$auto" || fail "auto-merge must run the dispatch script"
grep -q 'version-update:semver-major' "$auto" || fail "major updates must stay gated"
grep -q 'gh pr merge --auto --squash' "$auto" || fail "patch/minor auto-merge command changed"
grep -q 'secrets.GITHUB_TOKEN' "$auto" || fail "auto-merge must keep using GITHUB_TOKEN"
actions_write=$(grep -c 'actions: write' "$auto")
[ "$actions_write" -eq 1 ] || fail "actions: write should be limited to the dispatch job (found $actions_write)"
PASS=$((PASS + 1))

echo "dispatch-ci-after-automerge: $PASS cases passed"
