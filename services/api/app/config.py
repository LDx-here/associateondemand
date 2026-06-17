from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "AssociateOnDemand API"
    # Local: docker-compose postgres. Production: Supabase pooler URI on Fly (see docs/runbooks/deploy.md).
    database_url: str = "postgresql+psycopg://aod:aod@localhost:5432/aod"
    redis_url: str = "redis://localhost:6379/0"
    qdrant_url: str = "http://localhost:6333"
    allowed_origins: str = "http://localhost:3000"
    aod_pii_tier: str = "0"
    upload_dir: str = "./data/uploads"
    ocr_provider: str = "tesseract"
    anthropic_api_key: str = ""
    llm_default_model: str = "claude-sonnet-4-6"
    qdrant_api_key: str = ""


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
