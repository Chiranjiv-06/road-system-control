"""
Map Schema Definitions (Phase 12 GIS & Operations Map)
------------------------------------------------------
Pydantic models for geospatial operational features, domain summaries,
and standardized map overview responses.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class MapFeatureRecord(BaseModel):
    """Represents an individual spatial record ready for map visualization."""
    id: str = Field(..., description="Unique entity identifier (e.g., ISS-0001, TRF-0001, EMG-0001, VIO-0001)")
    domain: str = Field(..., description="Operational domain: issue, traffic, emergency, violation, risk")
    title: str = Field(..., description="Feature title or incident label")
    location: str = Field(..., description="Textual location description or corridor name")
    area: Optional[str] = Field(None, description="City sector, ward, or neighborhood")
    latitude: Optional[float] = Field(None, description="WGS84 Latitude in decimal degrees")
    longitude: Optional[float] = Field(None, description="WGS84 Longitude in decimal degrees")
    coordinate_source: str = Field(
        ...,
        description="Data provenance: exact_gps, configured_reference, configured_corridor, area_centroid, unmapped"
    )
    severity: Optional[str] = Field(None, description="Severity rating: Critical, High, Medium, Low")
    status: Optional[str] = Field(None, description="Operational lifecycle status")
    risk_level: Optional[str] = Field(None, description="Composite risk level: Critical, High, Medium, Low")
    metric_label: Optional[str] = Field(None, description="Key operational metric display label")
    timestamp: Optional[str] = Field(None, description="Observation or incident timestamp")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Domain-specific operational attributes")


class MapSummary(BaseModel):
    """Aggregate statistics for mapped operational layers."""
    total_features: int = Field(..., description="Total features processed across all domains")
    mapped_count: int = Field(..., description="Total features with valid spatial coordinates")
    issues_count: int = Field(..., description="Total road issue features")
    traffic_count: int = Field(..., description="Total monitored traffic corridor features")
    emergencies_count: int = Field(..., description="Total emergency alert broadcast features")
    violations_count: int = Field(..., description="Total traffic violation features")
    risk_areas_count: int = Field(..., description="Total evaluated risk sector polygons/centroids")
    unmapped_count: int = Field(..., description="Features without coordinates that cannot be plotted")


class MapCenterConfig(BaseModel):
    """Geographic view center configuration for the map container."""
    latitude: float = Field(21.1458, description="Default center latitude")
    longitude: float = Field(79.0882, description="Default center longitude")
    zoom: int = Field(12, description="Default map zoom level")
    city: str = Field("Nagpur Metropolitan Command", description="City command zone name")


class MapOverviewResponse(BaseModel):
    """Consolidated geospatial response consumed by the operations map."""
    summary: MapSummary
    center: MapCenterConfig
    issues: List[MapFeatureRecord] = Field(default_factory=list)
    traffic: List[MapFeatureRecord] = Field(default_factory=list)
    emergencies: List[MapFeatureRecord] = Field(default_factory=list)
    violations: List[MapFeatureRecord] = Field(default_factory=list)
    risk: List[MapFeatureRecord] = Field(default_factory=list)
