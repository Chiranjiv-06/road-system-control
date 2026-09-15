"""
AI Risk & Incident Intelligence Service Layer
---------------------------------------------
Computes an explainable, data-driven risk intelligence assessment
using existing PostgreSQL records across Road Issues, Traffic Records,
Emergency Alerts, and Traffic Violations.

METHODOLOGY NOTE:
This engine uses a deterministic multi-domain risk evaluation model with
clearly weighted scoring components. Because the dataset contains fewer than
100 records across tables, a statistical ML model is NOT applied to avoid
spurious correlations or fabricated training. Every point in the 0-100 score
is directly attributable to observable PostgreSQL telemetry.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.issue import Issue
from models.traffic import TrafficRecord
from models.emergency_alert import EmergencyAlert
from models.traffic_violation import TrafficViolation


class RiskService:
    # Max domain weights (Sum = 100.0)
    MAX_EMERGENCY_WEIGHT = 35.0
    MAX_TRAFFIC_WEIGHT = 25.0
    MAX_ISSUE_WEIGHT = 20.0
    MAX_VIOLATION_WEIGHT = 20.0

    @staticmethod
    def classify_risk_level(score: int) -> str:
        """Categorizes 0-100 risk score into standard operational levels."""
        if score >= 80:
            return "Critical"
        elif score >= 60:
            return "High"
        elif score >= 30:
            return "Medium"
        return "Low"

    @staticmethod
    def _evaluate_emergency_risk(alerts: List[EmergencyAlert]) -> tuple[float, List[Dict[str, Any]], int]:
        """
        Calculates emergency risk score (0-35 points) and explains contributing factors.
        Active Critical: +25 pts
        Active High: +15 pts
        Active Medium: +8 pts
        Active Low: +4 pts
        Investigating: 50% of active severity weight
        """
        score = 0.0
        factors = []
        active_count = 0

        for a in alerts:
            st = (a.status or "").strip()
            sev = (a.severity or "").strip()
            multiplier = 1.0 if st == "Active" else (0.5 if st == "Investigating" else 0.0)

            if multiplier == 0.0:
                continue

            active_count += 1
            pts = 0.0
            if sev == "Critical":
                pts = 25.0 * multiplier
            elif sev == "High":
                pts = 15.0 * multiplier
            elif sev == "Medium":
                pts = 8.0 * multiplier
            else:
                pts = 4.0 * multiplier

            score += pts
            factors.append({
                "domain": "Emergency",
                "impact": sev if sev in ["Critical", "High", "Medium", "Low"] else "Medium",
                "points": round(pts, 1),
                "title": f"Active {sev} Emergency: {a.alert_type}",
                "description": f"{a.title} ({st}) at {a.location}."
            })

        final_score = min(RiskService.MAX_EMERGENCY_WEIGHT, score)
        return round(final_score, 1), factors, active_count

    @staticmethod
    def _evaluate_traffic_risk(records: List[TrafficRecord]) -> tuple[float, List[Dict[str, Any]], Optional[str], Optional[float], Optional[int]]:
        """
        Calculates traffic flow & congestion risk score (0-25 points).
        Severe: +18 pts
        Heavy: +14 pts
        Moderate: +8 pts
        Low: +2 pts
        Speed deficit (<15 km/h: +7 pts, <25 km/h: +5 pts, <35 km/h: +3 pts)
        Volume surge (>800 veh: +3 pts, >500 veh: +1.5 pts)
        """
        if not records:
            return 0.0, [], None, None, None

        total_records = len(records)
        avg_speed = round(sum(r.average_speed for r in records) / total_records, 1)
        avg_vehicles = round(sum(r.vehicle_count for r in records) / total_records)

        # Dominant congestion level
        congestion_counts: Dict[str, int] = {}
        for r in records:
            lvl = r.congestion_level or "Low"
            congestion_counts[lvl] = congestion_counts.get(lvl, 0) + 1
        dominant_congestion = max(congestion_counts, key=congestion_counts.get) if congestion_counts else "Low"

        score = 0.0
        factors = []

        # Congestion base points
        cong_pts = {
            "Severe": 18.0,
            "Heavy": 14.0,
            "Moderate": 8.0,
            "Low": 2.0
        }.get(dominant_congestion, 2.0)
        score += cong_pts

        if dominant_congestion in ["Severe", "Heavy"]:
            factors.append({
                "domain": "Traffic",
                "impact": "Critical" if dominant_congestion == "Severe" else "High",
                "points": cong_pts,
                "title": f"{dominant_congestion} Congestion Detected",
                "description": f"Dominant traffic state indicates high bottleneck across {total_records} monitored road record(s)."
            })
        elif dominant_congestion == "Moderate":
            factors.append({
                "domain": "Traffic",
                "impact": "Medium",
                "points": cong_pts,
                "title": "Moderate Congestion Flow",
                "description": f"Vehicular queue forming with moderate delays."
            })

        # Speed deficit
        speed_pts = 0.0
        if avg_speed < 15.0:
            speed_pts = 7.0
            impact = "Critical"
        elif avg_speed < 25.0:
            speed_pts = 5.0
            impact = "High"
        elif avg_speed < 35.0:
            speed_pts = 3.0
            impact = "Medium"
        else:
            impact = "Low"

        if speed_pts > 0:
            score += speed_pts
            factors.append({
                "domain": "Traffic",
                "impact": impact,
                "points": speed_pts,
                "title": f"Speed Deficit ({avg_speed} km/h)",
                "description": f"Vehicular transit speed is significantly suppressed compared to nominal city flows (50 km/h baseline)."
            })

        # Volume surge
        vol_pts = 0.0
        if avg_vehicles >= 800:
            vol_pts = 3.0
        elif avg_vehicles >= 500:
            vol_pts = 1.5

        if vol_pts > 0:
            score += vol_pts
            factors.append({
                "domain": "Traffic",
                "impact": "Medium",
                "points": vol_pts,
                "title": f"High Vehicle Volume ({avg_vehicles} vehicles)",
                "description": f"Elevated vehicle density placing pressure on roadway capacity."
            })

        final_score = min(RiskService.MAX_TRAFFIC_WEIGHT, score)
        return round(final_score, 1), factors, dominant_congestion, avg_speed, avg_vehicles

    @staticmethod
    def _evaluate_issue_risk(issues: List[Issue]) -> tuple[float, List[Dict[str, Any]], int]:
        """
        Calculates road infrastructure issue risk score (0-20 points).
        Unresolved issues:
        Critical: +10 pts each
        High: +6 pts each
        Medium: +3 pts each
        Low: +1 pt each
        """
        score = 0.0
        factors = []
        unresolved_count = 0

        for i in issues:
            st = (i.status or "").strip()
            if st == "Resolved":
                continue

            unresolved_count += 1
            sev = (i.severity or "Medium").strip()
            pts = 0.0
            if sev == "Critical":
                pts = 10.0
            elif sev == "High":
                pts = 6.0
            elif sev == "Medium":
                pts = 3.0
            else:
                pts = 1.0

            score += pts
            factors.append({
                "domain": "Road Hazard",
                "impact": sev if sev in ["Critical", "High", "Medium", "Low"] else "Medium",
                "points": pts,
                "title": f"Unresolved {sev} Issue: {i.issue_type}",
                "description": f"Reported at {i.location} (Status: {st})."
            })

        final_score = min(RiskService.MAX_ISSUE_WEIGHT, score)
        return round(final_score, 1), factors, unresolved_count

    @staticmethod
    def _evaluate_violation_risk(violations: List[TrafficViolation]) -> tuple[float, List[Dict[str, Any]], int]:
        """
        Calculates rule violations & fine activity risk score (0-20 points).
        Active/Detected/Under Review violations:
        Critical: +6 pts each
        High: +4 pts each
        Medium: +2 pts each
        Low: +1 pt each
        Fine volume > 5000: +3 pts
        """
        score = 0.0
        factors = []
        recent_count = 0
        total_fines = 0.0

        for v in violations:
            st = (v.status or "").strip()
            if st == "Resolved":
                continue

            recent_count += 1
            sev = (v.severity or "Medium").strip()
            total_fines += (v.fine_amount or 0.0)

            pts = 0.0
            if sev == "Critical":
                pts = 6.0
            elif sev == "High":
                pts = 4.0
            elif sev == "Medium":
                pts = 2.0
            else:
                pts = 1.0

            score += pts
            factors.append({
                "domain": "Violation",
                "impact": sev if sev in ["Critical", "High", "Medium", "Low"] else "Medium",
                "points": pts,
                "title": f"{sev} Violation: {v.violation_type}",
                "description": f"Vehicle {v.vehicle_number} at {v.location} (Fine: ₹{v.fine_amount:,.0f})."
            })

        if total_fines > 5000.0:
            fine_pts = 3.0
            score += fine_pts
            factors.append({
                "domain": "Violation",
                "impact": "Medium",
                "points": fine_pts,
                "title": "High Uncollected Fine Volume",
                "description": f"Cumulative penalty ₹{total_fines:,.0f} signals repeated traffic non-compliance."
            })

        final_score = min(RiskService.MAX_VIOLATION_WEIGHT, score)
        return round(final_score, 1), factors, recent_count

    @staticmethod
    def _determine_recommended_action(
        final_score: int,
        emg_score: float,
        trf_score: float,
        iss_score: float,
        vio_score: float,
        active_emergencies: int
    ) -> str:
        """Synthesizes control-center tactical recommendation based on dominant risk contributor."""
        if active_emergencies > 0 or emg_score >= 15.0:
            return "PRIORITY ALERT: Dispatch emergency response teams to incident scene; coordinate localized road closures and traffic diversions."
        if trf_score >= 16.0:
            return "TRAFFIC CONGESTION: Activate dynamic signal green waves and deploy field traffic marshals to alleviate bottleneck."
        if iss_score >= 9.0:
            return "INFRASTRUCTURE HAZARD: Deploy municipal road maintenance crews to inspect, barricade, and repair unresolved road hazards."
        if vio_score >= 8.0:
            return "ENFORCEMENT ACTION: Deploy automated traffic patrol and radar units to curb persistent rule violations."
        if final_score >= 30:
            return "MONITORING: Area exhibiting moderate telemetry activity; maintain sensor surveillance and standby emergency units."
        return "NORMAL OPERATIONS: All telemetry nominal; maintain routine automated surveillance and standard cycle."

    @staticmethod
    def _determine_primary_factor(factors: List[Dict[str, Any]]) -> str:
        """Selects the highest impact / highest points factor title."""
        if not factors:
            return "Nominal baseline: no active incidents or critical bottlenecks."
        sorted_factors = sorted(factors, key=lambda x: x.get("points", 0), reverse=True)
        return sorted_factors[0]["title"]

    @staticmethod
    def evaluate_area_risk(db: Session, area_name: str) -> Optional[Dict[str, Any]]:
        """
        Calculates risk assessment for a specific urban area/sector across all 4 tables.
        Returns None if area is not found anywhere in the system.
        """
        norm_area = area_name.strip().lower()

        # Query all records
        all_issues = db.query(Issue).all()
        all_traffic = db.query(TrafficRecord).all()
        all_alerts = db.query(EmergencyAlert).all()
        all_violations = db.query(TrafficViolation).all()

        area_issues = [i for i in all_issues if (i.area or '').strip().lower() == norm_area]
        area_traffic = [t for t in all_traffic if (t.area or '').strip().lower() == norm_area]
        area_alerts = [a for a in all_alerts if (a.area or '').strip().lower() == norm_area]
        area_violations = [v for v in all_violations if (v.area or '').strip().lower() == norm_area]

        # If zero records exist across all 4 tables, return None (unknown area)
        if not (area_issues or area_traffic or area_alerts or area_violations):
            return None

        # Determine original casing
        cased_name = (
            (area_alerts[0].area if area_alerts else None) or
            (area_traffic[0].area if area_traffic else None) or
            (area_issues[0].area if area_issues else None) or
            (area_violations[0].area if area_violations else None) or
            area_name
        )

        emg_score, emg_factors, active_emergencies = RiskService._evaluate_emergency_risk(area_alerts)
        trf_score, trf_factors, congestion_level, avg_speed, avg_vehicles = RiskService._evaluate_traffic_risk(area_traffic)
        iss_score, iss_factors, unresolved_issues = RiskService._evaluate_issue_risk(area_issues)
        vio_score, vio_factors, recent_violations = RiskService._evaluate_violation_risk(area_violations)

        raw_score = emg_score + trf_score + iss_score + vio_score
        final_score = int(min(100, max(0, round(raw_score))))
        risk_lvl = RiskService.classify_risk_level(final_score)

        all_factors = emg_factors + trf_factors + iss_factors + vio_factors
        primary_factor = RiskService._determine_primary_factor(all_factors)
        recommended_action = RiskService._determine_recommended_action(
            final_score, emg_score, trf_score, iss_score, vio_score, active_emergencies
        )

        return {
            "area": cased_name,
            "risk_score": final_score,
            "risk_level": risk_lvl,
            "primary_factor": primary_factor,
            "recommended_action": recommended_action,
            "active_emergencies": active_emergencies,
            "unresolved_issues": unresolved_issues,
            "congestion_level": congestion_level,
            "average_speed": avg_speed,
            "vehicle_count": avg_vehicles,
            "recent_violations": recent_violations,
            "score_breakdown": {
                "emergency_score": emg_score,
                "traffic_score": trf_score,
                "issue_score": iss_score,
                "violation_score": vio_score,
                "raw_score": round(raw_score, 1),
                "final_score": final_score
            },
            "contributing_factors": all_factors
        }

    @staticmethod
    def evaluate_road_risk(db: Session, road_name: str) -> Optional[Dict[str, Any]]:
        """
        Calculates risk assessment for a specific monitored roadway or corridor.
        Returns None if road is not found.
        """
        norm_road = road_name.strip().lower()

        all_traffic = db.query(TrafficRecord).all()
        road_traffic = [t for t in all_traffic if (t.road_name or '').strip().lower() == norm_road]

        # Also search issues, alerts, and violations whose location or area mentions the road
        all_issues = db.query(Issue).all()
        all_alerts = db.query(EmergencyAlert).all()
        all_violations = db.query(TrafficViolation).all()

        road_area = road_traffic[0].area if road_traffic else None

        road_issues = [
            i for i in all_issues
            if norm_road in (i.location or '').lower() or (road_area and (i.area or '').strip().lower() == road_area.lower())
        ]
        road_alerts = [
            a for a in all_alerts
            if norm_road in (a.location or '').lower() or (road_area and (a.area or '').strip().lower() == road_area.lower())
        ]
        road_violations = [
            v for v in all_violations
            if norm_road in (v.location or '').lower() or (road_area and (v.area or '').strip().lower() == road_area.lower())
        ]

        if not (road_traffic or road_issues or road_alerts or road_violations):
            return None

        cased_name = road_traffic[0].road_name if road_traffic else road_name

        emg_score, emg_factors, active_emergencies = RiskService._evaluate_emergency_risk(road_alerts)
        trf_score, trf_factors, congestion_level, avg_speed, avg_vehicles = RiskService._evaluate_traffic_risk(road_traffic)
        iss_score, iss_factors, unresolved_issues = RiskService._evaluate_issue_risk(road_issues)
        vio_score, vio_factors, recent_violations = RiskService._evaluate_violation_risk(road_violations)

        raw_score = emg_score + trf_score + iss_score + vio_score
        final_score = int(min(100, max(0, round(raw_score))))
        risk_lvl = RiskService.classify_risk_level(final_score)

        all_factors = emg_factors + trf_factors + iss_factors + vio_factors
        primary_factor = RiskService._determine_primary_factor(all_factors)
        recommended_action = RiskService._determine_recommended_action(
            final_score, emg_score, trf_score, iss_score, vio_score, active_emergencies
        )

        traffic_status = road_traffic[0].status if road_traffic else "Moving"

        return {
            "road_name": cased_name,
            "area": road_area,
            "risk_score": final_score,
            "risk_level": risk_lvl,
            "average_speed": avg_speed if avg_speed is not None else 0.0,
            "vehicle_count": avg_vehicles if avg_vehicles is not None else 0,
            "congestion_level": congestion_level or "Low",
            "traffic_status": traffic_status,
            "active_emergencies": active_emergencies,
            "unresolved_issues": unresolved_issues,
            "recent_violations": recent_violations,
            "primary_factor": primary_factor,
            "recommended_action": recommended_action,
            "score_breakdown": {
                "emergency_score": emg_score,
                "traffic_score": trf_score,
                "issue_score": iss_score,
                "violation_score": vio_score,
                "raw_score": round(raw_score, 1),
                "final_score": final_score
            },
            "contributing_factors": all_factors
        }

    @staticmethod
    def get_all_areas_risk(db: Session) -> List[Dict[str, Any]]:
        """Evaluates risk scores across all unique areas present in the database."""
        # Find unique areas across all four tables
        unique_areas = set()

        for t in db.query(TrafficRecord.area).distinct().all():
            if t[0] and t[0].strip():
                unique_areas.add(t[0].strip())

        for i in db.query(Issue.area).distinct().all():
            if i[0] and i[0].strip():
                unique_areas.add(i[0].strip())

        for a in db.query(EmergencyAlert.area).distinct().all():
            if a[0] and a[0].strip():
                unique_areas.add(a[0].strip())

        for v in db.query(TrafficViolation.area).distinct().all():
            if v[0] and v[0].strip():
                unique_areas.add(v[0].strip())

        results = []
        for area_name in sorted(list(unique_areas)):
            evaluation = RiskService.evaluate_area_risk(db, area_name)
            if evaluation:
                results.append(evaluation)

        # Sort descending by risk score
        results.sort(key=lambda x: x["risk_score"], reverse=True)
        return results

    @staticmethod
    def get_all_roads_risk(db: Session) -> List[Dict[str, Any]]:
        """Evaluates risk scores across all unique monitored roads."""
        unique_roads = set()
        for t in db.query(TrafficRecord.road_name).distinct().all():
            if t[0] and t[0].strip():
                unique_roads.add(t[0].strip())

        results = []
        for road_name in sorted(list(unique_roads)):
            evaluation = RiskService.evaluate_road_risk(db, road_name)
            if evaluation:
                results.append(evaluation)

        results.sort(key=lambda x: x["risk_score"], reverse=True)
        return results

    @staticmethod
    def get_risk_overview(db: Session) -> Dict[str, Any]:
        """Calculates executive citywide risk overview, counts, and top risk hotspots."""
        areas_eval = RiskService.get_all_areas_risk(db)
        roads_eval = RiskService.get_all_roads_risk(db)

        total_areas = len(areas_eval)
        total_roads = len(roads_eval)

        crit_count = sum(1 for a in areas_eval if a["risk_level"] == "Critical")
        high_count = sum(1 for a in areas_eval if a["risk_level"] == "High")
        med_count = sum(1 for a in areas_eval if a["risk_level"] == "Medium")
        low_count = sum(1 for a in areas_eval if a["risk_level"] == "Low")

        # Citywide risk score = average of top 5 highest risk areas, or overall average
        if areas_eval:
            top_sample = areas_eval[:min(5, len(areas_eval))]
            city_score = int(round(sum(a["risk_score"] for a in top_sample) / len(top_sample)))
        else:
            city_score = 0

        city_level = RiskService.classify_risk_level(city_score)

        # Totals from db
        active_emg = db.query(EmergencyAlert).filter(EmergencyAlert.status == "Active").count()
        unres_iss = db.query(Issue).filter(Issue.status != "Resolved").count()
        cong_roads = db.query(TrafficRecord).filter(TrafficRecord.congestion_level.in_(["Heavy", "Severe"])).count()
        recent_vios = db.query(TrafficViolation).filter(TrafficViolation.status.in_(["Detected", "Under Review"])).count()

        if active_emg > 0:
            rec_action = f"CRITICAL HAZARDS DETECTED: {active_emg} active emergency alerts require immediate operational prioritization and route diversions."
        elif city_score >= 60:
            rec_action = "HIGH RISK CONCENTRATION: Deploy dynamic signal management and municipal emergency crews to top-risk corridors."
        elif city_score >= 30:
            rec_action = "MODERATE INCIDENT ACTIVITY: Continue standard command-center monitoring and telemetry surveillance."
        else:
            rec_action = "NETWORK OPERATIONS NOMINAL: Traffic flow, safety indexes, and incident telemetry are within baseline limits."

        return {
            "city_risk_score": city_score,
            "city_risk_level": city_level,
            "total_areas_assessed": total_areas,
            "total_roads_assessed": total_roads,
            "critical_risk_areas": crit_count,
            "high_risk_areas": high_count,
            "medium_risk_areas": med_count,
            "low_risk_areas": low_count,
            "top_risk_areas": areas_eval[:5],
            "top_risk_roads": roads_eval[:5],
            "active_emergencies_count": active_emg,
            "unresolved_issues_count": unres_iss,
            "congested_roads_count": cong_roads,
            "recent_violations_count": recent_vios,
            "recommended_action": rec_action,
            "methodology": "Deterministic Multi-Domain Risk Scoring Engine (explainable, rules-based, non-ML)",
            "last_evaluated": datetime.now().isoformat()
        }
