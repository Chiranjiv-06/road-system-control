"""
Work Order API Endpoints (Phase 14)
-----------------------------------
REST routes for field work order creation, lifecycle management,
crew dispatching, and resolution auditing.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from dependencies.auth import get_current_active_user, security_bearer
from schemas.work_order import (
    WorkOrderCreate,
    WorkOrderStatusUpdate,
    WorkOrderResponse,
    WorkOrderSummary,
    WorkOrderListResponse
)
from services.work_order_service import WorkOrderService

router = APIRouter(prefix="/api/work-orders", tags=["Work Orders"])


@router.get(
    "",
    response_model=WorkOrderListResponse,
    summary="List work orders",
    description="Retrieves a list of work orders with filtering, pagination, and calculated runtime SLA states."
)
def list_work_orders(
    status: Optional[str] = Query(None, description="Filter by status (PENDING, DISPATCHED, IN_PROGRESS, COMPLETED, CANCELLED)"),
    priority: Optional[str] = Query(None, description="Filter by priority (Critical, High, Medium, Low)"),
    order_type: Optional[str] = Query(None, description="Filter by order type (ROAD_REPAIR, EMERGENCY_RESPONSE, etc.)"),
    area: Optional[str] = Query(None, description="Filter by municipal sector name"),
    assigned_role: Optional[str] = Query(None, description="Filter by assigned operator role"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        items, total = WorkOrderService.list_work_orders(
            db=db,
            user=user,
            status=status,
            priority=priority,
            order_type=order_type,
            area=area,
            assigned_role=assigned_role,
            limit=limit,
            offset=offset
        )
        return WorkOrderListResponse(total=total, items=items)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve work orders: {str(e)}"
        )


@router.get(
    "/summary",
    response_model=WorkOrderSummary,
    summary="Get work orders summary metrics",
    description="Returns aggregate KPI metrics, SLA breaches, expenditure, and MTTR scoped to user role."
)
def get_work_orders_summary(
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        return WorkOrderService.get_summary(db=db, user=user)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate work order summary: {str(e)}"
        )


@router.get(
    "/{id}",
    response_model=WorkOrderResponse,
    summary="Get single work order detail",
    description="Retrieves a work order by its unique WO-XXXX identifier."
)
def get_work_order(
    id: str,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    wo = WorkOrderService.get_work_order_by_id(db, id.strip())
    if not wo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Work order '{id}' not found."
        )

    # Scoping check
    if user.role != "ADMIN" and user.role != wo.assigned_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: Role '{user.role}' cannot view work orders assigned to '{wo.assigned_role}'."
        )

    sla_state = WorkOrderService.calculate_sla_status(wo)
    resp = WorkOrderResponse.model_validate(wo)
    resp.sla_status = sla_state
    return resp


@router.post(
    "",
    response_model=WorkOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Dispatch new work order",
    description="Creates and persists a new field work order with atomic sequence ID and deterministic SLA deadline."
)
def create_work_order(
    wo_in: WorkOrderCreate,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        created = WorkOrderService.create_work_order(db=db, wo_in=wo_in, user=user)
        sla_state = WorkOrderService.calculate_sla_status(created)
        resp = WorkOrderResponse.model_validate(created)
        resp.sla_status = sla_state
        return resp
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create work order: {str(e)}"
        )


@router.patch(
    "/{id}/status",
    response_model=WorkOrderResponse,
    summary="Update work order status",
    description="Transitions work order status. Marking as COMPLETED triggers closed-loop resolution of the linked source entity."
)
def update_work_order_status(
    id: str,
    update_in: WorkOrderStatusUpdate,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        updated = WorkOrderService.update_work_order_status(
            db=db,
            order_id=id.strip(),
            update_in=update_in,
            user=user
        )
        sla_state = WorkOrderService.calculate_sla_status(updated)
        resp = WorkOrderResponse.model_validate(updated)
        resp.sla_status = sla_state
        return resp
    except KeyError as ke:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ke))
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update work order status: {str(e)}"
        )


@router.get(
    "/by-source/{domain}/{source_id}",
    response_model=List[WorkOrderResponse],
    summary="Get work orders by source entity",
    description="Retrieves all work orders linked to an operational entity to verify active dispatch state."
)
def get_work_orders_by_source(
    domain: str,
    source_id: str,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    from models.work_order import WorkOrder
    records = (
        db.query(WorkOrder)
        .filter(
            WorkOrder.source_domain == domain.strip().lower(),
            WorkOrder.source_id == source_id.strip()
        )
        .all()
    )
    responses = []
    for r in records:
        sla_state = WorkOrderService.calculate_sla_status(r)
        resp = WorkOrderResponse.model_validate(r)
        resp.sla_status = sla_state
        responses.append(resp)
    return responses
