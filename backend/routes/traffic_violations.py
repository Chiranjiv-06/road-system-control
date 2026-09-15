from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from schemas.traffic_violation import (
    TrafficViolationCreate,
    TrafficViolationResponse,
    TrafficViolationSummaryResponse,
    TrafficViolationStatusUpdate
)
from services.traffic_violation_service import TrafficViolationService
from dependencies.auth import require_traffic_operator

router = APIRouter(prefix="/api/traffic-violations", tags=["Traffic Violations"])

@router.get(
    "/summary",
    response_model=TrafficViolationSummaryResponse,
    summary="Get traffic violations summary metrics",
    description="Returns aggregate statistics across all traffic violations (total, detected, under review, confirmed, resolved, high/critical, total fines)."
)
def get_traffic_violations_summary(db: Session = Depends(get_db)):
    """Retrieve aggregate summary metrics for traffic rule violations."""
    return TrafficViolationService.get_violations_summary(db)

@router.get(
    "",
    response_model=List[TrafficViolationResponse],
    summary="Get all traffic violations",
    description="Returns all traffic violations ordered newest first, with optional filtering by status, severity, violation_type, and area."
)
def get_all_traffic_violations(
    status: Optional[str] = Query(None, description="Filter by status: Detected, Under Review, Confirmed, Resolved"),
    severity: Optional[str] = Query(None, description="Filter by severity: Low, Medium, High, Critical"),
    violation_type: Optional[str] = Query(None, description="Filter by violation type: Speeding, Red Light Violation, etc."),
    area: Optional[str] = Query(None, description="Filter by city area/ward"),
    db: Session = Depends(get_db)
):
    """Retrieve traffic violations with optional query filters."""
    return TrafficViolationService.get_all_violations(
        db,
        status=status,
        severity=severity,
        violation_type=violation_type,
        area=area
    )

@router.post(
    "",
    response_model=TrafficViolationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log a new traffic violation",
    description="Validate incoming violation data, assign sequential VIO-XXXX ID, and save to PostgreSQL."
)
def create_traffic_violation(
    violation_in: TrafficViolationCreate,
    operator=Depends(require_traffic_operator),
    db: Session = Depends(get_db)
):
    """Create a new traffic violation record in PostgreSQL."""
    try:
        created = TrafficViolationService.create_violation(db, violation_in)
        return created
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record and persist traffic violation."
        )

@router.get(
    "/{violation_id}",
    response_model=TrafficViolationResponse,
    summary="Get traffic violation by ID",
    description="Retrieve details for a specific traffic violation by its ID."
)
def get_traffic_violation_by_id(
    violation_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve a single traffic violation by ID or return 404 if not found."""
    violation = TrafficViolationService.get_violation_by_id(db, violation_id)
    if not violation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Traffic violation with ID '{violation_id}' not found."
        )
    return violation

@router.patch(
    "/{violation_id}/status",
    response_model=TrafficViolationResponse,
    summary="Update traffic violation status",
    description="Transition traffic violation status (Detected, Under Review, Confirmed, Resolved)."
)
def update_traffic_violation_status(
    violation_id: str,
    status_update: TrafficViolationStatusUpdate,
    operator=Depends(require_traffic_operator),
    db: Session = Depends(get_db)
):
    """Update status for a specific traffic violation or return 404 if not found."""
    updated = TrafficViolationService.update_violation_status(db, violation_id, status_update.status)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Traffic violation with ID '{violation_id}' not found."
        )
    return updated
