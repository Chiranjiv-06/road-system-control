"""
Traffic Violation Service Layer
--------------------------------
Handles PostgreSQL database operations and business logic for traffic violations
using SQLAlchemy ORM sessions.
"""

from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.traffic_violation import TrafficViolation
from schemas.traffic_violation import TrafficViolationCreate

class TrafficViolationService:
    @staticmethod
    def generate_next_violation_id(db: Session) -> str:
        """
        Generate a sequential violation ID in the format: VIO-0001, VIO-0002, etc.
        Scans existing records to guarantee no primary key collisions.
        """
        all_ids = db.query(TrafficViolation.id).all()
        max_num = 0
        for (existing_id,) in all_ids:
            if existing_id and existing_id.startswith("VIO-"):
                try:
                    num = int(existing_id.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (ValueError, IndexError):
                    continue
        return f"VIO-{max_num + 1:04d}"

    @staticmethod
    def get_all_violations(
        db: Session,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        violation_type: Optional[str] = None,
        area: Optional[str] = None
    ) -> List[TrafficViolation]:
        """
        Retrieve all traffic violations with optional filtering, ordered newest first.
        """
        query = db.query(TrafficViolation)

        if status and status.strip():
            query = query.filter(func.lower(TrafficViolation.status) == status.strip().lower())

        if severity and severity.strip():
            query = query.filter(func.lower(TrafficViolation.severity) == severity.strip().lower())

        if violation_type and violation_type.strip():
            query = query.filter(func.lower(TrafficViolation.violation_type) == violation_type.strip().lower())

        if area and area.strip():
            query = query.filter(func.lower(TrafficViolation.area) == area.strip().lower())

        return query.order_by(
            TrafficViolation.detected_at.desc(),
            TrafficViolation.created_at.desc(),
            TrafficViolation.id.desc()
        ).all()

    @staticmethod
    def get_violation_by_id(db: Session, violation_id: str) -> Optional[TrafficViolation]:
        """
        Retrieve a single traffic violation by ID (case-insensitive).
        """
        return db.query(TrafficViolation).filter(
            func.lower(TrafficViolation.id) == violation_id.strip().lower()
        ).first()

    @staticmethod
    def create_violation(db: Session, violation_in: TrafficViolationCreate) -> TrafficViolation:
        """
        Create and persist a new traffic violation to PostgreSQL.
        """
        violation_id = TrafficViolationService.generate_next_violation_id(db)

        # Fallback to current UTC timestamp if not provided
        detected_time = violation_in.detected_at or datetime.now(timezone.utc).isoformat()

        db_violation = TrafficViolation(
            id=violation_id,
            violation_type=violation_in.violation_type.strip(),
            vehicle_number=violation_in.vehicle_number.strip(),
            location=violation_in.location.strip(),
            area=violation_in.area.strip(),
            severity=violation_in.severity,
            status=violation_in.status,
            fine_amount=float(violation_in.fine_amount),
            description=violation_in.description.strip(),
            detected_at=detected_time
        )

        try:
            db.add(db_violation)
            db.commit()
            db.refresh(db_violation)
            return db_violation
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def update_violation_status(db: Session, violation_id: str, new_status: str) -> Optional[TrafficViolation]:
        """
        Update the lifecycle processing status of an existing traffic violation.
        """
        violation = TrafficViolationService.get_violation_by_id(db, violation_id)
        if not violation:
            return None

        violation.status = new_status
        try:
            db.commit()
            db.refresh(violation)
            return violation
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def get_violations_summary(db: Session) -> dict:
        """
        Calculate aggregate summary statistics across all traffic violations.
        Handles empty database cleanly without errors.
        """
        violations = db.query(TrafficViolation).all()
        total_violations = len(violations)

        if total_violations == 0:
            return {
                "total_violations": 0,
                "detected_count": 0,
                "under_review_count": 0,
                "confirmed_count": 0,
                "resolved_count": 0,
                "high_critical_count": 0,
                "total_fine_amount": 0.0
            }

        detected_count = sum(1 for v in violations if v.status == "Detected")
        under_review_count = sum(1 for v in violations if v.status == "Under Review")
        confirmed_count = sum(1 for v in violations if v.status == "Confirmed")
        resolved_count = sum(1 for v in violations if v.status == "Resolved")
        high_critical_count = sum(1 for v in violations if v.severity in ["High", "Critical"])
        total_fine_amount = round(sum(v.fine_amount or 0.0 for v in violations), 2)

        return {
            "total_violations": total_violations,
            "detected_count": detected_count,
            "under_review_count": under_review_count,
            "confirmed_count": confirmed_count,
            "resolved_count": resolved_count,
            "high_critical_count": high_critical_count,
            "total_fine_amount": total_fine_amount
        }
