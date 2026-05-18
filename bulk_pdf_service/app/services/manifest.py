from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional

import pandas as pd


@dataclass
class ManifestEntry:
    row_number: int
    filename: str
    document_title: str
    shelf_id: str
    docket: Optional[int] = None
    side: Optional[str] = None
    row_index: Optional[int] = None
    column_index: Optional[int] = None


class ManifestError(Exception):
    pass


def _normalize_optional_int(value: object, row_number: int, field_name: str) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None

    text = str(value).strip()
    if text == '':
        return None
    if text.isdigit():
        return int(text)

    try:
        parsed_float = float(text)
    except ValueError as exc:
        raise ManifestError(f"Row {row_number}: {field_name} must be an integer >= 0") from exc

    if not parsed_float.is_integer() or parsed_float < 0:
        raise ManifestError(f"Row {row_number}: {field_name} must be an integer >= 0")
    return int(parsed_float)


def _normalize_optional_side(value: object, row_number: int) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None

    text = str(value).strip().upper()
    if text == '':
        return None
    if text not in {'L', 'R'}:
        raise ManifestError(f"Row {row_number}: side must be either L or R")
    return text


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
        row_number = idx + 2  # +2 accounts for 0-index + header row
        filename = str(row.get('filename', '')).strip()
        title = str(row.get('document_title', '')).strip()
        shelf_id = str(row.get('shelf_id', '')).strip()
        docket = _normalize_optional_int(row.get('docket'), row_number, 'docket')
        row_index = _normalize_optional_int(row.get('row_index'), row_number, 'row_index')
        column_index = _normalize_optional_int(row.get('column_index'), row_number, 'column_index')
        side = _normalize_optional_side(row.get('side'), row_number)

        if not filename or not title or not shelf_id:
            raise ManifestError(f"Row {row_number}: filename, document_title, and shelf_id are required")

        entries.append(
            ManifestEntry(
                row_number=row_number,
                filename=filename,
                document_title=title,
                shelf_id=shelf_id,
                docket=docket,
                side=side,
                row_index=row_index,
                column_index=column_index,
            )
        )

    return entries
