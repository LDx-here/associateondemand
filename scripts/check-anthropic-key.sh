#!/usr/bin/env bash
# Verify an Anthropic API key actually works, before setting it on Fly.
#
# The drafting pipeline silently falls back to template output when the key is
# rejected, so "the key is set" and "the key works" are different questions.
# This answers the second one in one call.
#
#   bash scripts/check-anthropic-key.sh sk-ant-...
#   ANTHROPIC_API_KEY=sk-ant-... bash scripts/check-anthropic-key.sh
#
# The key is read as an argument or from the environment and is never written
# to disk, logged, or echoed.

set -uo pipefail

KEY="${1:-${ANTHROPIC_API_KEY:-}}"

if [ -z "$KEY" ]; then
  echo "Usage: bash scripts/check-anthropic-key.sh <api-key>"
  echo "   or: ANTHROPIC_API_KEY=<api-key> bash scripts/check-anthropic-key.sh"
  exit 2
fi

MODEL="${LLM_DEFAULT_MODEL:-claude-sonnet-4-6}"

body=$(curl -sS -w '\n%{http_code}' https://api.anthropic.com/v1/messages \
  -H "x-api-key: $KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d "{\"model\":\"$MODEL\",\"max_tokens\":16,\"messages\":[{\"role\":\"user\",\"content\":\"Reply with the word OK.\"}]}")

status=$(printf '%s' "$body" | tail -n1)
payload=$(printf '%s' "$body" | sed '$d')

case "$status" in
  200)
    echo "PASS: key works (model $MODEL)"
    echo "Set it on Fly with:"
    echo "  flyctl secrets set ANTHROPIC_API_KEY=<key> -a associateondemand-api"
    ;;
  401|403)
    echo "FAIL: key rejected ($status) — this is the current production state."
    echo "Generate a new key at https://console.anthropic.com/settings/keys"
    printf '%s\n' "$payload"
    exit 1
    ;;
  404)
    echo "FAIL: model '$MODEL' not found ($status). The key may be fine."
    echo "Check LLM_DEFAULT_MODEL on Fly against the current model list."
    printf '%s\n' "$payload"
    exit 1
    ;;
  429)
    echo "WARN: key is valid but rate limited (429) — check plan credits."
    printf '%s\n' "$payload"
    ;;
  *)
    echo "FAIL: unexpected status $status"
    printf '%s\n' "$payload"
    exit 1
    ;;
esac
