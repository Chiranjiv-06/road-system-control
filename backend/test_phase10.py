"""
Test Suite for Phase 10: AI Risk & Incident Intelligence
--------------------------------------------------------
Validates endpoints, risk-scoring range (0-100), risk levels,
explainability factors, tactical recommendations, and edge cases
(unknown area/road, 404, 422, empty parameters).
"""

import sys
from fastapi.testclient import TestClient
from database import SessionLocal
from main import app
from models.issue import Issue
from models.traffic import TrafficRecord
from models.emergency_alert import EmergencyAlert
from models.traffic_violation import TrafficViolation
from services.risk_service import RiskService

client = TestClient(app)

def run_tests():
    passed = 0
    failed = 0

    print("==================================================")
    print("PHASE 10: AI RISK & INCIDENT INTELLIGENCE TESTS")
    print("==================================================")

    # ----------------------------------------------------
    # TEST 1: GET /api/risk/overview
    # ----------------------------------------------------
    try:
        res = client.get("/api/risk/overview")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "city_risk_score" in data, "Missing city_risk_score"
        assert 0 <= data["city_risk_score"] <= 100, f"Score out of range: {data['city_risk_score']}"
        assert data["city_risk_level"] in ["Low", "Medium", "High", "Critical"]
        assert "recommended_action" in data and len(data["recommended_action"]) > 0
        assert "methodology" in data
        assert "top_risk_areas" in data and isinstance(data["top_risk_areas"], list)
        assert "top_risk_roads" in data and isinstance(data["top_risk_roads"], list)
        print(f"PASS - Test 1: GET /api/risk/overview (City score: {data['city_risk_score']}, Level: {data['city_risk_level']})")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 1: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 2: GET /api/risk/areas
    # ----------------------------------------------------
    try:
        res = client.get("/api/risk/areas")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "total" in data and "areas" in data
        assert data["total"] == len(data["areas"])
        assert data["total"] > 0, "Expected at least 1 area evaluated from database"
        first = data["areas"][0]
        assert "area" in first and "risk_score" in first and "risk_level" in first
        assert "contributing_factors" in first
        print(f"PASS - Test 2: GET /api/risk/areas (Evaluated {data['total']} areas)")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 2: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 3: GET /api/risk/roads
    # ----------------------------------------------------
    try:
        res = client.get("/api/risk/roads")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "total" in data and "roads" in data
        assert data["total"] == len(data["roads"])
        assert data["total"] > 0, "Expected at least 1 road evaluated from database"
        first_road = data["roads"][0]
        assert "road_name" in first_road and "risk_score" in first_road
        assert "congestion_level" in first_road
        print(f"PASS - Test 3: GET /api/risk/roads (Evaluated {data['total']} corridors)")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 3: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 4: Specific Area Risk Endpoint (Known Area)
    # ----------------------------------------------------
    try:
        # Use an area known to exist from earlier DB inspection, e.g., 'Sitabuldi'
        res = client.get("/api/risk/areas/Sitabuldi")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["area"].lower() == "sitabuldi"
        assert 0 <= data["risk_score"] <= 100
        assert data["risk_level"] in ["Low", "Medium", "High", "Critical"]
        assert "score_breakdown" in data
        breakdown = data["score_breakdown"]
        assert 0 <= breakdown["emergency_score"] <= 35.0
        assert 0 <= breakdown["traffic_score"] <= 25.0
        assert 0 <= breakdown["issue_score"] <= 20.0
        assert 0 <= breakdown["violation_score"] <= 20.0
        print(f"PASS - Test 4: GET /api/risk/areas/Sitabuldi (Score: {data['risk_score']}, Level: {data['risk_level']})")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 4: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 5: Specific Road Risk Endpoint (Known Road)
    # ----------------------------------------------------
    try:
        # Use a road known to exist, e.g., 'Airport Expressway'
        res = client.get("/api/risk/roads/Airport Expressway")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["road_name"].lower() == "airport expressway"
        assert 0 <= data["risk_score"] <= 100
        assert "average_speed" in data
        assert "traffic_status" in data
        print(f"PASS - Test 5: GET /api/risk/roads/Airport Expressway (Score: {data['risk_score']})")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 5: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 6: Explainable Factors and Tactical Recommendation
    # ----------------------------------------------------
    try:
        res = client.get("/api/risk/areas")
        areas = res.json()["areas"]
        found_factors = False
        for a in areas:
            if a["contributing_factors"]:
                found_factors = True
                f = a["contributing_factors"][0]
                assert "domain" in f
                assert "impact" in f
                assert "points" in f
                assert "title" in f
                assert "description" in f
                break
        assert found_factors, "Expected at least one area to contain explainable risk factors"
        assert all("recommended_action" in a and len(a["recommended_action"]) > 0 for a in areas)
        print("PASS - Test 6: Explainable contributing factors & recommended actions verified")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 6: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 7: Unknown Area Handling (404 Not Found)
    # ----------------------------------------------------
    try:
        res = client.get("/api/risk/areas/NonExistentArea999XYZ")
        assert res.status_code == 404, f"Expected 404 for unknown area, got {res.status_code}"
        assert "detail" in res.json()
        print("PASS - Test 7: Unknown area handled correctly with 404 Not Found")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 7: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 8: Unknown Road Handling (404 Not Found)
    # ----------------------------------------------------
    try:
        res = client.get("/api/risk/roads/NonExistentRoad999ABC")
        assert res.status_code == 404, f"Expected 404 for unknown road, got {res.status_code}"
        assert "detail" in res.json()
        print("PASS - Test 8: Unknown road handled correctly with 404 Not Found")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 8: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 9: Empty/Whitespace Parameter Validation (422)
    # ----------------------------------------------------
    try:
        res1 = client.get("/api/risk/areas/%20")
        assert res1.status_code == 422, f"Expected 422 for empty area param, got {res1.status_code}"
        res2 = client.get("/api/risk/roads/%20")
        assert res2.status_code == 422, f"Expected 422 for empty road param, got {res2.status_code}"
        print("PASS - Test 9: Empty parameter rejected with 422 Unprocessable Entity")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 9: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 10: Deterministic Scoring Range & Formula Bounds
    # ----------------------------------------------------
    try:
        db = SessionLocal()
        # Test unit calculation function bounds directly
        assert RiskService.classify_risk_level(15) == "Low"
        assert RiskService.classify_risk_level(45) == "Medium"
        assert RiskService.classify_risk_level(70) == "High"
        assert RiskService.classify_risk_level(95) == "Critical"

        # Verify city overview score bounds
        overview = RiskService.get_risk_overview(db)
        assert 0 <= overview["city_risk_score"] <= 100
        assert overview["city_risk_level"] in ["Low", "Medium", "High", "Critical"]
        assert overview["methodology"] == "Deterministic Multi-Domain Risk Scoring Engine (explainable, rules-based, non-ML)"
        db.close()
        print("PASS - Test 10: Mathematical bounds, level classifications, and non-ML methodology verified")
        passed += 1
    except Exception as e:
        print(f"FAIL - Test 10: {e}")
        failed += 1

    print("==================================================")
    print(f"TEST RESULTS: {passed} passed, {failed} failed")
    if failed == 0:
        print("ALL TESTS PASSED! PHASE 10 BACKEND IS OPERATIONAL.")
        print("==================================================")
        return 0
    else:
        print("SOME TESTS FAILED.")
        print("==================================================")
        return 1

if __name__ == "__main__":
    code = run_tests()
    sys.exit(code)
