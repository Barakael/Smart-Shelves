from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List

import pandas as pd


@dataclass
class ManifestEntry:
    row_number: int
    filename: str
    document_title: str
    shelf_id: str


class ManifestError(Exception):
    pass


def _read_manifest(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix == '.csv':
        return pd.read_csv(path)
    if suffix in {'.xlsx', '.xls'}:
        return pd.read_excel(path)
    raise ManifestError(f"Unsupported manifest format: {suffix}")


def load_manifest(path: Path, required_columns: Iterable[str]) -> List[ManifestEntry]:
    frame = _read_manifest(path)
    frame.columns = [str(col).strip().lower() for col in frame.columns]

    normalized_required = [col.lower() for col in required_columns]
    missing = [col for col in normalized_required if col not in frame.columns]
    if missing:
        raise ManifestError(f"Manifest missing required columns: {', '.join(missing)}")

    entries: List[ManifestEntry] = []
    for idx, row in frame.iterrows():
        filename = str(row.get('filename', '')).strip()
        title = str(row.get('document_title', '')).strip()
        shelf_id = str(row.get('shelf_id', '')).strip()

        if not filename or not title or not shelf_id:
            raise ManifestError(f"Row {idx + 2}: filename, document_title, and shelf_id are required")

        entries.append(
            ManifestEntry(
                row_number=idx + 2,  # +2 accounts for 0-index + header row
                filename=filename,
                document_title=title,
                shelf_id=shelf_id,
            )
        )

    return entries
