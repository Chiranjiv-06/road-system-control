"""
Emergency Alert Service Layer
-----------------------------
Handles PostgreSQL database operations and business logic for emergency alerts
using SQLAlchemy ORM sessions.
"""

from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.emergency_alert import EmergencyAlert
from schemas.emergency_alert import EmergencyAlertCreate

class EmergencyAlertService:
    @staticmethod
    def generate_next_alert_id(db: Session) -> str:
        """
        Generate a human-readable sequential alert ID in the format: EMG-0001, EMG-0002, etc.
        Scans existing records to guarantee no key collisions.
        """
        all_ids = db.query(EmergencyAlert.id).all()
        max_num = 0
        for (existing_id,) in all_ids:
            if existing_id and existing_id.startswith("EMG-"):
                try:
                    num = int(existing_id.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (ValueError, IndexError):
                    continue
        return f"EMG-{max_num + 1:04d}"

    @staticmethod
    def get_all_alerts(db: Session, status: Optional[str] = None) -> List[EmergencyAlert]:
        """
        Retrieve all emergency alerts ordered newest first, with optional status filtering.
        """
        query = db.query(EmergencyAlert)
        if status and status.strip():
            query = query.filter(func.lower(EmergencyAlert.status) == status.strip().lower())

        return query.order_by(
            EmergencyAlert.issued_at.desc(),
            EmergencyAlert.created_at.desc(),
            EmergencyAlert.id.desc()
        ).all()

    @staticmethod
    def get_alert_by_id(db: Session, alert_id: str) -> Optional[EmergencyAlert]:
        """
        Retrieve a single emergency alert by ID (case-insensitive).
        """
        return db.query(EmergencyAlert).filter(
            func.lower(EmergencyAlert.id) == alert_id.strip().lower()
        ).first()

    @staticmethod
    def create_alert(db: Session, alert_in: EmergencyAlertCreate) -> EmergencyAlert:
        """
        Create and persist a new emergency alert to PostgreSQL.
        """
        alert_id = EmergencyAlertService.generate_next_alert_id(db)

        # Fallback to current UTC timestamp if not provided
        issued_time = alert_in.issued_at or datetime.now(timezone.utc).isoformat()

        db_alert = EmergencyAlert(
            id=alert_id,
            alert_type=alert_in.alert_type,
            title=alert_in.title,
            description=alert_in.description,
            location=alert_in.location,
            area=alert_in.area,
            severity=alert_in.severity,
            status=alert_in.status,
            issued_at=issued_time
        )

        try:
            db.add(db_alert)
            db.commit()
            db.refresh(db_alert)
            return db_alert
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def update_alert_status(db: Session, alert_id: str, new_status: str) -> Optional[EmergencyAlert]:
        """
        Update the lifecycle status of an existing emergency alert.
        """
        alert = EmergencyAlertService.get_alert_by_id(db, alert_id)
        if not alert:
            return None

        alert.status = new_status
        try:
            db.commit()
            db.refresh(alert)
            return alert
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def get_alerts_summary(db: Session) -> dict:
        """
        Calculate aggregate summary statistics across all emergency alerts.
        Handles empty database cleanly without errors.
        """
        alerts = db.query(EmergencyAlert).all()
        total_alerts = len(alerts)

        if total_alerts == 0:
            return {
                "total_alerts": 0,
                "active_alerts": 0,
                "critical_alerts": 0,
                "investigating_alerts": 0,
                "resolved_alerts": 0
            }

        active_count = sum(1 for a in alerts if a.status == "Active")
        critical_count = sum(1 for a in alerts if a.severity == "Critical")
        investigating_count = sum(1 for a in alerts if a.status == "Investigating")
        resolved_count = sum(1 for a in alerts if a.status == "Resolved")

        return {
            "total_alerts": total_alerts,
            "active_alerts": active_count,
            "critical_alerts": critical_count,
            "investigating_alerts": investigating_count,
            "resolved_alerts": resolved_count
        }
