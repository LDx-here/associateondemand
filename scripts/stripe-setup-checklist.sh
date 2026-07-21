#!/usr/bin/env bash
# Stripe activation checklist — prints exact steps when STRIPE_* env vars are missing on Vercel.
#
# Usage:
#   bash scripts/stripe-setup-checklist.sh
#
# If ../.deploy-secrets.env exists (gitignored), offers non-interactive hints only — never prints secrets.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
cd "$ROOT"

echo "== Stripe env audit (Vercel project: aod-next) =="

# canonical name -> space-separated legacy aliases
declare -A STRIPE_VARS=(
  [STRIPE_SECRET_KEY]="stripe_secret"
  [NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY]="stripe_publishable NEXT_PUBLIC_stripe_publishable"
  [STRIPE_WEBHOOK_SECRET]="stripe_webhook_secret"
)

vercel_env_list=""
if (cd web && vercel env ls 2>/dev/null); then
  vercel_env_list="$(cd web && vercel env ls 2>/dev/null || true)"
fi

MISSING=()
for canonical in "${!STRIPE_VARS[@]}"; do
  aliases=${STRIPE_VARS[$canonical]}
  found=""
  if echo "$vercel_env_list" | grep -q "$canonical"; then
    found="$canonical"
  else
    for alias in $aliases; do
      if echo "$vercel_env_list" | grep -q "$alias"; then
        found="$alias (alias for $canonical)"
        break
      fi
    done
  fi

  if [[ -n "$found" ]]; then
    echo "  OK  $found"
  else
    echo "  MISSING  $canonical (aliases: $aliases)"
    MISSING+=("$canonical")
  fi
done

if ((${#MISSING[@]} == 0)); then
  echo ""
  echo "All three Stripe variables appear on Vercel (canonical or alias). Redeploy production, then test checkout."
  echo "  bash scripts/smoke-production.sh"
  echo "  docs/runbooks/stripe-activation.md"
  exit 0
fi

echo ""
echo "Stripe checkout is NOT live until these are set on Vercel (Production):"
for var in "${MISSING[@]}"; do
  echo "  - $var"
done

echo ""
echo "Steps:"
echo "  1. Stripe Dashboard → Developers → API keys"
echo "     STRIPE_SECRET_KEY=sk_test_…  (alias: stripe_secret)"
echo "     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…  (alias: stripe_publishable)"
echo "  2. Stripe Dashboard → Developers → Webhooks → Add endpoint (NOT in Vercel)"
echo "     URL: https://aod-next.vercel.app/api/stripe/webhook"
echo "     Event: checkout.session.completed"
echo "     STRIPE_WEBHOOK_SECRET=whsec_…  (alias: stripe_webhook_secret)"
echo "  3. Vercel → aod-next → Settings → Environment Variables → Production"
echo "     vercel env add STRIPE_SECRET_KEY"
echo "     vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
echo "     vercel env add STRIPE_WEBHOOK_SECRET"
echo "  4. Redeploy: cd web && vercel deploy --prod"
echo ""
echo "Local webhook testing (Stripe CLI):"
echo "  stripe listen --forward-to localhost:3000/api/stripe/webhook"
echo "  export STRIPE_WEBHOOK_SECRET=whsec_…from_listen_output"
echo "  See docs/runbooks/stripe-activation.md § Local webhook testing"

if [[ -f "$ROOT/.deploy-secrets.env" ]]; then
  echo ""
  echo "Found .deploy-secrets.env — you may run (manual, do not commit):"
  echo "  set -a && source .deploy-secrets.env && set +a"
  echo "  cd web && vercel env add STRIPE_SECRET_KEY production"
  echo "  (repeat for NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and STRIPE_WEBHOOK_SECRET)"
fi

exit 1
