"""
Phase 6 Automated Verification Test Script: Traffic Monitoring
--------------------------------------------------------------
Tests all Phase 6 requirements:
1. GET /api/traffic
2. GET /api/traffic/summary
3. POST /api/traffic
4. GET /api/traffic/{id}
5. Invalid vehicle_count (< 0) -> 422
6. Invalid average_speed (< 0) -> 422
7. Invalid congestion_level -> 422
8. Invalid status -> 422
9. 404 for unknown traffic ID
10. PostgreSQL persistence across client restart
"""

import sys
from fastapi.testclient import TestClient
import main

def run_tests():
    client = TestClient(main.app)

    print("==================================================")
    print("PHASE 6: TRAFFIC MONITORING TEST SUITE")
    print("==================================================")

    # 1. GET /api/traffic
    r = client.get("/api/traffic")
    assert r.status_code == 200, f"GET /api/traffic failed: {r.status_code}"
    initial_records = r.json()
    assert isinstance(initial_records, list), "Expected list of traffic records"
    print(f"[PASS] TEST 1: GET /api/traffic -> 200 OK (Current count: {len(initial_records)})")

    # 2. GET /api/traffic/summary
    r = client.get("/api/traffic/summary")
    assert r.status_code == 200, f"GET /api/traffic/summary failed: {r.status_code}"
    summary = r.json()
    for field in ["total_records", "total_vehicles", "average_speed", "low_count", "moderate_count", "heavy_count", "severe_count"]:
        assert field in summary, f"Missing field '{field}' in summary response"
    print(f"[PASS] TEST 2: GET /api/traffic/summary -> 200 OK (Summary: {summary})")

    # 3. POST /api/traffic
    valid_payload = {
        "road_name": "Ring Road West (Phase 6 Test)",
        "area": "Sector 9 Junction",
        "vehicle_count": 450,
        "average_speed": 38.5,
        "congestion_level": "Moderate",
        "status": "Moving",
        "recorded_at": "2026-09-13T11:00:00Z"
    }
    r = client.post("/api/traffic", json=valid_payload)
    assert r.status_code == 201, f"POST /api/traffic failed: {r.text}"
    created_traffic = r.json()
    traffic_id = created_traffic["id"]
    assert traffic_id.startswith("TRF-"), f"Expected ID starting with TRF-, got {traffic_id}"
    assert created_traffic["road_name"] == valid_payload["road_name"]
    assert created_traffic["vehicle_count"] == 450
    assert created_traffic["average_speed"] == 38.5
    assert created_traffic["congestion_level"] == "Moderate"
    assert created_traffic["status"] == "Moving"
    print(f"[PASS] TEST 3: POST /api/traffic -> 201 Created (Assigned ID: {traffic_id})")

    # 4. GET /api/traffic/{id}
    r = client.get(f"/api/traffic/{traffic_id}")
    assert r.status_code == 200, f"GET /api/traffic/{traffic_id} failed: {r.status_code}"
    fetched = r.json()
    assert fetched["id"] == traffic_id
    assert fetched["area"] == "Sector 9 Junction"
    print(f"[PASS] TEST 4: GET /api/traffic/{traffic_id} -> 200 OK")

    # 5. Invalid vehicle_count (negative) -> 422
    bad_payload_vehicles = valid_payload.copy()
    bad_payload_vehicles["vehicle_count"] = -15
    r = client.post("/api/traffic", json=bad_payload_vehicles)
    assert r.status_code == 422, f"Expected 422 for negative vehicles, got {r.status_code}"
    print("[PASS] TEST 5: POST invalid vehicle_count (-15) -> 422 Validation Error")

    # 6. Invalid average_speed (negative) -> 422
    bad_payload_speed = valid_payload.copy()
    bad_payload_speed["average_speed"] = -5.0
    r = client.post("/api/traffic", json=bad_payload_speed)
    assert r.status_code == 422, f"Expected 422 for negative speed, got {r.status_code}"
    print("[PASS] TEST 6: POST invalid average_speed (-5.0) -> 422 Validation Error")

    # 7. Invalid congestion_level -> 422
    bad_payload_congestion = valid_payload.copy()
    bad_payload_congestion["congestion_level"] = "ExtremeTraffic"
    r = client.post("/api/traffic", json=bad_payload_congestion)
    assert r.status_code == 422, f"Expected 422 for invalid congestion_level, got {r.status_code}"
    print("[PASS] TEST 7: POST invalid congestion_level ('ExtremeTraffic') -> 422 Validation Error")

    # 8. Invalid status -> 422
    bad_payload_status = valid_payload.copy()
    bad_payload_status["status"] = "StandingStill"
    r = client.post("/api/traffic", json=bad_payload_status)
    assert r.status_code == 422, f"Expected 422 for invalid status, got {r.status_code}"
    print("[PASS] TEST 8: POST invalid status ('StandingStill') -> 422 Validation Error")

    # 9. 404 for unknown traffic ID
    r = client.get("/api/traffic/TRF-NONEXISTENT-9999")
    assert r.status_code == 404, f"Expected 404 for unknown ID, got {r.status_code}"
    print("[PASS] TEST 9: GET /api/traffic/TRF-NONEXISTENT-9999 -> 404 Not Found")

    # 10. PostgreSQL persistence across client / module reload
    del client
    if "main" in sys.modules:
        del sys.modules["main"]
    import main as fresh_main
    new_client = TestClient(fresh_main.app)
    r = new_client.get(f"/api/traffic/{traffic_id}")
    assert r.status_code == 200, f"Persisted fetch failed: {r.status_code}"
    assert r.json()["id"] == traffic_id
    print(f"[PASS] TEST 10 (PERSISTENCE PROVEN): Record {traffic_id} persisted in PostgreSQL across reload!")

    print("\nALL 10 PHASE 6 TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
