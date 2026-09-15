"""
Database Configuration & Session Management
--------------------------------------------
Configures SQLAlchemy engine, SessionLocal, Base model,
and provides the get_db dependency for FastAPI routes.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# Load environment variables (.env in workspace root or backend/)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")
load_dotenv()

# Retrieve DATABASE_URL from environment with standard PostgreSQL fallback
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/road_system_control"
)

# Initialize SQLAlchemy Engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Automatically check connection health before query
    echo=False
)

# Session Factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative Base for ORM models
Base = declarative_base()

def ensure_spatial_columns():
    """
    Idempotently verifies and adds optional latitude and longitude columns
    to operational tables if they do not yet exist, guaranteeing backward compatibility.
    """
    try:
        with engine.connect() as conn:
            for table_name in ["issues", "traffic_records", "emergency_alerts", "traffic_violations"]:
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;"))
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;"))
            conn.commit()
    except Exception as e:
        print(f"Spatial column verification check: {e}")

def get_db():
    """
    FastAPI dependency that yields a database session per request
    and ensures the session is properly closed after completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

