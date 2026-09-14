"""
Seed Script for Traffic Violation Management (Phase 8)
------------------------------------------------------
Inserts realistic demo traffic violation records into PostgreSQL only if the
traffic_violations table is currently empty.

Usage:
    python seed_traffic_violations.py
"""

import sys
from datetime import datetime, timezone
from database import SessionLocal, engine, Base
import models.traffic_violation  # Register model
from models.traffic_violation import TrafficViolation

DEMO_VIOLATIONS = [
    {
        "id": "VIO-0001",
        "violation_type": "Speeding",
        "vehicle_number": "MH 31 EQ 8821",
        "location": "Wardha Road near Airport Metro Pillar 12",
        "area": "Wardha Road",
        "severity": "High",
        "status": "Detected",
        "fine_amount": 2000.0,
        "description": "Vehicle clocked at 88 km/h in designated 50 km/h urban speed zone by automated radar.",
        "detected_at": "2026-09-14T09:15:00Z"
    },
    {
        "id": "VIO-0002",
        "violation_type": "Red Light Violation",
        "vehicle_number": "MH 31 BC 4519",
        "location": "Sitabuldi Interchange Junction",
        "area": "Sitabuldi",
        "severity": "Critical",
        "status": "Under Review",
        "fine_amount": 1000.0,
        "description": "Sedan crossed stop line 3.4 seconds into red signal phase, almost intersecting pedestrian crossing.",
        "detected_at": "2026-09-14T09:30:00Z"
    },
    {
        "id": "VIO-0003",
        "violation_type": "Wrong Lane",
        "vehicle_number": "MH 31 DZ 7712",
        "location": "Central Avenue Commercial Corridor",
        "area": "Gandhibagh",
        "severity": "Medium",
        "status": "Confirmed",
        "fine_amount": 1500.0,
        "description": "Commercial delivery van driving against designated one-way traffic flow during morning peak.",
        "detected_at": "2026-09-14T10:05:00Z"
    },
    {
        "id": "VIO-0004",
        "violation_type": "Illegal Parking",
        "vehicle_number": "MH 40 AR 3302",
        "location": "Medical Square Emergency Hospital Entrance",
        "area": "Medical Square",
        "severity": "High",
        "status": "Confirmed",
        "fine_amount": 1000.0,
        "description": "SUV left unattended in designated ambulance emergency bay causing traffic obstruction.",
        "detected_at": "2026-09-14T10:45:00Z"
    },
    {
        "id": "VIO-0005",
        "violation_type": "No Helmet",
        "vehicle_number": "MH 31 FJ 9091",
        "location": "Zero Mile Freedom Park Metro Square",
        "area": "Civil Lines",
        "severity": "Low",
        "status": "Resolved",
        "fine_amount": 500.0,
        "description": "Two-wheeler operator photographed without safety helmet. Fine settled via citizen portal.",
        "detected_at": "2026-09-14T08:20:00Z"
    }
]

def seed_traffic_violations_data():
    """Seeds demo traffic violations if the table is empty."""
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        count = db.query(TrafficViolation).count()
        if count > 0:
            print(f"[seed_traffic_violations] traffic_violations table already has {count} records. Skipping seed.")
            return

        print(f"[seed_traffic_violations] Seeding {len(DEMO_VIOLATIONS)} demo traffic violations into PostgreSQL...")
        for data in DEMO_VIOLATIONS:
            violation = TrafficViolation(**data)
            db.add(violation)
        db.commit()
        print("[seed_traffic_violations] Successfully seeded demo traffic violations.")
    except Exception as e:
        db.rollback()
        print(f"[seed_traffic_violations] Error seeding traffic violations: {e}", file=sys.stderr)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_traffic_violations_data()
