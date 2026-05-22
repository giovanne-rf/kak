from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(180), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="viewer", server_default="viewer")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Building(Base):
    __tablename__ = "buildings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    photo_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    manager_name: Mapped[str] = mapped_column(String(120), nullable=False)
    manager_phone: Mapped[str] = mapped_column(String(40), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    equipments: Mapped[list["Equipment"]] = relationship(
        back_populates="building",
        cascade="all, delete-orphan",
    )


class Equipment(Base):
    __tablename__ = "equipments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id"), nullable=False, index=True)
    equipment_type: Mapped[str] = mapped_column(String(60), nullable=False)
    manufacturer: Mapped[str] = mapped_column(String(120), nullable=False)
    model: Mapped[str] = mapped_column(String(120), nullable=False)
    ip: Mapped[str] = mapped_column(String(60), nullable=False)
    installation_location: Mapped[str] = mapped_column(String(160), nullable=False)
    access_login: Mapped[str] = mapped_column(String(120), nullable=False)
    access_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    building: Mapped[Building] = relationship(back_populates="equipments")
