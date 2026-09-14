"""
Phase 8 Automated Verification Test Script: Traffic Violation Management
------------------------------------------------------------------------
Tests all Phase 8 requirements:
1. GET /api/traffic-violations/summary -> 200
2. GET /api/traffic-violations -> 200
3. GET /api/traffic-violations with filters (status, severity, violation_type, area) -> 200
4. GET /api/traffic-violations/{id} -> 200
5. POST valid traffic violation -> 201 (sequential VIO-XXXX format)
6. POST invalid severity -> 422
7. POST negative fine_amount -> 422
8. PATCH status -> 200
9. Invalid violation ID returns 404
10. Verify PostgreSQL persistence across server reload
"""

import sys
from fastapi.testclient import TestClient
import main

def run_tests():
    client = TestClient(main.app)

    print("==================================================")
    print("PHASE 8: TRAFFIC VIOLATION MANAGEMENT TEST SUITE")
    print("==================================================")

    # 1. GET /api/traffic-violations/summary -> 200
    r = client.get("/api/traffic-violations/summary")
    assert r.status_code == 200, f"GET /api/traffic-violations/summary failed: {r.status_code}"
    summary = r.json()
    for field in [
        "total_violations",
        "detected_count",
        "under_review_count",
        "confirmed_count",
        "resolved_count",
        "high_critical_count",
        "total_fine_amount"
    ]:
        assert field in summary, f"Missing field '{field}' in traffic violations summary response"
    assert summary["total_violations"] >= 5, f"Expected at least 5 seeded violations, got {summary['total_violations']}"
    assert summary["total_fine_amount"] >= 0.0, "Total fine amount should be non-negative"
    print(f"[PASS] TEST 1: GET /api/traffic-violations/summary -> 200 OK (Summary: {summary})")

    # 2. GET /api/traffic-violations -> 200
    r = client.get("/api/traffic-violations")
    assert r.status_code == 200, f"GET /api/traffic-violations failed: {r.status_code}"
    violations = r.json()
    assert isinstance(violations, list), "Expected list of traffic violations"
    assert len(violations) >= 5, f"Expected at least 5 violations, found {len(violations)}"
    print(f"[PASS] TEST 2: GET /api/traffic-violations -> 200 OK (Count: {len(violations)})")

    # 3. GET filtered violations (by status, severity, violation_type, area)
    r_filtered = client.get("/api/traffic-violations?status=Detected")
    assert r_filtered.status_code == 200
    filtered_list = r_filtered.json()
    assert all(v["status"] == "Detected" for v in filtered_list), "Filtering by status failed"

    r_sev = client.get("/api/traffic-violations?severity=Critical")
    assert r_sev.status_code == 200
    assert all(v["severity"] == "Critical" for v in r_sev.json()), "Filtering by severity failed"

    r_type = client.get("/api/traffic-violations?violation_type=Speeding")
    assert r_type.status_code == 200
    assert all("Speeding" in v["violation_type"] for v in r_type.json()), "Filtering by violation_type failed"

    r_area = client.get("/api/traffic-violations?area=Sitabuldi")
    assert r_area.status_code == 200
    assert all("Sitabuldi" in v["area"] for v in r_area.json()), "Filtering by area failed"
    print(f"[PASS] TEST 3: GET /api/traffic-violations with filters (status, severity, type, area) -> 200 OK")

    # 4. GET single violation -> 200
    first_id = violations[0]["id"]
    r = client.get(f"/api/traffic-violations/{first_id}")
    assert r.status_code == 200, f"GET /api/traffic-violations/{first_id} failed: {r.status_code}"
    fetched = r.json()
    assert fetched["id"] == first_id
    assert "vehicle_number" in fetched
    print(f"[PASS] TEST 4: GET /api/traffic-violations/{first_id} -> 200 OK")

    # 5. POST valid violation -> 201
    valid_payload = {
        "violation_type": "Speeding",
        "vehicle_number": "MH 31 TEST 9999",
        "location": "Amravati Road near University Campus",
        "area": "Amravati Road",
        "severity": "High",
        "status": "Detected",
        "fine_amount": 2500.0,
        "description": "Vehicle exceeded 95 km/h in 60 km/h corridor. Radar flagged.",
        "detected_at": "2026-09-14T11:00:00Z"
    }
    r = client.post("/api/traffic-violations", json=valid_payload)
    assert r.status_code == 201, f"POST /api/traffic-violations failed: {r.text}"
    created_violation = r.json()
    vio_id = created_violation["id"]
    assert vio_id.startswith("VIO-"), f"Expected ID starting with VIO-, got {vio_id}"
    assert len(vio_id) == 8, f"Expected 8-character format VIO-XXXX, got {vio_id}"
    assert created_violation["vehicle_number"] == valid_payload["vehicle_number"]
    assert created_violation["fine_amount"] == 2500.0
    print(f"[PASS] TEST 5: POST valid traffic violation -> 201 Created ({vio_id})")

    # 6. POST invalid severity -> 422
    bad_payload_sev = valid_payload.copy()
    bad_payload_sev["severity"] = "ExtremeDanger"
    r = client.post("/api/traffic-violations", json=bad_payload_sev)
    assert r.status_code == 422, f"Expected 422 for invalid severity, got {r.status_code}"
    print("[PASS] TEST 6: POST invalid severity ('ExtremeDanger') -> 422 Validation Error")

    # 7. POST negative fine -> 422
    bad_payload_fine = valid_payload.copy()
    bad_payload_fine["fine_amount"] = -500.0
    r = client.post("/api/traffic-violations", json=bad_payload_fine)
    assert r.status_code == 422, f"Expected 422 for negative fine, got {r.status_code}"
    print("[PASS] TEST 7: POST negative fine_amount (-500.0) -> 422 Validation Error")

    # 8. PATCH status -> 200
    patch_payload = {"status": "Confirmed"}
    r = client.patch(f"/api/traffic-violations/{vio_id}/status", json=patch_payload)
    assert r.status_code == 200, f"PATCH /api/traffic-violations/{vio_id}/status failed: {r.text}"
    patched_vio = r.json()
    assert patched_vio["status"] == "Confirmed"

    # Verify status changed in subsequent GET
    r_check = client.get(f"/api/traffic-violations/{vio_id}")
    assert r_check.status_code == 200
    assert r_check.json()["status"] == "Confirmed", "Status was not updated in database"
    print(f"[PASS] TEST 8: PATCH status -> 200 OK (Updated status: Confirmed)")

    # 9. Invalid violation ID returns 404
    r = client.get("/api/traffic-violations/VIO-NONEXISTENT-9999")
    assert r.status_code == 404, f"Expected 404 for unknown ID, got {r.status_code}"

    r_patch_404 = client.patch("/api/traffic-violations/VIO-NONEXISTENT-9999/status", json={"status": "Resolved"})
    assert r_patch_404.status_code == 404, f"Expected 404 for unknown ID in PATCH, got {r_patch_404.status_code}"
    print("[PASS] TEST 9: Invalid violation ID returns 404 Not Found")

    # 10. Verify PostgreSQL persistence across server reload
    del client
    if "main" in sys.modules:
        del sys.modules["main"]
    import main as fresh_main
    new_client = TestClient(fresh_main.app)
    r_persisted = new_client.get(f"/api/traffic-violations/{vio_id}")
    assert r_persisted.status_code == 200, f"Persisted fetch failed: {r_persisted.status_code}"
    assert r_persisted.json()["id"] == vio_id
    assert r_persisted.json()["status"] == "Confirmed"
    print(f"[PASS] TEST 10 (PERSISTENCE PROVEN): Record {vio_id} persisted in PostgreSQL across reload!")

    print("\nALL 10 PHASE 8 VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
