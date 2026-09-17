"""
Work Order Service Layer (Phase 14)
-----------------------------------
Encapsulates business logic for field work orders, concurrency-safe ID allocation,
SLA deadline management, state lifecycle validation, closed-loop resolution,
and role-aware dispatch routing.
"""

from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime, timezone, timedelta
import re
from sqlalchemy.orm import Session
from sqlalchemy import text, func, and_, or_

from models.work_order import WorkOrder
from models.issue import Issue
from models.emergency_alert import EmergencyAlert
from models.traffic import TrafficRecord
from models.user import User
from schemas.work_order import (
    WorkOrderCreate,
    WorkOrderStatusUpdate,
    WorkOrderResponse,
    WorkOrderSummary,
    ORDER_TYPE_ROLE_MAP,
    DOMAIN_ORDER_TYPE_MAP
)
from services.notification_service import NotificationService
from schemas.notification import NotificationCreate


class WorkOrderService:

    @classmethod
    def generate_next_work_order_id(cls, db: Session) -> str:
        """
        Generates a sequential, concurrency-safe work order ID in format WO-XXXX (e.g. WO-0001).
        Uses PostgreSQL sequence `work_order_id_seq` for atomic allocation,
        with fallback to max lookup for environments without native sequences.
        """
        try:
            val = db.execute(text("SELECT nextval('work_order_id_seq')")).scalar()
            if val is not None:
                return f"WO-{int(val):04d}"
        except Exception:
            try:
                db.rollback()
            except Exception:
                pass

        all_ids = db.query(WorkOrder.id).all()
        max_num = 0
        pattern = re.compile(r"^WO-(\d+)$")

        for (w_id,) in all_ids:
            match = pattern.match(w_id)
            if match:
                num = int(match.group(1))
                if num > max_num:
                    max_num = num

        return f"WO-{max_num + 1:04d}"

    @classmethod
    def check_active_duplicate(
        cls,
        db: Session,
        source_domain: str,
        source_id: Optional[str]
    ) -> Optional[WorkOrder]:
        """
        Checks if an active work order (PENDING, DISPATCHED, IN_PROGRESS)
        already exists for the given source event.
        Completed or cancelled historical work orders do not suppress new dispatches.
        """
        if not source_id:
            return None

        return (
            db.query(WorkOrder)
            .filter(
                WorkOrder.source_domain == source_domain.strip().lower(),
                WorkOrder.source_id == source_id.strip(),
                WorkOrder.status.in_(["PENDING", "DISPATCHED", "IN_PROGRESS"])
            )
            .first()
        )

    @classmethod
    def verify_source_exists(cls, db: Session, source_domain: str, source_id: Optional[str]) -> bool:
        """
        Validates that the source record exists in its originating operational table.
        """
        if not source_id:
            return True

        clean_domain = source_domain.strip().lower()
        clean_id = source_id.strip()

        if clean_domain == "issues":
            return db.query(Issue).filter(Issue.id == clean_id).first() is not None
        elif clean_domain == "emergency_alerts":
            return db.query(EmergencyAlert).filter(EmergencyAlert.id == clean_id).first() is not None
        elif clean_domain == "traffic":
            return db.query(TrafficRecord).filter(TrafficRecord.id == clean_id).first() is not None

        return False

    @classmethod
    def calculate_sla_status(cls, work_order: WorkOrder) -> str:
        """
        Calculates the runtime SLA state of a work order:
        - ON_TRACK: Active and comfortably within SLA window
        - EXPIRING_SOON: Active with <= 25% of SLA window remaining
        - BREACHED: Active and past the SLA deadline
        - COMPLETED / CANCELLED: Closed orders are not operationally BREACHED
        """
        if work_order.status in ("COMPLETED", "CANCELLED"):
            return "ON_TRACK"

        now = datetime.now(timezone.utc)
        deadline = work_order.sla_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)

        if now > deadline:
            return "BREACHED"

        created = work_order.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)

        total_duration = (deadline - created).total_seconds()
        remaining = (deadline - now).total_seconds()

        if total_duration > 0 and (remaining / total_duration) <= 0.25:
            return "EXPIRING_SOON"

        return "ON_TRACK"

    @classmethod
    def validate_state_transition(cls, current_status: str, target_status: str) -> None:
        """
        Enforces strict forward lifecycle state transitions.
        Valid:
          PENDING -> DISPATCHED, IN_PROGRESS, CANCELLED
          DISPATCHED -> IN_PROGRESS, CANCELLED
          IN_PROGRESS -> COMPLETED, CANCELLED
        Invalid: Any transition from COMPLETED or CANCELLED, or backward transitions.
        """
        valid_transitions = {
            "PENDING": {"DISPATCHED", "IN_PROGRESS", "CANCELLED"},
            "DISPATCHED": {"IN_PROGRESS", "CANCELLED"},
            "IN_PROGRESS": {"COMPLETED", "CANCELLED"},
            "COMPLETED": set(),
            "CANCELLED": set()
        }

        allowed = valid_transitions.get(current_status, set())
        if target_status not in allowed:
            raise ValueError(
                f"Invalid state transition from '{current_status}' to '{target_status}'. "
                f"Allowed target states: {sorted(list(allowed)) if allowed else 'None (Terminal state)'}."
            )

    @classmethod
    def create_work_order(
        cls,
        db: Session,
        wo_in: WorkOrderCreate,
        user: User
    ) -> WorkOrder:
        """
        Creates and persists a new field work order with atomic sequence ID and SLA deadline.
        Enforces RBAC domain restrictions and duplicate active dispatch prevention.
        """
        # 1. Verify role authorization
        assigned_role = ORDER_TYPE_ROLE_MAP.get(wo_in.order_type, "ADMIN")
        if user.role != "ADMIN" and user.role != assigned_role:
            raise PermissionError(
                f"Role '{user.role}' is not authorized to dispatch '{wo_in.order_type}' work orders. "
                f"Required role: '{assigned_role}' or 'ADMIN'."
            )

        # 2. Verify source existence if source_id is provided
        if wo_in.source_id and not cls.verify_source_exists(db, wo_in.source_domain, wo_in.source_id):
            raise ValueError(
                f"Source entity '{wo_in.source_id}' does not exist in domain '{wo_in.source_domain}'."
            )

        # 3. Prevent duplicate active dispatch
        active_dup = cls.check_active_duplicate(db, wo_in.source_domain, wo_in.source_id)
        if active_dup:
            raise ValueError(
                f"An active work order '{active_dup.id}' ({active_dup.status}) already exists "
                f"for source entity '{wo_in.source_id}'."
            )

        # 4. Compute SLA deadline
        now = datetime.now(timezone.utc)
        sla_deadline = now + timedelta(hours=wo_in.target_sla_hours)

        # 5. Generate atomic ID
        new_id = cls.generate_next_work_order_id(db)

        # 6. Instantiate and persist model
        work_order = WorkOrder(
            id=new_id,
            title=wo_in.title.strip(),
            description=wo_in.description.strip(),
            order_type=wo_in.order_type.strip(),
            source_domain=wo_in.source_domain.strip().lower(),
            source_id=wo_in.source_id.strip() if wo_in.source_id else None,
            area=wo_in.area.strip(),
            location=wo_in.location.strip(),
            latitude=wo_in.latitude,
            longitude=wo_in.longitude,
            priority=wo_in.priority.strip().capitalize(),
            status="PENDING",
            assigned_crew=wo_in.assigned_crew.strip(),
            assigned_role=assigned_role,
            created_by=user.username,
            target_sla_hours=wo_in.target_sla_hours,
            sla_deadline=sla_deadline,
            created_at=now,
            updated_at=now
        )

        db.add(work_order)
        db.commit()
        db.refresh(work_order)

        # 7. Operational Notification Integration: Emit dispatch alert
        try:
            notif_payload = NotificationCreate(
                notification_type="FIELD_DISPATCH",
                title=f"Work Order {work_order.id}: {work_order.title}",
                message=(
                    f"New {work_order.order_type} dispatched to {work_order.assigned_crew} at {work_order.location}, {work_order.area}. "
                    f"Priority: {work_order.priority}. SLA Window: {work_order.target_sla_hours} hours."
                ),
                source_domain=work_order.source_domain,
                source_id=work_order.source_id or work_order.id,
                area=work_order.area,
                severity=work_order.priority,
                recipient_role=assigned_role
            )
            NotificationService.create_notification(db, notif_payload, prevent_duplicate=False)
        except Exception:
            pass

        return work_order

    @classmethod
    def get_work_order_by_id(cls, db: Session, order_id: str) -> Optional[WorkOrder]:
        """Retrieves a single work order by its WO-XXXX identifier."""
        return db.query(WorkOrder).filter(WorkOrder.id == order_id).first()

    @classmethod
    def update_work_order_status(
        cls,
        db: Session,
        order_id: str,
        update_in: WorkOrderStatusUpdate,
        user: User
    ) -> WorkOrder:
        """
        Transitions the lifecycle status of a work order with transactional integrity.
        When reaching COMPLETED:
        - Enforces resolution_notes and records completed_by.
        - Automatically resolves the originating source record (Issue or EmergencyAlert).
        """
        work_order = cls.get_work_order_by_id(db, order_id)
        if not work_order:
            raise KeyError(f"Work order '{order_id}' not found.")

        # Role authorization check
        if user.role != "ADMIN" and user.role != work_order.assigned_role:
            raise PermissionError(
                f"Role '{user.role}' is not authorized to update work orders assigned to '{work_order.assigned_role}'."
            )

        target_status = update_in.status.strip().upper()
        cls.validate_state_transition(work_order.status, target_status)

        now = datetime.now(timezone.utc)
        work_order.status = target_status
        work_order.updated_at = now

        if target_status == "DISPATCHED" and not work_order.dispatched_at:
            work_order.dispatched_at = now

        elif target_status == "IN_PROGRESS" and not work_order.dispatched_at:
            work_order.dispatched_at = now

        elif target_status == "COMPLETED":
            notes = update_in.resolution_notes.strip() if update_in.resolution_notes else ""
            if len(notes) < 5:
                raise ValueError("resolution_notes are required when completing a work order (min 5 characters).")

            work_order.completed_at = now
            work_order.completed_by = user.username
            work_order.resolution_notes = notes
            if update_in.actual_cost is not None:
                work_order.actual_cost = float(update_in.actual_cost)

            # ----------------------------------------------------
            # CLOSED-LOOP RESOLUTION: Update source operational entity
            # Handled atomically within the same database transaction
            # ----------------------------------------------------
            if work_order.source_id:
                if work_order.source_domain == "issues":
                    linked_issue = db.query(Issue).filter(Issue.id == work_order.source_id).first()
                    if linked_issue:
                        linked_issue.status = "Resolved"
                elif work_order.source_domain == "emergency_alerts":
                    linked_alert = db.query(EmergencyAlert).filter(EmergencyAlert.id == work_order.source_id).first()
                    if linked_alert:
                        linked_alert.status = "Resolved"

            # Completion audit notification
            try:
                notif_payload = NotificationCreate(
                    notification_type="DISPATCH_COMPLETED",
                    title=f"Work Order Completed: {work_order.id}",
                    message=(
                        f"Field remediation for '{work_order.title}' at {work_order.location} was successfully COMPLETED "
                        f"by crew {work_order.assigned_crew}. Verified by: {user.username}."
                    ),
                    source_domain=work_order.source_domain,
                    source_id=work_order.source_id or work_order.id,
                    area=work_order.area,
                    severity="Low",
                    recipient_role=work_order.assigned_role
                )
                NotificationService.create_notification(db, notif_payload, prevent_duplicate=False)
            except Exception:
                pass

        elif target_status == "CANCELLED":
            if update_in.resolution_notes:
                work_order.resolution_notes = f"[Cancellation Reason]: {update_in.resolution_notes.strip()}"

        db.commit()
        db.refresh(work_order)
        return work_order

    @classmethod
    def list_work_orders(
        cls,
        db: Session,
        user: Optional[User] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        order_type: Optional[str] = None,
        area: Optional[str] = None,
        assigned_role: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[WorkOrderResponse], int]:
        """
        Lists work orders with role-based scoping, query filters, and computed runtime SLA state.
        """
        query = db.query(WorkOrder)

        # Scoping: non-admin operators are restricted to their operational role
        if user and user.role != "ADMIN":
            query = query.filter(WorkOrder.assigned_role == user.role)
        elif assigned_role:
            query = query.filter(WorkOrder.assigned_role == assigned_role.strip().upper())

        if status:
            query = query.filter(WorkOrder.status == status.strip().upper())

        if priority:
            query = query.filter(WorkOrder.priority == priority.strip().capitalize())

        if order_type:
            query = query.filter(WorkOrder.order_type == order_type.strip().upper())

        if area:
            query = query.filter(WorkOrder.area.ilike(f"%{area.strip()}%"))

        total = query.count()
        records = query.order_by(WorkOrder.created_at.desc()).offset(offset).limit(limit).all()

        responses = []
        for r in records:
            sla_state = cls.calculate_sla_status(r)
            resp = WorkOrderResponse.model_validate(r)
            resp.sla_status = sla_state
            responses.append(resp)

        return responses, total

    @classmethod
    def get_summary(cls, db: Session, user: Optional[User] = None) -> WorkOrderSummary:
        """
        Computes aggregated operational KPIs for field dispatches,
        SLA breach totals, expenditure, and resolution duration.
        """
        query = db.query(WorkOrder)
        if user and user.role != "ADMIN":
            query = query.filter(WorkOrder.assigned_role == user.role)

        all_records = query.all()
        now = datetime.now(timezone.utc)

        total = len(all_records)
        pending = sum(1 for w in all_records if w.status == "PENDING")
        dispatched = sum(1 for w in all_records if w.status == "DISPATCHED")
        in_progress = sum(1 for w in all_records if w.status == "IN_PROGRESS")
        completed = sum(1 for w in all_records if w.status == "COMPLETED")
        cancelled = sum(1 for w in all_records if w.status == "CANCELLED")

        # SLA Breaches: active orders where now > sla_deadline
        sla_breached = 0
        for w in all_records:
            if w.status not in ("COMPLETED", "CANCELLED"):
                deadline = w.sla_deadline
                if deadline.tzinfo is None:
                    deadline = deadline.replace(tzinfo=timezone.utc)
                if now > deadline:
                    sla_breached += 1

        # Total Cost
        total_cost = sum(float(w.actual_cost or 0.0) for w in all_records if w.actual_cost)

        # MTTR & SLA compliance
        resolution_durations_hours = []
        completed_on_time = 0

        for w in all_records:
            if w.status == "COMPLETED" and w.completed_at and w.created_at:
                c_at = w.completed_at
                cr_at = w.created_at
                if c_at.tzinfo is None:
                    c_at = c_at.replace(tzinfo=timezone.utc)
                if cr_at.tzinfo is None:
                    cr_at = cr_at.replace(tzinfo=timezone.utc)

                duration_hr = (c_at - cr_at).total_seconds() / 3600.0
                resolution_durations_hours.append(duration_hr)

                deadline = w.sla_deadline
                if deadline.tzinfo is None:
                    deadline = deadline.replace(tzinfo=timezone.utc)
                if c_at <= deadline:
                    completed_on_time += 1

        mttr = (
            round(sum(resolution_durations_hours) / len(resolution_durations_hours), 1)
            if resolution_durations_hours else 0.0
        )
        sla_rate = (
            round((completed_on_time / completed) * 100.0, 1)
            if completed > 0 else 100.0
        )

        by_type: Dict[str, int] = {}
        by_area: Dict[str, int] = {}

        for w in all_records:
            t = w.order_type
            by_type[t] = by_type.get(t, 0) + 1
            a = w.area
            by_area[a] = by_area.get(a, 0) + 1

        return WorkOrderSummary(
            total_orders=total,
            pending_count=pending,
            dispatched_count=dispatched,
            in_progress_count=in_progress,
            completed_count=completed,
            cancelled_count=cancelled,
            sla_breached_count=sla_breached,
            total_cost=round(total_cost, 2),
            sla_compliance_rate=sla_rate,
            mean_time_to_resolve_hours=mttr,
            by_order_type=by_type,
            by_area=by_area
        )
