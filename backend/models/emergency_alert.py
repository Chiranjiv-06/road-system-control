"""
Emergency Alert SQLAlchemy ORM Model
------------------------------------
Represents the 'emergency_alerts' table in PostgreSQL.
"""

from sqlalchemy import Column, String, Text, DateTime, func
from database import Base

class EmergencyAlert(Base):
    __tablename__ = "emergency_alerts"

    # Sequential identifier: EMG-0001, EMG-0002, etc.
    id = Column(String(20), primary_key=True, index=True, nullable=False)

    alert_type = Column(String(50), nullable=False, index=True)
    # Allowed: "Accident", "Road Blockage", "Fire", "Flooding", "Medical Emergency", "Traffic Emergency"

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String(255), nullable=False)
    area = Column(String(100), nullable=False)

    severity = Column(String(20), nullable=False)
    # Allowed: "Low", "Medium", "High", "Critical"

    status = Column(String(30), nullable=False, default="Active", index=True)
    # Allowed: "Active", "Investigating", "Resolved"

    issued_at = Column(String(50), nullable=False)  # ISO 8601 string
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<EmergencyAlert id='{self.id}' type='{self.alert_type}' severity='{self.severity}' status='{self.status}'>"
