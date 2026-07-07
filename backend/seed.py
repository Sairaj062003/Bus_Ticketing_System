"""
Seed script — Populate the database with sample buses and users.
Run: python seed.py
"""

from datetime import datetime, timedelta
from database import engine, create_db_and_tables
from models import Bus, BusType, BusStatus, User, UserRole
from sqlmodel import Session, select

SAMPLE_BUSES = [
    # Hyderabad ↔ Bangalore
    {"origin": "Hyderabad", "destination": "Bangalore", "hours_offset": 8, "bus_type": BusType.AC, "total_seats": 40, "price": 850.0},
    {"origin": "Hyderabad", "destination": "Bangalore", "hours_offset": 14, "bus_type": BusType.SLEEPER, "total_seats": 30, "price": 1200.0},
    {"origin": "Hyderabad", "destination": "Bangalore", "hours_offset": 22, "bus_type": BusType.NON_AC, "total_seats": 50, "price": 550.0},
    {"origin": "Bangalore", "destination": "Hyderabad", "hours_offset": 10, "bus_type": BusType.AC, "total_seats": 40, "price": 900.0},

    # Mumbai ↔ Pune
    {"origin": "Mumbai", "destination": "Pune", "hours_offset": 6, "bus_type": BusType.AC, "total_seats": 45, "price": 450.0},
    {"origin": "Mumbai", "destination": "Pune", "hours_offset": 16, "bus_type": BusType.NON_AC, "total_seats": 50, "price": 300.0},
    {"origin": "Pune", "destination": "Mumbai", "hours_offset": 9, "bus_type": BusType.SLEEPER, "total_seats": 30, "price": 500.0},

    # Delhi ↔ Jaipur
    {"origin": "Delhi", "destination": "Jaipur", "hours_offset": 7, "bus_type": BusType.AC, "total_seats": 40, "price": 700.0},
    {"origin": "Delhi", "destination": "Jaipur", "hours_offset": 20, "bus_type": BusType.SLEEPER, "total_seats": 36, "price": 950.0},
    {"origin": "Jaipur", "destination": "Delhi", "hours_offset": 11, "bus_type": BusType.NON_AC, "total_seats": 50, "price": 500.0},

    # Chennai ↔ Bangalore
    {"origin": "Chennai", "destination": "Bangalore", "hours_offset": 5, "bus_type": BusType.AC, "total_seats": 40, "price": 600.0},
    {"origin": "Chennai", "destination": "Bangalore", "hours_offset": 18, "bus_type": BusType.SLEEPER, "total_seats": 30, "price": 800.0},
    {"origin": "Bangalore", "destination": "Chennai", "hours_offset": 12, "bus_type": BusType.NON_AC, "total_seats": 50, "price": 400.0},

    # Hyderabad ↔ Mumbai
    {"origin": "Hyderabad", "destination": "Mumbai", "hours_offset": 15, "bus_type": BusType.SLEEPER, "total_seats": 36, "price": 1500.0},
    {"origin": "Mumbai", "destination": "Hyderabad", "hours_offset": 21, "bus_type": BusType.AC, "total_seats": 40, "price": 1400.0},

    # Delhi ↔ Chandigarh
    {"origin": "Delhi", "destination": "Chandigarh", "hours_offset": 6, "bus_type": BusType.AC, "total_seats": 40, "price": 550.0},
    {"origin": "Chandigarh", "destination": "Delhi", "hours_offset": 17, "bus_type": BusType.NON_AC, "total_seats": 50, "price": 400.0},
]


def seed():
    create_db_and_tables()

    with Session(engine) as db:
        # Check if already seeded
        existing = db.exec(select(Bus)).first()
        if existing:
            print("Database already seeded. Skipping.")
            return

        now = datetime.utcnow()

        # Create buses spread across the next 4 days
        for day_offset in range(4):
            base_date = now + timedelta(days=day_offset)
            for bus_data in SAMPLE_BUSES:
                dep_time = base_date.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(hours=bus_data["hours_offset"])
                # Only add if departure is in the future
                if dep_time > now:
                    bus = Bus(
                        origin=bus_data["origin"],
                        destination=bus_data["destination"],
                        departure_time=dep_time,
                        bus_type=bus_data["bus_type"],
                        total_seats=bus_data["total_seats"],
                        available_seats=bus_data["total_seats"],
                        price=bus_data["price"],
                        status=BusStatus.ACTIVE,
                    )
                    db.add(bus)

        # Create sample users
        db.add(User(name="Admin User", role=UserRole.ADMIN))
        db.add(User(name="John Doe", role=UserRole.CUSTOMER))
        db.add(User(name="Jane Smith", role=UserRole.CUSTOMER))

        db.commit()
        print("Done: Database seeded with sample buses and users.")


if __name__ == "__main__":
    seed()
