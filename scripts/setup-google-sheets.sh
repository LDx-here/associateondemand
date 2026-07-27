#!/usr/bin/env bash
# Automates GCP service account + AOD firm spreadsheet (see docs/runbooks/google-sheets-setup.md).
# Prerequisites: gcloud CLI, one browser login (gcloud auth login).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRETS_DIR="${AOD_SECRETS_DIR:-$ROOT/.secrets}"
KEY_FILE="${AOD_SERVICE_ACCOUNT_KEY:-$SECRETS_DIR/google-service-account.json}"
PROJECT_ID="${GCP_PROJECT_ID:-associate-on-demand-aod}"
SA_ID="aod-firm-data"
SA_EMAIL="${SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
SPREADSHEET_ID_FILE="$SECRETS_DIR/spreadsheet-id.txt"

red() { printf '\033[0;31m%s\033[0m\n' "$*" >&2; }
green() { printf '\033[0;32m%s\033[0m\n' "$*" >&2; }
info() { printf '→ %s\n' "$*" >&2; }

if ! command -v gcloud >/dev/null 2>&1; then
  red "gcloud not found. Install: brew install --cask gcloud-cli"
  exit 1
fi

ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -1 || true)"
if [[ -z "$ACTIVE_ACCOUNT" ]]; then
  red "No active gcloud account."
  echo ""
  echo "  1. Run:  gcloud auth login"
  echo "  2. Pick your Google Workspace account when the browser opens."
  echo "  3. Re-run:  bash scripts/setup-google-sheets.sh"
  exit 1
fi

info "Using Google account: $ACTIVE_ACCOUNT"

if ! gcloud projects describe "$PROJECT_ID" &>/dev/null; then
  info "Creating GCP project: $PROJECT_ID"
  gcloud projects create "$PROJECT_ID" --name="AssociateOnDemand" || true
fi
gcloud config set project "$PROJECT_ID" >/dev/null

info "Enabling Google Sheets API + Google Drive API"
gcloud services enable sheets.googleapis.com drive.googleapis.com --project="$PROJECT_ID"

if ! gcloud iam service-accounts describe "$SA_EMAIL" &>/dev/null; then
  info "Creating service account: $SA_EMAIL"
  gcloud iam service-accounts create "$SA_ID" \
    --display-name="AOD Firm Data (Google Sheets)" \
    --project="$PROJECT_ID"
else
  info "Service account already exists: $SA_EMAIL"
fi

mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

if [[ ! -f "$KEY_FILE" ]]; then
  info "Creating service account key → $KEY_FILE"
  gcloud iam service-accounts keys create "$KEY_FILE" \
    --iam-account="$SA_EMAIL" \
    --project="$PROJECT_ID"
  chmod 600 "$KEY_FILE"
else
  info "Reusing existing key file: $KEY_FILE"
fi

info "Creating spreadsheet (tabs + headers) and sharing with service account"
BOOTSTRAP_JSON="$(cd "$ROOT/web" && GOOGLE_APPLICATION_CREDENTIALS="$KEY_FILE" \
  npx tsx scripts/bootstrap-google-spreadsheet.mjs --service-account-email "$SA_EMAIL")"

SPREADSHEET_ID="$(echo "$BOOTSTRAP_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["spreadsheetId"])')"
SPREADSHEET_URL="$(echo "$BOOTSTRAP_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["spreadsheetUrl"])')"
echo "$SPREADSHEET_ID" > "$SPREADSHEET_ID_FILE"
chmod 600 "$SPREADSHEET_ID_FILE"

green "Spreadsheet ready"
echo "  URL:              $SPREADSHEET_URL"
echo "  Spreadsheet ID:   $SPREADSHEET_ID"
echo "  Service account:  $SA_EMAIL"
echo "  Key file:         $KEY_FILE"
echo ""

# Local dev env snippet (gitignored path)
LOCAL_ENV="$ROOT/web/.env.local"
if [[ ! -f "$LOCAL_ENV" ]] || ! grep -q GOOGLE_SHEETS_SPREADSHEET_ID "$LOCAL_ENV" 2>/dev/null; then
  info "Appending Google Sheets vars to web/.env.local (gitignored)"
  {
    echo ""
    echo "# Google Sheets data store (added by scripts/setup-google-sheets.sh)"
    echo "DATA_STORE=google_sheets"
    echo "GOOGLE_SHEETS_SPREADSHEET_ID=$SPREADSHEET_ID"
    echo "GOOGLE_APPLICATION_CREDENTIALS=$KEY_FILE"
  } >> "$LOCAL_ENV"
fi

info "Optional: push secrets to Vercel (Production)"
if command -v vercel >/dev/null 2>&1 && [[ -d "$ROOT/web/.vercel" ]]; then
  echo "  From web/:"
  echo "    vercel env add GOOGLE_SHEETS_SPREADSHEET_ID production   # paste: $SPREADSHEET_ID"
  echo "    vercel env add GOOGLE_SERVICE_ACCOUNT_JSON production    # paste entire JSON from $KEY_FILE"
  echo "    vercel env add DATA_STORE production                     # value: google_sheets"
  echo "  Or Vercel Dashboard → aod-next → Settings → Environment Variables"
else
  echo "  Vercel: link web/ (vercel link) then add the three variables above in the dashboard."
fi

info "Verify locally:"
echo "  cd web && npm run test:google-sheets && npm run build"
