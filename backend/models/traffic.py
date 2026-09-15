"""
Traffic Monitoring SQLAlchemy ORM Model
---------------------------------------
Represents the 'traffic_records' table in PostgreSQL.
"""

from sqlalchemy import Column, String, Integer, Float, DateTime, func
from database import Base

class TrafficRecord(Base):
    __tablename__ = "traffic_records"

    # Sequential identifier: TRF-0001, TRF-0002, etc.
    id = Column(String(20), primary_key=True, index=True, nullable=False)
    
    road_name = Column(String(150), nullable=False, index=True)
    area = Column(String(100), nullable=False)
    vehicle_count = Column(Integer, nullable=False, default=0)
    average_speed = Column(Float, nullable=False)  # Unit: km/h
    congestion_level = Column(String(30), nullable=False)  # Low, Moderate, Heavy, Severe
    status = Column(String(30), nullable=False)  # Clear, Moving, Congested, Blocked
    recorded_at = Column(String(50), nullable=False)  # ISO timestamp
    
    # Optional geospatial coordinates (Phase 12 GIS foundation)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<TrafficRecord id='{self.id}' road='{self.road_name}' congestion='{self.congestion_level}'>"
