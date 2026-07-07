"""
Customer routes — Search, browse, book, cancel, history.
"""

from datetime import datetime, date
from time import time

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlmodel import Session, text

from database import get_session
from models import (
    Bus, Booking, BookingStatus,
    BookingCreate, BookingResponse, BusResponse, SearchQuery,
)
from services.search import search_buses

router = APIRouter(tags=["customer"])

RATE_LIMIT_PROMPTS = 10
RATE_LIMIT_WINDOW = 60
prompt_rate_limits: dict[str, list[float]] = {}


# ── POST /search — Natural language search ────────────

@router.post("/search")
def nl_search(
    body: SearchQuery,
    request: Request,
    db: Session = Depends(get_session),
):
    client = request.client.host if request.client else "anonymous"
    now_ts = time()
    window_start = now_ts - RATE_LIMIT_WINDOW
    recent = [ts for ts in prompt_rate_limits.get(client, []) if ts > window_start]

    if len(recent) >= RATE_LIMIT_PROMPTS:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Max {RATE_LIMIT_PROMPTS} prompts per minute.",
        )

    recent.append(now_ts)
    prompt_rate_limits[client] = recent

    result = search_buses(body.query, db)

    # If search couldn't determine cities, return 400
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["note"])

    return result


# ── GET /buses — Structured filter search ───────────

@router.get("/buses", response_model=list[BusResponse])
def browse_buses(
    origin: str = Query(None),
    destination: str = Query(None),
    date: str = Query(None),
    bus_type: str = Query(None),
    db: Session = Depends(get_session),
):
    """Structured filter search — plain filters, no NL/LLM involved."""
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    conditions = [
        "available_seats > 0",
        "departure_time > :now",
        "LOWER(status) = 'active'",
    ]
    params = {"now": now}

    if origin:
        conditions.append("LOWER(origin) = LOWER(:origin)")
        params["origin"] = origin.strip()
    if destination:
        conditions.append("LOWER(destination) = LOWER(:destination)")
        params["destination"] = destination.strip()
    if date:
        conditions.append("date(departure_time) = :date")
        params["date"] = date
    if bus_type:
        conditions.append("bus_type = :bus_type")
        params["bus_type"] = bus_type

    query = (
        "SELECT id, origin, destination, departure_time, bus_type, total_seats, "
        "available_seats, price, status FROM buses "
        f"WHERE {' AND '.join(conditions)} ORDER BY departure_time ASC"
    )
    rows = db.exec(text(query), params=params).all()

    return [
        {
            "id": r[0],
            "origin": r[1],
            "destination": r[2],
            "departure_time": r[3],
            "bus_type": r[4],
            "total_seats": r[5],
            "available_seats": r[6],
            "price": r[7],
            "status": r[8],
        }
        for r in rows
    ]


# ── POST /bookings — Create a booking (atomic) ───────

@router.post("/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(body: BookingCreate, db: Session = Depends(get_session)):
    # Verify bus exists and is active
    bus = db.get(Bus, body.bus_id)
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found.")
    if bus.status != "active":
        raise HTTPException(status_code=400, detail="This bus is not active.")
    if bus.departure_time <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="This bus has already departed.")

    # Atomic seat decrement — single SQL statement prevents race conditions
    result = db.exec(
        text(
            "UPDATE buses SET available_seats = available_seats - :seats "
            "WHERE id = :bus_id AND available_seats >= :seats"
        ),
        params={"seats": body.seats, "bus_id": body.bus_id},
    )
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=409, detail="Not enough seats available.")

    # Create booking record
    booking = Booking(
        bus_id=body.bus_id,
        passenger_name=body.passenger_name.strip(),
        passenger_age=body.passenger_age,
        seats_booked=body.seats,
        amount=bus.price * body.seats,
        status=BookingStatus.CONFIRMED,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


# ── PATCH /bookings/{id}/cancel — Cancel a booking ───

@router.patch("/bookings/{booking_id}/cancel", response_model=BookingResponse)
def cancel_booking(booking_id: int, db: Session = Depends(get_session)):
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if str(booking.status).strip().lower() == BookingStatus.CANCELLED.value.lower():
        raise HTTPException(status_code=400, detail="Booking is already cancelled.")

    # Atomic seat release, clamped to total seats to avoid over-release
    db.exec(
        text(
            "UPDATE buses SET available_seats = MIN(total_seats, available_seats + :seats) "
            "WHERE id = :bus_id"
        ),
        params={"seats": booking.seats_booked, "bus_id": booking.bus_id},
    )

    # Update booking status
    booking.status = BookingStatus.CANCELLED
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


# ── GET /bookings — Booking history ───────────────────

def normalize_booking_status(raw_status: str):
    if not isinstance(raw_status, str):
        return raw_status
    normalized = raw_status.strip().lower()
    if normalized == "confirmed":
        return BookingStatus.CONFIRMED
    if normalized == "cancelled":
        return BookingStatus.CANCELLED
    return raw_status


@router.get("/bookings", response_model=list[BookingResponse])
def booking_history(
    customer_name: str = Query(None),
    db: Session = Depends(get_session),
):
    if customer_name:
        query_name = customer_name.strip()
        rows = db.exec(
            text(
                "SELECT * FROM bookings "
                "WHERE LOWER(TRIM(passenger_name)) = LOWER(TRIM(:name)) "
                "ORDER BY created_at DESC"
            ),
            params={"name": query_name},
        ).all()
    else:
        rows = db.exec(
            text("SELECT * FROM bookings ORDER BY created_at DESC")
        ).all()

    bookings = []
    for r in rows:
        bus_row = db.exec(
            text("SELECT origin, destination, departure_time, price FROM buses WHERE id = :bus_id"),
            params={"bus_id": r[1]},
        ).first()

        origin, destination, departure_time, bus_price = (bus_row or (None, None, None, None))

        # Build a plain dict matching BookingResponse so extra fields are included
        booking_obj = {
            "id": r[0],
            "bus_id": r[1],
            "passenger_name": r[2],
            "passenger_age": r[3],
            "seats_booked": r[4],
            "amount": r[5],
            "status": normalize_booking_status(r[6]),
            "created_at": r[7],
            "origin": origin,
            "destination": destination,
            "departure_time": departure_time,
            "bus_price": bus_price,
        }

        bookings.append(booking_obj)
    return bookings
