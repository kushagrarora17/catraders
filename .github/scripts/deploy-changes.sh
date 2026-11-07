#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_TARGET:?}"
: "${REQUESTED_SHA:?}"
: "${REPO:?}"
: "${GH_TOKEN:?}"

case "$DEPLOY_TARGET" in
  automotive) workflow=azure-deploy.yml; job=build-and-deploy; ci_job='deploy-azure / build-and-deploy' ;;
  studio) workflow=studio-deploy.yml; job=deploy; ci_job='deploy-studio / deploy' ;;
  *) echo "Unknown deployment target" >&2; exit 1 ;;
esac
[[ "$REQUESTED_SHA" =~ ^[a-f0-9]{40}$ ]] || exit 1
[[ "$REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || exit 1

# Manual dispatch remains an explicit redeploy, even without source changes.
if [ "${EVENT_NAME:-}" = workflow_dispatch ]; then
  echo true
  exit 0
fi

baseline=""
# A successful workflow can contain a skipped deploy job. Only actual successful
# deploy jobs establish a baseline; otherwise older unshipped changes are lost.
runs=$(gh api "repos/$REPO/actions/workflows/$workflow/runs?branch=main&status=success&per_page=100")
ci_runs=$(gh api "repos/$REPO/actions/workflows/ci.yml/runs?branch=main&status=success&per_page=100")
combined=$(printf '%s\n%s\n' "$runs" "$ci_runs" | jq -s \
  '[.[0].workflow_runs[], .[1].workflow_runs[]] | sort_by(.created_at) | reverse')
while IFS=$'\t' read -r run_id sha; do
  [ "$run_id" != "${GITHUB_RUN_ID:-}" ] || continue
  deployed=$(gh api --paginate "repos/$REPO/actions/runs/$run_id/jobs?per_page=100" \
    --jq ".jobs[] | select((.name == \"$job\" or .name == \"$ci_job\") and .conclusion == \"success\") | .id")
  if [ -n "$deployed" ]; then baseline="$sha"; break; fi
done < <(jq -r '.[] | [.id, .head_sha] | @tsv' <<< "$combined")

# No recent deployment, or rewritten history: release conservatively.
if [ -z "$baseline" ] || ! git cat-file -e "$baseline^{commit}" 2>/dev/null ||
   ! git merge-base --is-ancestor "$baseline" "$REQUESTED_SHA"; then
  echo true
  exit 0
fi

paths=$(mktemp)
trap 'rm -f "$paths"' EXIT
git diff --name-only --no-renames -z "$baseline" "$REQUESTED_SHA" > "$paths"
changed=false
while IFS= read -r -d '' path; do
  case "$path" in
    README.md|AGENTS.md|CLAUDE.md|TRD.md|docs/*|*.test.ts|*.test.tsx|*.test.js|*.spec.ts|*.spec.tsx|*.spec.js) continue ;;
  esac
  case "$path" in
    .nvmrc|.github/scripts/deploy-changes.sh|.github/scripts/resolve-deploy-sha.sh)
      changed=true; break ;;
  esac
  if [ "$DEPLOY_TARGET" = studio ]; then
    case "$path" in
      studio/scripts/*) continue ;;
      studio/*|.github/workflows/studio-deploy.yml) changed=true; break ;;
    esac
  else
    case "$path" in
      src/*|public/*|docker/*|drizzle/*|db/*|workers/*|iac/app/*|scripts/migrate.ts|\
      package.json|bun.lock|bunfig.toml|.dockerignore|tsconfig.json|next.config.*|postcss.config.*|\
      .github/workflows/azure-deploy.yml|.github/scripts/warmup-site.sh)
        changed=true; break ;;
    esac
  fi
done < "$paths"
echo "$changed"
