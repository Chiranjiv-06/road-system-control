"""
Seed Script for Traffic Monitoring (Phase 6)
--------------------------------------------
Inserts realistic demo traffic corridor records into PostgreSQL only if the
traffic_records table is currently empty.

Usage:
    python seed_traffic.py
"""

import sys
from datetime import datetime, timezone
from database import SessionLocal, engine, Base
import models.traffic  # Register model
from models.traffic import TrafficRecord

DEMO_RECORDS = [
    {
        "id": "TRF-0001",
        "road_name": "Grand Trunk Road (NH-1)",
        "area": "North Corridor / Industrial Sector",
        "vehicle_count": 340,
        "average_speed": 42.5,
        "congestion_level": "Moderate",
        "status": "Moving",
        "recorded_at": "2026-09-13T10:15:00Z"
    },
    {
        "id": "TRF-0002",
        "road_name": "Outer Ring Expressway",
        "area": "East Bypass Junction",
        "vehicle_count": 780,
        "average_speed": 18.2,
        "congestion_level": "Heavy",
        "status": "Congested",
        "recorded_at": "2026-09-13T10:20:00Z"
    },
    {
        "id": "TRF-0003",
        "road_name": "Central Boulevard",
        "area": "Downtown Commercial Hub",
        "vehicle_count": 140,
        "average_speed": 55.0,
        "congestion_level": "Low",
        "status": "Clear",
        "recorded_at": "2026-09-13T10:22:00Z"
    },
    {
        "id": "TRF-0004",
        "road_name": "Airport Expressway",
        "area": "Terminal 2 Underpass",
        "vehicle_count": 920,
        "average_speed": 6.8,
        "congestion_level": "Severe",
        "status": "Blocked",
        "recorded_at": "2026-09-13T10:25:00Z"
    }
]

def seed_traffic_data():
    """Seeds demo traffic records if the table is empty."""
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        count = db.query(TrafficRecord).count()
        if count > 0:
            print(f"[seed_traffic] traffic_records table already has {count} records. Skipping seed.")
            return

        print(f"[seed_traffic] Seeding {len(DEMO_RECORDS)} demo traffic records into PostgreSQL...")
        for data in DEMO_RECORDS:
            record = TrafficRecord(**data)
            db.add(record)
        db.commit()
        print("[seed_traffic] Successfully seeded demo traffic records.")
    except Exception as e:
        db.rollback()
        print(f"[seed_traffic] Error seeding database: {e}", file=sys.stderr)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_traffic_data()
