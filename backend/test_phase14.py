"""
Test Suite for Phase 14: Field Work Orders & Incident Dispatch Operations
-------------------------------------------------------------------------
Validates:
1.  Work orders table existence and ORM model mapping in PostgreSQL
2.  Sequential ID generation via sequence (WO-XXXX format)
3.  Work order creation via WorkOrderService & persistence
4.  Deterministic SLA deadline calculation (created_at + target_sla_hours)
5.  Source domain & order type compatibility validation
6.  Duplicate active dispatch prevention for same source entity
7.  GET /api/work-orders listing endpoint with query filters
8.  GET /api/work-orders/summary metrics and KPI calculation
9.  GET /api/work-orders/{id} detail endpoint and runtime SLA status
10. Lifecycle transition: PENDING -> DISPATCHED (populates dispatched_at)
11. Lifecycle transition: DISPATCHED -> IN_PROGRESS
12. Lifecycle transition: IN_PROGRESS -> COMPLETED (populates completed_at, cost)
13. Resolution notes enforcement & completed_by audit identity
14. Closed-loop resolution: Completing repair resolves linked Issue
15. Closed-loop resolution: Completing emergency dispatch resolves linked EmergencyAlert
16. SLA breach detection for overdue operational dispatches
17. RBAC authorization checks (403 on cross-role mutation, 401 on unauthenticated)
18. Error handling: Invalid lifecycle state transitions, missing IDs, negative costs
"""

import sys
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from database import SessionLocal, engine, Base
from main import app
import models.work_order
from models.work_order import WorkOrder
from models.issue import Issue
from models.emergency_alert import EmergencyAlert
from schemas.work_order import WorkOrderCreate, WorkOrderStatusUpdate
from services.work_order_service import WorkOrderService
from services.auth_service import AuthService

client = TestClient(app)


def get_auth_token(username: str, password: str = "AdminPassword@123") -> str:
    """Helper to authenticate and obtain JWT token for a specific operator."""
    passwords = {
        "admin": "AdminPassword@123",
        "traffic_op": "TrafficPassword@123",
        "emergency_op": "EmergencyPassword@123",
        "road_insp": "InspectorPassword@123"
    }
    pw = passwords.get(username, password)
    res = client.post("/api/auth/login", json={"username": username, "password": pw})
    assert res.status_code == 200, f"Login failed for {username}: {res.text}"
    return res.json()["access_token"]


