from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Runtime configuration for the bulk PDF ingestion service."""

    database_url: str = Field(
        default="sqlite:///../backend/database/database.sqlite",
        description="SQLAlchemy compatible database URL (e.g., postgres://user:pass@host/db)",
    )
    uploads_root: Path = Field(default=Path('../storage/uploads/documents'))
    tmp_root: Path = Field(default=Path('../storage/tmp'))
    allowed_extensions: List[str] = Field(default_factory=lambda: ['.pdf'])
    manifest_required_columns: List[str] = Field(
        default_factory=lambda: ['filename', 'document_title', 'shelf_id']
    )
    ingest_source_label: str = Field(default='bulk_zip_ingest')
    gpio_pulse_ms: int = Field(default=500, description="Pulse length for GPIO relay activation")

    class Config:
        env_file = '.env'
        env_prefix = 'BULK_'
        case_sensitive = False

    def ensure_directories(self) -> None:
        self.uploads_root.mkdir(parents=True, exist_ok=True)
        self.tmp_root.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.ensure_directories()
    return settings
