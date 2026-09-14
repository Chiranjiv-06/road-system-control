from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from schemas.emergency_alert import (
    EmergencyAlertCreate,
    EmergencyAlertResponse,
    EmergencyAlertSummaryResponse,
    EmergencyAlertStatusUpdate
)
from services.emergency_alert_service import EmergencyAlertService

router = APIRouter(prefix="/api/emergency-alerts", tags=["Emergency Alerts"])

@router.get(
    "/summary",
    response_model=EmergencyAlertSummaryResponse,
    summary="Get emergency alerts summary metrics",
    description="Returns aggregate statistics across all emergency alerts (total, active, critical, investigating, resolved)."
)
def get_emergency_alerts_summary(db: Session = Depends(get_db)):
    """Retrieve aggregate metrics for emergency alert dispatch."""
    return EmergencyAlertService.get_alerts_summary(db)

@router.get(
    "",
    response_model=List[EmergencyAlertResponse],
    summary="Get all emergency alerts",
    description="Returns all emergency alerts ordered newest first, with optional status filtering."
)
def get_all_emergency_alerts(
    status: Optional[str] = Query(None, description="Filter alerts by status: Active, Investigating, Resolved"),
    db: Session = Depends(get_db)
):
    """Retrieve emergency alerts with optional status query filter."""
    return EmergencyAlertService.get_all_alerts(db, status=status)

@router.post(
    "",
    response_model=EmergencyAlertResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Broadcast a new emergency alert",
    description="Validate incoming emergency alert, assign sequential EMG-XXXX ID, and save to PostgreSQL."
)
def create_emergency_alert(
    alert_in: EmergencyAlertCreate,
    db: Session = Depends(get_db)
):
    """Create a new emergency alert record in PostgreSQL."""
    try:
        created = EmergencyAlertService.create_alert(db, alert_in)
        return created
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to broadcast and persist emergency alert."
        )

@router.get(
    "/{alert_id}",
    response_model=EmergencyAlertResponse,
    summary="Get emergency alert by ID",
    description="Retrieve details for a specific emergency alert by its ID."
)
def get_emergency_alert_by_id(
    alert_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve a single emergency alert by ID or return 404 if not found."""
    alert = EmergencyAlertService.get_alert_by_id(db, alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Emergency alert with ID '{alert_id}' not found."
        )
    return alert

@router.patch(
    "/{alert_id}/status",
    response_model=EmergencyAlertResponse,
    summary="Update emergency alert status",
    description="Transition emergency alert lifecycle status (Active, Investigating, Resolved)."
)
def update_emergency_alert_status(
    alert_id: str,
    status_update: EmergencyAlertStatusUpdate,
    db: Session = Depends(get_db)
):
    """Update status for a specific emergency alert or return 404 if not found."""
    updated = EmergencyAlertService.update_alert_status(db, alert_id, status_update.status)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Emergency alert with ID '{alert_id}' not found."
        )
    return updated
