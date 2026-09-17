"""
Work Order SQLAlchemy ORM Model (Phase 14)
------------------------------------------
Represents field incident dispatch operations, maintenance work orders,
crew assignments, and SLA remediation tracking in PostgreSQL.
"""

from sqlalchemy import Column, String, Integer, Float, Text, DateTime, func
from database import Base


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(String(20), primary_key=True, index=True)  # Format: WO-XXXX
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    order_type = Column(String(50), nullable=False, index=True)  # ROAD_REPAIR, FIELD_INSPECTION, EMERGENCY_RESPONSE, TRAFFIC_DIVERSION
    source_domain = Column(String(50), nullable=False)  # issues, emergency_alerts, traffic
    source_id = Column(String(50), nullable=True, index=True)  # ISS-XXXX, EMG-XXXX, TRF-XXXX
    area = Column(String(100), nullable=False, index=True)
    location = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    priority = Column(String(20), nullable=False, default="Medium")  # Critical, High, Medium, Low
    status = Column(String(30), nullable=False, index=True, default="PENDING")  # PENDING, DISPATCHED, IN_PROGRESS, COMPLETED, CANCELLED
    assigned_crew = Column(String(100), nullable=False)
    assigned_role = Column(String(50), nullable=False, index=True)  # ROAD_INSPECTOR, EMERGENCY_OPERATOR, TRAFFIC_OPERATOR, ADMIN
    created_by = Column(String(50), nullable=False)  # Operator username
    target_sla_hours = Column(Integer, nullable=False, default=24)
    sla_deadline = Column(DateTime(timezone=True), nullable=False)
    dispatched_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completed_by = Column(String(50), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    actual_cost = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<WorkOrder id='{self.id}' type='{self.order_type}' status='{self.status}' crew='{self.assigned_crew}'>"
