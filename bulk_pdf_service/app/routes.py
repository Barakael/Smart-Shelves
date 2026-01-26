from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .database import get_db
from .models import Shelf
from .schemas import BulkImportResponse, ShelfOpenResponse
from .services.hardware import ShelfHardwareDriver
from .services.ingest import BulkIngestService

router = APIRouter(prefix='/api', tags=['bulk-ingest'])


@router.post('/bulk-import', response_model=BulkImportResponse, status_code=status.HTTP_201_CREATED)
async def bulk_import_endpoint(
    archive: UploadFile = File(..., description='ZIP containing PDFs and manifest'),
    db: Session = Depends(get_db),
):
    service = BulkIngestService(db)
    return service.process_archive(archive)


@router.post('/shelves/{shelf_identifier}/open', response_model=ShelfOpenResponse)
async def open_shelf_endpoint(shelf_identifier: str, db: Session = Depends(get_db)):
    stmt = (
        select(Shelf)
        .where(
            (Shelf.id == int(shelf_identifier))
            if shelf_identifier.isdigit()
            else func.lower(Shelf.name) == shelf_identifier.lower()
        )
    )
    shelf = db.execute(stmt).scalars().first()
    if not shelf:
        raise HTTPException(status_code=404, detail='Shelf not found')
    if shelf.gpio_pin is None:
        raise HTTPException(status_code=400, detail='Shelf missing GPIO pin assignment')

    driver = ShelfHardwareDriver()
    result = driver.trigger(shelf.gpio_pin)
    driver.cleanup()

    return ShelfOpenResponse(
        shelf_id=shelf.id,
        gpio_pin=shelf.gpio_pin,
        triggered=result.triggered,
        message=result.message,
    )
