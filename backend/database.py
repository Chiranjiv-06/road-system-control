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

def ensure_notification_schema():
    """
    Idempotently verifies and adds the read_by column to notifications table
    and initializes the notification_id_seq sequence in PostgreSQL.
    Synchronizes sequence value with max existing NTF-XXXX identifier.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_by VARCHAR(50);"))
            conn.execute(text("CREATE SEQUENCE IF NOT EXISTS notification_id_seq START WITH 1;"))
            max_id = conn.execute(text(
                "SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) "
                "FROM notifications WHERE id ~ '^NTF-[0-9]+$'"
            )).scalar()
            if max_id and max_id > 0:
                conn.execute(text(f"SELECT setval('notification_id_seq', {max_id}, true);"))
            conn.commit()
    except Exception as e:
        print(f"Notification schema verification check: {e}")

def ensure_work_order_schema():
    """
    Idempotently verifies and provisions the work_order_id_seq sequence and
    performance indexes for the work_orders table in PostgreSQL.
    Synchronizes sequence value with max existing WO-XXXX identifier.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE SEQUENCE IF NOT EXISTS work_order_id_seq START WITH 1;"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders (status);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_role ON work_orders (assigned_role);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_work_orders_source_id ON work_orders (source_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_work_orders_area ON work_orders (area);"))
            max_id = conn.execute(text(
                "SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER)), 0) "
                "FROM work_orders WHERE id ~ '^WO-[0-9]+$'"
            )).scalar()
            if max_id and max_id > 0:
                conn.execute(text(f"SELECT setval('work_order_id_seq', {max_id}, true);"))
            conn.commit()
    except Exception as e:
        print(f"Work order schema verification check: {e}")



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

