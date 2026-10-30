#!/usr/bin/env bash
# Dependabot auto-merge squash-merges with the workflow GITHUB_TOKEN. GitHub does
# not start push workflows for that token, so the merge commit otherwise gets no
# CI run and no deploy. workflow_dispatch is exempt: once the squash commit is on
# main and nothing has started CI for it, dispatch CI for that exact SHA.
set -euo pipefail

: "${REPO:?}"
: "${HEAD_BRANCH:?}"
: "${HEAD_SHA:?}"
: "${GH_TOKEN:?}"

POLL_ATTEMPTS="${POLL_ATTEMPTS:-60}"
POLL_INTERVAL="${POLL_INTERVAL:-10}"
CONFIRM_ATTEMPTS="${CONFIRM_ATTEMPTS:-12}"
CONFIRM_INTERVAL="${CONFIRM_INTERVAL:-5}"

if [[ ! "$REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
  echo "::error::Unexpected repository name"
  exit 1
fi

HEAD_SHA=$(printf '%s' "$HEAD_SHA" | tr '[:upper:]' '[:lower:]')
if [[ ! "$HEAD_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "::error::HEAD_SHA is not a commit SHA"
  exit 1
fi

case "$HEAD_BRANCH" in
  dependabot/*) ;;
  *)
    echo "Branch $HEAD_BRANCH is not a Dependabot branch."
    exit 0
    ;;
esac
case "$HEAD_BRANCH" in
  *..* | *' '* | *$'\n'* | *$'\t'*)
    echo "::error::Unexpected branch name"
    exit 1
    ;;
esac

is_dependabot_author() {
  [ "$1" = "app/dependabot" ] || [ "$1" = "dependabot" ] || [ "$1" = "dependabot[bot]" ]
}

is_actions_merger() {
  [ "$1" = "app/github-actions" ] || [ "$1" = "github-actions" ] || [ "$1" = "github-actions[bot]" ]
}

PR_JSON_FIELDS="number,author,state,mergeCommit,autoMergeRequest,headRefOid,mergedBy,url"

read_pr() {
  gh pr view "$1" --repo "$REPO" --json "$PR_JSON_FIELDS"
}

# gh pr list --head still resolves a merged PR after Dependabot deletes the
# branch. If it does not, the commit's pull-request association does.
load_pr() {
  local listed match count
  listed=$(gh pr list --repo "$REPO" --head "$HEAD_BRANCH" --state all --limit 5 --json "$PR_JSON_FIELDS")
  match=$(jq -c --arg sha "$HEAD_SHA" '[.[] | select((.headRefOid | ascii_downcase) == $sha)]' <<<"$listed")
  count=$(jq 'length' <<<"$match")
  if [ "$count" -gt 1 ]; then
    echo "::error::Multiple pull requests for $HEAD_BRANCH at $HEAD_SHA" >&2
    exit 1
  fi
  if [ "$count" -eq 1 ]; then
    jq -c '.[0]' <<<"$match"
    return 0
  fi
  if [ "$(jq 'length' <<<"$listed")" -ne 0 ]; then
    echo "PR head for $HEAD_BRANCH is no longer $HEAD_SHA; this CI run is stale." >&2
    exit 0
  fi

  local pulls number
  pulls=$(gh api "repos/${REPO}/commits/${HEAD_SHA}/pulls")
  number=$(jq -r --arg sha "$HEAD_SHA" --arg branch "$HEAD_BRANCH" '
    [
      .[]
      | select(
          (.head.sha | ascii_downcase) == $sha
          and .head.ref == $branch
          and (.user.login == "dependabot[bot]" or .user.login == "app/dependabot" or .user.login == "dependabot")
        )
    ]
    | if length == 1 then .[0].number | tostring else "" end
  ' <<<"$pulls")
  if [ -z "$number" ]; then
    echo "No Dependabot pull request for $HEAD_BRANCH at $HEAD_SHA." >&2
    exit 0
  fi
  read_pr "$number"
}

# load_pr exits the process on purpose. Keep it out of a command substitution,
# which would swallow that exit.
pr_file=$(mktemp)
trap 'rm -f "$pr_file"' EXIT
load_pr >"$pr_file"
current=$(cat "$pr_file")
number=$(jq -r '.number' <<<"$current")

for attempt in $(seq 1 "$POLL_ATTEMPTS"); do
  author=$(jq -r '.author.login // ""' <<<"$current")
  head_oid=$(jq -r '.headRefOid // ""' <<<"$current" | tr '[:upper:]' '[:lower:]')
  state=$(jq -r '.state // ""' <<<"$current")
  auto=$(jq -r 'if .autoMergeRequest == null then "false" else "true" end' <<<"$current")

  if ! is_dependabot_author "$author"; then
    echo "PR #${number} author is ${author:-unknown}; not Dependabot."
    exit 0
  fi
  if [ "$head_oid" != "$HEAD_SHA" ]; then
    echo "PR #${number} head is ${head_oid:-unknown}; CI ran on $HEAD_SHA."
    exit 0
  fi
  if [ "$state" = "MERGED" ]; then
    break
  fi
  if [ "$auto" != "true" ]; then
    echo "Auto-merge is not enabled on PR #${number} (major updates stay open)."
    exit 0
  fi
  if [ "$attempt" -eq "$POLL_ATTEMPTS" ]; then
    echo "::error::PR #${number} had auto-merge enabled after CI passed, but it was still open after ${POLL_ATTEMPTS} checks."
    exit 1
  fi
  sleep "$POLL_INTERVAL"
  current=$(read_pr "$number") || exit 1
done

merged_by=$(jq -r '.mergedBy.login // ""' <<<"$current")
merge_sha=$(jq -r '.mergeCommit.oid // ""' <<<"$current" | tr '[:upper:]' '[:lower:]')

if ! is_actions_merger "$merged_by"; then
  echo "PR #${number} was merged by ${merged_by:-unknown}. That push starts CI on its own."
  exit 0
fi
if [[ ! "$merge_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "::error::PR #${number} is merged but has no merge commit SHA."
  exit 1
fi

main_sha() {
  gh api "repos/${REPO}/commits/main" --jq .sha | tr '[:upper:]' '[:lower:]'
}

ci_runs() {
  gh run list --repo "$REPO" --commit "$merge_sha" --workflow ci.yml --json databaseId,event,status
}

current_main=$(main_sha) || exit 1
if [ "$current_main" != "$merge_sha" ]; then
  echo "main is $current_main, not merge commit $merge_sha. A newer commit owns the next deploy."
  exit 0
fi

runs=$(ci_runs) || exit 1
existing=$(jq 'length' <<<"$runs")
if [ "$existing" != "0" ]; then
  echo "CI already has a run for $merge_sha; not dispatching a second one."
  exit 0
fi

# A push-triggered run can show up a moment later. Dispatching as well would
# test the same SHA twice and deploy it twice.
sleep "$CONFIRM_INTERVAL"
current_main=$(main_sha) || exit 1
if [ "$current_main" != "$merge_sha" ]; then
  echo "main moved to $current_main before dispatch; not dispatching."
  exit 0
fi
runs=$(ci_runs) || exit 1
existing=$(jq 'length' <<<"$runs")
if [ "$existing" != "0" ]; then
  echo "CI appeared for $merge_sha before dispatch; not dispatching a second one."
  exit 0
fi

echo "Dispatching CI for merge commit $merge_sha (PR #${number})."
gh workflow run ci.yml --repo "$REPO" --ref main -f "expected_sha=${merge_sha}"

for attempt in $(seq 1 "$CONFIRM_ATTEMPTS"); do
  runs=$(ci_runs) || exit 1
  found=$(jq '[.[] | select(.event == "workflow_dispatch")] | length' <<<"$runs")
  if [ "$found" != "0" ]; then
    echo "CI workflow_dispatch is queued for $merge_sha."
    exit 0
  fi
  if [ "$attempt" -ne "$CONFIRM_ATTEMPTS" ]; then
    sleep "$CONFIRM_INTERVAL"
  fi
done

current_main=$(main_sha) || exit 1
if [ "$current_main" != "$merge_sha" ]; then
  echo "::error::Dispatched CI but main is now $current_main. The pin check fails that run, so it cannot deploy."
  exit 1
fi
echo "::warning::CI dispatch for $merge_sha was accepted, but the run is not listed yet."
exit 0
