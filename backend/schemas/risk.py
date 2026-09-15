"""
Pydantic Schemas for AI Risk & Incident Intelligence
---------------------------------------------------
Defines structured responses for risk scores, contributing factors,
explainable breakdowns, and control-center recommendations.
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field

# Allowed Risk Classification Levels
RiskLevel = Literal["Low", "Medium", "High", "Critical"]


class RiskFactor(BaseModel):
    domain: str = Field(..., description="Origin domain: Emergency, Traffic, Road Hazard, Violation")
    impact: str = Field(..., description="Impact level: Low, Medium, High, Critical")
    points: float = Field(..., description="Points added to the risk score")
    title: str = Field(..., description="Short factor summary")
    description: str = Field(..., description="Detailed explanation of contributing metric")


class ScoreBreakdown(BaseModel):
    emergency_score: float = Field(..., ge=0.0, le=35.0, description="Active emergency alerts score (max 35)")
    traffic_score: float = Field(..., ge=0.0, le=25.0, description="Traffic congestion & speed deficit score (max 25)")
    issue_score: float = Field(..., ge=0.0, le=20.0, description="Unresolved road hazards score (max 20)")
    violation_score: float = Field(..., ge=0.0, le=20.0, description="Rule violations & enforcement score (max 20)")
    raw_score: float = Field(..., ge=0.0, description="Unclamped sum of domain scores")
    final_score: int = Field(..., ge=0, le=100, description="Clamped final risk score (0-100)")


class AreaRiskSummary(BaseModel):
    area: str = Field(..., description="Urban area / sector name")
    risk_score: int = Field(..., ge=0, le=100, description="Calculated risk score from 0 to 100")
    risk_level: RiskLevel = Field(..., description="Risk level: Low, Medium, High, Critical")
    primary_factor: str = Field(..., description="Highest weighted risk factor")
    recommended_action: str = Field(..., description="Control-center recommended operational response")
    active_emergencies: int = Field(..., ge=0, description="Count of active emergency alerts")
    unresolved_issues: int = Field(..., ge=0, description="Count of open or in-progress road hazards")
    congestion_level: Optional[str] = Field(None, description="Dominant congestion state if traffic monitored")
    average_speed: Optional[float] = Field(None, description="Average traffic speed in km/h if available")
    vehicle_count: Optional[int] = Field(None, description="Average vehicle count if available")
    recent_violations: int = Field(..., ge=0, description="Count of detected violations")
    score_breakdown: ScoreBreakdown
    contributing_factors: List[RiskFactor] = Field(default_factory=list)


class RoadRiskSummary(BaseModel):
    road_name: str = Field(..., description="Monitored road or corridor name")
    area: Optional[str] = Field(None, description="Primary area road is located in")
    risk_score: int = Field(..., ge=0, le=100, description="Calculated risk score from 0 to 100")
    risk_level: RiskLevel = Field(..., description="Risk level: Low, Medium, High, Critical")
    average_speed: float = Field(..., description="Current average speed in km/h")
    vehicle_count: int = Field(..., description="Vehicle volume count")
    congestion_level: str = Field(..., description="Congestion category: Low, Moderate, Heavy, Severe")
    traffic_status: str = Field(..., description="Flow status: Clear, Moving, Congested, Blocked")
    active_emergencies: int = Field(..., ge=0, description="Active emergency alerts along this road")
    unresolved_issues: int = Field(..., ge=0, description="Unresolved road issues along this road")
    recent_violations: int = Field(..., ge=0, description="Recent traffic violations along this road")
    primary_factor: str = Field(..., description="Highest weighted risk factor")
    recommended_action: str = Field(..., description="Control-center recommended action")
    score_breakdown: ScoreBreakdown
    contributing_factors: List[RiskFactor] = Field(default_factory=list)


class RiskOverviewResponse(BaseModel):
    city_risk_score: int = Field(..., ge=0, le=100, description="Overall citywide composite risk index")
    city_risk_level: RiskLevel = Field(..., description="Citywide risk level")
    total_areas_assessed: int = Field(..., ge=0)
    total_roads_assessed: int = Field(..., ge=0)
    critical_risk_areas: int = Field(..., ge=0)
    high_risk_areas: int = Field(..., ge=0)
    medium_risk_areas: int = Field(..., ge=0)
    low_risk_areas: int = Field(..., ge=0)
    top_risk_areas: List[AreaRiskSummary] = Field(default_factory=list)
    top_risk_roads: List[RoadRiskSummary] = Field(default_factory=list)
    active_emergencies_count: int = Field(..., ge=0)
    unresolved_issues_count: int = Field(..., ge=0)
    congested_roads_count: int = Field(..., ge=0)
    recent_violations_count: int = Field(..., ge=0)
    recommended_action: str = Field(..., description="Citywide primary tactical recommendation")
    methodology: str = Field(
        default="Deterministic Multi-Domain Risk Scoring Engine (explainable, rules-based, non-ML)",
        description="Documentation of intelligence computation engine"
    )
    last_evaluated: str = Field(..., description="ISO 8601 evaluation timestamp")


class AreaRiskListResponse(BaseModel):
    total: int = Field(..., ge=0)
    areas: List[AreaRiskSummary] = Field(default_factory=list)


class RoadRiskListResponse(BaseModel):
    total: int = Field(..., ge=0)
    roads: List[RoadRiskSummary] = Field(default_factory=list)
