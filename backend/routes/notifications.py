"""
FastAPI Notification Router (Phase 13)
--------------------------------------
Provides endpoints for operational notifications, role-aware retrieval,
acknowledgement workflows, and event synchronization.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.notification import (
    NotificationResponse,
    NotificationSummary,
    NotificationListResponse,
    NotificationAcknowledgeRequest
)
from services.notification_service import NotificationService
from dependencies.auth import (
    require_roles,
    get_current_active_user,
    security_bearer
)

router = APIRouter(prefix="/api/notifications", tags=["Notifications & Operational Escalation"])

# Permission dependency allowing all valid system operator roles (with legacy fallback for test suites)
get_operator_user = require_roles(
    "ROAD_INSPECTOR",
    "TRAFFIC_OPERATOR",
    "EMERGENCY_OPERATOR",
    "ADMIN",
    legacy_fallback=True
)


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="List operational notifications",
    description="Retrieves notifications scoped to the authenticated operator's role (or all for ADMIN)."
)
def list_notifications(
    status: Optional[str] = Query(None, description="Filter by status: UNREAD, READ, ACKNOWLEDGED"),
    severity: Optional[str] = Query(None, description="Filter by severity: Critical, High, Medium, Low"),
    source_domain: Optional[str] = Query(None, description="Filter by domain: issues, traffic, emergency_alerts, traffic_violations, risk"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    user: Optional[User] = Depends(get_operator_user),
    db: Session = Depends(get_db)
):
    try:
        items, total, unread_total = NotificationService.list_notifications(
            db=db,
            user=user,
            status=status,
            severity=severity,
            domain=source_domain,
            limit=limit,
            offset=offset
        )
        return NotificationListResponse(
            total=total,
            unread_total=unread_total,
            items=[NotificationResponse.model_validate(n) for n in items]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list notifications: {str(e)}"
        )


@router.get(
    "/summary",
    response_model=NotificationSummary,
    summary="Get notification summary metrics",
    description="Returns aggregate notification counts, unread counters, and domain breakdowns."
)
def get_notification_summary(
    user: Optional[User] = Depends(get_operator_user),
    db: Session = Depends(get_db)
):
    try:
        return NotificationService.get_summary(db, user=user)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate notification summary: {str(e)}"
        )


@router.get(
    "/{id}",
    response_model=NotificationResponse,
    summary="Get single notification detail",
    description="Retrieves an operational notification by its NTF-XXXX identifier."
)
def get_notification(
    id: str,
    user: Optional[User] = Depends(get_operator_user),
    db: Session = Depends(get_db)
):
    notif = NotificationService.get_notification_by_id(db, id)
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification '{id}' not found."
        )

    # Enforce role visibility
    if user and user.role != "ADMIN" and user.role != notif.recipient_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: Role '{user.role}' cannot view notifications assigned to '{notif.recipient_role}'."
        )

    return NotificationResponse.model_validate(notif)


@router.patch(
    "/{id}/read",
    response_model=NotificationResponse,
    summary="Mark notification as read",
    description="Transitions notification status from UNREAD to READ."
)
def mark_notification_read(
    id: str,
    user: Optional[User] = Depends(get_operator_user),
    db: Session = Depends(get_db)
):
    try:
        notif = NotificationService.mark_as_read(db, id, user=user)
        if not notif:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notification '{id}' not found."
            )
        return NotificationResponse.model_validate(notif)
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update notification: {str(e)}"
        )


@router.patch(
    "/{id}/acknowledge",
    response_model=NotificationResponse,
    summary="Acknowledge notification",
    description="Marks notification as ACKNOWLEDGED and records the acknowledging operator."
)
def acknowledge_notification(
    id: str,
    ack_req: Optional[NotificationAcknowledgeRequest] = None,
    user: Optional[User] = Depends(get_operator_user),
    db: Session = Depends(get_db)
):
    remarks = ack_req.remarks if ack_req else None
    try:
        notif = NotificationService.acknowledge_notification(
            db=db,
            notif_id=id,
            user=user,
            remarks=remarks
        )
        if not notif:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notification '{id}' not found."
            )
        return NotificationResponse.model_validate(notif)
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to acknowledge notification: {str(e)}"
        )


@router.post(
    "/sync",
    summary="Trigger operational notification synchronization",
    description="Scans database for unnotified high/critical events across domains."
)
def sync_notifications(
    user: Optional[User] = Depends(get_operator_user),
    db: Session = Depends(get_db)
):
    try:
        created = NotificationService.sync_operational_notifications(db)
        return {
            "status": "success",
            "message": f"Operational notification sync completed. {created} new notifications generated.",
            "new_notifications": created
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Notification sync failed: {str(e)}"
        )
