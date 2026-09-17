"""
Work Order Pydantic Schemas (Phase 14)
--------------------------------------
Validation, serialization, and summary models for Field Work Orders
and incident dispatch remediation operations.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator


VALID_ORDER_TYPES = {"ROAD_REPAIR", "FIELD_INSPECTION", "EMERGENCY_RESPONSE", "TRAFFIC_DIVERSION"}
VALID_PRIORITIES = {"Critical", "High", "Medium", "Low"}
VALID_STATUSES = {"PENDING", "DISPATCHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"}
VALID_ROLES = {"ROAD_INSPECTOR", "EMERGENCY_OPERATOR", "TRAFFIC_OPERATOR", "ADMIN"}
VALID_DOMAINS = {"issues", "emergency_alerts", "traffic"}

# Strict mapping required between order_type and source_domain
DOMAIN_ORDER_TYPE_MAP = {
    "ROAD_REPAIR": "issues",
    "FIELD_INSPECTION": "issues",
    "EMERGENCY_RESPONSE": "emergency_alerts",
    "TRAFFIC_DIVERSION": "traffic",
}

# Role mapping for order types
ORDER_TYPE_ROLE_MAP = {
    "ROAD_REPAIR": "ROAD_INSPECTOR",
    "FIELD_INSPECTION": "ROAD_INSPECTOR",
    "EMERGENCY_RESPONSE": "EMERGENCY_OPERATOR",
    "TRAFFIC_DIVERSION": "TRAFFIC_OPERATOR",
}


class WorkOrderBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=150, description="Headline of operational task")
    description: str = Field(..., min_length=5, description="Work scope, crew instructions, and safety notes")
    order_type: str = Field(..., description="ROAD_REPAIR, FIELD_INSPECTION, EMERGENCY_RESPONSE, TRAFFIC_DIVERSION")
    source_domain: str = Field(..., description="issues, emergency_alerts, traffic")
    source_id: Optional[str] = Field(None, description="Primary key of originating operational entity (e.g., ISS-0001)")
    area: str = Field(..., min_length=2, max_length=100, description="Municipal sector or zone")
    location: str = Field(..., min_length=2, max_length=255, description="Street name, landmark, or intersection")
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    priority: str = Field("Medium", description="Critical, High, Medium, Low")
    assigned_crew: str = Field(..., min_length=2, max_length=100, description="Name or identifier of dispatched field team")
    target_sla_hours: int = Field(24, ge=1, le=168, description="Allocated remediation window in hours (1-168)")

    @field_validator("order_type")
    @classmethod
    def validate_order_type(cls, v: str) -> str:
        clean = v.strip().upper() if v else ""
        if clean not in VALID_ORDER_TYPES:
            raise ValueError(f"Invalid order_type '{v}'. Must be one of: {sorted(list(VALID_ORDER_TYPES))}")
        return clean

    @field_validator("source_domain")
    @classmethod
    def validate_source_domain(cls, v: str) -> str:
        clean = v.strip().lower() if v else ""
        if clean not in VALID_DOMAINS:
            raise ValueError(f"Invalid source_domain '{v}'. Must be one of: {sorted(list(VALID_DOMAINS))}")
        return clean

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        clean = v.strip().capitalize() if v else "Medium"
        if clean not in VALID_PRIORITIES:
            raise ValueError(f"Invalid priority '{v}'. Must be one of: {sorted(list(VALID_PRIORITIES))}")
        return clean

    @model_validator(mode="after")
    def validate_domain_type_compatibility(self) -> "WorkOrderBase":
        expected_domain = DOMAIN_ORDER_TYPE_MAP.get(self.order_type)
        if expected_domain and self.source_domain != expected_domain:
            raise ValueError(
                f"Incompatible source_domain '{self.source_domain}' for order_type '{self.order_type}'. "
                f"Expected source_domain: '{expected_domain}'."
            )
        return self


class WorkOrderCreate(WorkOrderBase):
    pass


class WorkOrderStatusUpdate(BaseModel):
    status: str = Field(..., description="Target status: DISPATCHED, IN_PROGRESS, COMPLETED, CANCELLED")
    resolution_notes: Optional[str] = Field(None, description="Detailed remediation report (mandatory if status is COMPLETED)")
    actual_cost: Optional[float] = Field(None, ge=0.0, description="Remediation expenditure in INR (must not be negative)")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        clean = v.strip().upper() if v else ""
        if clean not in {"DISPATCHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"}:
            raise ValueError(f"Invalid target status '{v}'. Allowed: DISPATCHED, IN_PROGRESS, COMPLETED, CANCELLED")
        return clean

    @model_validator(mode="after")
    def validate_completion_requirements(self) -> "WorkOrderStatusUpdate":
        if self.status == "COMPLETED":
            notes = self.resolution_notes.strip() if self.resolution_notes else ""
            if len(notes) < 5:
                raise ValueError("resolution_notes are required when completing a work order (minimum 5 characters).")
        return self


class WorkOrderResponse(WorkOrderBase):
    id: str = Field(..., description="Unique work order identifier (e.g. WO-0001)")
    status: str
    assigned_role: str
    created_by: str
    sla_deadline: datetime
    sla_status: str = Field("ON_TRACK", description="ON_TRACK, EXPIRING_SOON, BREACHED")
    dispatched_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    completed_by: Optional[str] = None
    resolution_notes: Optional[str] = None
    actual_cost: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkOrderSummary(BaseModel):
    total_orders: int
    pending_count: int
    dispatched_count: int
    in_progress_count: int
    completed_count: int
    cancelled_count: int
    sla_breached_count: int
    total_cost: float
    sla_compliance_rate: float
    mean_time_to_resolve_hours: float
    by_order_type: Dict[str, int]
    by_area: Dict[str, int]


class WorkOrderListResponse(BaseModel):
    total: int
    items: List[WorkOrderResponse]
