"""
Analytics Service Layer
-----------------------
Calculates aggregated intelligence and operational analytics across all four
system domains (Road Issues, Traffic Telemetry, Emergency Alerts, and Violations)
directly from PostgreSQL.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.issue import Issue
from models.traffic import TrafficRecord
from models.emergency_alert import EmergencyAlert
from models.traffic_violation import TrafficViolation

class AnalyticsService:
    @staticmethod
    def parse_and_validate_date(date_str: Optional[str]) -> Optional[date]:
        """Validates and parses YYYY-MM-DD formatted date string or raises ValueError."""
        if not date_str or not date_str.strip():
            return None
        cleaned = date_str.strip()
        try:
            return datetime.strptime(cleaned, "%Y-%m-%d").date()
        except ValueError:
            raise ValueError(f"Invalid date format '{cleaned}'. Expected YYYY-MM-DD.")

    @staticmethod
    def _extract_record_date(record_date_str: Optional[str], created_at: Optional[datetime]) -> Optional[str]:
        """Extracts YYYY-MM-DD string from timestamp or created_at."""
        if record_date_str and len(record_date_str) >= 10:
            candidate = record_date_str[:10]
            try:
                datetime.strptime(candidate, "%Y-%m-%d")
                return candidate
            except ValueError:
                pass
        if created_at:
            return created_at.strftime("%Y-%m-%d")
        return None

    @staticmethod
    def _is_within_date_range(record_date_str: Optional[str], created_at: Optional[datetime],
                              start_d: Optional[date], end_d: Optional[date]) -> bool:
        """Determines if a record falls within the optional date bounds."""
        if not start_d and not end_d:
            return True
        date_iso = AnalyticsService._extract_record_date(record_date_str, created_at)
        if not date_iso:
            return True
        try:
            d = datetime.strptime(date_iso, "%Y-%m-%d").date()
            if start_d and d < start_d:
                return False
            if end_d and d > end_d:
                return False
            return True
        except ValueError:
            return True

    @staticmethod
    def get_overview(
        db: Session,
        area: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Computes executive command-center KPIs across all entities."""
        start_d = AnalyticsService.parse_and_validate_date(start_date)
        end_d = AnalyticsService.parse_and_validate_date(end_date)

        # 1. Issues
        issues = db.query(Issue).all()
        if area:
            issues = [i for i in issues if (i.area or '').strip().lower() == area.strip().lower()]
        issues = [i for i in issues if AnalyticsService._is_within_date_range(i.reported_at, i.created_at, start_d, end_d)]
        total_issues = len(issues)
        unresolved_issues = sum(1 for i in issues if i.status != "Resolved")

        # 2. Traffic
        traffic = db.query(TrafficRecord).all()
        if area:
            traffic = [t for t in traffic if (t.area or '').strip().lower() == area.strip().lower()]
        traffic = [t for t in traffic if AnalyticsService._is_within_date_range(t.recorded_at, t.created_at, start_d, end_d)]
        total_traffic = len(traffic)
        avg_speed = round(sum(t.average_speed for t in traffic) / total_traffic, 1) if total_traffic > 0 else 0.0
        avg_vehicles = round(sum(t.vehicle_count for t in traffic) / total_traffic, 1) if total_traffic > 0 else 0.0

        # 3. Emergency Alerts
        alerts = db.query(EmergencyAlert).all()
        if area:
            alerts = [a for a in alerts if (a.area or '').strip().lower() == area.strip().lower()]
        alerts = [a for a in alerts if AnalyticsService._is_within_date_range(a.issued_at, a.created_at, start_d, end_d)]
        total_alerts = len(alerts)
        active_emergencies = sum(1 for a in alerts if a.status == "Active")

        # 4. Violations
        violations = db.query(TrafficViolation).all()
        if area:
            violations = [v for v in violations if (v.area or '').strip().lower() == area.strip().lower()]
        violations = [v for v in violations if AnalyticsService._is_within_date_range(v.detected_at, v.created_at, start_d, end_d)]
        total_violations = len(violations)
        active_violations = sum(1 for v in violations if v.status in ["Detected", "Under Review"])
        total_fines = round(sum(v.fine_amount or 0.0 for v in violations), 2)

        return {
            "total_issues": total_issues,
            "total_traffic_records": total_traffic,
            "total_alerts": total_alerts,
            "total_violations": total_violations,
            "active_emergencies": active_emergencies,
            "unresolved_issues": unresolved_issues,
            "active_violations": active_violations,
            "total_fines_assessed": total_fines,
            "average_traffic_speed": avg_speed,
            "average_vehicle_count": avg_vehicles
        }

    @staticmethod
    def get_traffic_analytics(
        db: Session,
        area: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Calculates traffic flow intelligence and road congestion metrics."""
        start_d = AnalyticsService.parse_and_validate_date(start_date)
        end_d = AnalyticsService.parse_and_validate_date(end_date)

        records = db.query(TrafficRecord).all()
        if area:
            records = [t for t in records if (t.area or '').strip().lower() == area.strip().lower()]
        records = [t for t in records if AnalyticsService._is_within_date_range(t.recorded_at, t.created_at, start_d, end_d)]

        total_records = len(records)
        if total_records == 0:
            return {
                "total_records": 0,
                "average_vehicle_count": 0.0,
                "average_speed": 0.0,
                "congestion_distribution": {"Low": 0, "Moderate": 0, "Heavy": 0, "Severe": 0},
                "traffic_by_area": [],
                "traffic_by_road": [],
                "highest_congestion_areas": [],
                "highest_volume_roads": []
            }

        avg_speed = round(sum(t.average_speed for t in records) / total_records, 1)
        avg_vehicles = round(sum(t.vehicle_count for t in records) / total_records, 1)

        # Congestion breakdown
        congestion_dist: Dict[str, int] = {"Low": 0, "Moderate": 0, "Heavy": 0, "Severe": 0}
        for r in records:
            lvl = r.congestion_level or "Low"
            congestion_dist[lvl] = congestion_dist.get(lvl, 0) + 1

        # Aggregation by area
        area_groups: Dict[str, List[TrafficRecord]] = {}
        for r in records:
            a = r.area or "Unknown"
            area_groups.setdefault(a, []).append(r)

        traffic_by_area = []
        for a, group in area_groups.items():
            cnt = len(group)
            traffic_by_area.append({
                "area": a,
                "record_count": cnt,
                "avg_speed": round(sum(item.average_speed for item in group) / cnt, 1),
                "avg_vehicles": round(sum(item.vehicle_count for item in group) / cnt, 1)
            })
        traffic_by_area.sort(key=lambda x: x["record_count"], reverse=True)

        # Highest congestion areas (sorted by slowest average speed)
        highest_congestion_areas = sorted(traffic_by_area, key=lambda x: x["avg_speed"])[:5]

        # Aggregation by road
        road_groups: Dict[str, List[TrafficRecord]] = {}
        for r in records:
            rd = r.road_name or "Unknown"
            road_groups.setdefault(rd, []).append(r)

        traffic_by_road = []
        for rd, group in road_groups.items():
            cnt = len(group)
            traffic_by_road.append({
                "road_name": rd,
                "vehicle_count": round(sum(item.vehicle_count for item in group) / cnt),
                "average_speed": round(sum(item.average_speed for item in group) / cnt, 1),
                "congestion_level": group[0].congestion_level,
                "status": group[0].status
            })
        traffic_by_road.sort(key=lambda x: x["vehicle_count"], reverse=True)
        highest_volume_roads = traffic_by_road[:5]

        return {
            "total_records": total_records,
            "average_vehicle_count": avg_vehicles,
            "average_speed": avg_speed,
            "congestion_distribution": congestion_dist,
            "traffic_by_area": traffic_by_area,
            "traffic_by_road": traffic_by_road,
            "highest_congestion_areas": highest_congestion_areas,
            "highest_volume_roads": highest_volume_roads
        }

    @staticmethod
    def get_issues_analytics(
        db: Session,
        area: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Calculates road issue distribution, severity, and hotspot metrics."""
        start_d = AnalyticsService.parse_and_validate_date(start_date)
        end_d = AnalyticsService.parse_and_validate_date(end_date)

        issues = db.query(Issue).all()
        if area:
            issues = [i for i in issues if (i.area or '').strip().lower() == area.strip().lower()]
        issues = [i for i in issues if AnalyticsService._is_within_date_range(i.reported_at, i.created_at, start_d, end_d)]

        total_issues = len(issues)
        if total_issues == 0:
            return {
                "total_issues": 0,
                "issues_by_status": {},
                "issues_by_severity": {},
                "issues_by_type": {},
                "issues_by_area": [],
                "most_affected_areas": [],
                "unresolved_issue_count": 0
            }

        by_status: Dict[str, int] = {}
        by_severity: Dict[str, int] = {}
        by_type: Dict[str, int] = {}
        by_area: Dict[str, int] = {}

        unresolved = 0
        for i in issues:
            st = i.status or "Reported"
            by_status[st] = by_status.get(st, 0) + 1
            if st != "Resolved":
                unresolved += 1

            sev = i.severity or "Medium"
            by_severity[sev] = by_severity.get(sev, 0) + 1

            itype = i.issue_type or "General Road Hazard"
            by_type[itype] = by_type.get(itype, 0) + 1

            a = i.area or "Unassigned"
            by_area[a] = by_area.get(a, 0) + 1

        area_list = [{"area": k, "count": v} for k, v in by_area.items()]
        area_list.sort(key=lambda x: x["count"], reverse=True)
        most_affected = area_list[:5]

        return {
            "total_issues": total_issues,
            "issues_by_status": by_status,
            "issues_by_severity": by_severity,
            "issues_by_type": by_type,
            "issues_by_area": area_list,
            "most_affected_areas": most_affected,
            "unresolved_issue_count": unresolved
        }

    @staticmethod
    def get_emergencies_analytics(
        db: Session,
        area: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Calculates emergency incidents, hazard severity, and response metrics."""
        start_d = AnalyticsService.parse_and_validate_date(start_date)
        end_d = AnalyticsService.parse_and_validate_date(end_date)

        alerts = db.query(EmergencyAlert).all()
        if area:
            alerts = [a for a in alerts if (a.area or '').strip().lower() == area.strip().lower()]
        alerts = [a for a in alerts if AnalyticsService._is_within_date_range(a.issued_at, a.created_at, start_d, end_d)]

        total_alerts = len(alerts)
        active_alerts = sum(1 for a in alerts if a.status == "Active")

        by_severity: Dict[str, int] = {}
        by_type: Dict[str, int] = {}
        by_area: Dict[str, int] = {}

        for a in alerts:
            sev = a.severity or "Medium"
            by_severity[sev] = by_severity.get(sev, 0) + 1

            atype = a.alert_type or "Hazard"
            by_type[atype] = by_type.get(atype, 0) + 1

            ar = a.area or "Unknown"
            by_area[ar] = by_area.get(ar, 0) + 1

        area_list = [{"area": k, "count": v} for k, v in by_area.items()]
        area_list.sort(key=lambda x: x["count"], reverse=True)

        recent = [
            {
                "id": a.id,
                "alert_type": a.alert_type,
                "title": a.title,
                "area": a.area,
                "severity": a.severity,
                "status": a.status,
                "issued_at": a.issued_at
            }
            for a in sorted(alerts, key=lambda x: (x.issued_at or '', x.id), reverse=True)[:5]
        ]

        return {
            "total_alerts": total_alerts,
            "active_alerts": active_alerts,
            "alerts_by_severity": by_severity,
            "alerts_by_type": by_type,
            "alerts_by_area": area_list,
            "recent_emergency_activity": recent
        }

    @staticmethod
    def get_violations_analytics(
        db: Session,
        area: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Calculates traffic violations, rule infringements, and fine metrics."""
        start_d = AnalyticsService.parse_and_validate_date(start_date)
        end_d = AnalyticsService.parse_and_validate_date(end_date)

        violations = db.query(TrafficViolation).all()
        if area:
            violations = [v for v in violations if (v.area or '').strip().lower() == area.strip().lower()]
        violations = [v for v in violations if AnalyticsService._is_within_date_range(v.detected_at, v.created_at, start_d, end_d)]

        total_violations = len(violations)
        total_fines = round(sum(v.fine_amount or 0.0 for v in violations), 2)
        avg_fine = round(total_fines / total_violations, 2) if total_violations > 0 else 0.0

        by_type: Dict[str, int] = {}
        by_severity: Dict[str, int] = {}
        by_status: Dict[str, int] = {}
        by_area: Dict[str, int] = {}

        for v in violations:
            vt = v.violation_type or "Infraction"
            by_type[vt] = by_type.get(vt, 0) + 1

            sev = v.severity or "Medium"
            by_severity[sev] = by_severity.get(sev, 0) + 1

            st = v.status or "Detected"
            by_status[st] = by_status.get(st, 0) + 1

            ar = v.area or "Unknown"
            by_area[ar] = by_area.get(ar, 0) + 1

        area_list = [{"area": k, "count": v} for k, v in by_area.items()]
        area_list.sort(key=lambda x: x["count"], reverse=True)
        highest_areas = area_list[:5]

        return {
            "total_violations": total_violations,
            "violations_by_type": by_type,
            "violations_by_severity": by_severity,
            "violations_by_status": by_status,
            "violations_by_area": area_list,
            "total_fines": total_fines,
            "average_fine": avg_fine,
            "highest_violation_areas": highest_areas
        }

    @staticmethod
    def get_trends_analytics(
        db: Session,
        area: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Calculates daily temporal aggregation across issues, traffic, alerts, and violations."""
        start_d = AnalyticsService.parse_and_validate_date(start_date)
        end_d = AnalyticsService.parse_and_validate_date(end_date)

        # 1. Issues by date
        issues = db.query(Issue).all()
        if area:
            issues = [i for i in issues if (i.area or '').strip().lower() == area.strip().lower()]
        issues = [i for i in issues if AnalyticsService._is_within_date_range(i.reported_at, i.created_at, start_d, end_d)]
        issues_by_date: Dict[str, int] = {}
        for i in issues:
            d = AnalyticsService._extract_record_date(i.reported_at, i.created_at)
            if d:
                issues_by_date[d] = issues_by_date.get(d, 0) + 1

        # 2. Traffic by date
        traffic = db.query(TrafficRecord).all()
        if area:
            traffic = [t for t in traffic if (t.area or '').strip().lower() == area.strip().lower()]
        traffic = [t for t in traffic if AnalyticsService._is_within_date_range(t.recorded_at, t.created_at, start_d, end_d)]
        traffic_by_date: Dict[str, List[TrafficRecord]] = {}
        for t in traffic:
            d = AnalyticsService._extract_record_date(t.recorded_at, t.created_at)
            if d:
                traffic_by_date.setdefault(d, []).append(t)

        # 3. Emergencies by date
        alerts = db.query(EmergencyAlert).all()
        if area:
            alerts = [a for a in alerts if (a.area or '').strip().lower() == area.strip().lower()]
        alerts = [a for a in alerts if AnalyticsService._is_within_date_range(a.issued_at, a.created_at, start_d, end_d)]
        alerts_by_date: Dict[str, int] = {}
        for a in alerts:
            d = AnalyticsService._extract_record_date(a.issued_at, a.created_at)
            if d:
                alerts_by_date[d] = alerts_by_date.get(d, 0) + 1

        # 4. Violations by date
        violations = db.query(TrafficViolation).all()
        if area:
            violations = [v for v in violations if (v.area or '').strip().lower() == area.strip().lower()]
        violations = [v for v in violations if AnalyticsService._is_within_date_range(v.detected_at, v.created_at, start_d, end_d)]
        violations_by_date: Dict[str, List[TrafficViolation]] = {}
        for v in violations:
            d = AnalyticsService._extract_record_date(v.detected_at, v.created_at)
            if d:
                violations_by_date.setdefault(d, []).append(v)

        # Collect and sort all distinct dates across datasets
        all_dates = sorted(list(set(
            list(issues_by_date.keys()) +
            list(traffic_by_date.keys()) +
            list(alerts_by_date.keys()) +
            list(violations_by_date.keys())
        )))

        # Fallback to today's date if completely empty
        if not all_dates:
            all_dates = [datetime.now().strftime("%Y-%m-%d")]

        issues_trend = [{"date": d, "count": issues_by_date.get(d, 0)} for d in all_dates]
        emergencies_trend = [{"date": d, "count": alerts_by_date.get(d, 0)} for d in all_dates]

        traffic_trend = []
        for d in all_dates:
            group = traffic_by_date.get(d, [])
            cnt = len(group)
            avg_spd = round(sum(t.average_speed for t in group) / cnt, 1) if cnt > 0 else 0.0
            traffic_trend.append({"date": d, "count": cnt, "extra": {"avg_speed": avg_spd}})

        violations_trend = []
        for d in all_dates:
            group = violations_by_date.get(d, [])
            cnt = len(group)
            fines = round(sum(v.fine_amount or 0.0 for v in group), 2)
            violations_trend.append({"date": d, "count": cnt, "extra": {"total_fines": fines}})

        return {
            "dates": all_dates,
            "issues_trend": issues_trend,
            "traffic_trend": traffic_trend,
            "emergencies_trend": emergencies_trend,
            "violations_trend": violations_trend
        }
