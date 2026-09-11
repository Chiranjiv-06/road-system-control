"""
Phase 4 Automated Verification Test Script
Tests health check, issue creation, ID generation, database query,
schema validation, 404 handling, and persistence across server restarts.
"""

from fastapi.testclient import TestClient
import main
import sys

def run_tests():
    client = TestClient(main.app)

    # 1. Health check
    r = client.get("/api/health")
    assert r.status_code == 200, f"Health failed: {r.status_code}"
    print("[PASS] TEST 1: GET /api/health -> 200 OK")

    # 2. Get issues list
    r = client.get("/api/issues")
    assert r.status_code == 200, f"List failed: {r.status_code}"
    initial_count = len(r.json())
    print(f"[PASS] TEST 2: GET /api/issues -> 200 OK (Current DB count: {initial_count})")

    # 3. Create Issue 1
    payload1 = {
        "issueType": "Pothole",
        "description": "Deep crater on right lane near metro pillar 42.",
        "location": "Wardha Road",
        "area": "Wardha Road",
        "severity": "High",
        "reportedAt": "2026-09-11T12:00:00Z"
    }
    r = client.post("/api/issues", json=payload1)
    assert r.status_code == 201, f"Create 1 failed: {r.text}"
    issue1 = r.json()
    id1 = issue1["id"]
    assert issue1["status"] == "Reported"
    assert issue1["issueType"] == "Pothole"
    print(f"[PASS] TEST 3: POST /api/issues -> 201 Created ({id1})")

    # 4. Create Issue 2
    payload2 = {
        "issueType": "Traffic Signal Failure",
        "description": "Signal controller burned out; all lights blinking red.",
        "location": "Sitabuldi Interchange",
        "area": "Sitabuldi",
        "severity": "Critical",
        "reportedAt": "2026-09-11T12:30:00Z"
    }
    r = client.post("/api/issues", json=payload2)
    assert r.status_code == 201, f"Create 2 failed: {r.text}"
    issue2 = r.json()
    id2 = issue2["id"]
    assert issue2["status"] == "Reported"
    assert issue2["severity"] == "Critical"
    print(f"[PASS] TEST 4: POST /api/issues -> 201 Created ({id2})")

    # 5. Verify ordering: newest first
    r = client.get("/api/issues")
    assert r.status_code == 200
    issues = r.json()
    assert len(issues) >= 2
    assert issues[0]["id"] == id2, f"Expected newest issue {id2} first, got {issues[0]['id']}"
    print("[PASS] TEST 5: GET /api/issues returns records newest first")

    # 6. Get issue by ID
    r = client.get(f"/api/issues/{id1}")
    assert r.status_code == 200
    assert r.json()["id"] == id1
    assert r.json()["location"] == "Wardha Road"
    print(f"[PASS] TEST 6: GET /api/issues/{id1} -> 200 OK")

    # 7. Invalid ID -> 404
    r = client.get("/api/issues/ISS-NONEXISTENT-9999")
    assert r.status_code == 404
    print("[PASS] TEST 7: GET /api/issues/nonexistent -> 404 Not Found")

    # 8. Invalid severity -> 422
    bad_payload = {
        "issueType": "Pothole",
        "description": "Valid description text",
        "location": "Wardha Road",
        "severity": "SuperCritical"
    }
    r = client.post("/api/issues", json=bad_payload)
    assert r.status_code == 422
    print("[PASS] TEST 8: POST invalid severity -> 422 Unprocessable Entity")

    # 9. Test persistence across server restart
    del client
    if "main" in sys.modules:
        del sys.modules["main"]
    import main as fresh_main
    new_client = TestClient(fresh_main.app)
    r = new_client.get("/api/issues")
    assert r.status_code == 200
    persisted_ids = [item["id"] for item in r.json()]
    assert id1 in persisted_ids, f"Issue {id1} missing after restart!"
    assert id2 in persisted_ids, f"Issue {id2} missing after restart!"
    print(f"[PASS] TEST 9 (PERSISTENCE PROVEN): Both {id1} and {id2} survived server restart!")

    print("\nALL 9 TESTS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
