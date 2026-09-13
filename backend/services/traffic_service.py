"""
Traffic Service Layer
---------------------
Handles PostgreSQL database operations and business logic for traffic monitoring records
using SQLAlchemy ORM sessions.
"""

from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.traffic import TrafficRecord
from schemas.traffic import TrafficCreate

class TrafficService:
    @staticmethod
    def generate_next_traffic_id(db: Session) -> str:
        """
        Generate a human-readable sequential traffic ID in the format: TRF-0001, TRF-0002, etc.
        Scans existing records to guarantee no key collisions.
        """
        all_ids = db.query(TrafficRecord.id).all()
        max_num = 0
        for (existing_id,) in all_ids:
            if existing_id and existing_id.startswith("TRF-"):
                try:
                    num = int(existing_id.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (ValueError, IndexError):
                    continue
        return f"TRF-{max_num + 1:04d}"

    @staticmethod
    def get_all_traffic(db: Session) -> List[TrafficRecord]:
        """
        Retrieve all traffic monitoring records ordered newest first.
        """
        return db.query(TrafficRecord).order_by(
            TrafficRecord.recorded_at.desc(),
            TrafficRecord.created_at.desc(),
            TrafficRecord.id.desc()
        ).all()

    @staticmethod
    def get_traffic_by_id(db: Session, traffic_id: str) -> Optional[TrafficRecord]:
        """
        Retrieve a single traffic record by ID (case-insensitive).
        """
        return db.query(TrafficRecord).filter(
            func.lower(TrafficRecord.id) == traffic_id.strip().lower()
        ).first()

    @staticmethod
    def create_traffic(db: Session, traffic_in: TrafficCreate) -> TrafficRecord:
        """
        Create and persist a new traffic record to PostgreSQL.
        """
        traffic_id = TrafficService.generate_next_traffic_id(db)

        # Fallback to current UTC timestamp if not provided
        recorded_time = traffic_in.recorded_at or datetime.now(timezone.utc).isoformat()

        db_traffic = TrafficRecord(
            id=traffic_id,
            road_name=traffic_in.road_name,
            area=traffic_in.area,
            vehicle_count=traffic_in.vehicle_count,
            average_speed=float(traffic_in.average_speed),
            congestion_level=traffic_in.congestion_level,
            status=traffic_in.status,
            recorded_at=recorded_time
        )

        try:
            db.add(db_traffic)
            db.commit()
            db.refresh(db_traffic)
            return db_traffic
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def get_traffic_summary(db: Session) -> dict:
        """
        Calculate aggregate summary statistics across all traffic records.
        Handles empty database cleanly without errors.
        """
        records = db.query(TrafficRecord).all()

        total_records = len(records)
        if total_records == 0:
            return {
                "total_records": 0,
                "total_vehicles": 0,
                "average_speed": 0.0,
                "low_count": 0,
                "moderate_count": 0,
                "heavy_count": 0,
                "severe_count": 0
            }

        total_vehicles = sum(r.vehicle_count for r in records)
        avg_speed = sum(r.average_speed for r in records) / total_records

        low_count = sum(1 for r in records if r.congestion_level == "Low")
        moderate_count = sum(1 for r in records if r.congestion_level == "Moderate")
        heavy_count = sum(1 for r in records if r.congestion_level == "Heavy")
        severe_count = sum(1 for r in records if r.congestion_level == "Severe")

        return {
            "total_records": total_records,
            "total_vehicles": total_vehicles,
            "average_speed": round(avg_speed, 1),
            "low_count": low_count,
            "moderate_count": moderate_count,
            "heavy_count": heavy_count,
            "severe_count": severe_count
        }
