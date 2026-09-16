"""
Notification Pydantic Schemas (Phase 13)
----------------------------------------
Request and response validation models for internal operational notifications,
acknowledgement workflows, and summary metrics.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


VALID_SEVERITIES = {"Critical", "High", "Medium", "Low"}
VALID_STATUSES = {"UNREAD", "READ", "ACKNOWLEDGED"}
VALID_ROLES = {"ROAD_INSPECTOR", "TRAFFIC_OPERATOR", "EMERGENCY_OPERATOR", "ADMIN"}
VALID_DOMAINS = {"issues", "traffic", "emergency_alerts", "traffic_violations", "risk"}


class NotificationBase(BaseModel):
    notification_type: str = Field(..., description="Operational notification type code (e.g., EMERGENCY_DISPATCH)")
    title: str = Field(..., min_length=3, max_length=150, description="Short, human-readable summary")
    message: str = Field(..., min_length=5, description="Full operational description and context")
    source_domain: str = Field(..., description="Source subsystem: issues, traffic, emergency_alerts, traffic_violations, risk")
    source_id: Optional[str] = Field(None, description="Primary key of originating operational record")
    area: Optional[str] = Field(None, description="Affected municipal area or corridor")
    severity: str = Field("Medium", description="Operational severity: Critical, High, Medium, Low")
    recipient_role: str = Field(..., description="Target role: ROAD_INSPECTOR, TRAFFIC_OPERATOR, EMERGENCY_OPERATOR, ADMIN")

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        v_title = v.strip().capitalize() if v else "Medium"
        if v_title not in VALID_SEVERITIES:
            raise ValueError(f"Invalid severity '{v}'. Must be one of: {sorted(list(VALID_SEVERITIES))}")
        return v_title

    @field_validator("recipient_role")
    @classmethod
    def validate_recipient_role(cls, v: str) -> str:
        v_upper = v.strip().upper() if v else ""
        if v_upper not in VALID_ROLES:
            raise ValueError(f"Invalid recipient_role '{v}'. Must be one of: {sorted(list(VALID_ROLES))}")
        return v_upper

    @field_validator("source_domain")
    @classmethod
    def validate_source_domain(cls, v: str) -> str:
        v_clean = v.strip().lower() if v else ""
        if v_clean not in VALID_DOMAINS:
            raise ValueError(f"Invalid source_domain '{v}'. Must be one of: {sorted(list(VALID_DOMAINS))}")
        return v_clean


class NotificationCreate(NotificationBase):
    pass


class NotificationResponse(BaseModel):
    id: str = Field(..., description="Unique notification identifier (e.g., NTF-0001)")
    notification_type: str
    title: str
    message: str
    source_domain: str
    source_id: Optional[str] = None
    area: Optional[str] = None
    severity: str
    status: str
    recipient_role: str
    created_at: datetime
    read_at: Optional[datetime] = None
    read_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None

    class Config:
        from_attributes = True


class NotificationSummary(BaseModel):
    total_notifications: int
    unread_count: int
    read_count: int
    acknowledged_count: int
    critical_count: int
    high_count: int
    by_domain: Dict[str, int]
    by_role: Dict[str, int]


class NotificationListResponse(BaseModel):
    total: int
    unread_total: int
    items: List[NotificationResponse]


class NotificationAcknowledgeRequest(BaseModel):
    remarks: Optional[str] = Field(None, max_length=255, description="Optional acknowledgement notes")
