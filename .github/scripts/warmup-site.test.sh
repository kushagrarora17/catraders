#!/usr/bin/env bash
# Exercises warmup-site.sh with a fake curl: fast 200s pass, slow 200s warn
# without failing, and a URL that never returns 200 fails the script.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SCRIPT="$ROOT/.github/scripts/warmup-site.sh"
ORIGIN=https://caelitelube.com
PASS=0

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

new_case() {
  CASE=$(mktemp -d)
  cat >"$CASE/curl" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
outfile=""
prev=""
url=""
for arg in "$@"; do
  if [ "$prev" = "-o" ]; then
    outfile=$arg
  fi
  prev=$arg
  url=$arg
done
key=$(printf '%s' "$url" | tr '/:?=&' '_____')
count_file="$FIXTURE/count-$key"
count=0
if [ -f "$count_file" ]; then
  count=$(cat "$count_file")
fi
count=$((count + 1))
printf '%s\n' "$count" >"$count_file"
printf '%s\n' "$url" >>"$FIXTURE/calls"
resp="$FIXTURE/$key.$count.response"
body="$FIXTURE/$key.$count.body"
if [ ! -f "$resp" ]; then
  resp="$FIXTURE/$key.response"
  body="$FIXTURE/$key.body"
fi
if [ ! -f "$resp" ]; then
  echo "mock curl has no fixture for $url" >&2
  exit 1
fi
if [ -n "$outfile" ]; then
  if [ -f "$body" ]; then
    cp "$body" "$outfile"
  else
    : >"$outfile"
  fi
fi
cat "$resp"
MOCK
  chmod +x "$CASE/curl"
  mkdir -p "$CASE/fixture"
  export FIXTURE="$CASE/fixture" PATH="$CASE:$PATH"
  export ORIGIN WARMUP_CURL="$CASE/curl"
  export WARMUP_DEADLINE_SECONDS=0 WARMUP_SLEEP_SECONDS=0 WARMUP_FAST_SECONDS=3 WARMUP_REQUEST_TIMEOUT=90
}

