from datetime import datetime
from typing import List

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Shelf(Base):
    __tablename__ = 'shelves'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    gpio_pin: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cabinet_id: Mapped[int | None] = mapped_column(ForeignKey('cabinets.id'))
    room_id: Mapped[int | None] = mapped_column(ForeignKey('rooms.id'))

    documents: Mapped[List['Document']] = relationship(back_populates='shelf')


class Document(Base):
    __tablename__ = 'documents'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reference: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), default='available')
    shelf_label: Mapped[str | None] = mapped_column(String(255))
    docket: Mapped[int | None] = mapped_column(Integer)
    side: Mapped[str | None] = mapped_column(String(2))
    row_index: Mapped[int | None] = mapped_column(Integer)
    column_index: Mapped[int | None] = mapped_column(Integer)
    cabinet_id: Mapped[int] = mapped_column(ForeignKey('cabinets.id'))
    room_id: Mapped[int | None] = mapped_column(ForeignKey('rooms.id'))
    shelf_id: Mapped[int | None] = mapped_column(ForeignKey('shelves.id'))
    metadata: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime | None] = mapped_column(DateTime)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime)

    shelf: Mapped[Shelf | None] = relationship(back_populates='documents')
