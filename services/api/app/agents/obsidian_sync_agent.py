"""Obsidian vault sync agent — writes intake artifacts under brain/01_Cases/."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.agents._base import FiveAnchorsAgent
from app.models.agent_result import AgentResult
from app.services.obsidian_sync import vault_root, write_case_note


class ObsidianSyncAgent(FiveAnchorsAgent):
    agent_name = "obsidian_sync"

    def sync_document(
        self,
        matter_id: str,
        filename: str,
        *,
        category: str,
        ocr_method: str,
        confidence: float,
        processing_status: str,
        facts: list[dict[str, Any]],
        text_preview: str = "",
    ) -> Path:
        facts_md = "\n".join(
            f"- **{f.get('fact_type', '?')}**: {f.get('value', '')} _(conf {f.get('confidence', 0):.0%})_"
            for f in facts[:20]
        ) or "_No facts extracted._"

        body = f"""## Document: {filename}

| Field | Value |
|-------|-------|
| Category | {category} |
| OCR method | {ocr_method} |
| Confidence | {confidence:.0%} |
| Status | {processing_status} |

### Extracted facts

{facts_md}

### Text preview

```
{text_preview[:1200]}
```

### Raw facts JSON

```json
{json.dumps(facts[:30], indent=2)}
```
"""
        return write_case_note(
            matter_id,
            f"doc-{filename}",
            body,
            tags=["intake", "strong-reader", category.replace(" ", "-")],
        )

    def run(self, **kwargs: Any) -> AgentResult:
        matter_id: str = kwargs["matter_id"]
        filename: str = kwargs.get("filename", "document")
        category: str = kwargs.get("category", "uncategorized")
        ocr_method: str = kwargs.get("ocr_method", "unknown")
        confidence: float = float(kwargs.get("confidence", 0))
        processing_status: str = kwargs.get("processing_status", "unknown")
        facts: list[dict[str, Any]] = kwargs.get("facts", [])
        text: str = kwargs.get("text", "")

        path = self.sync_document(
            matter_id,
            filename,
            category=category,
            ocr_method=ocr_method,
            confidence=confidence,
            processing_status=processing_status,
            facts=facts,
            text_preview=text,
        )

        return self._result(
            matter_id,
            anchor_facts=[f"Synced {filename} to Obsidian vault."],
            anchor_law=[],
            anchor_strategy=["Use vault note as attorney review starting point."],
            anchor_risk=["Vault copy is not privileged storage — confirm backup policy."],
            anchor_next=[f"Open {path.relative_to(vault_root())} in Obsidian"],
            summary=f"Wrote intake note to {path.name}.",
            citations=[str(path)],
            confidence=0.95,
            metadata={"obsidian_path": str(path), "synced_at": datetime.now(timezone.utc).isoformat()},
        )


obsidian_sync_agent = ObsidianSyncAgent()
