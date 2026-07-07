# Bus Ticketing System

A full-stack bus booking application with a FastAPI backend and a React + Vite frontend. The system supports bus search, booking, cancellation, admin bus management, and an admin dashboard.

## Tech Stack

### Backend
- Python 3.10+
- FastAPI
- SQLModel
- SQLite
- Uvicorn

### Frontend
- React
- Vite
- React Router DOM

## Architecture Overview

The project follows a simple layered structure:

- Backend entry point: [backend/main.py](backend/main.py)
- Database setup and engine: [backend/database.py](backend/database.py)
- Data models and schemas: [backend/models.py](backend/models.py)
- Route handlers:
  - Admin APIs: [backend/routes/admin.py](backend/routes/admin.py)
  - Customer APIs: [backend/routes/customer.py](backend/routes/customer.py)
- Search logic: [backend/services/search.py](backend/services/search.py)
- Frontend app: [frontend/src](frontend/src)

The backend uses SQLite for persistence and SQLModel for ORM and schema modeling. The frontend communicates with the backend through REST API endpoints.

## Setup Instructions

### 1. Clone the project

```bash
git clone https://github.com/Sairaj062003/Bus_Ticketing_System.git
cd Bus_Ticketing_System
```

### 2. Backend setup

```bash
cd backend
py -m pip install -r requirements.txt
py -m uvicorn main:app --reload
```

The backend will run at:

```text
http://127.0.0.1:8000
```

### 3. Frontend setup

Open a new terminal and run:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at:

```text
http://localhost:5173
```

## Assumptions

- SQLite is used for simplicity and local development.
- The app is intended for a small to medium-sized demo project rather than a large-scale production deployment.
- Admin and customer flows are handled through separate route groups in the backend.
- Booking and seat availability are managed directly in the database for this version.

## Notes

- The backend automatically creates tables and seeds initial data when the app starts.
- The frontend is configured to call the local backend during development.
