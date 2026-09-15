"""
Traffic Violation SQLAlchemy ORM Model
---------------------------------------
Represents the 'traffic_violations' table in PostgreSQL.
"""

from sqlalchemy import Column, String, Text, Float, DateTime, func
from database import Base

class TrafficViolation(Base):
    __tablename__ = "traffic_violations"

    # Sequential identifier: VIO-0001, VIO-0002, etc.
    id = Column(String(20), primary_key=True, index=True, nullable=False)

    violation_type = Column(String(80), nullable=False, index=True)
    # Examples: Speeding, Red Light Violation, Wrong Lane, Illegal Parking, No Helmet

    vehicle_number = Column(String(30), nullable=False, index=True)
    location = Column(String(255), nullable=False)
    area = Column(String(100), nullable=False, index=True)

    severity = Column(String(20), nullable=False)
    # Allowed: "Low", "Medium", "High", "Critical"

    status = Column(String(30), nullable=False, default="Detected", index=True)
    # Allowed: "Detected", "Under Review", "Confirmed", "Resolved"

    fine_amount = Column(Float, nullable=False, default=0.0)
    description = Column(Text, nullable=False)
    detected_at = Column(String(50), nullable=False)  # ISO 8601 string or formatted timestamp

    # Optional geospatial coordinates (Phase 12 GIS foundation)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<TrafficViolation id='{self.id}' type='{self.violation_type}' vehicle='{self.vehicle_number}' status='{self.status}'>"
