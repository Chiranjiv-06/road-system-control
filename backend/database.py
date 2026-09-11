"""
Database Configuration & Session Management
--------------------------------------------
Configures SQLAlchemy engine, SessionLocal, Base model,
and provides the get_db dependency for FastAPI routes.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
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
