from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional, Any

class AnalyticsOverviewResponse(BaseModel):
    total_issues: int
    total_traffic_records: int
    total_alerts: int
    total_violations: int
    active_emergencies: int
    unresolved_issues: int
    active_violations: int
    total_fines_assessed: float
    average_traffic_speed: float
    average_vehicle_count: float

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class AreaMetric(BaseModel):
    area: str
    count: int

class TrafficByAreaMetric(BaseModel):
    area: str
    record_count: int
    avg_speed: float
    avg_vehicles: float

class TrafficByRoadMetric(BaseModel):
    road_name: str
    vehicle_count: int
    average_speed: float
    congestion_level: str
    status: str

class AnalyticsTrafficResponse(BaseModel):
    total_records: int
    average_vehicle_count: float
    average_speed: float
    congestion_distribution: Dict[str, int]
    traffic_by_area: List[TrafficByAreaMetric]
    traffic_by_road: List[TrafficByRoadMetric]
    highest_congestion_areas: List[TrafficByAreaMetric]
    highest_volume_roads: List[TrafficByRoadMetric]

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class AnalyticsIssuesResponse(BaseModel):
    total_issues: int
    issues_by_status: Dict[str, int]
    issues_by_severity: Dict[str, int]
    issues_by_type: Dict[str, int]
    issues_by_area: List[AreaMetric]
    most_affected_areas: List[AreaMetric]
    unresolved_issue_count: int

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class EmergencyItemSummary(BaseModel):
    id: str
    alert_type: str
    title: str
    area: str
    severity: str
    status: str
    issued_at: str

class AnalyticsEmergenciesResponse(BaseModel):
    total_alerts: int
    active_alerts: int
    alerts_by_severity: Dict[str, int]
    alerts_by_type: Dict[str, int]
    alerts_by_area: List[AreaMetric]
    recent_emergency_activity: List[EmergencyItemSummary]

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class AnalyticsViolationsResponse(BaseModel):
    total_violations: int
    violations_by_type: Dict[str, int]
    violations_by_severity: Dict[str, int]
    violations_by_status: Dict[str, int]
    violations_by_area: List[AreaMetric]
    total_fines: float
    average_fine: float
    highest_violation_areas: List[AreaMetric]

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class DailyTrendItem(BaseModel):
    date: str
    count: int
    extra: Optional[Dict[str, Any]] = None

class AnalyticsTrendsResponse(BaseModel):
    dates: List[str]
    issues_trend: List[DailyTrendItem]
    traffic_trend: List[DailyTrendItem]
    emergencies_trend: List[DailyTrendItem]
    violations_trend: List[DailyTrendItem]

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
