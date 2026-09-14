from pydantic import BaseModel, Field, ConfigDict, AliasChoices
from typing import Optional, Literal

# Allowed Emergency Alert Types
AlertType = Literal[
    "Accident",
    "Road Blockage",
    "Fire",
    "Flooding",
    "Medical Emergency",
    "Traffic Emergency"
]

# Allowed Severity Levels
AlertSeverityType = Literal["Low", "Medium", "High", "Critical"]

# Allowed Lifecycle Statuses
AlertStatusType = Literal["Active", "Investigating", "Resolved"]

class EmergencyAlertBase(BaseModel):
    alert_type: AlertType = Field(
        ...,
        validation_alias=AliasChoices("alert_type", "alertType"),
        description="Category of emergency incident"
    )
    title: str = Field(
        ...,
        min_length=3,
        max_length=200,
        description="Concise summary headline of the emergency"
    )
    description: str = Field(
        ...,
        min_length=5,
        description="Detailed description of the emergency and response needs"
    )
    location: str = Field(
        ...,
        min_length=2,
        max_length=255,
        description="Specific street, intersection, or landmark"
    )
    area: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="City sector, ward, or neighborhood"
    )
    severity: AlertSeverityType = Field(
        ...,
        description="Urgency severity level: Low, Medium, High, Critical"
    )
    status: AlertStatusType = Field(
        default="Active",
        description="Current dispatch status: Active, Investigating, Resolved"
    )
    issued_at: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("issued_at", "issuedAt"),
        description="ISO 8601 timestamp when the alert was broadcast"
    )

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )

class EmergencyAlertCreate(EmergencyAlertBase):
    """Schema for creating a new emergency alert."""
    pass

class EmergencyAlertStatusUpdate(BaseModel):
    """Schema for updating an alert's lifecycle status."""
    status: AlertStatusType = Field(
        ...,
        description="New lifecycle status: Active, Investigating, Resolved"
    )

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )

class EmergencyAlertResponse(EmergencyAlertBase):
    """Schema for emergency alert responses returned by the API."""
    id: str = Field(..., description="Unique backend-generated alert identifier, e.g. EMG-0001")

class EmergencyAlertSummaryResponse(BaseModel):
    """Aggregated emergency alerts metrics summary."""
    total_alerts: int = Field(..., validation_alias=AliasChoices("total_alerts", "totalAlerts"))
    active_alerts: int = Field(..., validation_alias=AliasChoices("active_alerts", "activeAlerts"))
    critical_alerts: int = Field(..., validation_alias=AliasChoices("critical_alerts", "criticalAlerts"))
    investigating_alerts: int = Field(..., validation_alias=AliasChoices("investigating_alerts", "investigatingAlerts"))
    resolved_alerts: int = Field(..., validation_alias=AliasChoices("resolved_alerts", "resolvedAlerts"))

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )
