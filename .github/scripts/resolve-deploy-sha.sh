#!/usr/bin/env bash
# Print the commit an automatic or manual production deploy should release.
# Automatic deploys (CI's workflow_run) release the SHA CI validated only while
# it is still the tip of main, so a slower run cannot roll production back.
# Manual workflow_dispatch redeploys the selected tip of main.
set -euo pipefail

: "${EVENT_NAME:?}"
: "${REQUESTED_SHA:?}"
: "${REPO:?}"
: "${GH_TOKEN:?}"

if [ "$EVENT_NAME" = "workflow_dispatch" ] && [ "${GITHUB_REF:-}" != "refs/heads/main" ]; then
  echo "::error::Manual deploy only runs for refs/heads/main (got ${GITHUB_REF:-unset})." >&2
  exit 1
fi

if [[ ! "$REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
  echo "::error::Unexpected repository name" >&2
  exit 1
fi

sha=$(printf '%s' "$REQUESTED_SHA" | tr '[:upper:]' '[:lower:]')
if [[ ! "$sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "::error::Refusing to deploy unexpected revision" >&2
  exit 1
fi

if [ "$EVENT_NAME" = "workflow_run" ]; then
  tip=$(gh api "repos/${REPO}/commits/main" --jq .sha | tr '[:upper:]' '[:lower:]')
  if [ "$tip" != "$sha" ]; then
    echo "main is $tip; CI validated $sha. Skipping deploy so production is not rolled back." >&2
    exit 0
  fi
fi

printf '%s\n' "$sha"
