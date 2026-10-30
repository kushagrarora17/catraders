#!/usr/bin/env bash
# After a deploy, request the public pages so the single B1 worker compiles them
# before a visitor does. Each URL is retried until it returns 200 in under
# WARMUP_FAST_SECONDS (default 3), for up to WARMUP_DEADLINE_SECONDS (default 180).
# A URL that stays slow is a warning and the deploy continues. A URL that never
# returns 200 fails the job. No secrets.
set -euo pipefail

ORIGIN=${ORIGIN:-https://caelitelube.com}
ORIGIN=${ORIGIN%/}
DEADLINE_SECONDS=${WARMUP_DEADLINE_SECONDS:-180}
FAST_SECONDS=${WARMUP_FAST_SECONDS:-3}
REQUEST_TIMEOUT=${WARMUP_REQUEST_TIMEOUT:-90}
SLEEP_SECONDS=${WARMUP_SLEEP_SECONDS:-5}
WARMUP_CURL=${WARMUP_CURL:-curl}

is_fast() {
  awk -v t="$1" -v limit="$FAST_SECONDS" 'BEGIN { exit !(t + 0 < limit + 0) }'
}

# Prints "<http_code> <seconds>". A transport failure is "000 <timeout>".
request() {
  local url=$1
  local body=$2
  local err meta status
  err=$(mktemp)
  set +e
  meta=$("$WARMUP_CURL" -sS -o "$body" -w '%{http_code} %{time_total}' --max-time "$REQUEST_TIMEOUT" -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' -L "$url" 2>"$err")
  status=$?
  set -e
  if [ "$status" -ne 0 ] || [ -z "$meta" ]; then
    if [ -s "$err" ]; then
      echo "warmup curl_error url=$url $(tr '\n' ' ' <"$err")" >&2
    fi
    rm -f "$err"
    printf '000 %s\n' "$REQUEST_TIMEOUT"
    return 0
  fi
  rm -f "$err"
  printf '%s\n' "$meta"
}

# warm_url URL [BODY_FILE]
# On any 200, copies the body to BODY_FILE (even when the response is slow).
warm_url() {
  local url=$1
  local save=${2:-}
  local start=$SECONDS
  local attempt=0
  local saw_200=0
  local code="" time="" body meta
  body=$(mktemp)
  while true; do
    attempt=$((attempt + 1))
    meta=$(request "$url" "$body")
    read -r code time <<<"$meta"
    printf 'warmup attempt=%s url=%s status=%s seconds=%s\n' "$attempt" "$url" "$code" "$time"
    if [ "$code" = "200" ]; then
      saw_200=1
      if [ -n "$save" ]; then
        cp "$body" "$save"
      fi
      if is_fast "$time"; then
        printf 'warmup ready url=%s status=200 seconds=%s attempts=%s\n' "$url" "$time" "$attempt"
        rm -f "$body"
        return 0
      fi
    fi
    if [ $((SECONDS - start)) -ge "$DEADLINE_SECONDS" ]; then
      break
    fi
    sleep "$SLEEP_SECONDS"
  done
  rm -f "$body"
  if [ "$saw_200" -eq 1 ]; then
    echo "::warning title=Warm-up slow::${url} returned 200 in ${time}s, over ${FAST_SECONDS}s, after ${attempt} attempts. Deploy continues."
    return 0
  fi
  echo "::error title=Warm-up failed::${url} never returned 200 (last status ${code})."
  return 1
}

# First product loc in the sitemap, as a path (/products/<slug>).
discover_product_path() {
  local file=$1
  local origin=$2
  local loc path rest
  while IFS= read -r loc; do
    case "$loc" in
      "$origin"/products/*)
        path=${loc#"$origin"}
        path=${path%%\?*}
        path=${path%%#*}
        rest=${path#/products/}
        if [ -n "$rest" ] && [ "${rest#*/}" = "$rest" ]; then
          printf '%s\n' "$path"
          return 0
        fi
        ;;
    esac
  done < <(grep -oE 'https?://[^<"]+' "$file" || true)
  return 1
}

# A category URL in the sitemap, as a path or absolute URL.
discover_category_from_sitemap() {
  local file=$1
  local origin=$2
  local loc path
  while IFS= read -r loc; do
    case "$loc" in
      *'category='*)
        case "$loc" in
          "$origin"/* | "$origin"\?*) path=${loc#"$origin"} ;;
          *) path=$loc ;;
        esac
        printf '%s\n' "$path"
        return 0
        ;;
    esac
  done < <(grep -oE 'https?://[^<"]+' "$file" || true)
  return 1
}

# First /products?category=... href in an HTML body.
discover_category_href() {
  local file=$1
  local href
  href=$(grep -oE -m 1 '/products\?category=[A-Za-z0-9._~%-]+' "$file" || true)
  if [ -z "$href" ]; then
    return 1
  fi
  printf '%s\n' "$href"
}

absolute_url() {
  local value=$1
  case "$value" in
    http://* | https://*) printf '%s\n' "$value" ;;
    /*) printf '%s%s\n' "$ORIGIN" "$value" ;;
    *) return 1 ;;
  esac
}

main() {
  local work home sitemap product category product_url category_url product_body
  local failed=0
  work=$(mktemp -d)
  home=$work/home.html
  sitemap=$work/sitemap.xml
  product_body=$work/product.html
  : >"$home"
  : >"$sitemap"
  : >"$product_body"

  warm_url "$ORIGIN/api/health" || failed=1
  warm_url "$ORIGIN/" "$home" || failed=1
  warm_url "$ORIGIN/products" || failed=1
  warm_url "$ORIGIN/sitemap.xml" "$sitemap" || failed=1

  product=""
  category=""
  if [ -s "$sitemap" ]; then
    product=$(discover_product_path "$sitemap" "$ORIGIN" || true)
    category=$(discover_category_from_sitemap "$sitemap" "$ORIGIN" || true)
  fi
  if [ -z "$category" ] && [ -s "$home" ]; then
    category=$(discover_category_href "$home" || true)
  fi

  if [ -n "$product" ]; then
    product_url=$(absolute_url "$product")
    echo "warmup discovered product=$product_url"
    warm_url "$product_url" "$product_body" || failed=1
  else
    echo "::error title=Warm-up failed::sitemap did not list a product page under ${ORIGIN}/products/<slug>."
    failed=1
  fi

  if [ -z "$category" ] && [ -s "$product_body" ]; then
    category=$(discover_category_href "$product_body" || true)
  fi
  if [ -n "$category" ]; then
    category_url=$(absolute_url "$category")
    echo "warmup discovered category=$category_url"
    warm_url "$category_url" || failed=1
  else
    echo "::error title=Warm-up failed::no category page in the sitemap or in the homepage HTML."
    failed=1
  fi

  rm -rf "$work"
  exit "$failed"
}

main "$@"
