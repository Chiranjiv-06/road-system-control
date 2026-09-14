"""
Seed Script for Emergency Alert Management (Phase 7)
----------------------------------------------------
Inserts realistic demo emergency incident alerts into PostgreSQL only if the
emergency_alerts table is currently empty.

Usage:
    python seed_emergency_alerts.py
"""

import sys
from datetime import datetime, timezone
from database import SessionLocal, engine, Base
import models.emergency_alert  # Register model
from models.emergency_alert import EmergencyAlert

DEMO_ALERTS = [
    {
        "id": "EMG-0001",
        "alert_type": "Accident",
        "title": "Multi-Vehicle Collision near Sitabuldi Interchange",
        "description": "Two vehicles collided blocking inbound lanes; police and ambulance on site. Traffic diverted via Temple Road.",
        "location": "Sitabuldi Flyover Ramp, Central Nagpur",
        "area": "Sitabuldi",
        "severity": "Critical",
        "status": "Active",
        "issued_at": "2026-09-14T08:15:00Z"
    },
    {
        "id": "EMG-0002",
        "alert_type": "Road Blockage",
        "title": "Fallen Tree Obstructing Wardha Road Arterial",
        "description": "Heavy timber across southbound lane following stormy weather. Disaster management crew clearing debris.",
        "location": "Wardha Road, Opposite Metro Pillar 44",
        "area": "Wardha Road",
        "severity": "High",
        "status": "Investigating",
        "issued_at": "2026-09-14T08:30:00Z"
    },
    {
        "id": "EMG-0003",
        "alert_type": "Flooding",
        "title": "Severe Waterlogging at Narendra Nagar Underpass",
        "description": "3 feet of standing water in underpass. Motorists advised to use alternate ring road route.",
        "location": "Narendra Nagar Railway Underpass",
        "area": "Narendra Nagar",
        "severity": "High",
        "status": "Active",
        "issued_at": "2026-09-14T08:45:00Z"
    },
    {
        "id": "EMG-0004",
        "alert_type": "Medical Emergency",
        "title": "Emergency Medical Transport Corridor Activated",
        "description": "Green corridor enabled for critical organ transit between AIIMS Nagpur and GMC Hospital.",
        "location": "MIHAN Expressway to Medical Square",
        "area": "Medical Square",
        "severity": "Medium",
        "status": "Resolved",
        "issued_at": "2026-09-14T07:30:00Z"
    }
]

def seed_emergency_alerts_data():
    """Seeds demo emergency alerts if the table is empty."""
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        count = db.query(EmergencyAlert).count()
        if count > 0:
            print(f"[seed_emergency_alerts] emergency_alerts table already has {count} records. Skipping seed.")
            return

        print(f"[seed_emergency_alerts] Seeding {len(DEMO_ALERTS)} demo emergency alerts into PostgreSQL...")
        for data in DEMO_ALERTS:
            alert = EmergencyAlert(**data)
            db.add(alert)
        db.commit()
        print("[seed_emergency_alerts] Successfully seeded demo emergency alerts.")
    except Exception as e:
        db.rollback()
        print(f"[seed_emergency_alerts] Error seeding emergency alerts: {e}", file=sys.stderr)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_emergency_alerts_data()
