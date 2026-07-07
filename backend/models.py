"""
Data models (SQLModel) and Pydantic request/response schemas.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import Column
from sqlalchemy.types import Enum as SQLEnum
from sqlmodel import Field, SQLModel


# ── Enums ──────────────────────────────────────────────

class BusType(str, Enum):
    AC = "AC"
    NON_AC = "Non-AC"
    SLEEPER = "Sleeper"


class BusStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class BookingStatus(str, Enum):
    CONFIRMED = "Confirmed"
    CANCELLED = "Cancelled"


class UserRole(str, Enum):
    ADMIN = "admin"
    CUSTOMER = "customer"


# ── DB Models ──────────────────────────────────────────

class Bus(SQLModel, table=True):
    __tablename__ = "buses"

    id: Optional[int] = Field(default=None, primary_key=True)
    origin: str = Field(index=True)
    destination: str = Field(index=True)
    departure_time: datetime
    bus_type: BusType = Field(
        sa_column=Column(
            SQLEnum(
                BusType,
                native_enum=False,
                values_callable=lambda enum: [e.value for e in enum],
            ),
            nullable=False,
        )
    )
    total_seats: int
    available_seats: int
    price: float
    status: BusStatus = Field(
        default=BusStatus.ACTIVE,
        sa_column=Column(
            SQLEnum(
                BusStatus,
                native_enum=False,
                values_callable=lambda enum: [e.value for e in enum],
            ),
            nullable=False,
        ),
    )


class Booking(SQLModel, table=True):
    __tablename__ = "bookings"

    id: Optional[int] = Field(default=None, primary_key=True)
    bus_id: int = Field(foreign_key="buses.id")
    passenger_name: str
    passenger_age: int
    seats_booked: int
    amount: float
    status: BookingStatus = Field(
        default=BookingStatus.CONFIRMED,
        sa_column=Column(
            SQLEnum(
                BookingStatus,
                native_enum=False,
                values_callable=lambda enum: [e.value for e in enum],
            ),
            nullable=False,
        ),
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    role: UserRole


# ── Request Schemas ────────────────────────────────────

class BusCreate(BaseModel):
    origin: str
    destination: str
    departure_time: datetime
    bus_type: BusType
    total_seats: int
    price: float
    status: BusStatus = BusStatus.ACTIVE


class BusUpdate(BaseModel):
    origin: Optional[str] = None
    destination: Optional[str] = None
    departure_time: Optional[datetime] = None
    bus_type: Optional[BusType] = None
    total_seats: Optional[int] = None
    price: Optional[float] = None
    status: Optional[BusStatus] = None


class BookingCreate(BaseModel):
    bus_id: int
    passenger_name: str
    passenger_age: int
    seats: int


class SearchQuery(BaseModel):
    query: str


# ── Response Schemas ───────────────────────────────────

class BusResponse(BaseModel):
    id: int
    origin: str
    destination: str
    departure_time: datetime
    bus_type: BusType
    total_seats: int
    available_seats: int
    price: float
    status: BusStatus

    class Config:
        from_attributes = True


class BookingResponse(BaseModel):
    id: int
    bus_id: int
    passenger_name: str
    passenger_age: int
    seats_booked: int
    amount: float
    status: BookingStatus
    created_at: datetime
    origin: Optional[str] = None
    destination: Optional[str] = None
    departure_time: Optional[datetime] = None
    bus_price: Optional[float] = None

    class Config:
        from_attributes = True


class DashboardResponse(BaseModel):
    bookings_today: int
    revenue_today: float
    occupancy_by_bus: list
    route_wise_demand: list


class SearchResult(BaseModel):
    results: list
    understood: dict
    note: Optional[str] = None
