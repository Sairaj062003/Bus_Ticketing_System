"""
FastAPI application — entry point.
"""

from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_db_and_tables, cleanup_db
from routes.admin import router as admin_router
from routes.customer import router as customer_router
from seed import seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables, repair persisted data, and seed defaults."""
    create_db_and_tables()
    cleanup_db()
    seed()
    yield


app = FastAPI(
    title="Bus Ticketing System",
    description="AI-powered bus ticket search & booking",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(admin_router)
app.include_router(customer_router)


@app.get("/")
def health():
    return {"status": "ok", "service": "Bus Ticketing System"}
