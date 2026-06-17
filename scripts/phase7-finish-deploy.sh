#!/usr/bin/env bash
# Finish Phase 7: Alembic → Fly secrets → Fly deploy → Vercel API URL.
# Run from repo root in Terminal.app (Fly Redis create is interactive):
#   bash scripts/phase7-finish-deploy.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REF="mqspbntzxerzlkdwhxku"
POOLER_HOST="aws-1-us-west-1.pooler.supabase.com"
VERCEL_ORIGIN="https://aod-next.vercel.app"
FLY_APP="associateondemand-api"

if [[ ! -f .deploy-secrets.env ]]; then
  echo "Missing .deploy-secrets.env — add: SUPABASE_DB_PASSWORD=your_db_password"
  exit 1
fi
SUPABASE_DB_PASSWORD="$(
  /opt/homebrew/bin/python3.12 - <<'PY'
import re
text = open(".deploy-secrets.env", encoding="utf-8").read()
match = re.search(r"^SUPABASE_DB_PASSWORD=(.*)$", text, re.M)
if not match:
    raise SystemExit("SUPABASE_DB_PASSWORD missing in .deploy-secrets.env")
print(match.group(1).strip().strip('"').strip("'"))
PY
)"
if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "SUPABASE_DB_PASSWORD empty in .deploy-secrets.env"
  exit 1
fi

if [[ -f .env ]]; then set -a; source .env; set +a; fi
if [[ -f web/.env.local ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^(AIRTABLE_PAT|AIRTABLE_BASE_ID)= ]] || continue
    key="${line%%=*}"; val="${line#*=}"
    export "$key=$val"
  done < web/.env.local
fi

encode_pw() {
  /opt/homebrew/bin/python3.12 -c "from urllib.parse import quote_plus; import sys; print(quote_plus(sys.argv[1]))" "$1"
}
PW_ENC="$(encode_pw "$SUPABASE_DB_PASSWORD")"
DIRECT_URL="postgresql+psycopg://postgres.${REF}:${PW_ENC}@${POOLER_HOST}:5432/postgres?sslmode=require"
POOLER_URL="postgresql+psycopg://postgres.${REF}:${PW_ENC}@${POOLER_HOST}:6543/postgres?sslmode=require"

echo "== verify Supabase password =="
SUPABASE_DB_PASSWORD="$SUPABASE_DB_PASSWORD" /opt/homebrew/bin/python3.12 - <<PY
import os, psycopg, sys
pw = os.environ["SUPABASE_DB_PASSWORD"]
ref = "${REF}"
host = "${POOLER_HOST}"
conninfo = f"host={host} port=5432 dbname=postgres user=postgres.{ref} password={pw} sslmode=require connect_timeout=12"
try:
    with psycopg.connect(conninfo) as c:
        c.execute("select 1")
    print("OK: database password works")
except Exception as e:
    print("FAIL:", e, file=sys.stderr)
    sys.exit(1)
PY

echo "== alembic upgrade head =="
cd services/api
if [[ ! -d .venv ]]; then /opt/homebrew/bin/python3.12 -m venv .venv; fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt
export DATABASE_URL="$DIRECT_URL"
alembic upgrade head
cd "$ROOT"

if [[ -z "${REDIS_URL:-}" ]] || [[ "$REDIS_URL" == redis://localhost* ]]; then
  echo ""
  echo "REDIS_URL not set for production."
  echo "Option A — Fly Upstash (Terminal.app):"
  echo "  flyctl redis create --name aod-prod --region iad --enable-eviction --org personal --no-replicas"
  echo "  flyctl redis status aod-prod   # copy the private URL"
  echo "Option B — Upstash.com → create DB → copy rediss:// URL"
  echo ""
  read -r -p "Paste production REDIS_URL (rediss://...): " REDIS_URL
fi

: "${AIRTABLE_PAT:?Set AIRTABLE_PAT in web/.env.local or .env}"
: "${AIRTABLE_BASE_ID:?Set AIRTABLE_BASE_ID}"
: "${ANTHROPIC_API_KEY:?Set ANTHROPIC_API_KEY in .env}"

echo "== fly secrets =="
flyctl secrets set \
  DATABASE_URL="$POOLER_URL" \
  REDIS_URL="$REDIS_URL" \
  AIRTABLE_PAT="$AIRTABLE_PAT" \
  AIRTABLE_BASE_ID="$AIRTABLE_BASE_ID" \
  ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  ALLOWED_ORIGINS="$VERCEL_ORIGIN" \
  AOD_PII_TIER="0" \
  -a "$FLY_APP"

echo "== fly deploy =="
flyctl deploy -a "$FLY_APP"
API_URL="https://${FLY_APP}.fly.dev"
echo "== health =="
curl -sf "${API_URL}/health" | head -c 400
echo ""

echo "== vercel NEXT_PUBLIC_API_URL =="
cd web
printf '%s' "$API_URL" | vercel env add NEXT_PUBLIC_API_URL production --force
vercel deploy --prod --yes
echo ""
echo "DONE"
echo "  Web:  $VERCEL_ORIGIN"
echo "  API:  $API_URL"
echo "  Auth: still off (AOD_AUTH_ENABLED=false). Enable after smoke test."
