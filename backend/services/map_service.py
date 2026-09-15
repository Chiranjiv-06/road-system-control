"""
Map Service (Phase 12 GIS & Operations Map)
-------------------------------------------
Aggregates operational data across Issues, Traffic, Emergency Alerts,
Violations, and Phase 10 Risk Intelligence into a unified spatial schema.

IMPORTANT DATA INTEGRITY NOTICE:
Existing PostgreSQL operational records may not contain hardware GPS data.
This service transparently tags coordinate provenance:
- 'exact_gps': Record contains explicitly stored latitude/longitude.
- 'configured_reference': Location resolved to municipal GIS reference anchor.
- 'configured_corridor': Traffic corridor resolved to highway alignment anchor.
- 'area_centroid': Geographic centroid of evaluated municipal risk zone.
- 'unmapped': No geographic coordinate available.
"""

import hashlib
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session

from models.issue import Issue
from models.traffic import TrafficRecord
from models.emergency_alert import EmergencyAlert
from models.traffic_violation import TrafficViolation
from services.risk_service import RiskService
from schemas.map import (
    MapFeatureRecord,
    MapSummary,
    MapCenterConfig,
    MapOverviewResponse,
)

# Reference Coordinate Registry for Nagpur Metropolitan Command Zone
# Coordinates represent surveyed civic ward centers, metro interchanges, and highway corridors.
MUNICIPAL_GIS_REGISTRY: Dict[str, Tuple[float, float]] = {
    "sitabuldi": (21.1458, 79.0882),
    "sitabuld": (21.1458, 79.0882),
    "wardha road": (21.1070, 79.0620),
    "civil lines": (21.1550, 79.0750),
    "medical square": (21.1350, 79.1020),
    "dharampeth": (21.1430, 79.0600),
    "gandhibagh": (21.1500, 79.1120),
    "narendra nagar": (21.1080, 79.0820),
    "amravati road": (21.1520, 79.0400),
    "midc hingna": (21.1050, 78.9850),
    "railway station corridor": (21.1530, 79.0910),
    "airport expressway": (21.0920, 79.0600),
    "outer ring expressway": (21.1700, 79.1300),
    "central boulevard": (21.1460, 79.0820),
    "grand trunk road (nh-1)": (21.1850, 79.0950),
    "ring road west": (21.1250, 79.0350),
    "ward 14": (21.1480, 79.0850),
    "east bypass junction": (21.1680, 79.1350),
    "terminal 2 underpass": (21.0910, 79.0580),
    "downtown commercial hub": (21.1460, 79.0820),
    "north corridor / industrial sector": (21.1850, 79.0950),
    "sector 9 junction": (21.1250, 79.0350),
}


