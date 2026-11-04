#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SCRIPT="$ROOT/.github/scripts/deploy-changes.sh"
FIXTURE=$(mktemp -d)
trap 'rm -r "$FIXTURE"' EXIT
cat > "$FIXTURE/gh" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
[ "${API_FAIL:-false}" != true ] || exit 1
case "$*" in
  *'/workflows/'*)
    if [ "${NO_BASELINE:-false}" = true ]; then
      echo '{"workflow_runs":[]}'
    else
      echo '{"workflow_runs":[{"id":10,"head_sha":"0000000000000000000000000000000000000000"},{"id":9,"head_sha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]}'
    fi ;;
  *'/runs/10/jobs?'*) : ;;
  *'/runs/9/jobs?'*) echo 123 ;;
  *) exit 1 ;;
esac
MOCK
cat > "$FIXTURE/git" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
case "$1" in
  cat-file|merge-base) [ "${REWRITTEN:-false}" != true ] ;;
  diff)
    [ "${DIFF_FAIL:-false}" != true ] || exit 1
    [ "$5" = aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa ] || exit 1
    if [ -n "${FILES:-}" ]; then
      while IFS= read -r file; do printf '%s\0' "$file"; done <<< "$FILES"
    fi ;;
  *) exit 1 ;;
esac
MOCK
chmod +x "$FIXTURE/gh" "$FIXTURE/git"
export PATH="$FIXTURE:$PATH" GH_TOKEN=test REPO=acme/catraders EVENT_NAME=workflow_run
export REQUESTED_SHA=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
PASS=0
check() {
  local target="$1" expected="$2" actual
  actual=$(DEPLOY_TARGET="$target" bash "$SCRIPT")
  [ "$actual" = "$expected" ] || { echo "FAIL: $target expected $expected, got $actual" >&2; exit 1; }
  PASS=$((PASS+1))
}
export FILES=studio/components/editor.tsx
check studio true; check automotive false
export FILES=src/app/page.tsx
check studio false; check automotive true
export FILES=.nvmrc
check studio true; check automotive true
export FILES=studio/bun.lock
check studio true; check automotive false
export FILES=README.md
check studio false; check automotive false
export FILES=public/catalog-guide.md
check automotive true; check studio false
export FILES=src/app/page.test.tsx
check studio false; check automotive false
export FILES=.github/workflows/studio-deploy.yml
check studio true; check automotive false
export FILES=.github/workflows/azure-deploy.yml
check studio false; check automotive true
export FILES=.github/scripts/deploy-changes.sh
check studio true; check automotive true
export FILES=studio/scripts/seed.ts
check studio false; check automotive false
export FILES=drizzle/0001.sql
check automotive true
export FILES=workers/content-review/index.ts
check automotive true; check studio false
# Full deployment-range file lists include previously unshipped changes and
# both paths of moves; skipped runs must not replace the successful baseline.
export FILES=$'README.md\nsrc/app/page.tsx'
check automotive true
export FILES=$'studio/old.tsx\nsrc/new.tsx'
check automotive true; check studio true
export FILES=''
check automotive false; check studio false
NO_BASELINE=true check studio true
REWRITTEN=true check automotive true
EVENT_NAME=workflow_dispatch check studio true
for mode in API_FAIL DIFF_FAIL; do
  if env "$mode=true" DEPLOY_TARGET=studio bash "$SCRIPT" >/dev/null 2>&1; then
    echo "FAIL: $mode must not silently skip a release" >&2; exit 1
  fi
  PASS=$((PASS+1))
done
echo "deploy-changes: $PASS cases passed"
