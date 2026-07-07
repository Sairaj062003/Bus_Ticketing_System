"""
Admin routes — Bus CRUD + Dashboard analytics.
"""

from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func, text

from database import get_session
from models import (
    Bus, Booking, BookingStatus,
    BusCreate, BusUpdate, BusResponse, DashboardResponse,
)

router = APIRouter(prefix="/admin", tags=["admin"])


# ── POST /admin/buses — Create a bus ──────────────────

@router.post("/buses", response_model=BusResponse, status_code=status.HTTP_201_CREATED)
def create_bus(bus_data: BusCreate, db: Session = Depends(get_session)):
    # Validate departure_time is in the future
    dt = bus_data.departure_time
    if dt.tzinfo is not None:
        dt = dt.replace(tzinfo=None)
        bus_data.departure_time = dt
        
    if dt <= datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="Departure time must be in the future.",
        )

    bus = Bus(
        origin=bus_data.origin.strip().title(),
        destination=bus_data.destination.strip().title(),
        departure_time=bus_data.departure_time,
        bus_type=bus_data.bus_type,
        total_seats=bus_data.total_seats,
        available_seats=bus_data.total_seats,  # set equal on creation
        price=bus_data.price,
        status=bus_data.status,
    )
    db.add(bus)
    db.commit()
    db.refresh(bus)
    return bus


# ── GET /admin/buses — List all buses ─────────────────

@router.get("/buses", response_model=list[BusResponse])
def list_buses(db: Session = Depends(get_session)):
    buses = db.exec(select(Bus)).all()
    return buses


# ── PATCH /admin/buses/{id} — Update a bus ────────────

@router.patch("/buses/{bus_id}", response_model=BusResponse)
def update_bus(bus_id: int, bus_data: BusUpdate, db: Session = Depends(get_session)):
    bus = db.get(Bus, bus_id)
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found.")

    update_dict = bus_data.model_dump(exclude_unset=True)

    # Validate departure_time if it's being changed
    if "departure_time" in update_dict and update_dict["departure_time"] is not None:
        dt = update_dict["departure_time"]
        if dt.tzinfo is not None:
            dt = dt.replace(tzinfo=None)
            update_dict["departure_time"] = dt
            
        if dt <= datetime.utcnow():
            raise HTTPException(
                status_code=400,
                detail="Departure time must be in the future.",
            )

    # Normalize city names if provided
    if "origin" in update_dict:
        update_dict["origin"] = update_dict["origin"].strip().title()
    if "destination" in update_dict:
        update_dict["destination"] = update_dict["destination"].strip().title()

    # Preserve booked-seat count when total capacity changes.
    if "total_seats" in update_dict and update_dict["total_seats"] is not None:
        new_total = update_dict["total_seats"]
        already_booked = bus.total_seats - bus.available_seats

        if new_total < already_booked:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cannot reduce total seats to {new_total}: "
                    f"{already_booked} seats are already booked on this bus."
                ),
            )

        update_dict["available_seats"] = new_total - already_booked

    for key, value in update_dict.items():
        setattr(bus, key, value)

    db.add(bus)
    db.commit()
    db.refresh(bus)
    return bus


# ── GET /admin/dashboard — Analytics ──────────────────

@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(db: Session = Depends(get_session)):
    today = date.today().isoformat()

    # Bookings today (confirmed only)
    bookings_today = db.exec(
        text(
            "SELECT COUNT(*) FROM bookings "
            "WHERE date(created_at) = :today AND status = 'Confirmed'"
        ),
        params={"today": today},
    ).one()[0]

    # Revenue today (confirmed bookings only)
    rev = db.exec(
        text(
            "SELECT COALESCE(SUM(amount), 0) FROM bookings "
            "WHERE date(created_at) = :today AND status = 'Confirmed'"
        ),
        params={"today": today},
    ).one()[0]

    # Occupancy by bus (only active future buses)
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    occ_rows = db.exec(
        text(
            "SELECT id, origin || ' → ' || destination AS route, "
            "total_seats, available_seats, "
            "CASE WHEN total_seats > 0 "
            "THEN ROUND((total_seats - available_seats) * 100.0 / total_seats, 1) "
            "ELSE 0 END AS occupancy_pct "
            "FROM buses "
            "WHERE LOWER(status) = 'active' AND departure_time > :now "
            "ORDER BY origin, destination, id"
        ),
        params={"now": now},
    ).all()
    occupancy_by_bus = []
    for r in occ_rows:
        occupancy_by_bus.append({
            "bus_id": r[0],
            "route": r[1],
            "total_seats": r[2],
            "available_seats": r[3],
            "occupancy_pct": float(r[4]) if r[4] is not None else 0.0,
        })

    # Route-wise demand (confirmed bookings only)
    demand_rows = db.exec(
        text(
            "SELECT b.origin, b.destination, COUNT(bk.id) AS booking_count "
            "FROM buses b LEFT JOIN bookings bk "
            "ON b.id = bk.bus_id AND LOWER(bk.status) = 'confirmed' "
            "GROUP BY b.origin, b.destination "
            "ORDER BY booking_count DESC"
        )
    ).all()
    route_wise_demand = [
        {"origin": r[0], "destination": r[1], "booking_count": r[2]}
        for r in demand_rows
    ]

    return DashboardResponse(
        bookings_today=bookings_today,
        revenue_today=float(rev),
        occupancy_by_bus=occupancy_by_bus,
        route_wise_demand=route_wise_demand,
    )
