# Presidio + LiteLLM (Phase 3)

`docker-compose.yml` runs a **minimal HTTP health stub** on port 8080 so the API can verify reachability at tier 1+ (`PRESIDIO_HEALTH_URL=http://presidio:8080`).

Replace this stub in production with:

1. Official Microsoft Presidio Analyzer + Anonymizer containers (behind TLS internally).  
2. LiteLLM proxy that scrubs payloads before outbound model calls.

## Tier 0 (default)

Strong Reader works when the attorney sends `manual_review_approved=true` (form field or `X-Manual-Review-Approved: true` header). The web UI shows an amber banner for this path.

## Tier 1+

Set `AOD_PII_TIER=1` and ensure `PRESIDIO_HEALTH_URL` returns HTTP 200 before processing live client documents.
