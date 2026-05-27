#!/usr/bin/env bash
# E2E smoke: Docker stack, PM dispatch, research, intake (tier 0 safe).
# Run from repo root: ./scripts/smoke-docker-e2e.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== git pull =="
git pull origin cursor/phase0-foundation || true

echo "== docker compose =="
if ! docker info >/dev/null 2>&1; then
  echo "FAIL: Docker daemon not running. Start Docker Desktop, then re-run."
  exit 1
fi
docker compose up -d --build

echo "== health =="
HEALTH="$(curl -sf http://localhost:8000/health || echo FAIL)"
echo "$HEALTH"
if [[ "$HEALTH" == FAIL ]]; then
  docker compose logs api --tail 40
  exit 1
fi

echo "== PM research dispatch =="
curl -sf -X POST http://localhost:8000/agents/pm/dispatch \
  -H "Content-Type: application/json" \
  -d '{"matter_id":"AOD-1001","instruction":"pm:research What is the standard for past persecution?","priority":"normal"}' \
  | head -c 800
echo ""

echo "== intake status =="
curl -sf http://localhost:8000/intake/status | head -c 400
echo ""

echo "== intake upload (tier 0 + manual approval) =="
PDF="${ROOT}/scripts/fixtures/smoke-test.pdf"
if [[ ! -f "$PDF" ]]; then
  echo "Missing $PDF"
  exit 1
fi
curl -sf -X POST http://localhost:8000/intake/upload \
  -H "X-Manual-Review-Approved: true" \
  -F "matter_id=AOD-1001" \
  -F "manual_review_approved=true" \
  -F "file=@${PDF}" | head -c 600
echo ""

echo "PASS: smoke-docker-e2e completed"
