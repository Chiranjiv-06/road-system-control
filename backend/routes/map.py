"""
Map Router (Phase 12 GIS & Live Operations Map)
-----------------------------------------------
Provides consolidated spatial endpoints for live operations map visualization,
multi-layer spatial filtering, and tactical risk overview.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from schemas.map import MapOverviewResponse
from services.map_service import MapService

router = APIRouter(prefix="/api/map", tags=["Operations Map"])

VALID_DOMAINS = {"all", "issue", "issues", "traffic", "emergency", "emergencies", "violation", "violations", "risk"}
VALID_RISK_LEVELS = {"low", "medium", "high", "critical"}


@router.get(
    "/overview",
    response_model=MapOverviewResponse,
    summary="Get consolidated live operations map data",
    description="Returns spatial features across Road Issues, Traffic Corridors, Emergency Broadcasts, Violations, and Risk Intelligence.",
)
def get_map_overview(
    area: Optional[str] = Query(None, description="Filter features by city area or corridor"),
    data_type: Optional[str] = Query(None, description="Filter by domain: all, issues, traffic, emergencies, violations, risk"),
    risk_level: Optional[str] = Query(None, description="Filter by severity/risk level: Low, Medium, High, Critical"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by lifecycle status (e.g., Active, Reported, Detected)"),
    db: Session = Depends(get_db),
):
    """
    Consolidated GIS operational endpoint for map visualization.
    """
    # Parameter validations
    if data_type and data_type.strip().lower() not in VALID_DOMAINS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid data_type '{data_type}'. Allowed values: {sorted(list(VALID_DOMAINS))}",
        )

    if risk_level and risk_level.strip().lower() not in VALID_RISK_LEVELS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid risk_level '{risk_level}'. Allowed values: ['Low', 'Medium', 'High', 'Critical']",
        )

    try:
        overview = MapService.get_map_overview(
            db=db,
            area=area,
            data_type=data_type,
            risk_level=risk_level,
            status=status_filter,
        )
        return overview
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate map operational overview: {str(e)}",
        )
