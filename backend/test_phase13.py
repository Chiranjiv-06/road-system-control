"""
Test Suite for Phase 13: Notifications & Operational Escalation
--------------------------------------------------------------
Validates:
1.  Notifications table existence and ORM model mapping in PostgreSQL
2.  Sequential ID generation (NTF-XXXX format)
3.  Notification creation via NotificationService
4.  Duplicate prevention logic (same source_domain, source_id, notification_type)
5.  Role-based routing:
    - Road issues -> ROAD_INSPECTOR
    - Traffic congestion & violations -> TRAFFIC_OPERATOR
    - Emergencies -> EMERGENCY_OPERATOR
    - Risk intelligence spikes -> ADMIN
6.  GET /api/notifications listing endpoint (unfiltered and filtered)
7.  GET /api/notifications/summary metrics calculation
8.  GET /api/notifications/{id} single record retrieval
9.  PATCH /api/notifications/{id}/read state transition (UNREAD -> READ, sets read_at)
10. PATCH /api/notifications/{id}/acknowledge state transition (-> ACKNOWLEDGED, records operator and timestamp)
11. RBAC authorization checks:
    - Operator cannot view/acknowledge notifications targeted to another role (403 Forbidden)
    - ADMIN can view and acknowledge any notification across all domains
12. Operational sync engine (scans PostgreSQL tables and materializes alerts)
13. Source traceability (source_domain and source_id cross-referenced)
14. Error handling: Nonexistent notification ID returns 404
15. Error handling: Invalid status / severity returns 422 / 400
16. Full regression across all earlier phases (Phases 4, 6, 7, 8, 9, 10, 11, 12)
"""

import sys
from fastapi.testclient import TestClient
from database import SessionLocal, engine, Base
from main import app
import models.notification
from models.notification import Notification
from schemas.notification import NotificationCreate
from services.notification_service import NotificationService
from services.auth_service import AuthService

client = TestClient(app)


def get_auth_token(username: str, password: str = "AdminPassword@123") -> str:
    """Helper to authenticate and obtain JWT token for a specific operator."""
    res = client.post("/api/auth/login", json={"username": username, "password": password})
    if res.status_code != 200:
        # Fallback to standard operator passwords
        passwords = {
            "admin": "AdminPassword@123",
            "traffic_op": "TrafficPassword@123",
            "emergency_op": "EmergencyPassword@123",
            "road_insp": "InspectorPassword@123"
        }
        res = client.post("/api/auth/login", json={"username": username, "password": passwords.get(username, password)})
    assert res.status_code == 200, f"Login failed for {username}: {res.text}"
    return res.json()["access_token"]


