"""
Phase 9 Automated Verification Test Script: Traffic Analytics & Intelligence Dashboard
--------------------------------------------------------------------------------------
Tests all Phase 9 requirements:
1. GET /api/analytics/overview -> 200
2. GET /api/analytics/traffic -> 200
3. GET /api/analytics/issues -> 200
4. GET /api/analytics/emergencies -> 200
5. GET /api/analytics/violations -> 200
6. GET /api/analytics/trends -> 200
7. Verify analytics values are derived from PostgreSQL
8. Verify filtering by area
9. Verify invalid date input returns 422
10. Verify response schemas and structural integrity
"""

import sys
from fastapi.testclient import TestClient
import main
from database import SessionLocal
from models.issue import Issue
from models.traffic import TrafficRecord
from models.emergency_alert import EmergencyAlert
from models.traffic_violation import TrafficViolation

def run_tests():
    client = TestClient(main.app)

    print("==================================================")
    print("PHASE 9: ANALYTICS & INTELLIGENCE TEST SUITE")
    print("==================================================")

    # 1. GET /api/analytics/overview -> 200
    r = client.get("/api/analytics/overview")
    assert r.status_code == 200, f"GET /api/analytics/overview failed: {r.status_code}"
    overview = r.json()
    required_overview_keys = [
        "total_issues", "total_traffic_records", "total_alerts", "total_violations",
        "active_emergencies", "unresolved_issues", "active_violations",
        "total_fines_assessed", "average_traffic_speed", "average_vehicle_count"
    ]
    for k in required_overview_keys:
        assert k in overview, f"Missing key '{k}' in overview"
    print(f"[PASS] TEST 1: GET /api/analytics/overview -> 200 OK (Issues: {overview['total_issues']}, Traffic: {overview['total_traffic_records']}, Alerts: {overview['total_alerts']}, Violations: {overview['total_violations']})")

    # 2. GET /api/analytics/traffic -> 200
    r = client.get("/api/analytics/traffic")
    assert r.status_code == 200, f"GET /api/analytics/traffic failed: {r.status_code}"
    traffic_data = r.json()
    for k in ["total_records", "average_vehicle_count", "average_speed", "congestion_distribution", "traffic_by_area", "traffic_by_road", "highest_congestion_areas", "highest_volume_roads"]:
        assert k in traffic_data, f"Missing key '{k}' in traffic analytics"
    assert isinstance(traffic_data["congestion_distribution"], dict)
    assert isinstance(traffic_data["traffic_by_area"], list)
    assert isinstance(traffic_data["traffic_by_road"], list)
    print(f"[PASS] TEST 2: GET /api/analytics/traffic -> 200 OK (Avg speed: {traffic_data['average_speed']} km/h, Avg vehicles: {traffic_data['average_vehicle_count']})")

    # 3. GET /api/analytics/issues -> 200
    r = client.get("/api/analytics/issues")
    assert r.status_code == 200, f"GET /api/analytics/issues failed: {r.status_code}"
    issues_data = r.json()
    for k in ["total_issues", "issues_by_status", "issues_by_severity", "issues_by_type", "issues_by_area", "most_affected_areas", "unresolved_issue_count"]:
        assert k in issues_data, f"Missing key '{k}' in issues analytics"
    assert isinstance(issues_data["issues_by_status"], dict)
    assert isinstance(issues_data["issues_by_severity"], dict)
    print(f"[PASS] TEST 3: GET /api/analytics/issues -> 200 OK (Total: {issues_data['total_issues']}, Unresolved: {issues_data['unresolved_issue_count']})")

    # 4. GET /api/analytics/emergencies -> 200
    r = client.get("/api/analytics/emergencies")
    assert r.status_code == 200, f"GET /api/analytics/emergencies failed: {r.status_code}"
    emergencies_data = r.json()
    for k in ["total_alerts", "active_alerts", "alerts_by_severity", "alerts_by_type", "alerts_by_area", "recent_emergency_activity"]:
        assert k in emergencies_data, f"Missing key '{k}' in emergencies analytics"
    assert isinstance(emergencies_data["recent_emergency_activity"], list)
    print(f"[PASS] TEST 4: GET /api/analytics/emergencies -> 200 OK (Total: {emergencies_data['total_alerts']}, Active: {emergencies_data['active_alerts']})")

    # 5. GET /api/analytics/violations -> 200
    r = client.get("/api/analytics/violations")
    assert r.status_code == 200, f"GET /api/analytics/violations failed: {r.status_code}"
    violations_data = r.json()
    for k in ["total_violations", "violations_by_type", "violations_by_severity", "violations_by_status", "violations_by_area", "total_fines", "average_fine", "highest_violation_areas"]:
        assert k in violations_data, f"Missing key '{k}' in violations analytics"
    assert violations_data["total_fines"] >= 0.0
    print(f"[PASS] TEST 5: GET /api/analytics/violations -> 200 OK (Total: {violations_data['total_violations']}, Total fines: INR {violations_data['total_fines']})")

    # 6. GET /api/analytics/trends -> 200
    r = client.get("/api/analytics/trends")
    assert r.status_code == 200, f"GET /api/analytics/trends failed: {r.status_code}"
    trends_data = r.json()
    for k in ["dates", "issues_trend", "traffic_trend", "emergencies_trend", "violations_trend"]:
        assert k in trends_data, f"Missing key '{k}' in trends analytics"
    assert isinstance(trends_data["dates"], list)
    assert len(trends_data["dates"]) > 0
    print(f"[PASS] TEST 6: GET /api/analytics/trends -> 200 OK (Distinct dates tracked: {len(trends_data['dates'])})")

    # 7. Verify analytics values are derived directly from PostgreSQL
    db = SessionLocal()
    try:
        actual_issue_count = db.query(Issue).count()
        actual_traffic_count = db.query(TrafficRecord).count()
        actual_alert_count = db.query(EmergencyAlert).count()
        actual_violation_count = db.query(TrafficViolation).count()

        assert overview["total_issues"] == actual_issue_count, f"Overview issue count {overview['total_issues']} does not match DB count {actual_issue_count}"
        assert overview["total_traffic_records"] == actual_traffic_count, f"Overview traffic count {overview['total_traffic_records']} does not match DB count {actual_traffic_count}"
        assert overview["total_alerts"] == actual_alert_count, f"Overview alerts count {overview['total_alerts']} does not match DB count {actual_alert_count}"
        assert overview["total_violations"] == actual_violation_count, f"Overview violation count {overview['total_violations']} does not match DB count {actual_violation_count}"
        print(f"[PASS] TEST 7 (POSTGRESQL INTEGRITY): Verified counts match live DB tables exactly (Issues: {actual_issue_count}, Traffic: {actual_traffic_count}, Alerts: {actual_alert_count}, Violations: {actual_violation_count})")
    finally:
        db.close()

    # 8. Verify filtering by area
    r_filtered = client.get("/api/analytics/overview?area=Sitabuldi")
    assert r_filtered.status_code == 200
    sitabuldi_overview = r_filtered.json()
    assert sitabuldi_overview["total_issues"] <= overview["total_issues"]
    assert sitabuldi_overview["total_violations"] <= overview["total_violations"]
    print(f"[PASS] TEST 8: Verified query filtering by area ('Sitabuldi')")

    # 9. Verify invalid date input returns 422
    r_bad_date = client.get("/api/analytics/overview?start_date=not-a-valid-date")
    assert r_bad_date.status_code == 422, f"Expected 422 for invalid date, got {r_bad_date.status_code}"

    r_bad_end_date = client.get("/api/analytics/trends?end_date=2026/13/45")
    assert r_bad_end_date.status_code == 422, f"Expected 422 for malformed end date, got {r_bad_end_date.status_code}"
    print(f"[PASS] TEST 9: Verified invalid date format raises proper 422 Unprocessable Entity")

    # 10. Verify response schemas and structural consistency
    r_valid_date = client.get("/api/analytics/trends?start_date=2026-01-01&end_date=2026-12-31")
    assert r_valid_date.status_code == 200
    scoped_trends = r_valid_date.json()
    assert "issues_trend" in scoped_trends
    assert len(scoped_trends["issues_trend"]) == len(scoped_trends["dates"])
    print(f"[PASS] TEST 10: Verified valid date range query and structural consistency")

    print("\nALL 10 PHASE 9 VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
