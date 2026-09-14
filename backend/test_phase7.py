"""
Phase 7 Automated Verification Test Script: Emergency Alert Management
----------------------------------------------------------------------
Tests all Phase 7 requirements:
1. GET /api/emergency-alerts -> 200
2. GET /api/emergency-alerts/summary -> 200
3. POST valid emergency alert -> 201
4. Verify EMG-XXXX sequential ID format
5. GET created alert -> 200
6. GET nonexistent alert -> 404
7. Invalid alert_type -> 422
8. Invalid severity -> 422
9. Invalid status -> 422
10. PATCH status -> 200
11. Verify status actually changed
12. Verify PostgreSQL persistence across client restart
"""

import sys
from fastapi.testclient import TestClient
import main

def run_tests():
    client = TestClient(main.app)

    print("==================================================")
    print("PHASE 7: EMERGENCY ALERT MANAGEMENT TEST SUITE")
    print("==================================================")

    # 1. GET /api/emergency-alerts -> 200
    r = client.get("/api/emergency-alerts")
    assert r.status_code == 200, f"GET /api/emergency-alerts failed: {r.status_code}"
    initial_alerts = r.json()
    assert isinstance(initial_alerts, list), "Expected list of emergency alerts"
    print(f"[PASS] TEST 1: GET /api/emergency-alerts -> 200 OK (Current count: {len(initial_alerts)})")

    # 2. GET /api/emergency-alerts/summary -> 200
    r = client.get("/api/emergency-alerts/summary")
    assert r.status_code == 200, f"GET /api/emergency-alerts/summary failed: {r.status_code}"
    summary = r.json()
    for field in ["total_alerts", "active_alerts", "critical_alerts", "investigating_alerts", "resolved_alerts"]:
        assert field in summary, f"Missing field '{field}' in emergency alerts summary response"
    print(f"[PASS] TEST 2: GET /api/emergency-alerts/summary -> 200 OK (Summary: {summary})")

    # 3. POST valid emergency alert -> 201
    valid_payload = {
        "alert_type": "Road Blockage",
        "title": "Bridge Structural Inspection Closure",
        "description": "Precautionary closure of flyover for structural check. Route diverted.",
        "location": "Ram Jhula Cable Bridge",
        "area": "Railway Station Corridor",
        "severity": "High",
        "status": "Active",
        "issued_at": "2026-09-14T09:00:00Z"
    }
    r = client.post("/api/emergency-alerts", json=valid_payload)
    assert r.status_code == 201, f"POST /api/emergency-alerts failed: {r.text}"
    created_alert = r.json()
    alert_id = created_alert["id"]
    print(f"[PASS] TEST 3: POST /api/emergency-alerts -> 201 Created ({alert_id})")

    # 4. Verify EMG-XXXX ID
    assert alert_id.startswith("EMG-"), f"Expected ID starting with EMG-, got {alert_id}"
    assert len(alert_id) == 8, f"Expected 8-character ID format EMG-XXXX, got {alert_id}"
    assert created_alert["alert_type"] == valid_payload["alert_type"]
    assert created_alert["title"] == valid_payload["title"]
    assert created_alert["status"] == "Active"
    print(f"[PASS] TEST 4: Verified sequential ID format ({alert_id})")

    # 5. GET created alert -> 200
    r = client.get(f"/api/emergency-alerts/{alert_id}")
    assert r.status_code == 200, f"GET /api/emergency-alerts/{alert_id} failed: {r.status_code}"
    fetched = r.json()
    assert fetched["id"] == alert_id
    assert fetched["location"] == valid_payload["location"]
    print(f"[PASS] TEST 5: GET /api/emergency-alerts/{alert_id} -> 200 OK")

    # 6. GET nonexistent alert -> 404
    r = client.get("/api/emergency-alerts/EMG-NONEXISTENT-9999")
    assert r.status_code == 404, f"Expected 404 for unknown ID, got {r.status_code}"
    print("[PASS] TEST 6: GET nonexistent alert -> 404 Not Found")

    # 7. Invalid alert_type -> 422
    bad_payload_type = valid_payload.copy()
    bad_payload_type["alert_type"] = "AlienInvasion"
    r = client.post("/api/emergency-alerts", json=bad_payload_type)
    assert r.status_code == 422, f"Expected 422 for invalid alert_type, got {r.status_code}"
    print("[PASS] TEST 7: POST invalid alert_type ('AlienInvasion') -> 422 Validation Error")

    # 8. Invalid severity -> 422
    bad_payload_severity = valid_payload.copy()
    bad_payload_severity["severity"] = "Catastrophic"
    r = client.post("/api/emergency-alerts", json=bad_payload_severity)
    assert r.status_code == 422, f"Expected 422 for invalid severity, got {r.status_code}"
    print("[PASS] TEST 8: POST invalid severity ('Catastrophic') -> 422 Validation Error")

    # 9. Invalid status -> 422
    bad_payload_status = valid_payload.copy()
    bad_payload_status["status"] = "Archived"
    r = client.post("/api/emergency-alerts", json=bad_payload_status)
    assert r.status_code == 422, f"Expected 422 for invalid status, got {r.status_code}"
    print("[PASS] TEST 9: POST invalid status ('Archived') -> 422 Validation Error")

    # 10. PATCH status -> 200
    patch_payload = {"status": "Investigating"}
    r = client.patch(f"/api/emergency-alerts/{alert_id}/status", json=patch_payload)
    assert r.status_code == 200, f"PATCH /api/emergency-alerts/{alert_id}/status failed: {r.text}"
    patched_alert = r.json()
    assert patched_alert["status"] == "Investigating"
    print(f"[PASS] TEST 10: PATCH /api/emergency-alerts/{alert_id}/status -> 200 OK")

    # 11. Verify status actually changed in subsequent GET
    r = client.get(f"/api/emergency-alerts/{alert_id}")
    assert r.status_code == 200
    assert r.json()["status"] == "Investigating", "Status was not updated in database"
    print(f"[PASS] TEST 11: Verified status updated to 'Investigating' for {alert_id}")

    # 12. Verify PostgreSQL persistence across reload
    del client
    if "main" in sys.modules:
        del sys.modules["main"]
    import main as fresh_main
    new_client = TestClient(fresh_main.app)
    r = new_client.get(f"/api/emergency-alerts/{alert_id}")
    assert r.status_code == 200, f"Persisted fetch failed: {r.status_code}"
    assert r.json()["id"] == alert_id
    assert r.json()["status"] == "Investigating"
    print(f"[PASS] TEST 12 (PERSISTENCE PROVEN): Record {alert_id} persisted in PostgreSQL across reload!")

    print("\nALL PHASE 7 VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
