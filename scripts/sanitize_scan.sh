#!/usr/bin/env bash
set -euo pipefail

root="${1:-$(cd "$(dirname "$0")/.." && pwd)}"

patterns=(
  "aprilmay"
  "cavit"
  "erginsoy"
  "07758091"
  "parkhall"
  "martell"
  "b112"
  "sign\\.aprilmay"
  "7887"
  "203 189"
)

status=0
for pattern in "${patterns[@]}"; do
  if rg -i -n "$pattern" "$root" --glob '!scripts/sanitize_scan.sh'; then
    status=1
  fi
done

if [[ "$status" -eq 0 ]]; then
  echo "Sanitization scan passed for built-in private markers."
else
  echo "Sanitization scan found private-marker matches." >&2
fi

exit "$status"
