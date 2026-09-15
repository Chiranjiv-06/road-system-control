from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas.traffic import TrafficCreate, TrafficResponse, TrafficSummaryResponse
from services.traffic_service import TrafficService
from dependencies.auth import require_traffic_operator

router = APIRouter(prefix="/api/traffic", tags=["Traffic Monitoring"])

@router.get(
    "/summary",
    response_model=TrafficSummaryResponse,
    summary="Get traffic summary metrics",
    description="Returns aggregate traffic statistics (total records, total vehicles, average speed, congestion counts)."
)
def get_traffic_summary(db: Session = Depends(get_db)):
    """Retrieve aggregate summary for traffic monitoring."""
    return TrafficService.get_traffic_summary(db)

@router.get(
    "",
    response_model=List[TrafficResponse],
    summary="Get all traffic records",
    description="Returns all traffic monitoring records from PostgreSQL, newest first."
)
def get_all_traffic(db: Session = Depends(get_db)):
    """Retrieve all traffic monitoring records."""
    return TrafficService.get_all_traffic(db)

@router.post(
    "",
    response_model=TrafficResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record traffic monitoring data",
    description="Validate incoming traffic reading, assign unique TRF ID, and save to PostgreSQL."
)
def create_traffic(
    traffic_in: TrafficCreate,
    operator=Depends(require_traffic_operator),
    db: Session = Depends(get_db)
):
    """Create a new traffic observation record."""
    try:
        created = TrafficService.create_traffic(db, traffic_in)
        return created
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save traffic record to the database."
        )

@router.get(
    "/{traffic_id}",
    response_model=TrafficResponse,
    summary="Get traffic record by ID",
    description="Fetch full details for a specific traffic observation record."
)
def get_traffic_by_id(traffic_id: str, db: Session = Depends(get_db)):
    """Retrieve a single traffic record by ID or return 404 if not found."""
    record = TrafficService.get_traffic_by_id(db, traffic_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Traffic record with ID '{traffic_id}' not found."
        )
    return record
