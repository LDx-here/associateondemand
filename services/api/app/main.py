"""Minimal FastAPI service — Phases 0–6 agent stack."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

import httpx
import redis
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from qdrant_client import QdrantClient
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

from app.config import Settings, get_settings
from app.db import Base, get_engine
from app.models.db_models import AgentJob, AuditLog  # noqa: F401 — register ORM models
from app.models.document import Document, ExtractedFact  # noqa: F401 — register ORM models
from app.routers import agents, eimmigration, intake
from app.routers import correction_router

_ENGINE = None


def _sqlalchemy_engine(database_url: str):
    """Create lazily cached engine (sync URLs only for health checks)."""

    global _ENGINE
    if _ENGINE is None:
        _ENGINE = create_engine(database_url, pool_pre_ping=True, pool_size=2, max_overflow=0)
    return _ENGINE


def _init_db() -> None:
    try:
        engine = get_engine()
        Base.metadata.create_all(bind=engine)
    except Exception:
        pass


app = FastAPI(title="AssociateOnDemand API", version="0.4.0")

app.include_router(intake.router)
app.include_router(agents.router)
app.include_router(correction_router.router)
app.include_router(eimmigration.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    _init_db()


def postgres_ok(database_url: str) -> bool:
    """Return True if Postgres replies to SELECT 1."""

    try:
        eng = _sqlalchemy_engine(database_url)
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except OperationalError:
        return False
    except Exception:
        return False


def redis_ok(url: str) -> bool:
    try:
        r = redis.Redis.from_url(url, decode_responses=True)
        return r.ping()
    except Exception:
        return False


def qdrant_ok(qdrant_url: str) -> dict[str, Any]:
    payload: dict[str, Any] = {"reachable": False, "collections": None}
    try:
        client = QdrantClient(url=qdrant_url, timeout=2)
        collections = client.get_collections()
        payload["reachable"] = True
        payload["collections"] = len(collections.collections)
    except Exception:
        payload["reachable"] = False
    return payload


def presidio_stub_ok() -> bool:
    env_url = os.getenv("PRESIDIO_HEALTH_URL")
    if not env_url:
        return False
    try:
        resp = httpx.get(env_url, timeout=2)
        return resp.status_code == 200
    except Exception:
        return False


@app.get("/health")
def health(settings: Settings = Depends(get_settings)) -> dict[str, Any]:
    qdrant = qdrant_ok(settings.qdrant_url)

    deps = {
        "postgres": postgres_ok(settings.database_url),
        "redis": redis_ok(settings.redis_url),
        "qdrant": qdrant,
        "presidio": presidio_stub_ok(),
        "tier": settings.aod_pii_tier,
    }

    ready = deps["postgres"] and deps["redis"] and qdrant["reachable"]
    status = "ok" if ready else "degraded"
    return {
        "service": settings.app_name,
        "status": status,
        "tier": deps["tier"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dependencies": deps,
    }


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "AssociateOnDemand API online", "docs": "/docs", "health": "/health"}
