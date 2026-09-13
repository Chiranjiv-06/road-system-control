from pydantic import BaseModel, Field, ConfigDict, AliasChoices
from typing import Optional, Literal

# Allowed traffic metric types
CongestionType = Literal["Low", "Moderate", "Heavy", "Severe"]
TrafficStatusType = Literal["Clear", "Moving", "Congested", "Blocked"]

class TrafficBase(BaseModel):
    road_name: str = Field(
        ...,
        validation_alias=AliasChoices("road_name", "roadName"),
        min_length=1,
        description="Corridor or road name"
    )
    area: str = Field(
        ...,
        min_length=1,
        description="City sector, ward, or neighborhood"
    )
    vehicle_count: int = Field(
        ...,
        validation_alias=AliasChoices("vehicle_count", "vehicleCount"),
        ge=0,
        description="Estimated or counted number of vehicles"
    )
    average_speed: float = Field(
        ...,
        validation_alias=AliasChoices("average_speed", "averageSpeed"),
        ge=0.0,
        description="Average flow speed in km/h"
    )
    congestion_level: CongestionType = Field(
        ...,
        validation_alias=AliasChoices("congestion_level", "congestionLevel"),
        description="Congestion classification: Low, Moderate, Heavy, Severe"
    )
    status: TrafficStatusType = Field(
        ...,
        description="Current movement status: Clear, Moving, Congested, Blocked"
    )
    recorded_at: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("recorded_at", "recordedAt"),
        description="ISO timestamp of observation"
    )

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )

class TrafficCreate(TrafficBase):
    """Schema for creating a new traffic record."""
    pass

class TrafficResponse(TrafficBase):
    """Schema for traffic record responses returned by the API."""
    id: str = Field(..., description="Unique backend-generated identifier, e.g. TRF-0001")

class TrafficSummaryResponse(BaseModel):
    """Aggregated traffic metrics summary."""
    total_records: int = Field(..., validation_alias=AliasChoices("total_records", "totalRecords"))
    total_vehicles: int = Field(..., validation_alias=AliasChoices("total_vehicles", "totalVehicles"))
    average_speed: float = Field(..., validation_alias=AliasChoices("average_speed", "averageSpeed"))
    low_count: int = Field(..., validation_alias=AliasChoices("low_count", "lowCount"))
    moderate_count: int = Field(..., validation_alias=AliasChoices("moderate_count", "moderateCount"))
    heavy_count: int = Field(..., validation_alias=AliasChoices("heavy_count", "heavyCount"))
    severe_count: int = Field(..., validation_alias=AliasChoices("severe_count", "severeCount"))

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )
