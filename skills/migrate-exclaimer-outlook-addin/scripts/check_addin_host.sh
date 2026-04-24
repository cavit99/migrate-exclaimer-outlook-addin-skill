#!/usr/bin/env bash
set -euo pipefail

base="${1:-}"

if [[ -z "$base" ]]; then
  echo "Usage: $0 https://sign.example.com" >&2
  exit 2
fi

base="${base%/}"

check() {
  local path="$1"
  echo "== ${base}${path}"
  curl -sS -D - -o /dev/null "${base}${path}" |
    awk 'BEGIN{IGNORECASE=1} /^HTTP\// || /^content-type:/ || /^cache-control:/ || /^access-control-allow-origin:/ || /^last-modified:/ {print}'
  echo
}

check "/manifest.xml"
check "/src/runtime/autorunweb.html"
check "/src/runtime/autorunshared.js"
check "/config/signatures.json"
