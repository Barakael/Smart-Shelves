from __future__ import annotations

import os
import shutil
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path
from typing import List
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import Document, Shelf
from ..schemas import BulkImportResponse, DocumentSummary
from .manifest import ManifestError, load_manifest
from .storage import (
    StorageError,
    build_pdf_lookup,
    find_manifest,
    move_pdf_to_storage,
    persist_upload_to_tmp,
)


class BulkIngestService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()

    def process_archive(self, upload: UploadFile) -> BulkImportResponse:
        temp_dir = Path(tempfile.mkdtemp(prefix='bulk_', dir=self.settings.tmp_root))
        zip_path = temp_dir / 'payload.zip'

        try:
            persist_upload_to_tmp(upload, zip_path)
            if not zipfile.is_zipfile(zip_path):
                raise HTTPException(status_code=400, detail='Provided file is not a valid ZIP archive')

            with zipfile.ZipFile(zip_path) as archive:
                self._safe_extract(archive, temp_dir)

            manifest_path = find_manifest(temp_dir)
            manifest_entries = load_manifest(manifest_path, self.settings.manifest_required_columns)
            pdf_lookup = build_pdf_lookup(temp_dir)

            if not pdf_lookup:
                raise HTTPException(status_code=400, detail='No PDF files were found inside the ZIP archive')

            imported_documents: List[DocumentSummary] = []

            for entry in manifest_entries:
                pdf_path = pdf_lookup.get(entry.filename)
                if not pdf_path:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Row {entry.row_number}: File '{entry.filename}' not found in archive",
                    )

                shelf = self._resolve_shelf(entry.shelf_id)
                if not shelf:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Row {entry.row_number}: Shelf '{entry.shelf_id}' not found",
                    )

                if shelf.gpio_pin is None:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Row {entry.row_number}: Shelf '{entry.shelf_id}' is missing a GPIO pin assignment",
                    )

                stored_path = move_pdf_to_storage(pdf_path, self.settings.uploads_root)
                document = self._create_document(entry, shelf, stored_path)
                imported_documents.append(
                    DocumentSummary(
                        document_id=document.id,
                        reference=document.reference,
                        name=document.name,
                        shelf_id=shelf.id,
                        shelf_name=shelf.name,
                        stored_path=str(stored_path),
                        created_at=document.created_at or datetime.utcnow(),
                    )
                )

            return BulkImportResponse(
                total_manifest_rows=len(manifest_entries),
                imported_count=len(imported_documents),
                imported_documents=imported_documents,
            )
        except (StorageError, ManifestError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def _resolve_shelf(self, shelf_identifier: str) -> Shelf | None:
        if shelf_identifier.isdigit():
            stmt = select(Shelf).where(Shelf.id == int(shelf_identifier))
        else:
            stmt = select(Shelf).where(func.lower(Shelf.name) == shelf_identifier.lower())
        return self.db.execute(stmt).scalars().first()

    def _create_document(self, entry, shelf: Shelf, stored_path: Path) -> Document:
        reference = self._generate_reference(entry.filename, shelf.cabinet_id)
        metadata_payload = {
            'file': {
                'original_name': entry.filename,
                'stored_path': str(stored_path),
                'ingested_at': datetime.utcnow().isoformat(),
                'source': self.settings.ingest_source_label,
            },
            'manifest': {
                'document_title': entry.document_title,
                'shelf_identifier': entry.shelf_id,
            },
        }

        document = Document(
            reference=reference,
            name=entry.document_title,
            status='available',
            shelf_label=shelf.name,
            cabinet_id=shelf.cabinet_id,
            room_id=shelf.room_id,
            shelf_id=shelf.id,
            metadata=metadata_payload,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(document)
        self.db.flush()
        return document

    def _generate_reference(self, filename: str, cabinet_id: int | None) -> str:
        base = Path(filename).stem.upper().replace(' ', '-')[:240]
        if not base:
            base = uuid4().hex[:8].upper()
        candidate = base
        suffix = 1
        while self._reference_exists(candidate, cabinet_id):
            candidate = f"{base}-{suffix:02d}"
            suffix += 1
        return candidate

    def _reference_exists(self, reference: str, cabinet_id: int | None) -> bool:
        stmt = select(Document.id).where(Document.reference == reference)
        if cabinet_id:
            stmt = stmt.where(Document.cabinet_id == cabinet_id)
        return self.db.execute(stmt).scalar_one_or_none() is not None

    def _safe_extract(self, archive: zipfile.ZipFile, destination: Path) -> None:
        dest = destination.resolve()
        for member in archive.infolist():
            member_path = dest / Path(member.filename)
            resolved = member_path.resolve()
            if os.path.commonpath([str(dest), str(resolved)]) != str(dest):
                raise HTTPException(status_code=400, detail='Archive contains unsafe paths')
        archive.extractall(destination)
