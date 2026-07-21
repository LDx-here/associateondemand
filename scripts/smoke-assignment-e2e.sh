#!/usr/bin/env bash
# Assignment pilot E2E — demo mode, no login, no Airtable PAT required.
#
# Run from repo root:
#   bash scripts/smoke-assignment-e2e.sh
#
# Optional env:
#   SMOKE_WEB_PORT=3099     — local Next.js port (default 3099)
#   SMOKE_KEEP_SERVER=1     — leave web server running after pass
#   AOD_API_URL             — Fly/docker API for optional real PM dispatch probe

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
cd "$ROOT"

PORT="${SMOKE_WEB_PORT:-3099}"
WEB="http://127.0.0.1:${PORT}"
SERVER_PID=""
STARTED_SERVER=0

cleanup() {
  if [[ "$STARTED_SERVER" == "1" && "${SMOKE_KEEP_SERVER:-0}" != "1" && -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "== assignment E2E (demo mode, port $PORT) =="

if ! curl -sf "$WEB/api/health" >/dev/null 2>&1; then
  echo "== starting Next.js (demo mode, auth off) =="
  (
    cd "$ROOT/web"
    export AOD_AUTH_ENABLED=false
    export AOD_FORCE_DEMO_MODE=true
    npm run build >/dev/null
    PORT="$PORT" AOD_FORCE_DEMO_MODE=true AOD_AUTH_ENABLED=false npm run start
  ) &
  SERVER_PID=$!
  STARTED_SERVER=1
  for i in $(seq 1 45); do
    if curl -sf "$WEB/api/health" >/dev/null 2>&1; then
      echo "web ready after $((i * 2))s"
      break
    fi
    sleep 2
  done
fi

HEALTH="$(curl -sf "$WEB/api/health")"
echo "$HEALTH"
echo "$HEALTH" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d.get('ok') is True, d
assert d.get('demoMode') is True, 'Expected demo mode — unset AIRTABLE_PAT for this script'
"

echo "== conflict check =="
CONFLICT="$(curl -sf -X POST "$WEB/api/conflicts/check" \
  -H "Content-Type: application/json" \
  -d '{"opposingParty":"Acme Corp","opposingCounsel":"Smith LLP"}')"
echo "$CONFLICT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d.get('result') in ('clear', 'review_required'), d
"

echo "== intake session autosave =="
curl -sf -X POST "$WEB/api/intake/session" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"smoke-e2e","email":"pilot@example.com","step":2,"deliverableId":"aos-discretionary-brief","matterId":"AOD-1001"}' \
  | head -c 300
echo ""

echo "== create assignment =="
CREATE="$(curl -sf -X POST "$WEB/api/assignments" \
  -H "Content-Type: application/json" \
  -d '{
    "matterId":"AOD-1001",
    "deliverableType":"AOS Discretionary Brief",
    "deliverableCatalogId":"aos-discretionary-brief",
    "tier":"Template",
    "facts":"Smoke E2E facts: client seeks waiver relief; extreme hardship to USC spouse; positive equities include community ties.",
    "priority":"Medium"
  }')"
eval "$(echo "$CREATE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d.get('matterId'), d
assert d.get('inboxItem', {}).get('id'), d
print(f\"matterId={d['matterId']!r}\")
print(f\"inboxItemId={d['inboxItem']['id']!r}\")
")"
echo "matterId: $matterId"
echo "inboxItemId: $inboxItemId"

API="${AOD_API_URL:-http://localhost:8000}"
if curl -sf "$API/health" >/dev/null 2>&1; then
  echo "== optional PM dispatch ($API) =="
  curl -sf -X POST "$API/agents/pm/dispatch" \
    -H "Content-Type: application/json" \
    -d "{\"matter_id\":\"$matterId\",\"instruction\":\"pm:research smoke assignment e2e\",\"priority\":\"normal\"}" \
    | head -c 400
  echo ""
else
  echo "== PM dispatch skipped (no API at $API) =="
fi

transition() {
  local status="$1"
  local note="$2"
  curl -sf -X PATCH "$WEB/api/inbox/${inboxItemId}/status" \
    -H "Content-Type: application/json" \
    -d "{\"status\":\"$status\",\"note\":\"$note\"}" | head -c 200
  echo ""
}

echo "== assignment lifecycle =="
transition "In progress" "Smoke E2E — mock dispatch started"
transition "Ready for review" "Smoke E2E — draft ready"
transition "Approved" "Smoke E2E — attorney approved"

echo "== export / delivered event =="
DELIVERED="$(curl -sf -X POST "$WEB/api/inbox/${inboxItemId}/delivered" \
  -H "Content-Type: application/json" \
  -d '{"exportKind":"smoke-e2e"}')"
echo "$DELIVERED" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d.get('deliveredAt') or d.get('item', {}).get('deliveredAt'), d
"

echo "== memo export fallback (txt) =="
curl -sf -X POST "$WEB/api/research/memo-export" \
  -H "Content-Type: application/json" \
  -d "{\"matterId\":\"$matterId\",\"memo\":\"Smoke memo body for export.\",\"format\":\"txt\",\"assignmentId\":\"$inboxItemId\"}" \
  | head -c 80
echo ""

echo "== matter stage derivation =="
cd "$ROOT/web"
npm run test:matter-stage >/dev/null
npm run test:assignment-transitions >/dev/null

echo "PASS: smoke-assignment-e2e completed"
echo "  Web: $WEB (demo mode)"
echo "  Tip: docker compose up -d && re-run for real PM dispatch probe"
