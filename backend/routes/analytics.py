from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from schemas.analytics import (
    AnalyticsOverviewResponse,
    AnalyticsTrafficResponse,
    AnalyticsIssuesResponse,
    AnalyticsEmergenciesResponse,
    AnalyticsViolationsResponse,
    AnalyticsTrendsResponse
)
from services.analytics_service import AnalyticsService

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Intelligence"])

@router.get(
    "/overview",
    response_model=AnalyticsOverviewResponse,
    summary="Get system-wide command-center KPI analytics",
    description="Returns aggregate cross-domain metrics across road issues, traffic flow, emergencies, and violations."
)
def get_analytics_overview(
    area: Optional[str] = Query(None, description="Optional area/ward filter"),
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    try:
        return AnalyticsService.get_overview(db, area=area, start_date=start_date, end_date=end_date)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate overview analytics: {str(e)}")

@router.get(
    "/traffic",
    response_model=AnalyticsTrafficResponse,
    summary="Get traffic flow and corridor congestion intelligence",
    description="Returns traffic telemetry metrics, speed averages, volume distributions, and hotspot road rankings."
)
def get_traffic_analytics(
    area: Optional[str] = Query(None, description="Optional area/ward filter"),
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    try:
        return AnalyticsService.get_traffic_analytics(db, area=area, start_date=start_date, end_date=end_date)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate traffic analytics: {str(e)}")

@router.get(
    "/issues",
    response_model=AnalyticsIssuesResponse,
    summary="Get road issue severity and distribution analytics",
    description="Returns issue metrics grouped by status, severity, category, and most affected neighborhoods."
)
def get_issues_analytics(
    area: Optional[str] = Query(None, description="Optional area/ward filter"),
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    try:
        return AnalyticsService.get_issues_analytics(db, area=area, start_date=start_date, end_date=end_date)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate issues analytics: {str(e)}")

@router.get(
    "/emergencies",
    response_model=AnalyticsEmergenciesResponse,
    summary="Get emergency incidents and hazard response intelligence",
    description="Returns emergency alerts grouped by severity, incident type, geographic spread, and recent activity."
)
def get_emergencies_analytics(
    area: Optional[str] = Query(None, description="Optional area/ward filter"),
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    try:
        return AnalyticsService.get_emergencies_analytics(db, area=area, start_date=start_date, end_date=end_date)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate emergency analytics: {str(e)}")

@router.get(
    "/violations",
    response_model=AnalyticsViolationsResponse,
    summary="Get traffic violation enforcement and penalty analytics",
    description="Returns rule violation categories, penalty fines, status progression, and top infraction zones."
)
def get_violations_analytics(
    area: Optional[str] = Query(None, description="Optional area/ward filter"),
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    try:
        return AnalyticsService.get_violations_analytics(db, area=area, start_date=start_date, end_date=end_date)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate violations analytics: {str(e)}")

@router.get(
    "/trends",
    response_model=AnalyticsTrendsResponse,
    summary="Get chronological activity trends across system domains",
    description="Returns daily temporal volume trends across issues, traffic telemetry, emergency alerts, and violations."
)
def get_trends_analytics(
    area: Optional[str] = Query(None, description="Optional area/ward filter"),
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    try:
        return AnalyticsService.get_trends_analytics(db, area=area, start_date=start_date, end_date=end_date)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate trend analytics: {str(e)}")
