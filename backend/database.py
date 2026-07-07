"""
Database configuration — SQLite via SQLModel.
Single-file DB (bus_tickets.db), zero setup.
"""

from sqlmodel import SQLModel, Session, create_engine, text
from pathlib import Path

# Use absolute path to the DB file so the engine works regardless of CWD
DB_PATH = Path(__file__).resolve().parent / "bus_tickets.db"
DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},  # required for SQLite + FastAPI
)


def create_db_and_tables():
    """Create all tables defined by SQLModel metadata."""
    SQLModel.metadata.create_all(engine)


def cleanup_db():
    """Normalize persisted booking/bus data and repair bad seat counts."""
    with Session(engine) as session:
        # Normalize booking status values to enum names expected by SQLModel.
        session.exec(text("UPDATE bookings SET status = 'Confirmed' WHERE LOWER(TRIM(status)) = 'confirmed'"))
        session.exec(text("UPDATE bookings SET status = 'Confirmed' WHERE status = 'CONFIRMED'"))
        session.exec(text("UPDATE bookings SET status = 'Cancelled' WHERE LOWER(TRIM(status)) = 'cancelled'"))
        session.exec(text("UPDATE bookings SET status = 'Cancelled' WHERE status = 'CANCELLED'"))

        # Normalize bus status values to the enum values expected by SQLModel.
        session.exec(text("UPDATE buses SET status = 'active' WHERE LOWER(TRIM(status)) = 'active'"))
        session.exec(text("UPDATE buses SET status = 'active' WHERE status = 'ACTIVE'"))
        session.exec(text("UPDATE buses SET status = 'inactive' WHERE LOWER(TRIM(status)) = 'inactive'"))
        session.exec(text("UPDATE buses SET status = 'inactive' WHERE status = 'INACTIVE'"))

        # Normalize bus type values to the enum values expected by SQLModel.
        session.exec(text("UPDATE buses SET bus_type = 'AC' WHERE LOWER(TRIM(bus_type)) = 'ac'"))
        session.exec(text("UPDATE buses SET bus_type = 'Non-AC' WHERE LOWER(TRIM(bus_type)) IN ('non-ac','non_ac','non ac','nonac')"))
        session.exec(text("UPDATE buses SET bus_type = 'Sleeper' WHERE LOWER(TRIM(bus_type)) = 'sleeper'"))

        # Recompute available seats from confirmed bookings to repair over-release or stale state.
        bus_rows = session.exec(text("SELECT id, total_seats FROM buses")).all()
        for bus_id, total_seats in bus_rows:
            confirmed_seats = session.exec(
                text(
                    "SELECT COALESCE(SUM(seats_booked), 0) "
                    "FROM bookings WHERE bus_id = :bus_id AND LOWER(status) = 'confirmed'"
                ),
                params={"bus_id": bus_id},
            ).one()[0]
            correct_available = max(0, total_seats - confirmed_seats)
            session.exec(
                text("UPDATE buses SET available_seats = :avail WHERE id = :bus_id"),
                params={"avail": correct_available, "bus_id": bus_id},
            )

        session.commit()


def get_session():
    """FastAPI dependency — yields a DB session per request."""
    with Session(engine) as session:
        yield session
