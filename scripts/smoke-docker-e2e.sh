#!/usr/bin/env bash
# E2E smoke: Docker stack, PM dispatch, research, intake (tier 0 safe).
#
# Run from repo root (preferred — works in Terminal.app and most shells):
#   bash scripts/smoke-docker-e2e.sh
#
# If ./scripts/smoke-docker-e2e.sh fails with "Command not found" or a pseudo-tty
# error in Cursor's integrated terminal, use Terminal.app and the bash line above.
#
# Prerequisites: Docker Desktop running, repo at cursor/phase0-foundation.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
cd "$ROOT"

echo "== repo: $ROOT =="

echo "== git pull =="
git pull origin cursor/phase0-foundation 2>/dev/null || true

echo "== docker compose =="
if ! command -v docker >/dev/null 2>&1; then
  echo "FAIL: docker CLI not found. Install Docker Desktop for Mac."
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "FAIL: Docker daemon not running. Open Docker Desktop, wait until it is ready, then re-run:"
  echo "  bash scripts/smoke-docker-e2e.sh"
  exit 1
fi
docker compose up -d --build

echo "== health =="
HEALTH="$(curl -sf http://localhost:8000/health 2>/dev/null || echo FAIL)"
echo "$HEALTH"
if [[ "$HEALTH" == FAIL ]]; then
  echo "API not healthy. Recent api logs:"
  docker compose logs api --tail 40 || true
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
  echo "Missing $PDF — run: git pull origin cursor/phase0-foundation"
  exit 1
fi
curl -sf -X POST http://localhost:8000/intake/upload \
  -H "X-Manual-Review-Approved: true" \
  -F "matter_id=AOD-1001" \
  -F "manual_review_approved=true" \
  -F "file=@${PDF}" | head -c 600
echo ""

if curl -sf http://localhost:3003/api/command >/dev/null 2>&1; then
  echo "== web /api/command (optional, dev on 3003) =="
  curl -sf -X POST http://localhost:3003/api/command \
    -H "Content-Type: application/json" \
    -d '{"query":"pm:research What is the standard for past persecution? AOD-1001"}' \
    | head -c 400
  echo ""
else
  echo "== web /api/command skipped (start: cd web && npm run dev -- -p 3003) =="
fi

echo "PASS: smoke-docker-e2e completed"
