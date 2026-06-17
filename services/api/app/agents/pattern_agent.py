"""Pattern Recognition Agent — Qdrant fact-pattern similarity search."""

from __future__ import annotations

import hashlib
import json
import math
import re
from pathlib import Path
from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from app.agents.firm_context import load_strategy_patterns
from app.config import get_settings
from app.models.agent_result import AgentResult, Uncertainty

COLLECTION = "aod_fact_patterns"
VECTOR_SIZE = 64


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]{3,}", text.lower())


def embed_text(text: str, size: int = VECTOR_SIZE) -> list[float]:
    """Deterministic bag-of-words hash embedding (no external model required)."""

    vec = [0.0] * size
    tokens = _tokenize(text)
    if not tokens:
        return vec
    for tok in tokens:
        h = int(hashlib.sha256(tok.encode()).hexdigest(), 16)
        idx = h % size
        vec[idx] += 1.0
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def _client() -> QdrantClient:
    settings = get_settings()
    kwargs: dict[str, Any] = {"url": settings.qdrant_url, "timeout": 5}
    if settings.qdrant_api_key:
        kwargs["api_key"] = settings.qdrant_api_key
    return QdrantClient(**kwargs)


def _ensure_collection(client: QdrantClient) -> None:
    names = {c.name for c in client.get_collections().collections}
    if COLLECTION not in names:
        client.create_collection(
            collection_name=COLLECTION,
            vectors_config=qmodels.VectorParams(size=VECTOR_SIZE, distance=qmodels.Distance.COSINE),
        )


def _load_seed_matters() -> list[dict[str, Any]]:
    seed_path = Path("/app/data/dev-seed.json")
    if not seed_path.exists():
        seed_path = Path(__file__).resolve().parents[4] / "data" / "dev-seed.json"
    if not seed_path.exists():
        return []
    data = json.loads(seed_path.read_text(encoding="utf-8"))
    return data.get("matters") or []


def index_matter(matter_id: str, fact_pattern: str, metadata: dict[str, Any] | None = None) -> None:
    client = _client()
    _ensure_collection(client)
    payload = {"matter_id": matter_id, "fact_pattern": fact_pattern, **(metadata or {})}
    client.upsert(
        collection_name=COLLECTION,
        points=[
            qmodels.PointStruct(
                id=abs(hash(matter_id)) % (2**63 - 1),
                vector=embed_text(fact_pattern),
                payload=payload,
            )
        ],
    )


def seed_from_dev_data() -> int:
    count = 0
    for matter in _load_seed_matters():
        text = " ".join(
            filter(
                None,
                [
                    matter.get("caseType"),
                    matter.get("proceduralPosture"),
                    matter.get("summary"),
                    " ".join(matter.get("vulnerabilityFlags") or []),
                ],
            )
        )
        index_matter(matter["matterId"], text, {"case_type": matter.get("caseType"), "status": matter.get("status")})
        count += 1
    return count


def query_similar(fact_pattern: str, limit: int = 5) -> list[dict[str, Any]]:
    client = _client()
    _ensure_collection(client)
    if client.count(COLLECTION).count == 0:
        seed_from_dev_data()
    hits = client.search(
        collection_name=COLLECTION,
        query_vector=embed_text(fact_pattern),
        limit=limit,
    )
    results = []
    for hit in hits:
        results.append(
            {
                "matter_id": hit.payload.get("matter_id"),
                "score": round(float(hit.score), 3),
                "case_type": hit.payload.get("case_type"),
                "fact_pattern": hit.payload.get("fact_pattern", "")[:200],
            }
        )
    return results


def run_pattern(matter_id: str, facts: str | None = None) -> AgentResult:
    query_text = facts or matter_id
    matches = query_similar(query_text)
    strategy_notes = load_strategy_patterns(max_chars=1500)

    if not matches:
        return AgentResult(
            agent="pattern",
            matter_id=matter_id,
            anchor_facts=[f"Queried fact pattern for {matter_id}"],
            anchor_law=["Pattern agent surfaces prior matters only."],
            anchor_strategy=["Insufficient data: index more matters or seed Qdrant."],
            anchor_risk=["No similar matters found in the current index."],
            anchor_next=["Add matters to Airtable", "Run pattern seed when Qdrant is healthy"],
            uncertain=[
                Uncertainty(
                    item="Pattern index coverage",
                    confidence=0.3,
                    reason="Zero matches; not an error, but sample size is too small.",
                )
            ],
            summary="Insufficient data for pattern matches. Index more matters or run pattern seed.",
            confidence=0.35,
            complete=True,
        )

    match_lines = [
        f"{m['matter_id']} (score {m['score']}) · {m.get('case_type', 'unknown')}" for m in matches
    ]

    return AgentResult(
        agent="pattern",
        matter_id=matter_id,
        anchor_facts=[f"Queried fact pattern for {matter_id}", f"Top match: {matches[0]['matter_id']}" if matches else "No matches"],
        anchor_law=["Pattern agent surfaces prior matters only — does not recommend relief."],
        anchor_strategy=[f"Prior matter {m['matter_id']} used similar fact pattern." for m in matches[:3]],
        anchor_risk=["Small sample size until full Airtable + Obsidian index is wired."],
        anchor_next=["Attorney review pattern matches", "Select approach for Strategy Agent"],
        uncertain=[
            Uncertainty(
                item="Pattern similarity ranking",
                confidence=0.65 if matches else 0.35,
                reason="Bag-of-words hash embedding; will improve once full Airtable + Obsidian index is wired.",
            )
        ],
        summary=f"Found {len(matches)} similar matters for {matter_id}.",
        citations=[m["matter_id"] for m in matches if m.get("matter_id")],
        confidence=0.65 if matches else 0.35,
        metadata={"matches": matches, "strategy_patterns_excerpt": strategy_notes[:500]},
        complete=True,
    )


def build_knowledge_graph() -> dict[str, Any]:
    """Return nodes/links for knowledge map UI."""

    matters = _load_seed_matters()
    nodes: list[dict[str, str]] = []
    links: list[dict[str, Any]] = []
    relief_types: set[str] = set()

    for m in matters:
        mid = m["matterId"]
        nodes.append({"id": mid, "group": "matter", "label": mid})
        case_type = m.get("caseType") or "Unknown"
        slug = re.sub(r"[^a-z0-9]+", "_", case_type.lower()).strip("_")
        if slug not in relief_types:
            relief_types.add(slug)
            nodes.append({"id": slug, "group": "relief", "label": case_type})
        links.append({"source": mid, "target": slug, "weight": 1})

    return {"nodes": nodes, "links": links}
