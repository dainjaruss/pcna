#!/usr/bin/env bash
set -euo pipefail

# Smoke test: register -> login -> GET /api/auth/me -> inspect token -> cleanup
# Usage: ./scripts/smoke-test.sh [BASE_URL]

BASE_URL=${1:-https://popcna.duckdns.org}
COOKIE_JAR=$(mktemp /tmp/smoke_cookies.XXXX)

timestamp=$(date +%s)
EMAIL="smoke+${timestamp}@example.com"
PASSWORD="TestPass123!"

echo "[smoke-test] Using base URL: $BASE_URL"
echo "[smoke-test] Test email: $EMAIL"

echo "[smoke-test] Registering..."
register_status=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -c "$COOKIE_JAR")

if [[ "$register_status" -ne 200 && "$register_status" -ne 201 ]]; then
  echo "[smoke-test] REGISTER failed with status $register_status" >&2
  cat "$COOKIE_JAR" || true
  exit 2
fi

echo "[smoke-test] Login..."
login_status=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -c "$COOKIE_JAR")

if [[ "$login_status" -ne 200 ]]; then
  echo "[smoke-test] LOGIN failed with status $login_status" >&2
  cat "$COOKIE_JAR" || true
  exit 3
fi

echo "[smoke-test] Calling /api/auth/me..."
me_resp=$(curl -sS -w "\n%{http_code}" -X GET "$BASE_URL/api/auth/me" -b "$COOKIE_JAR")
me_body=$(echo "$me_resp" | sed '$d')
me_status=$(echo "$me_resp" | tail -n1)

if [[ "$me_status" -ne 200 ]]; then
  echo "[smoke-test] /api/auth/me failed with status $me_status" >&2
  echo "$me_body"
  exit 4
fi

echo "[smoke-test] /api/auth/me returned status $me_status"
echo "$me_body" | jq . || echo "$me_body"

echo "[smoke-test] Inspecting access_token payload..."
node scripts/inspect-token.js "$COOKIE_JAR"

echo "[smoke-test] Cleaning up test user..."
if [ "${ALLOW_DELETE:-}" = "true" ]; then
  echo "[smoke-test] ALLOW_DELETE=true, attempting to delete user..."
  node scripts/delete-user.js --email "$EMAIL"
else
  echo "[smoke-test] Skipping deletion. To enable cleanup set ALLOW_DELETE=true in the environment."
fi

echo "[smoke-test] Done. Removing cookie jar."
rm -f "$COOKIE_JAR"

exit 0
