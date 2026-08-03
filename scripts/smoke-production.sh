#!/usr/bin/env bash
# Production smoke — run from repo root after deploy.
# Usage: bash scripts/smoke-production.sh
set -euo pipefail

WEB="${AOD_WEB_URL:-https://aod-next.vercel.app}"
API="${AOD_API_URL:-https://associateondemand-api.fly.dev}"

echo "== Web auth gate (expect 307 to login) =="
curl -sfI "$WEB/dashboard" | grep -i '^location:' || { echo "FAIL: dashboard should redirect"; exit 1; }

echo "== API health =="
# /health is liveness-only (fast, no network I/O) so Fly's probe stops timing
# out; dependency status moved to /health/deps, which is what this asserts on.
curl -sf "$API/health" > /dev/null || { echo "FAIL: API not live"; exit 1; }
HEALTH="$(curl -sf "$API/health/deps")"
echo "$HEALTH" | python3 -c "
import sys,json
d=json.load(sys.stdin)
deps=d.get('dependencies',{})
assert deps.get('postgres'), 'postgres down'
assert deps.get('redis'), 'redis down'
tier=str(deps.get('tier','0'))
status=d.get('status')
if tier=='0':
    assert status=='ok', f'expected ok at tier 0, got {status}'
else:
    assert status=='ok', f'expected ok, got {status}'
print('status:', status, 'tier:', tier)
"

echo "== PM research dispatch (Anthropic when key set) =="
OUT="$(curl -sf -X POST "$API/agents/pm/dispatch" \
  -H "Content-Type: application/json" \
  -d '{"matter_id":"AOD-1001","instruction":"pm:research production smoke test","priority":"normal"}')"
echo "$OUT" | python3 -c "
import sys,json
d=json.load(sys.stdin)
m=d.get('metadata') or {}
llm=m.get('llm','template')
print('agent:', d.get('agent_name', d.get('agent')))
print('llm:', llm)
print('memo_chars:', len(m.get('full_memo','')))
if llm!='anthropic' and len(m.get('full_memo',''))<2500:
    print('WARN: short/template memo — check ANTHROPIC_API_KEY on Fly')
"

echo "PASS: smoke-production completed"
echo "  Web:  $WEB (sign in, then Command Panel pm:research …)"
echo "  API:  $API"
echo ""
echo "Optional: POST $API/agents/pattern/seed to index Airtable matters into Qdrant"
