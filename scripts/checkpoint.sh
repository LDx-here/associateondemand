#!/usr/bin/env bash
# AssociateOnDemand — agent checkpoint helper
# Usage: ./scripts/checkpoint.sh [--push] "milestone description"
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PUSH=false
MESSAGE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --push)
      PUSH=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--push] \"milestone description\"" >&2
      exit 0
      ;;
    *)
      if [[ -z "$MESSAGE" ]]; then
        MESSAGE="$1"
      else
        MESSAGE="$MESSAGE $1"
      fi
      shift
      ;;
  esac
done

if [[ -z "$MESSAGE" ]]; then
  echo "Error: milestone description required." >&2
  echo "Usage: $0 [--push] \"milestone description\"" >&2
  exit 1
fi

# Paths that must never be committed (exact or suffix match)
FORBIDDEN_EXACT=(
  ".env"
  "web/.env.local"
  "services/api/.env"
)
FORBIDDEN_PATTERNS=(
  ".env.local"
  "credentials.json"
  ".pem"
)

is_forbidden() {
  local path="$1"
  local base
  base="$(basename "$path")"
  for f in "${FORBIDDEN_EXACT[@]}"; do
    [[ "$path" == "$f" ]] && return 0
  done
  for pat in "${FORBIDDEN_PATTERNS[@]}"; do
    if [[ "$path" == *"$pat"* ]]; then
      # Allow documented templates (e.g. web/.env.local.example).
      [[ "$path" == *.example ]] && continue
      return 0
    fi
  done
  return 1
}

check_staged_for_secrets() {
  local path
  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    if is_forbidden "$path"; then
      echo "Error: forbidden path staged: $path" >&2
      echo "Unstage with: git reset HEAD -- \"$path\"" >&2
      exit 1
    fi
  done < <(git diff --cached --name-only 2>/dev/null || true)
}

update_checkpoint_timestamp() {
  local checkpoint="$REPO_ROOT/CHECKPOINT.md"
  [[ -f "$checkpoint" ]] || return 0
  local stamp
  stamp="$(date '+%Y-%m-%d (%Z)')" || stamp="$(date '+%Y-%m-%d')"
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "s/^\*\*Last updated:\*\*.*/\*\*Last updated:\*\* ${stamp}  /" "$checkpoint"
  else
    sed -i "s/^\*\*Last updated:\*\*.*/\*\*Last updated:\*\* ${stamp}  /" "$checkpoint"
  fi
}

append_activity_log() {
  local log="$REPO_ROOT/activity_log.md"
  [[ -f "$log" ]] || touch "$log"
  local line
  line="### [$(date '+%Y-%m-%d')] CHECKPOINT: ${MESSAGE}"
  local tmp
  tmp="$(mktemp)"
  printf '%s\n\n' "$line" >"$tmp"
  cat "$log" >>"$tmp"
  mv "$tmp" "$log"
}

echo "→ Staging changes (respects .gitignore)…"
git add -A

echo "→ Checking for secrets in index…"
check_staged_for_secrets

if git diff --cached --quiet; then
  echo "Nothing to commit (working tree clean or only ignored files changed)."
  exit 0
fi

update_checkpoint_timestamp
git add CHECKPOINT.md 2>/dev/null || true

echo "→ Committing: checkpoint: ${MESSAGE}"
git commit -m "checkpoint: ${MESSAGE}"

append_activity_log
git add activity_log.md
if ! git diff --cached --quiet; then
  git commit -m "checkpoint: activity log (${MESSAGE})"
fi

if [[ "$PUSH" == true ]]; then
  if git remote get-url origin &>/dev/null; then
    branch="$(git branch --show-current)"
    echo "→ Pushing to origin/${branch}…"
    git push -u origin "$branch"
  else
    echo "Warning: no origin remote; skipped push." >&2
  fi
fi

echo "Done. Update CHECKPOINT.md Last completed / Next / Blockers if not already done."
