"""
Notification SQLAlchemy ORM Model (Phase 13)
--------------------------------------------
Represents the 'notifications' table in PostgreSQL for role-aware operational
escalations across road issues, traffic flow, emergencies, violations, and risk.
"""

from sqlalchemy import Column, String, Text, DateTime, func, Index
from database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(20), primary_key=True, index=True)  # Sequential ID (e.g., NTF-0001)
    notification_type = Column(String(50), nullable=False, index=True)  # EMERGENCY_DISPATCH, TRAFFIC_CONGESTION, etc.
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    
    # Source entity traceability
    source_domain = Column(String(30), nullable=False, index=True)  # issues, traffic, emergency_alerts, traffic_violations, risk
    source_id = Column(String(50), nullable=True, index=True)  # e.g., EMG-0001, TRF-0002, ISS-0003, VIO-0004
    area = Column(String(100), nullable=True, index=True)
    
    # Operational priority & status
    severity = Column(String(20), nullable=False, default="Medium", index=True)  # Critical, High, Medium, Low
    status = Column(String(20), nullable=False, default="UNREAD", index=True)  # UNREAD, READ, ACKNOWLEDGED
    
    # RBAC routing: Target operator role
    # Allowed: "ROAD_INSPECTOR", "TRAFFIC_OPERATOR", "EMERGENCY_OPERATOR", "ADMIN"
    recipient_role = Column(String(30), nullable=False, index=True)
    
    # Timestamps & audit tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    read_by = Column(String(50), nullable=True)  # Operator username who marked as read
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_by = Column(String(50), nullable=True)  # Operator username who acknowledged

    # Composite index for fast duplicate checks and role filtering
    __table_args__ = (
        Index("ix_notifications_source_lookup", "source_domain", "source_id", "notification_type"),
        Index("ix_notifications_role_status", "recipient_role", "status"),
    )

    def __repr__(self):
        return (
            f"<Notification id='{self.id}' type='{self.notification_type}' "
            f"severity='{self.severity}' status='{self.status}' role='{self.recipient_role}'>"
        )