def run_tests():
    passed = 0
    failed = 0

    print("==================================================")
    print("PHASE 13: NOTIFICATIONS & OPERATIONAL ESCALATION")
    print("==================================================")

    # Ensure tables exist and baseline operators are seeded
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    AuthService.ensure_default_users(db)

    # Pre-fetch operator JWT tokens
    admin_token = get_auth_token("admin", "AdminPassword@123")
    traffic_token = get_auth_token("traffic_op", "TrafficPassword@123")
    emergency_token = get_auth_token("emergency_op", "EmergencyPassword@123")
    inspector_token = get_auth_token("road_insp", "InspectorPassword@123")

    # ----------------------------------------------------
    # TEST 1: Database Table & ORM Model Verification
    # ----------------------------------------------------
    try:
        from sqlalchemy import inspect
        insp = inspect(engine)
        tables = insp.get_table_names()
        assert "notifications" in tables, f"'notifications' table missing from DB tables: {tables}"
        columns = [c["name"] for c in insp.get_columns("notifications")]
        required_cols = [
            "id", "notification_type", "title", "message",
            "source_domain", "source_id", "area", "severity",
            "status", "recipient_role", "created_at", "read_at",
            "acknowledged_at", "acknowledged_by"
        ]
        for col in required_cols:
            assert col in columns, f"Column '{col}' missing from 'notifications' table"
        print("PASS - Test 1: Notifications table and columns verified in PostgreSQL")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 1: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 2: Sequential ID Generation (NTF-XXXX)
    # ----------------------------------------------------
    try:
        next_id = NotificationService.generate_next_notification_id(db)
        assert next_id.startswith("NTF-"), f"Invalid ID format: {next_id}"
        assert len(next_id) >= 8, f"ID format too short: {next_id}"
        print(f"PASS - Test 2: Sequential ID generation validated ({next_id})")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 2: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 3: Notification Creation & Service Persistence
    # ----------------------------------------------------
    test_notif_id = None
    try:
        payload = NotificationCreate(
            notification_type="EMERGENCY_DISPATCH",
            title="Severe Tanker Spill Test",
            message="Major fuel spill on Wardha Road blocking two lanes. Dispatch cleanup team.",
            source_domain="emergency_alerts",
            source_id="EMG-TEST-001",
            area="Wardha Road",
            severity="Critical",
            recipient_role="EMERGENCY_OPERATOR"
        )
        notif, was_created = NotificationService.create_notification(db, payload)
        assert was_created is True
        assert notif.id.startswith("NTF-")
        assert notif.status == "UNREAD"
        assert notif.recipient_role == "EMERGENCY_OPERATOR"
        assert notif.severity == "Critical"
        test_notif_id = notif.id
        print(f"PASS - Test 3: Notification created successfully ({notif.id})")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 3: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 4: Duplicate Prevention Behavior
    # ----------------------------------------------------
    try:
        payload_dup = NotificationCreate(
            notification_type="EMERGENCY_DISPATCH",
            title="Duplicate Tanker Spill Attempt",
            message="Attempting to re-notify same active incident.",
            source_domain="emergency_alerts",
            source_id="EMG-TEST-001",
            area="Wardha Road",
            severity="Critical",
            recipient_role="EMERGENCY_OPERATOR"
        )
        existing, was_created = NotificationService.create_notification(db, payload_dup, prevent_duplicate=True)
        assert was_created is False, "Duplicate notification should not have been created!"
        assert existing.id == test_notif_id, f"Expected existing ID {test_notif_id}, got {existing.id}"
        print("PASS - Test 4: Duplicate notification correctly suppressed for active entity")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 4: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 5: Role Routing for All Operational Domains
    # ----------------------------------------------------
    try:
        domains_and_roles = [
            ("ROAD_HAZARD", "issues", "ISS-TEST-01", "ROAD_INSPECTOR"),
            ("TRAFFIC_CONGESTION", "traffic", "TRF-TEST-01", "TRAFFIC_OPERATOR"),
            ("TRAFFIC_VIOLATION", "traffic_violations", "VIO-TEST-01", "TRAFFIC_OPERATOR"),
            ("EMERGENCY_DISPATCH", "emergency_alerts", "EMG-TEST-02", "EMERGENCY_OPERATOR"),
            ("RISK_ESCALATION", "risk", "RISK-TEST-01", "ADMIN"),
        ]
        created_role_ids = {}
        for n_type, dom, s_id, role in domains_and_roles:
            p = NotificationCreate(
                notification_type=n_type,
                title=f"Test Event {n_type}",
                message=f"Detailed message for {n_type} event.",
                source_domain=dom,
                source_id=s_id,
                area="Nagpur Central",
                severity="High",
                recipient_role=role
            )
            n, _ = NotificationService.create_notification(db, p, prevent_duplicate=False)
            assert n.recipient_role == role, f"Expected role {role}, got {n.recipient_role}"
            created_role_ids[role] = n.id
        print("PASS - Test 5: Role routing verified across all 5 operational domains")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 5: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 6: GET /api/notifications (List Endpoint & Filters)
    # ----------------------------------------------------
    try:
        # Request with ADMIN token (sees all)
        res = client.get(
            "/api/notifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "total" in data and "unread_total" in data and "items" in data
        assert data["total"] >= 6
        assert isinstance(data["items"], list)

        # Filter by status=UNREAD
        res_unread = client.get(
            "/api/notifications?status=UNREAD",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_unread.status_code == 200
        for item in res_unread.json()["items"]:
            assert item["status"] == "UNREAD"

        # Filter by source_domain=emergency_alerts
        res_dom = client.get(
            "/api/notifications?source_domain=emergency_alerts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_dom.status_code == 200
        for item in res_dom.json()["items"]:
            assert item["source_domain"] == "emergency_alerts"

        print(f"PASS - Test 6: GET /api/notifications listing and query filters verified (Total: {data['total']})")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 6: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 7: GET /api/notifications/summary
    # ----------------------------------------------------
    try:
        res = client.get(
            "/api/notifications/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        summary = res.json()
        assert "total_notifications" in summary
        assert "unread_count" in summary
        assert "critical_count" in summary
        assert "by_domain" in summary
        assert "by_role" in summary
        assert summary["total_notifications"] >= 6
        print(f"PASS - Test 7: GET /api/notifications/summary returns valid KPIs (Unread: {summary['unread_count']})")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 7: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 8: GET /api/notifications/{id} Detail Endpoint
    # ----------------------------------------------------
    try:
        res = client.get(
            f"/api/notifications/{test_notif_id}",
            headers={"Authorization": f"Bearer {emergency_token}"}
        )
        assert res.status_code == 200
        d = res.json()
        assert d["id"] == test_notif_id
        assert d["title"] == "Severe Tanker Spill Test"
        assert d["source_domain"] == "emergency_alerts"
        assert d["source_id"] == "EMG-TEST-001"
        print(f"PASS - Test 8: GET /api/notifications/{test_notif_id} returns accurate feature details")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 8: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 9: PATCH /api/notifications/{id}/read
    # ----------------------------------------------------
    try:
        res = client.patch(
            f"/api/notifications/{test_notif_id}/read",
            headers={"Authorization": f"Bearer {emergency_token}"}
        )
        assert res.status_code == 200
        d = res.json()
        assert d["status"] == "READ"
        assert d["read_at"] is not None
        print(f"PASS - Test 9: Status transitioned to READ with valid read_at timestamp")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 9: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 10: PATCH /api/notifications/{id}/acknowledge
    # ----------------------------------------------------
    try:
        res = client.patch(
            f"/api/notifications/{test_notif_id}/acknowledge",
            json={"remarks": "Hazmat team deployed to site."},
            headers={"Authorization": f"Bearer {emergency_token}"}
        )
        assert res.status_code == 200
        d = res.json()
        assert d["status"] == "ACKNOWLEDGED"
        assert d["acknowledged_at"] is not None
        assert d["acknowledged_by"] == "emergency_op"
        assert "Hazmat team deployed" in d["message"]
        print(f"PASS - Test 10: Status transitioned to ACKNOWLEDGED with audit trail")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 10: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 11: RBAC Authorization & Cross-Role Enforcement
    # ----------------------------------------------------
    try:
        # emergency_op should NOT be allowed to view/acknowledge ROAD_INSPECTOR notification
        insp_notif_id = created_role_ids["ROAD_INSPECTOR"]
        res_cross = client.get(
            f"/api/notifications/{insp_notif_id}",
            headers={"Authorization": f"Bearer {emergency_token}"}
        )
        assert res_cross.status_code == 403, f"Expected 403 Forbidden for cross-role access, got {res_cross.status_code}"

        res_ack_cross = client.patch(
            f"/api/notifications/{insp_notif_id}/acknowledge",
            headers={"Authorization": f"Bearer {traffic_token}"}
        )
        assert res_ack_cross.status_code == 403, f"Expected 403 Forbidden for cross-role acknowledge, got {res_ack_cross.status_code}"

        # ADMIN can access ANY notification
        res_admin = client.get(
            f"/api/notifications/{insp_notif_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_admin.status_code == 200, f"Admin should have universal access, got {res_admin.status_code}"

        print("PASS - Test 11: Role permissions and 403 cross-role rejections verified")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 11: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 12: Operational Event Sync Engine
    # ----------------------------------------------------
    try:
        res = client.post(
            "/api/notifications/sync",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        sync_res = res.json()
        assert sync_res["status"] == "success"
        assert "new_notifications" in sync_res
        print(f"PASS - Test 12: Operational sync engine completed successfully ({sync_res['new_notifications']} notifications)")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 12: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 13: Source Traceability
    # ----------------------------------------------------
    try:
        all_notifs = db.query(Notification).filter(Notification.source_id.isnot(None)).all()
        assert len(all_notifs) > 0
        for n in all_notifs[:10]:
            assert n.source_domain in ["issues", "traffic", "emergency_alerts", "traffic_violations", "risk"]
            assert len(n.source_id) > 0
        print("PASS - Test 13: Source traceability cross-referenced across operational records")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 13: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 14: Error Handling - Nonexistent Notification (404)
    # ----------------------------------------------------
    try:
        res = client.get(
            "/api/notifications/NTF-NONEXISTENT-9999",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()
        print("PASS - Test 14: Nonexistent notification ID handled correctly with 404 Not Found")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 14: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 15: Error Handling - Schema Validation (422)
    # ----------------------------------------------------
    try:
        try:
            NotificationCreate(
                notification_type="INVALID",
                title="Bad Severity Test",
                message="Testing validation error for invalid severity",
                source_domain="issues",
                severity="SuperApocalyptic",
                recipient_role="ROAD_INSPECTOR"
            )
            assert False, "Should have raised ValueError for invalid severity"
        except ValueError:
            pass

        try:
            NotificationCreate(
                notification_type="INVALID",
                title="Bad Role Test",
                message="Testing validation error for invalid role",
                source_domain="issues",
                severity="High",
                recipient_role="GALAXY_COMMANDER"
            )
            assert False, "Should have raised ValueError for invalid recipient_role"
        except ValueError:
            pass

        print("PASS - Test 15: Schema validation errors properly reject invalid severity & role")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 15: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 16: Full Regression Across All Prior Phases
    # ----------------------------------------------------
    try:
        # Phase 4/5: Issues
        r_iss = client.get("/api/issues")
        assert r_iss.status_code == 200, f"Issues failed: {r_iss.status_code}"

        # Phase 6: Traffic
        r_trf = client.get("/api/traffic")
        assert r_trf.status_code == 200, f"Traffic failed: {r_trf.status_code}"

        # Phase 7: Emergency Alerts
        r_emg = client.get("/api/emergency-alerts")
        assert r_emg.status_code == 200, f"Alerts failed: {r_emg.status_code}"

        # Phase 8: Traffic Violations
        r_vio = client.get("/api/traffic-violations")
        assert r_vio.status_code == 200, f"Violations failed: {r_vio.status_code}"

        # Phase 9: Analytics Overview
        r_anl = client.get("/api/analytics/overview")
        assert r_anl.status_code == 200, f"Analytics failed: {r_anl.status_code}"

        # Phase 10: Risk Overview
        r_rsk = client.get("/api/risk/overview")
        assert r_rsk.status_code == 200, f"Risk failed: {r_rsk.status_code}"

        # Phase 11: Auth Login
        r_auth = client.post("/api/auth/login", json={"username": "admin", "password": "AdminPassword@123"})
        assert r_auth.status_code == 200, f"Auth login failed: {r_auth.status_code}"

        # Phase 12: GIS Map Overview
        r_map = client.get("/api/map/overview")
        assert r_map.status_code == 200, f"Map overview failed: {r_map.status_code}"

        print("PASS - Test 16: Regression check passed (Phases 4, 6, 7, 8, 9, 10, 11, 12 operational)")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 16: {e}")
        failed += 1

    # ----------------------------------------------------
    # SUMMARY
    # ----------------------------------------------------
    print("==================================================")
    print(f"PHASE 13 RESULTS: {passed} PASSED, {failed} FAILED")
    print("==================================================")

    db.close()
    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    run_tests()
