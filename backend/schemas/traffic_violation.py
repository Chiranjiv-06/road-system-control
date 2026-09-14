from pydantic import BaseModel, Field, ConfigDict, AliasChoices, field_validator
from typing import Optional, Literal

# Allowed Severity Levels
ViolationSeverityType = Literal["Low", "Medium", "High", "Critical"]

# Allowed Lifecycle Statuses
ViolationStatusType = Literal["Detected", "Under Review", "Confirmed", "Resolved"]

class TrafficViolationBase(BaseModel):
    violation_type: str = Field(
        ...,
        min_length=2,
        max_length=80,
        validation_alias=AliasChoices("violation_type", "violationType"),
        description="Type of rule violation, e.g. Speeding, Red Light Violation, No Helmet"
    )
    vehicle_number: str = Field(
        ...,
        min_length=1,
        max_length=30,
        validation_alias=AliasChoices("vehicle_number", "vehicleNumber"),
        description="License plate registration, e.g. MH 31 AB 1234"
    )
    location: str = Field(
        ...,
        min_length=2,
        max_length=255,
        description="Specific street or junction where violation occurred"
    )
    area: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="City zone or neighborhood"
    )
    severity: ViolationSeverityType = Field(
        ...,
        description="Urgency/hazard level: Low, Medium, High, Critical"
    )
    status: ViolationStatusType = Field(
        default="Detected",
        description="Processing status: Detected, Under Review, Confirmed, Resolved"
    )
    fine_amount: float = Field(
        default=0.0,
        ge=0.0,
        validation_alias=AliasChoices("fine_amount", "fineAmount"),
        description="Penalty amount in local currency (cannot be negative)"
    )
    description: str = Field(
        ...,
        min_length=3,
        description="Details or camera notes of the violation"
    )
    detected_at: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("detected_at", "detectedAt"),
        description="ISO 8601 timestamp when the violation was detected"
    )

    @field_validator("vehicle_number")
    @classmethod
    def validate_vehicle_number(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Vehicle number cannot be empty or whitespace only.")
        return cleaned

    @field_validator("violation_type")
    @classmethod
    def validate_violation_type(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Violation type cannot be empty.")
        return cleaned

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )

class TrafficViolationCreate(TrafficViolationBase):
    """Schema for creating a new traffic violation."""
    pass

class TrafficViolationStatusUpdate(BaseModel):
    """Schema for updating a violation's processing status."""
    status: ViolationStatusType = Field(
        ...,
        description="New lifecycle status: Detected, Under Review, Confirmed, Resolved"
    )

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )

class TrafficViolationResponse(TrafficViolationBase):
    """Schema for traffic violation responses returned by the API."""
    id: str = Field(..., description="Unique backend-generated violation identifier, e.g. VIO-0001")

class TrafficViolationSummaryResponse(BaseModel):
    """Aggregated traffic violations metrics summary."""
    total_violations: int = Field(..., validation_alias=AliasChoices("total_violations", "totalViolations"))
    detected_count: int = Field(..., validation_alias=AliasChoices("detected_count", "detectedCount"))
    under_review_count: int = Field(..., validation_alias=AliasChoices("under_review_count", "underReviewCount"))
    confirmed_count: int = Field(..., validation_alias=AliasChoices("confirmed_count", "confirmedCount"))
    resolved_count: int = Field(..., validation_alias=AliasChoices("resolved_count", "resolvedCount"))
    high_critical_count: int = Field(..., validation_alias=AliasChoices("high_critical_count", "highCriticalCount"))
    total_fine_amount: float = Field(..., validation_alias=AliasChoices("total_fine_amount", "totalFineAmount"))

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )
