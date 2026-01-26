from __future__ import annotations

import io
import shutil
from pathlib import Path
from typing import Dict
from uuid import uuid4

from fastapi import UploadFile


class StorageError(Exception):
    pass


def persist_upload_to_tmp(upload: UploadFile, destination: Path) -> Path:
    destination.parent.mkdir(parents=True, exist_ok=True)
    upload.file.seek(0)
    with destination.open('wb') as buffer:
        while True:
            chunk = upload.file.read(1024 * 1024)
            if not chunk:
                break
            buffer.write(chunk)
    return destination


def move_pdf_to_storage(source_path: Path, uploads_root: Path) -> Path:
    if source_path.suffix.lower() != '.pdf':
        raise StorageError(f"File {source_path.name} is not a PDF")

    uploads_root.mkdir(parents=True, exist_ok=True)
    target_name = f"{uuid4().hex}.pdf"
    target_path = uploads_root / target_name
    shutil.move(str(source_path), target_path)
    return target_path


def build_pdf_lookup(root: Path) -> Dict[str, Path]:
    lookup: Dict[str, Path] = {}
    for pdf_path in root.rglob('*.pdf'):
        key = pdf_path.name
        if key in lookup:
            raise StorageError(f'Duplicate PDF filename detected: {key}')
        lookup[key] = pdf_path
    return lookup


def find_manifest(root: Path) -> Path:
    candidates = list(root.rglob('*.csv')) + list(root.rglob('*.xlsx')) + list(root.rglob('*.xls'))
    if not candidates:
        raise StorageError('Manifest file (.csv or .xlsx) not found in archive')
    candidates.sort(key=lambda path: len(path.relative_to(root).parts))
    return candidates[0]