class MapService:
    """Core geospatial operations service."""

    @staticmethod
    def _deterministic_offset(entity_id: str) -> Tuple[float, float]:
        """
        Generates a deterministic micro-offset (~80-250m) from an entity ID
        to prevent markers in the same sector from occluding each other.
        """
        digest = hashlib.md5(entity_id.encode("utf-8")).hexdigest()
        raw_x = (int(digest[:4], 16) % 100 - 50) / 10000.0  # Range: -0.005 to +0.005
        raw_y = (int(digest[4:8], 16) % 100 - 50) / 10000.0  # Range: -0.005 to +0.005
        return raw_x, raw_y

    @classmethod
    def resolve_coordinates(
        cls,
        db_lat: Optional[float],
        db_lon: Optional[float],
        area_str: Optional[str],
        location_str: Optional[str],
        domain: str,
        entity_id: str,
    ) -> Tuple[Optional[float], Optional[float], str]:
        """
        Resolves feature coordinates with strict provenance labeling.
        """
        # Case 1: Database has real coordinates
        if db_lat is not None and db_lon is not None:
            return float(db_lat), float(db_lon), "exact_gps"

        # Case 2: Match against Municipal GIS Registry
        search_terms = []
        if area_str:
            search_terms.append(area_str.strip().lower())
        if location_str:
            search_terms.append(location_str.strip().lower())

        for term in search_terms:
            for anchor_key, (base_lat, base_lon) in MUNICIPAL_GIS_REGISTRY.items():
                if anchor_key in term or term in anchor_key:
                    offset_x, offset_y = cls._deterministic_offset(entity_id)
                    jittered_lat = round(base_lat + offset_x, 6)
                    jittered_lon = round(base_lon + offset_y, 6)
                    source_label = "configured_corridor" if domain == "traffic" else "configured_reference"
                    return jittered_lat, jittered_lon, source_label

        # Case 3: Completely unmapped
        return None, None, "unmapped"

    @classmethod
    def get_map_overview(
        cls,
        db: Session,
        area: Optional[str] = None,
        data_type: Optional[str] = None,
        risk_level: Optional[str] = None,
        status: Optional[str] = None,
    ) -> MapOverviewResponse:
        """
        Builds the consolidated map overview response across all domains.
        """
        clean_area = area.strip().lower() if area else None
        clean_domain = data_type.strip().lower() if data_type else None
        clean_risk = risk_level.strip().lower() if risk_level else None
        clean_status = status.strip().lower() if status else None

        mapped_issues: List[MapFeatureRecord] = []
        mapped_traffic: List[MapFeatureRecord] = []
        mapped_emergencies: List[MapFeatureRecord] = []
        mapped_violations: List[MapFeatureRecord] = []
        mapped_risk: List[MapFeatureRecord] = []

        # ----------------------------------------------------
        # 1. ROAD ISSUES DOMAIN
        # ----------------------------------------------------
        if not clean_domain or clean_domain in ("all", "issue", "issues"):
            issues = db.query(Issue).all()
            for item in issues:
                item_area = item.area or ""
                item_loc = item.location or ""
                if clean_area and clean_area not in item_area.lower() and clean_area not in item_loc.lower():
                    continue
                if clean_status and clean_status != item.status.lower():
                    continue
                if clean_risk and clean_risk != item.severity.lower():
                    continue

                lat, lon, src = cls.resolve_coordinates(
                    getattr(item, "latitude", None),
                    getattr(item, "longitude", None),
                    item.area,
                    item.location,
                    "issue",
                    item.id,
                )

                mapped_issues.append(MapFeatureRecord(
                    id=item.id,
                    domain="issue",
                    title=item.issue_type,
                    location=item.location,
                    area=item.area or "Sector Unknown",
                    latitude=lat,
                    longitude=lon,
                    coordinate_source=src,
                    severity=item.severity,
                    status=item.status,
                    risk_level=item.severity,
                    metric_label=f"Status: {item.status}",
                    timestamp=item.reported_at,
                    metadata={
                        "description": item.description,
                        "created_at": item.created_at.isoformat() if item.created_at else None,
                    }
                ))

        # ----------------------------------------------------
        # 2. TRAFFIC MONITORING DOMAIN
        # ----------------------------------------------------
        if not clean_domain or clean_domain in ("all", "traffic"):
            traffic_records = db.query(TrafficRecord).all()
            for trf in traffic_records:
                trf_area = trf.area or ""
                trf_road = trf.road_name or ""
                if clean_area and clean_area not in trf_area.lower() and clean_area not in trf_road.lower():
                    continue
                if clean_status and clean_status != trf.status.lower():
                    continue
                # Map congestion level to equivalent risk filtering
                trf_risk_equiv = "Critical" if trf.congestion_level == "Severe" else (
                    "High" if trf.congestion_level == "Heavy" else (
                        "Medium" if trf.congestion_level == "Moderate" else "Low"
                    )
                )
                if clean_risk and clean_risk != trf_risk_equiv.lower():
                    continue

                lat, lon, src = cls.resolve_coordinates(
                    getattr(trf, "latitude", None),
                    getattr(trf, "longitude", None),
                    trf.area,
                    trf.road_name,
                    "traffic",
                    trf.id,
                )

                mapped_traffic.append(MapFeatureRecord(
                    id=trf.id,
                    domain="traffic",
                    title=trf.road_name,
                    location=trf.road_name,
                    area=trf.area,
                    latitude=lat,
                    longitude=lon,
                    coordinate_source=src,
                    severity=trf.congestion_level,
                    status=trf.status,
                    risk_level=trf_risk_equiv,
                    metric_label=f"{trf.average_speed} km/h • {trf.vehicle_count} veh",
                    timestamp=trf.recorded_at,
                    metadata={
                        "vehicle_count": trf.vehicle_count,
                        "average_speed": trf.average_speed,
                        "congestion_level": trf.congestion_level,
                    }
                ))

        # ----------------------------------------------------
        # 3. EMERGENCY ALERTS DOMAIN
        # ----------------------------------------------------
        if not clean_domain or clean_domain in ("all", "emergency", "emergencies"):
            alerts = db.query(EmergencyAlert).all()
            for alr in alerts:
                alr_area = alr.area or ""
                alr_loc = alr.location or ""
                if clean_area and clean_area not in alr_area.lower() and clean_area not in alr_loc.lower():
                    continue
                if clean_status and clean_status != alr.status.lower():
                    continue
                if clean_risk and clean_risk != alr.severity.lower():
                    continue

                lat, lon, src = cls.resolve_coordinates(
                    getattr(alr, "latitude", None),
                    getattr(alr, "longitude", None),
                    alr.area,
                    alr.location,
                    "emergency",
                    alr.id,
                )

                mapped_emergencies.append(MapFeatureRecord(
                    id=alr.id,
                    domain="emergency",
                    title=alr.title,
                    location=alr.location,
                    area=alr.area,
                    latitude=lat,
                    longitude=lon,
                    coordinate_source=src,
                    severity=alr.severity,
                    status=alr.status,
                    risk_level=alr.severity,
                    metric_label=f"{alr.alert_type} ({alr.severity})",
                    timestamp=alr.issued_at,
                    metadata={
                        "alert_type": alr.alert_type,
                        "description": alr.description,
                    }
                ))

        # ----------------------------------------------------
        # 4. TRAFFIC VIOLATIONS DOMAIN
        # ----------------------------------------------------
        if not clean_domain or clean_domain in ("all", "violation", "violations"):
            violations = db.query(TrafficViolation).all()
            for vio in violations:
                vio_area = vio.area or ""
                vio_loc = vio.location or ""
                if clean_area and clean_area not in vio_area.lower() and clean_area not in vio_loc.lower():
                    continue
                if clean_status and clean_status != vio.status.lower():
                    continue
                if clean_risk and clean_risk != vio.severity.lower():
                    continue

                lat, lon, src = cls.resolve_coordinates(
                    getattr(vio, "latitude", None),
                    getattr(vio, "longitude", None),
                    vio.area,
                    vio.location,
                    "violation",
                    vio.id,
                )

                mapped_violations.append(MapFeatureRecord(
                    id=vio.id,
                    domain="violation",
                    title=f"{vio.violation_type} ({vio.vehicle_number})",
                    location=vio.location,
                    area=vio.area,
                    latitude=lat,
                    longitude=lon,
                    coordinate_source=src,
                    severity=vio.severity,
                    status=vio.status,
                    risk_level=vio.severity,
                    metric_label=f"Fine: ₹{vio.fine_amount:,.0f}",
                    timestamp=vio.detected_at,
                    metadata={
                        "violation_type": vio.violation_type,
                        "vehicle_number": vio.vehicle_number,
                        "fine_amount": vio.fine_amount,
                        "description": vio.description,
                    }
                ))

        # ----------------------------------------------------
        # 5. RISK INTELLIGENCE SECTORS (PHASE 10 ENGINE)
        # ----------------------------------------------------
        if not clean_domain or clean_domain in ("all", "risk"):
            areas_risk = RiskService.get_all_areas_risk(db)
            for r_area in areas_risk:
                r_name = r_area.get("area") if isinstance(r_area, dict) else getattr(r_area, "area", "")
                r_level = r_area.get("risk_level") if isinstance(r_area, dict) else getattr(r_area, "risk_level", "Low")
                r_score = r_area.get("risk_score") if isinstance(r_area, dict) else getattr(r_area, "risk_score", 0)
                r_factor = r_area.get("primary_factor") if isinstance(r_area, dict) else getattr(r_area, "primary_factor", "")
                r_action = r_area.get("recommended_action") if isinstance(r_area, dict) else getattr(r_area, "recommended_action", "")
                r_emergencies = r_area.get("active_emergencies", 0) if isinstance(r_area, dict) else getattr(r_area, "active_emergencies", 0)
                r_issues = r_area.get("unresolved_issues", 0) if isinstance(r_area, dict) else getattr(r_area, "unresolved_issues", 0)
                r_speed = r_area.get("average_speed") if isinstance(r_area, dict) else getattr(r_area, "average_speed", None)
                r_violations = r_area.get("recent_violations", 0) if isinstance(r_area, dict) else getattr(r_area, "recent_violations", 0)
                r_breakdown = r_area.get("score_breakdown", {}) if isinstance(r_area, dict) else getattr(r_area, "score_breakdown", {})

                if clean_area and clean_area not in r_name.lower():
                    continue
                if clean_risk and clean_risk != r_level.lower():
                    continue

                # Locate sector centroid in municipal registry
                lat, lon, src = None, None, "unmapped"
                for anchor_key, (b_lat, b_lon) in MUNICIPAL_GIS_REGISTRY.items():
                    if anchor_key in r_name.lower() or r_name.lower() in anchor_key:
                        lat, lon = b_lat, b_lon
                        src = "area_centroid"
                        break

                mapped_risk.append(MapFeatureRecord(
                    id=f"RISK-{r_name.upper().replace(' ', '-')}",
                    domain="risk",
                    title=f"{r_name} Risk Zone",
                    location=f"{r_name} Sector",
                    area=r_name,
                    latitude=lat,
                    longitude=lon,
                    coordinate_source=src,
                    severity=r_level,
                    status="Evaluated",
                    risk_level=r_level,
                    metric_label=f"Risk Score: {r_score}/100",
                    timestamp=None,
                    metadata={
                        "risk_score": r_score,
                        "primary_factor": r_factor,
                        "recommended_action": r_action,
                        "active_emergencies": r_emergencies,
                        "unresolved_issues": r_issues,
                        "average_speed": r_speed,
                        "recent_violations": r_violations,
                        "breakdown": r_breakdown,
                    }
                ))

        # ----------------------------------------------------
        # SUMMARY COMPILATION
        # ----------------------------------------------------
        all_features = (
            mapped_issues +
            mapped_traffic +
            mapped_emergencies +
            mapped_violations +
            mapped_risk
        )

        mapped_count = sum(1 for f in all_features if f.latitude is not None and f.longitude is not None)
        unmapped_count = len(all_features) - mapped_count

        summary = MapSummary(
            total_features=len(all_features),
            mapped_count=mapped_count,
            issues_count=len(mapped_issues),
            traffic_count=len(mapped_traffic),
            emergencies_count=len(mapped_emergencies),
            violations_count=len(mapped_violations),
            risk_areas_count=len(mapped_risk),
            unmapped_count=unmapped_count,
        )

        center_config = MapCenterConfig()

        return MapOverviewResponse(
            summary=summary,
            center=center_config,
            issues=mapped_issues,
            traffic=mapped_traffic,
            emergencies=mapped_emergencies,
            violations=mapped_violations,
            risk=mapped_risk,
        )
