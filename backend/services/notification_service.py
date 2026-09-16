"""
Notification Service Layer (Phase 13)
-------------------------------------
Handles notification creation, duplicate prevention, role-aware routing,
lifecycle transitions (UNREAD -> READ -> ACKNOWLEDGED), and cross-domain
operational event synchronization.
"""

from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime, timezone
import re
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from models.notification import Notification
from models.user import User
from models.emergency_alert import EmergencyAlert
from models.traffic import TrafficRecord
from models.traffic_violation import TrafficViolation
from models.issue import Issue
from schemas.notification import (
    NotificationCreate,
    NotificationSummary
)
from services.risk_service import RiskService


class NotificationService:

    @classmethod
    def generate_next_notification_id(cls, db: Session) -> str:
        """
        Generates a sequential notification ID in the format NTF-XXXX (e.g., NTF-0001).
        Uses pessimistic query lock or max ID lookup for consistency.
        """
        all_ids = db.query(Notification.id).all()
        max_num = 0
        pattern = re.compile(r"^NTF-(\d+)$")

        for (n_id,) in all_ids:
            match = pattern.match(n_id)
            if match:
                num = int(match.group(1))
                if num > max_num:
                    max_num = num

        return f"NTF-{max_num + 1:04d}"

    @classmethod
    def check_duplicate(
        cls,
        db: Session,
        source_domain: str,
        source_id: Optional[str],
        notification_type: str
    ) -> Optional[Notification]:
        """
        Checks if an unacknowledged notification already exists for the given source entity.
        Prevents spamming duplicate alerts during operational polling or multi-event broadcasts.
        """
        if not source_id:
            return None

        return (
            db.query(Notification)
            .filter(
                Notification.source_domain == source_domain.strip().lower(),
                Notification.source_id == source_id.strip(),
                Notification.notification_type == notification_type.strip(),
                Notification.status.in_(["UNREAD", "READ"])
            )
            .first()
        )

    @classmethod
    def create_notification(
        cls,
        db: Session,
        notif_in: NotificationCreate,
        prevent_duplicate: bool = True
    ) -> Tuple[Notification, bool]:
        """
        Creates a new operational notification. If prevent_duplicate is True and an
        unacknowledged notification already exists for this source, returns the existing record.
        Returns: (Notification, was_created: bool)
        """
        if prevent_duplicate and notif_in.source_id:
            existing = cls.check_duplicate(
                db,
                notif_in.source_domain,
                notif_in.source_id,
                notif_in.notification_type
            )
            if existing:
                return existing, False

        new_id = cls.generate_next_notification_id(db)
        notif = Notification(
            id=new_id,
            notification_type=notif_in.notification_type.strip(),
            title=notif_in.title.strip(),
            message=notif_in.message.strip(),
            source_domain=notif_in.source_domain.strip().lower(),
            source_id=notif_in.source_id.strip() if notif_in.source_id else None,
            area=notif_in.area.strip() if notif_in.area else None,
            severity=notif_in.severity.strip().capitalize(),
            status="UNREAD",
            recipient_role=notif_in.recipient_role.strip().upper(),
            created_at=datetime.now(timezone.utc)
        )

        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif, True

    @classmethod
    def get_notification_by_id(cls, db: Session, notif_id: str) -> Optional[Notification]:
        """Retrieves a single notification by its NTF-XXXX identifier."""
        return db.query(Notification).filter(Notification.id == notif_id).first()

    @classmethod
    def list_notifications(
        cls,
        db: Session,
        user: Optional[User] = None,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        domain: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Notification], int, int]:
        """
        Lists notifications with role-based visibility filtering and pagination.
        - Operators only receive notifications targeted to their specific role.
        - Administrators (ADMIN) have global visibility across all roles.
        - Returns (items, total_filtered_count, unread_filtered_count).
        """
        query = db.query(Notification)

        # Role-based scoping
        if user and user.role != "ADMIN":
            query = query.filter(Notification.recipient_role == user.role)

        # Status filter (e.g. UNREAD, READ, ACKNOWLEDGED)
        if status:
            clean_status = status.strip().upper()
            if clean_status in ("UNREAD", "READ", "ACKNOWLEDGED"):
                query = query.filter(Notification.status == clean_status)

        # Severity filter (e.g. Critical, High, Medium, Low)
        if severity:
            clean_sev = severity.strip().capitalize()
            if clean_sev in ("Critical", "High", "Medium", "Low"):
                query = query.filter(Notification.severity == clean_sev)

        # Source Domain filter (e.g. issues, traffic, emergency_alerts, etc.)
        if domain:
            clean_dom = domain.strip().lower()
            query = query.filter(Notification.source_domain == clean_dom)

        total_count = query.count()
        unread_count = query.filter(Notification.status == "UNREAD").count()

        items = (
            query
            .order_by(
                # Order UNREAD first, then newer records first
                Notification.status.asc(),
                Notification.created_at.desc()
            )
            .offset(offset)
            .limit(limit)
            .all()
        )

        return items, total_count, unread_count

    @classmethod
    def get_summary(cls, db: Session, user: Optional[User] = None) -> NotificationSummary:
        """
        Calculates aggregate operational metrics scoped to the requesting operator's role.
        """
        base_query = db.query(Notification)
        if user and user.role != "ADMIN":
            base_query = base_query.filter(Notification.recipient_role == user.role)

        all_records = base_query.all()

        total = len(all_records)
        unread = sum(1 for n in all_records if n.status == "UNREAD")
        read = sum(1 for n in all_records if n.status == "READ")
        acknowledged = sum(1 for n in all_records if n.status == "ACKNOWLEDGED")
        critical = sum(1 for n in all_records if n.severity == "Critical")
        high = sum(1 for n in all_records if n.severity == "High")

        by_domain: Dict[str, int] = {
            "issues": 0,
            "traffic": 0,
            "emergency_alerts": 0,
            "traffic_violations": 0,
            "risk": 0
        }
        for n in all_records:
            dom = n.source_domain
            by_domain[dom] = by_domain.get(dom, 0) + 1

        by_role: Dict[str, int] = {
            "ROAD_INSPECTOR": 0,
            "TRAFFIC_OPERATOR": 0,
            "EMERGENCY_OPERATOR": 0,
            "ADMIN": 0
        }
        for n in all_records:
            r = n.recipient_role
            by_role[r] = by_role.get(r, 0) + 1

        return NotificationSummary(
            total_notifications=total,
            unread_count=unread,
            read_count=read,
            acknowledged_count=acknowledged,
            critical_count=critical,
            high_count=high,
            by_domain=by_domain,
            by_role=by_role
        )

    @classmethod
    def mark_as_read(
        cls,
        db: Session,
        notif_id: str,
        user: Optional[User] = None
    ) -> Optional[Notification]:
        """
        Transitions notification status from UNREAD -> READ.
        Enforces RBAC: Operators can only mark notifications for their own role.
        """
        notif = cls.get_notification_by_id(db, notif_id)
        if not notif:
            return None

        # Verify role permission
        if user and user.role != "ADMIN" and user.role != notif.recipient_role:
            raise PermissionError(
                f"Role '{user.role}' is not authorized to access notification for '{notif.recipient_role}'."
            )

        if notif.status == "UNREAD":
            notif.status = "READ"
            notif.read_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(notif)

        return notif

    @classmethod
    def acknowledge_notification(
        cls,
        db: Session,
        notif_id: str,
        user: Optional[User] = None,
        remarks: Optional[str] = None
    ) -> Optional[Notification]:
        """
        Transitions notification status to ACKNOWLEDGED.
        Records acknowledging operator and timestamp.
        """
        notif = cls.get_notification_by_id(db, notif_id)
        if not notif:
            return None

        # Verify role permission
        if user and user.role != "ADMIN" and user.role != notif.recipient_role:
            raise PermissionError(
                f"Role '{user.role}' is not authorized to acknowledge notification for '{notif.recipient_role}'."
            )

        notif.status = "ACKNOWLEDGED"
        notif.acknowledged_at = datetime.now(timezone.utc)
        notif.acknowledged_by = user.username if user else "system_operator"

        if remarks:
            notif.message = f"{notif.message}\n[Acknowledgement Remarks: {remarks.strip()}]"

        db.commit()
        db.refresh(notif)
        return notif

    @classmethod
    def sync_operational_notifications(cls, db: Session) -> int:
        """
        Scans existing operational entities in PostgreSQL and generates role-routed notifications
        for unnotified high/critical events across all 5 operational subsystems.
        Returns: count of newly created notifications.
        """
        created_count = 0

        # ----------------------------------------------------
        # 1. EMERGENCY ALERTS -> EMERGENCY_OPERATOR
        # ----------------------------------------------------
        alerts = (
            db.query(EmergencyAlert)
            .filter(
                EmergencyAlert.severity.in_(["Critical", "High"]),
                EmergencyAlert.status.in_(["Active", "Investigating"])
            )
            .all()
        )
        for alr in alerts:
            payload = NotificationCreate(
                notification_type="EMERGENCY_DISPATCH",
                title=f"Emergency Alert: {alr.title}",
                message=f"{alr.description} — Location: {alr.location}, Area: {alr.area or 'Nagpur'}",
                source_domain="emergency_alerts",
                source_id=alr.id,
                area=alr.area or alr.location,
                severity=alr.severity,
                recipient_role="EMERGENCY_OPERATOR"
            )
            _, was_created = cls.create_notification(db, payload, prevent_duplicate=True)
            if was_created:
                created_count += 1

        # ----------------------------------------------------
        # 2. SEVERE TRAFFIC CONGESTION -> TRAFFIC_OPERATOR
        # ----------------------------------------------------
        traffic_recs = (
            db.query(TrafficRecord)
            .filter(TrafficRecord.congestion_level.in_(["Severe", "Heavy"]))
            .all()
        )
        for trf in traffic_recs:
            sev = "Critical" if trf.congestion_level == "Severe" else "High"
            payload = NotificationCreate(
                notification_type="TRAFFIC_CONGESTION",
                title=f"Severe Congestion: {trf.road_name}",
                message=(
                    f"Corridor '{trf.road_name}' reporting {trf.vehicle_count} vehicles at "
                    f"{trf.average_speed} km/h (Congestion: {trf.congestion_level}). Immediate traffic diversion recommended."
                ),
                source_domain="traffic",
                source_id=trf.id,
                area=trf.area or trf.road_name,
                severity=sev,
                recipient_role="TRAFFIC_OPERATOR"
            )
            _, was_created = cls.create_notification(db, payload, prevent_duplicate=True)
            if was_created:
                created_count += 1

        # ----------------------------------------------------
        # 3. MAJOR TRAFFIC VIOLATIONS -> TRAFFIC_OPERATOR
        # ----------------------------------------------------
        violations = (
            db.query(TrafficViolation)
            .filter(
                TrafficViolation.severity.in_(["Critical", "High"]),
                TrafficViolation.status.in_(["Detected", "Under Review", "Confirmed"])
            )
            .all()
        )
        for vio in violations:
            payload = NotificationCreate(
                notification_type="TRAFFIC_VIOLATION",
                title=f"Major Violation: {vio.violation_type}",
                message=(
                    f"Vehicle {vio.vehicle_number} flagged for {vio.violation_type} at {vio.location}. "
                    f"Fine: INR {vio.fine_amount:,.2f}. Status: {vio.status}."
                ),
                source_domain="traffic_violations",
                source_id=vio.id,
                area=vio.area or vio.location,
                severity=vio.severity,
                recipient_role="TRAFFIC_OPERATOR"
            )
            _, was_created = cls.create_notification(db, payload, prevent_duplicate=True)
            if was_created:
                created_count += 1

        # ----------------------------------------------------
        # 4. CRITICAL/HIGH ROAD ISSUES -> ROAD_INSPECTOR
        # ----------------------------------------------------
        issues = (
            db.query(Issue)
            .filter(
                Issue.severity.in_(["Critical", "High"]),
                Issue.status != "Resolved"
            )
            .all()
        )
        for iss in issues:
            payload = NotificationCreate(
                notification_type="ROAD_HAZARD",
                title=f"Hazardous Road Issue: {iss.issue_type}",
                message=f"{iss.description} — Location: {iss.location}. Urgent field inspection required.",
                source_domain="issues",
                source_id=iss.id,
                area=iss.area or iss.location,
                severity=iss.severity,
                recipient_role="ROAD_INSPECTOR"
            )
            _, was_created = cls.create_notification(db, payload, prevent_duplicate=True)
            if was_created:
                created_count += 1

        # ----------------------------------------------------
        # 5. AI RISK SPIKES & CRITICAL INCIDENTS -> ADMIN
        # ----------------------------------------------------
        try:
            area_risks = RiskService.get_all_areas_risk(db)
            for r_item in area_risks:
                r_score = r_item.get("risk_score") if isinstance(r_item, dict) else getattr(r_item, "risk_score", 0)
                r_level = r_item.get("risk_level") if isinstance(r_item, dict) else getattr(r_item, "risk_level", "Low")
                r_area = r_item.get("area") if isinstance(r_item, dict) else getattr(r_item, "area", "Unknown")
                r_action = r_item.get("recommended_action") if isinstance(r_item, dict) else getattr(r_item, "recommended_action", "")

                if r_level == "Critical" or r_score >= 70:
                    payload = NotificationCreate(
                        notification_type="RISK_ESCALATION",
                        title=f"Critical Area Risk Spike: {r_area}",
                        message=(
                            f"Area '{r_area}' has escalated to Risk Score {r_score}/100 ({r_level}). "
                            f"Directive: {r_action}"
                        ),
                        source_domain="risk",
                        source_id=f"RISK-{r_area.replace(' ', '_')}",
                        area=r_area,
                        severity="Critical",
                        recipient_role="ADMIN"
                    )
                    _, was_created = cls.create_notification(db, payload, prevent_duplicate=True)
                    if was_created:
                        created_count += 1
        except Exception:
            pass

        return created_count
