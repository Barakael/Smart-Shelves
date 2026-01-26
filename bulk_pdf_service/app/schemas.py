from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class DocumentSummary(BaseModel):
    document_id: int
    reference: str
    name: str
    shelf_id: int
    shelf_name: str
    stored_path: str
    created_at: datetime


class BulkImportResponse(BaseModel):
    total_manifest_rows: int
    imported_count: int
    skipped_rows: List[str] = Field(default_factory=list)
    imported_documents: List[DocumentSummary] = Field(default_factory=list)


class ShelfOpenResponse(BaseModel):
    shelf_id: int
    gpio_pin: int
    triggered: bool
    message: Optional[str] = None
*** End