# put URL CODE SECONDS [BODY]
put() {
  local url=$1 code=$2 seconds=$3 body=${4:-}
  local n=${5:-}
  local key
  key=$(printf '%s' "$url" | tr '/:?=&' '_____')
  if [ -n "$n" ]; then
    printf '%s %s\n' "$code" "$seconds" >"$FIXTURE/$key.$n.response"
    printf '%s' "$body" >"$FIXTURE/$key.$n.body"
  else
    printf '%s %s\n' "$code" "$seconds" >"$FIXTURE/$key.response"
    printf '%s' "$body" >"$FIXTURE/$key.body"
  fi
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

sitemap_body() {
  cat <<EOF
<urlset>
  <url><loc>${ORIGIN}/</loc></url>
  <url><loc>${ORIGIN}/products</loc></url>
  <url><loc>${ORIGIN}/products/castrol-edge-5w30-4l</loc></url>
</urlset>
EOF
}

home_body() {
  printf '%s\n' '<a href="/products?category=engine-oils">Engine Oils</a>'
}

name="fast 200s pass and the product comes from the sitemap"
new_case
put "$ORIGIN/api/health" 200 0.2
put "$ORIGIN/" 200 0.4 "$(home_body)"
put "$ORIGIN/products" 200 0.5
put "$ORIGIN/sitemap.xml" 200 0.3 "$(sitemap_body)"
put "$ORIGIN/products/castrol-edge-5w30-4l" 200 0.6
put "$ORIGIN/products?category=engine-oils" 200 0.7
got=$(run_script 0)
grep -F "warmup ready url=$ORIGIN/ status=200 seconds=0.4" <<<"$got" >/dev/null || fail "$name homepage"
grep -F "warmup discovered product=$ORIGIN/products/castrol-edge-5w30-4l" <<<"$got" >/dev/null || fail "$name product"
grep -F "warmup discovered category=$ORIGIN/products?category=engine-oils" <<<"$got" >/dev/null || fail "$name category"
grep -F '::error' <<<"$got" >/dev/null && fail "$name should not error"
grep -F '::warning' <<<"$got" >/dev/null && fail "$name should not warn"
PASS=$((PASS + 1))

name="a slow 200 is retried until it is under 3s"
new_case
export WARMUP_DEADLINE_SECONDS=30
put "$ORIGIN/api/health" 200 0.1
put "$ORIGIN/" 200 12.0 "$(home_body)" 1
put "$ORIGIN/" 200 0.8 "$(home_body)" 2
put "$ORIGIN/products" 200 0.2
put "$ORIGIN/sitemap.xml" 200 0.2 "$(sitemap_body)"
put "$ORIGIN/products/castrol-edge-5w30-4l" 200 0.2
put "$ORIGIN/products?category=engine-oils" 200 0.2
got=$(run_script 0)
grep -F "warmup attempt=1 url=$ORIGIN/ status=200 seconds=12.0" <<<"$got" >/dev/null || fail "$name first attempt"
grep -F "warmup ready url=$ORIGIN/ status=200 seconds=0.8 attempts=2" <<<"$got" >/dev/null || fail "$name second attempt"
PASS=$((PASS + 1))

name="a page that stays slow does not fail the deploy"
new_case
put "$ORIGIN/api/health" 200 0.1
put "$ORIGIN/" 200 9.5 "$(home_body)"
put "$ORIGIN/products" 200 0.2
put "$ORIGIN/sitemap.xml" 200 0.2 "$(sitemap_body)"
put "$ORIGIN/products/castrol-edge-5w30-4l" 200 0.2
put "$ORIGIN/products?category=engine-oils" 200 0.2
got=$(run_script 0)
grep -F "::warning title=Warm-up slow::${ORIGIN}/ returned 200 in 9.5s" <<<"$got" >/dev/null || fail "$name warning"
grep -F '::error' <<<"$got" >/dev/null && fail "$name should not error"
PASS=$((PASS + 1))

name="persistent non-200 fails"
new_case
put "$ORIGIN/api/health" 503 0.1
put "$ORIGIN/" 200 0.2 "$(home_body)"
put "$ORIGIN/products" 200 0.2
put "$ORIGIN/sitemap.xml" 200 0.2 "$(sitemap_body)"
put "$ORIGIN/products/castrol-edge-5w30-4l" 200 0.2
put "$ORIGIN/products?category=engine-oils" 200 0.2
got=$(run_script 1)
grep -F "::error title=Warm-up failed::${ORIGIN}/api/health never returned 200 (last status 503)." <<<"$got" >/dev/null || fail "$name error"
PASS=$((PASS + 1))

name="category in the sitemap is used before the homepage link"
new_case
put "$ORIGIN/api/health" 200 0.1
put "$ORIGIN/" 200 0.2 '<a href="/products?category=from-home">x</a>'
put "$ORIGIN/products" 200 0.2
put "$ORIGIN/sitemap.xml" 200 0.2 "<urlset><url><loc>${ORIGIN}/products/gear-oil</loc></url><url><loc>${ORIGIN}/products?category=from-sitemap</loc></url></urlset>"
put "$ORIGIN/products/gear-oil" 200 0.2
put "$ORIGIN/products?category=from-sitemap" 200 0.2
got=$(run_script 0)
grep -F "warmup discovered category=$ORIGIN/products?category=from-sitemap" <<<"$got" >/dev/null || fail "$name category"
grep -F 'from-home' <<<"$got" >/dev/null && fail "$name should not use the homepage category"
PASS=$((PASS + 1))

name="one homepage line with several category links yields a single URL"
new_case
one_line='<a href="/products?category=engine-oils">A</a><a href="/products?category=coolants">B</a><a href="/products?category=filters">C</a>'
put "$ORIGIN/api/health" 200 0.1
put "$ORIGIN/" 200 0.2 "$one_line"
put "$ORIGIN/products" 200 0.2
put "$ORIGIN/sitemap.xml" 200 0.2 "$(sitemap_body)"
put "$ORIGIN/products/castrol-edge-5w30-4l" 200 0.2
put "$ORIGIN/products?category=engine-oils" 200 0.2
got=$(run_script 0)
line=$(grep -F "warmup discovered category=" <<<"$got")
[ "$line" = "warmup discovered category=$ORIGIN/products?category=engine-oils" ] || fail "$name got: $line"
grep -F 'category=coolants' "$FIXTURE/calls" >/dev/null && fail "$name requested a second category"
grep -F 'category=filters' "$FIXTURE/calls" >/dev/null && fail "$name requested a third category"
PASS=$((PASS + 1))

name="category is taken from the homepage when the sitemap has none"
new_case
put "$ORIGIN/api/health" 200 0.1
put "$ORIGIN/" 200 0.2 "$(home_body)"
put "$ORIGIN/products" 200 0.2
put "$ORIGIN/sitemap.xml" 200 0.2 "$(sitemap_body)"
put "$ORIGIN/products/castrol-edge-5w30-4l" 200 0.2
put "$ORIGIN/products?category=engine-oils" 200 0.2
got=$(run_script 0)
grep -F "category=$ORIGIN/products?category=engine-oils" <<<"$got" >/dev/null || fail "$name category"
PASS=$((PASS + 1))

name="a sitemap with no product page fails"
new_case
put "$ORIGIN/api/health" 200 0.1
put "$ORIGIN/" 200 0.2 "$(home_body)"
put "$ORIGIN/products" 200 0.2
put "$ORIGIN/sitemap.xml" 200 0.2 "<urlset><url><loc>${ORIGIN}/products</loc></url></urlset>"
put "$ORIGIN/products?category=engine-oils" 200 0.2
got=$(run_script 1)
grep -F 'did not list a product page' <<<"$got" >/dev/null || fail "$name message"
PASS=$((PASS + 1))

name="no category link fails"
new_case
put "$ORIGIN/api/health" 200 0.1
put "$ORIGIN/" 200 0.2 '<html>no links</html>'
put "$ORIGIN/products" 200 0.2
put "$ORIGIN/sitemap.xml" 200 0.2 "$(sitemap_body)"
put "$ORIGIN/products/castrol-edge-5w30-4l" 200 0.2 '<html>no category</html>'
got=$(run_script 1)
grep -F 'no category page' <<<"$got" >/dev/null || fail "$name message"
PASS=$((PASS + 1))

echo "warmup-site: $PASS cases passed"
