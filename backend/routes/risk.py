"""
FastAPI Routes for AI Risk & Incident Intelligence
--------------------------------------------------
Exposes endpoints for citywide risk indices, area-level risk scores,
road corridor evaluations, and explainable contributing factors.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from schemas.risk import (
    RiskOverviewResponse,
    AreaRiskListResponse,
    AreaRiskSummary,
    RoadRiskListResponse,
    RoadRiskSummary
)
from services.risk_service import RiskService

router = APIRouter(prefix="/api/risk", tags=["AI Risk Intelligence"])


@router.get(
    "/overview",
    response_model=RiskOverviewResponse,
    summary="Get citywide multi-domain risk intelligence overview",
    description="Returns composite city risk index, risk counts by severity, top danger areas, and operational recommendations."
)
def get_risk_overview(db: Session = Depends(get_db)):
    try:
        return RiskService.get_risk_overview(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to evaluate risk overview due to an internal server error."
        )


@router.get(
    "/areas",
    response_model=AreaRiskListResponse,
    summary="List risk evaluations for all monitored city areas",
    description="Returns risk scores, levels, explainable factors, and recommended actions for all city sectors, sorted by risk."
)
def list_areas_risk(db: Session = Depends(get_db)):
    try:
        areas = RiskService.get_all_areas_risk(db)
        return {"total": len(areas), "areas": areas}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve area risk assessments due to an internal server error."
        )


@router.get(
    "/areas/{area}",
    response_model=AreaRiskSummary,
    summary="Get detailed risk assessment for a specific urban area",
    description="Returns 0-100 risk score, risk level, contributing factor breakdown, and recommended tactical response."
)
def get_area_risk(area: str, db: Session = Depends(get_db)):
    clean_area = area.strip()
    if not clean_area:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Area parameter cannot be empty."
        )
    try:
        evaluation = RiskService.evaluate_area_risk(db, clean_area)
        if not evaluation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Area '{clean_area}' not found or has no recorded data in any subsystem."
            )
        return evaluation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate risk assessment for area '{clean_area}'."
        )


@router.get(
    "/roads",
    response_model=RoadRiskListResponse,
    summary="List risk evaluations for all monitored road corridors",
    description="Returns risk assessments for all roadways with traffic telemetry, sorted from highest risk to lowest."
)
def list_roads_risk(db: Session = Depends(get_db)):
    try:
        roads = RiskService.get_all_roads_risk(db)
        return {"total": len(roads), "roads": roads}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve road risk assessments due to an internal server error."
        )


@router.get(
    "/roads/{road_name}",
    response_model=RoadRiskSummary,
    summary="Get detailed risk assessment for a specific road corridor",
    description="Returns corridor risk score, speed deficit, congestion impact, and recommended traffic intervention."
)
def get_road_risk(road_name: str, db: Session = Depends(get_db)):
    clean_road = road_name.strip()
    if not clean_road:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Road name parameter cannot be empty."
        )
    try:
        evaluation = RiskService.evaluate_road_risk(db, clean_road)
        if not evaluation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Road corridor '{clean_road}' not found or has no recorded telemetry."
            )
        return evaluation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate risk assessment for road '{clean_road}'."
        )