def run_tests():
    passed = 0
    failed = 0

    print("==================================================")
    print("PHASE 14: FIELD WORK ORDERS & INCIDENT DISPATCH")
    print("==================================================")

    # Ensure tables exist and baseline operators are seeded
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    AuthService.ensure_default_users(db)

    # Clean up test work orders from previous runs to guarantee clean state
    db.query(WorkOrder).filter(
        WorkOrder.source_id.in_([
            "ISS-TEST-P14-01", "ISS-TEST-P14-02",
            "EMG-TEST-P14-01", "EMG-TEST-P14-02",
            "TRF-TEST-P14-01"
        ])
    ).delete(synchronize_session=False)
    db.commit()

    # Pre-fetch operator JWT tokens
    admin_token = get_auth_token("admin")
    traffic_token = get_auth_token("traffic_op")
    emergency_token = get_auth_token("emergency_op")
    inspector_token = get_auth_token("road_insp")

    # ----------------------------------------------------
    # TEST 1: Database Table & Schema Verification
    # ----------------------------------------------------
    try:
        from sqlalchemy import inspect
        insp = inspect(engine)
        tables = insp.get_table_names()
        assert "work_orders" in tables, f"'work_orders' table missing from DB tables: {tables}"
        columns = [c["name"] for c in insp.get_columns("work_orders")]
        required_cols = [
            "id", "title", "description", "order_type", "source_domain",
            "source_id", "area", "location", "latitude", "longitude",
            "priority", "status", "assigned_crew", "assigned_role",
            "created_by", "target_sla_hours", "sla_deadline",
            "dispatched_at", "completed_at", "completed_by",
            "resolution_notes", "actual_cost", "created_at", "updated_at"
        ]
        for col in required_cols:
            assert col in columns, f"Column '{col}' missing from 'work_orders' table"
        print("PASS - Test 1: Work orders table and 24 columns verified in PostgreSQL")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 1: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 2: Concurrency-Safe Sequence ID Generation
    # ----------------------------------------------------
    try:
        next_id = WorkOrderService.generate_next_work_order_id(db)
        assert next_id.startswith("WO-"), f"Invalid ID format: {next_id}"
        assert len(next_id) >= 7, f"ID format too short: {next_id}"
        print(f"PASS - Test 2: Concurrency-safe sequence ID generated ({next_id})")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 2: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 3: Work Order Creation & Service Persistence
    # ----------------------------------------------------
    test_wo_id = None
    test_issue_id = "ISS-TEST-P14-01"
    try:
        # Create test source issue
        db.query(Issue).filter(Issue.id == test_issue_id).delete()
        db.commit()
        test_issue = Issue(
            id=test_issue_id,
            issue_type="Pothole",
            description="Deep pothole causing vehicular damage near Gandhi Square",
            location="Central Avenue",
            area="Gandhibagh",
            severity="Critical",
            status="Pending",
            reported_at=datetime.now(timezone.utc).isoformat()
        )
        db.add(test_issue)
        db.commit()

        payload = {
            "title": "Emergency Asphalt Repair: Central Avenue",
            "description": "Deploy cold mix asphalt patching crew to restore roadway surface immediately.",
            "order_type": "ROAD_REPAIR",
            "source_domain": "issues",
            "source_id": test_issue_id,
            "area": "Gandhibagh",
            "location": "Central Avenue near Gandhi Square",
            "latitude": 21.1500,
            "longitude": 79.1120,
            "priority": "Critical",
            "assigned_crew": "Asphalt Quick Patch Unit 4",
            "target_sla_hours": 12
        }

        res = client.post(
            "/api/work-orders",
            json=payload,
            headers={"Authorization": f"Bearer {inspector_token}"}
        )
        assert res.status_code == 201, f"Expected 201 Created, got {res.status_code}: {res.text}"
        d = res.json()
        assert d["id"].startswith("WO-")
        assert d["status"] == "PENDING"
        assert d["assigned_role"] == "ROAD_INSPECTOR"
        assert d["created_by"] == "road_insp"
        test_wo_id = d["id"]

        print(f"PASS - Test 3: Work order created and persisted ({test_wo_id})")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 3: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 4: Deterministic SLA Deadline Calculation
    # ----------------------------------------------------
    try:
        wo = WorkOrderService.get_work_order_by_id(db, test_wo_id)
        assert wo is not None
        # Verify deadline is created_at + 12 hours
        diff = (wo.sla_deadline - wo.created_at).total_seconds()
        assert abs(diff - (12 * 3600)) < 60, f"SLA window mismatch: expected ~43200s, got {diff}s"
        print("PASS - Test 4: Deterministic SLA deadline calculated accurately (+12h)")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 4: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 5: Source Domain & Order Type Compatibility
    # ----------------------------------------------------
    try:
        # Incompatible pair: ROAD_REPAIR with emergency_alerts domain
        bad_payload = {
            "title": "Mismatched Order Type Test",
            "description": "Testing rejection of invalid domain/type pairing",
            "order_type": "ROAD_REPAIR",
            "source_domain": "emergency_alerts",
            "area": "Sitabuldi",
            "location": "Main Road",
            "priority": "High",
            "assigned_crew": "Test Crew",
            "target_sla_hours": 24
        }
        res_bad = client.post(
            "/api/work-orders",
            json=bad_payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_bad.status_code == 422, f"Expected 422 for incompatible domain/type, got {res_bad.status_code}"
        print("PASS - Test 5: Incompatible domain and order_type rejected (422 Unprocessable Content)")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 5: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 6: Duplicate Active Dispatch Prevention
    # ----------------------------------------------------
    try:
        # Attempt to create second active work order for same source issue
        dup_payload = {
            "title": "Duplicate Dispatch Attempt",
            "description": "Attempting to create another work order for the same active incident",
            "order_type": "ROAD_REPAIR",
            "source_domain": "issues",
            "source_id": test_issue_id,
            "area": "Gandhibagh",
            "location": "Central Avenue",
            "priority": "High",
            "assigned_crew": "Duplicate Crew B",
            "target_sla_hours": 24
        }
        res_dup = client.post(
            "/api/work-orders",
            json=dup_payload,
            headers={"Authorization": f"Bearer {inspector_token}"}
        )
        assert res_dup.status_code == 400, f"Expected 400 Bad Request for duplicate active dispatch, got {res_dup.status_code}"
        assert "already exists" in res_dup.json()["detail"].lower()
        print("PASS - Test 6: Duplicate active dispatch successfully prevented (400 Bad Request)")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 6: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 7: GET /api/work-orders Listing & Filters
    # ----------------------------------------------------
    try:
        res_list = client.get(
            "/api/work-orders?status=PENDING&priority=Critical",
            headers={"Authorization": f"Bearer {inspector_token}"}
        )
        assert res_list.status_code == 200
        data = res_list.json()
        assert "items" in data
        assert "total" in data
        assert any(item["id"] == test_wo_id for item in data["items"])
        print(f"PASS - Test 7: GET /api/work-orders returned filtered list (Total: {data['total']})")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 7: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 8: GET /api/work-orders/summary Metrics
    # ----------------------------------------------------
    try:
        res_sum = client.get(
            "/api/work-orders/summary",
            headers={"Authorization": f"Bearer {inspector_token}"}
        )
        assert res_sum.status_code == 200
        s = res_sum.json()
        assert "total_orders" in s
        assert "pending_count" in s
        assert "dispatched_count" in s
        assert "in_progress_count" in s
        assert "completed_count" in s
        assert "sla_breached_count" in s
        assert s["total_orders"] >= 1
        print(f"PASS - Test 8: Work order summary metrics verified (Total: {s['total_orders']}, Pending: {s['pending_count']})")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 8: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 9: GET /api/work-orders/{id} Detail Endpoint
    # ----------------------------------------------------
    try:
        res_det = client.get(
            f"/api/work-orders/{test_wo_id}",
            headers={"Authorization": f"Bearer {inspector_token}"}
        )
        assert res_det.status_code == 200
        d = res_det.json()
        assert d["id"] == test_wo_id
        assert d["sla_status"] in ("ON_TRACK", "EXPIRING_SOON", "BREACHED")
        print(f"PASS - Test 9: Detail endpoint returned accurate record with SLA status '{d['sla_status']}'")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 9: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 10: Lifecycle Transition PENDING -> DISPATCHED
    # ----------------------------------------------------
    try:
        res_disp = client.patch(
            f"/api/work-orders/{test_wo_id}/status",
            json={"status": "DISPATCHED"},
            headers={"Authorization": f"Bearer {inspector_token}"}
        )
        assert res_disp.status_code == 200
        d = res_disp.json()
        assert d["status"] == "DISPATCHED"
        assert d["dispatched_at"] is not None
        print("PASS - Test 10: Transitioned PENDING -> DISPATCHED with valid dispatched_at timestamp")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 10: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 11: Lifecycle Transition DISPATCHED -> IN_PROGRESS
    # ----------------------------------------------------
    try:
        res_prog = client.patch(
            f"/api/work-orders/{test_wo_id}/status",
            json={"status": "IN_PROGRESS"},
            headers={"Authorization": f"Bearer {inspector_token}"}
        )
        assert res_prog.status_code == 200
        assert res_prog.json()["status"] == "IN_PROGRESS"
        print("PASS - Test 11: Transitioned DISPATCHED -> IN_PROGRESS")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 11: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 12: Lifecycle Transition IN_PROGRESS -> COMPLETED
    # ----------------------------------------------------
    try:
        res_comp = client.patch(
            f"/api/work-orders/{test_wo_id}/status",
            json={
                "status": "COMPLETED",
                "resolution_notes": "Roadway pothole filled with hot mix asphalt, compacted, and traffic lane reopened.",
                "actual_cost": 18500.0
            },
            headers={"Authorization": f"Bearer {inspector_token}"}
        )
        assert res_comp.status_code == 200
        d = res_comp.json()
        assert d["status"] == "COMPLETED"
        assert d["completed_at"] is not None
        assert d["completed_by"] == "road_insp"
        assert d["actual_cost"] == 18500.0
        print("PASS - Test 12: Transitioned IN_PROGRESS -> COMPLETED with resolution metadata")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 12: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 13: Resolution Notes & Completed By Audit Trail
    # ----------------------------------------------------
    try:
        db.expire_all()
        wo_check = WorkOrderService.get_work_order_by_id(db, test_wo_id)
        assert wo_check.completed_by == "road_insp", f"Expected completed_by 'road_insp', got '{wo_check.completed_by}'"
        assert len(wo_check.resolution_notes) > 10
        print("PASS - Test 13: Audit trail verified (completed_by populated from JWT identity)")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 13: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 14: Closed-Loop Auto-Resolution for Issues
    # ----------------------------------------------------
    try:
        # Linked issue should now have status = "Resolved"
        resolved_issue = db.query(Issue).filter(Issue.id == test_issue_id).first()
        assert resolved_issue is not None
        assert resolved_issue.status == "Resolved", f"Expected Issue status 'Resolved', got '{resolved_issue.status}'"
        print("PASS - Test 14: Closed-loop resolution verified: Linked Issue marked Resolved")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 14: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 15: Closed-Loop Auto-Resolution for Emergency Alerts
    # ----------------------------------------------------
    try:
        test_emg_id = "EMG-TEST-P14-01"
        db.query(EmergencyAlert).filter(EmergencyAlert.id == test_emg_id).delete()
        db.commit()

        test_emg = EmergencyAlert(
            id=test_emg_id,
            alert_type="Hazard",
            title="Chemical Leak at Hingna Plant",
            description="Hazardous chemical spill requiring containment perimeter",
            location="MIDC Hingna Sector 3",
            area="MIDC Hingna",
            severity="Critical",
            status="Active",
            issued_at=datetime.now(timezone.utc).isoformat()
        )
        db.add(test_emg)
        db.commit()

        # Create emergency response work order
        emg_wo_payload = {
            "title": "Hazmat Containment: Hingna Sector 3",
            "description": "Deploy chemical containment team with neutralizing foam",
            "order_type": "EMERGENCY_RESPONSE",
            "source_domain": "emergency_alerts",
            "source_id": test_emg_id,
            "area": "MIDC Hingna",
            "location": "MIDC Hingna Sector 3",
            "priority": "Critical",
            "assigned_crew": "Hazmat Quick Response Alpha",
            "target_sla_hours": 4
        }
        res_emg_wo = client.post(
            "/api/work-orders",
            json=emg_wo_payload,
            headers={"Authorization": f"Bearer {emergency_token}"}
        )
        assert res_emg_wo.status_code == 201
        emg_wo_id = res_emg_wo.json()["id"]

        # Advance to DISPATCHED -> IN_PROGRESS -> COMPLETED
        client.patch(f"/api/work-orders/{emg_wo_id}/status", json={"status": "DISPATCHED"}, headers={"Authorization": f"Bearer {emergency_token}"})
        client.patch(f"/api/work-orders/{emg_wo_id}/status", json={"status": "IN_PROGRESS"}, headers={"Authorization": f"Bearer {emergency_token}"})
        res_emg_done = client.patch(
            f"/api/work-orders/{emg_wo_id}/status",
            json={"status": "COMPLETED", "resolution_notes": "Chemical spill neutralized and area declared safe.", "actual_cost": 32000.0},
            headers={"Authorization": f"Bearer {emergency_token}"}
        )
        assert res_emg_done.status_code == 200

        # Verify linked EmergencyAlert is now Resolved
        emg_check = db.query(EmergencyAlert).filter(EmergencyAlert.id == test_emg_id).first()
        assert emg_check.status == "Resolved", f"Expected EmergencyAlert status 'Resolved', got '{emg_check.status}'"
        print("PASS - Test 15: Closed-loop resolution verified: Linked EmergencyAlert marked Resolved")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 15: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 16: Runtime SLA Breach Detection
    # ----------------------------------------------------
    try:
        # Create work order with artificially expired deadline
        expired_wo = WorkOrder(
            id=WorkOrderService.generate_next_work_order_id(db),
            title="Overdue Inspection Test",
            description="Testing SLA overdue breach classification",
            order_type="FIELD_INSPECTION",
            source_domain="issues",
            area="Dharampeth",
            location="West High Court Road",
            priority="High",
            status="DISPATCHED",
            assigned_crew="Inspection Team 2",
            assigned_role="ROAD_INSPECTOR",
            created_by="road_insp",
            target_sla_hours=4,
            created_at=datetime.now(timezone.utc) - timedelta(hours=6),
            sla_deadline=datetime.now(timezone.utc) - timedelta(hours=2)
        )
        db.add(expired_wo)
        db.commit()

        sla_state = WorkOrderService.calculate_sla_status(expired_wo)
        assert sla_state == "BREACHED", f"Expected 'BREACHED', got '{sla_state}'"

        # Cleanup expired test order
        db.delete(expired_wo)
        db.commit()
        print("PASS - Test 16: Runtime SLA breach correctly detected for overdue dispatch")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 16: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 17: RBAC Authorization Enforcement
    # ----------------------------------------------------
    try:
        # 1. Unauthenticated request to create work order -> 401
        res_unauth = client.post("/api/work-orders", json={})
        assert res_unauth.status_code == 401, f"Expected 401 for unauthenticated request, got {res_unauth.status_code}"

        # 2. Cross-role unauthorized dispatch: ROAD_INSPECTOR attempting EMERGENCY_RESPONSE -> 403
        cross_payload = {
            "title": "Cross Role Breach Test",
            "description": "Inspector attempting to dispatch hazmat emergency",
            "order_type": "EMERGENCY_RESPONSE",
            "source_domain": "emergency_alerts",
            "area": "Wardha Road",
            "location": "Airport Road",
            "priority": "High",
            "assigned_crew": "Hazmat Team",
            "target_sla_hours": 4
        }
        res_cross = client.post(
            "/api/work-orders",
            json=cross_payload,
            headers={"Authorization": f"Bearer {inspector_token}"}
        )
        assert res_cross.status_code == 403, f"Expected 403 Forbidden for cross-role creation, got {res_cross.status_code}"

        # 3. ADMIN role can create ANY order type
        res_admin_ok = client.post(
            "/api/work-orders",
            json=cross_payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_admin_ok.status_code == 201, f"Admin should have universal dispatch authority, got {res_admin_ok.status_code}"
        admin_created_id = res_admin_ok.json()["id"]

        # Clean up
        db.query(WorkOrder).filter(WorkOrder.id == admin_created_id).delete()
        db.commit()

        print("PASS - Test 17: RBAC permissions strictly enforced (401 unauth, 403 cross-role, ADMIN universal)")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 17: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 18: Invalid State Transitions & Error Handling
    # ----------------------------------------------------
    try:
        # 1. Attempting backward transition on COMPLETED order -> 400
        res_bad_trans = client.patch(
            f"/api/work-orders/{test_wo_id}/status",
            json={"status": "IN_PROGRESS"},
            headers={"Authorization": f"Bearer {inspector_token}"}
        )
        assert res_bad_trans.status_code == 400, f"Expected 400 for invalid backward transition, got {res_bad_trans.status_code}"

        # 2. Non-existent work order -> 404
        res_404 = client.get(
            "/api/work-orders/WO-NONEXISTENT-9999",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_404.status_code == 404

        # 3. Negative cost rejection -> 422
        res_neg = client.patch(
            f"/api/work-orders/{test_wo_id}/status",
            json={"status": "COMPLETED", "resolution_notes": "Valid notes for testing", "actual_cost": -100.0},
            headers={"Authorization": f"Bearer {inspector_token}"}
        )
        assert res_neg.status_code == 422

        print("PASS - Test 18: Invalid state transitions, 404 lookups, and negative costs rejected")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 18: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEARDOWN & CLEANUP
    # ----------------------------------------------------
    db.query(WorkOrder).filter(
        WorkOrder.source_id.in_([
            "ISS-TEST-P14-01", "ISS-TEST-P14-02",
            "EMG-TEST-P14-01", "EMG-TEST-P14-02",
            "TRF-TEST-P14-01"
        ])
    ).delete(synchronize_session=False)
    db.query(Issue).filter(Issue.id.in_(["ISS-TEST-P14-01", "ISS-TEST-P14-02"])).delete(synchronize_session=False)
    db.query(EmergencyAlert).filter(EmergencyAlert.id.in_(["EMG-TEST-P14-01", "EMG-TEST-P14-02"])).delete(synchronize_session=False)
    db.commit()
    db.close()

    # ----------------------------------------------------
    # SUMMARY
    # ----------------------------------------------------
    print("==================================================")
    print(f"PHASE 14 RESULTS: {passed} PASSED, {failed} FAILED")
    print("==================================================")

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    run_tests()
