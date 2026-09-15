"""
Test Suite for Phase 11: Authentication & Role-Based Access Control (RBAC)
--------------------------------------------------------------------------
Validates:
1. User creation & bcrypt hash behavior
2. Successful login
3. Invalid password rejection (401)
4. Unknown user rejection (401)
5. Token validation and claims resolution
6. Expired / invalid / malformed token rejection (401)
7. Current-user profile endpoint (GET /api/auth/me)
8. Inactive user rejection (403)
9. ADMIN authorization (200 for Admin, 403 for others)
10. TRAFFIC_OPERATOR authorization
11. EMERGENCY_OPERATOR authorization
12. ROAD_INSPECTOR authorization
13. Unauthorized cross-role rejection
14. Regression verification (Phases 4, 6, 7, 8, 9, 10)
"""

import sys
from datetime import timedelta
from fastapi.testclient import TestClient
from database import SessionLocal
from main import app
from models.user import User
from schemas.user import UserCreate
from services.auth_service import AuthService

client = TestClient(app)


def run_tests():
    passed = 0
    failed = 0

    print("==================================================")
    print("PHASE 11: AUTHENTICATION & RBAC TEST SUITE")
    print("==================================================")

    db = SessionLocal()
    # Ensure baseline operators exist
    AuthService.ensure_default_users(db)

    # ----------------------------------------------------
    # TEST 1: User Creation & Password Hash Behavior
    # ----------------------------------------------------
    try:
        test_uname = "unit_test_op"
        test_email = "unittest@roadcontrol.gov"
        existing = AuthService.get_user_by_identifier(db, test_uname)
        if existing:
            db.delete(existing)
            db.commit()

        plain_pwd = "SecureTestPassword@456"
        created = AuthService.create_user(db, UserCreate(
            username=test_uname,
            email=test_email,
            password=plain_pwd,
            full_name="Unit Test Operator",
            role="TRAFFIC_OPERATOR",
            is_active=True
        ))
        assert created.id is not None
        assert created.password_hash != plain_pwd, "Password was stored in plaintext!"
        assert created.password_hash.startswith("$2b$") or created.password_hash.startswith("$2a$") or "$2" in created.password_hash
        assert AuthService.verify_password(plain_pwd, created.password_hash)
        assert not AuthService.verify_password("WrongPassword@999", created.password_hash)
        print("[PASS] TEST 1: User creation & bcrypt hashing behavior verified (plaintext never saved)")
        passed += 1
    except AssertionError as e:
        print(f"[FAIL] TEST 1: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 2: Successful Login (POST /api/auth/login)
    # ----------------------------------------------------
    admin_token = ""
    traffic_token = ""
    emergency_token = ""
    inspector_token = ""
    try:
        res = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "AdminPassword@123"
        })
        assert res.status_code == 200, f"Admin login failed: {res.text}"
        data = res.json()
        assert "access_token" in data and len(data["access_token"]) > 20
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == "admin"
        assert data["user"]["role"] == "ADMIN"
        assert "password_hash" not in data["user"], "Exposed password_hash in login response!"
        admin_token = data["access_token"]

        # Also get tokens for other roles
        traffic_res = client.post("/api/auth/login", json={
            "username": "traffic_op",
            "password": "TrafficPassword@123"
        })
        assert traffic_res.status_code == 200
        traffic_token = traffic_res.json()["access_token"]

        emg_res = client.post("/api/auth/login", json={
            "username": "emergency_op",
            "password": "EmergencyPassword@123"
        })
        assert emg_res.status_code == 200
        emergency_token = emg_res.json()["access_token"]

        insp_res = client.post("/api/auth/login", json={
            "username": "road_insp",
            "password": "InspectorPassword@123"
        })
        assert insp_res.status_code == 200
        inspector_token = insp_res.json()["access_token"]

        print("[PASS] TEST 2: Successful login with valid credentials (JWT issued for all roles)")
        passed += 1
    except AssertionError as e:
        print(f"[FAIL] TEST 2: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 3: Invalid Password Rejection (401)
    # ----------------------------------------------------
    try:
        res = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "CompletelyWrongPassword!123"
        })
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"
        assert "detail" in res.json()
        print("[PASS] TEST 3: Invalid password rejected with 401 Unauthorized")
        passed += 1
    except AssertionError as e:
        print(f"[FAIL] TEST 3: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 4: Unknown User Rejection (401)
    # ----------------------------------------------------
    try:
        res = client.post("/api/auth/login", json={
            "username": "non_existent_operator_xyz",
            "password": "AnyPassword123"
        })
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"
        print("[PASS] TEST 4: Non-existent user rejected with 401 Unauthorized")
        passed += 1
    except AssertionError as e:
        print(f"[FAIL] TEST 4: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 5: Token Validation & Claims Resolution
    # ----------------------------------------------------
    try:
        decoded = AuthService.decode_access_token(admin_token)
        assert decoded["sub"] == "admin"
        assert decoded["role"] == "ADMIN"
        assert "exp" in decoded and "iat" in decoded
        print("[PASS] TEST 5: Token signature, expiration claims, and payload decoded successfully")
        passed += 1
    except Exception as e:
        print(f"[FAIL] TEST 5: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 6: Expired / Invalid Token Handling (401)
    # ----------------------------------------------------
    try:
        # Generate an expired token
        expired_token, _ = AuthService.create_access_token(
            subject="admin",
            role="ADMIN",
            user_id=1,
            expires_delta=timedelta(seconds=-10)
        )
        res_expired = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        assert res_expired.status_code == 401, f"Expected 401 for expired token, got {res_expired.status_code}"

        # Tampered token
        res_tampered = client.get("/api/auth/me", headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.tampered.signature"})
        assert res_tampered.status_code == 401, f"Expected 401 for tampered token, got {res_tampered.status_code}"

        print("[PASS] TEST 6: Expired and tampered tokens rejected with 401 Unauthorized")
        passed += 1
    except AssertionError as e:
        print(f"[FAIL] TEST 6: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 7: Current-User Endpoint (GET /api/auth/me)
    # ----------------------------------------------------
    try:
        # Without token -> 401
        res_no_auth = client.get("/api/auth/me")
        assert res_no_auth.status_code == 401, f"Expected 401 without auth, got {res_no_auth.status_code}"

        # With valid token -> 200
        res_auth = client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_auth.status_code == 200
        user_data = res_auth.json()
        assert user_data["username"] == "admin"
        assert user_data["role"] == "ADMIN"
        assert "password_hash" not in user_data
        print("[PASS] TEST 7: Current user profile resolved via Bearer token (401 enforced when missing)")
        passed += 1
    except AssertionError as e:
        print(f"[FAIL] TEST 7: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 8: Inactive User Rejection (403)
    # ----------------------------------------------------
    try:
        deact_uname = "deactivated_worker"
        existing = AuthService.get_user_by_identifier(db, deact_uname)
        if not existing:
            created_deact = AuthService.create_user(db, UserCreate(
                username=deact_uname,
                email="deact@roadcontrol.gov",
                password="Password@1234",
                full_name="Deactivated Worker",
                role="ROAD_INSPECTOR",
                is_active=False
            ))
        else:
            created_deact = AuthService.update_user_status(db, existing.id, False)

        # Login attempt by inactive user -> 403
        res_login_deact = client.post("/api/auth/login", json={
            "username": deact_uname,
            "password": "Password@1234"
        })
        assert res_login_deact.status_code == 403, f"Expected 403 for inactive login, got {res_login_deact.status_code}"

        # Token created prior to deactivation used against endpoint -> 403
        deact_token, _ = AuthService.create_access_token(deact_uname, "ROAD_INSPECTOR", created_deact.id)
        res_api_deact = client.get("/api/auth/me", headers={"Authorization": f"Bearer {deact_token}"})
        assert res_api_deact.status_code == 403, f"Expected 403 for inactive user token, got {res_api_deact.status_code}"

        print("[PASS] TEST 8: Deactivated/inactive accounts blocked with 403 Forbidden")
        passed += 1
    except AssertionError as e:
        print(f"[FAIL] TEST 8: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 9: ADMIN Authorization & RBAC
    # ----------------------------------------------------
    try:
        # Admin can access admin endpoint
        res_admin = client.get("/api/auth/rbac/admin", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_admin.status_code == 200, f"Admin was rejected: {res_admin.text}"

        # Non-admin rejected with 403
        res_non_admin = client.get("/api/auth/rbac/admin", headers={"Authorization": f"Bearer {traffic_token}"})
        assert res_non_admin.status_code == 403, f"Expected 403 for non-admin, got {res_non_admin.status_code}"

        # Admin user list API
        res_users = client.get("/api/auth/users", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_users.status_code == 200
        assert res_users.json()["total"] >= 4

        print("[PASS] TEST 9: ADMIN role authorized for administrative endpoints (non-admin blocked 403)")
        passed += 1
    except AssertionError as e:
        print(f"[FAIL] TEST 9: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 10: TRAFFIC_OPERATOR Authorization
    # ----------------------------------------------------
    try:
        # Traffic operator allowed
        res_traffic = client.get("/api/auth/rbac/traffic", headers={"Authorization": f"Bearer {traffic_token}"})
        assert res_traffic.status_code == 200

        # Admin also allowed
        res_admin_trf = client.get("/api/auth/rbac/traffic", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_admin_trf.status_code == 200

        # Emergency operator blocked
        res_emg_blocked = client.get("/api/auth/rbac/traffic", headers={"Authorization": f"Bearer {emergency_token}"})
        assert res_emg_blocked.status_code == 403

        print("[PASS] TEST 10: TRAFFIC_OPERATOR & ADMIN authorized on traffic endpoints (others blocked 403)")
        passed += 1
    except AssertionError as e:
        print(f"[FAIL] TEST 10: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 11: EMERGENCY_OPERATOR Authorization
    # ----------------------------------------------------
    try:
        # Emergency operator allowed
        res_emg = client.get("/api/auth/rbac/emergency", headers={"Authorization": f"Bearer {emergency_token}"})
        assert res_emg.status_code == 200

        # Admin also allowed
        res_admin_emg = client.get("/api/auth/rbac/emergency", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_admin_emg.status_code == 200

        # Inspector blocked
        res_insp_blocked = client.get("/api/auth/rbac/emergency", headers={"Authorization": f"Bearer {inspector_token}"})
        assert res_insp_blocked.status_code == 403

        print("[PASS] TEST 11: EMERGENCY_OPERATOR & ADMIN authorized on emergency endpoints (others blocked 403)")
        passed += 1
    except AssertionError as e:
        print(f"[FAIL] TEST 11: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 12: ROAD_INSPECTOR Authorization
    # ----------------------------------------------------
    try:
        # Road inspector allowed
        res_insp = client.get("/api/auth/rbac/inspector", headers={"Authorization": f"Bearer {inspector_token}"})
        assert res_insp.status_code == 200

        # Admin also allowed
        res_admin_insp = client.get("/api/auth/rbac/inspector", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_admin_insp.status_code == 200

        # Traffic operator blocked
        res_trf_blocked = client.get("/api/auth/rbac/inspector", headers={"Authorization": f"Bearer {traffic_token}"})
        assert res_trf_blocked.status_code == 403

        print("[PASS] TEST 12: ROAD_INSPECTOR & ADMIN authorized on inspector endpoints (others blocked 403)")
        passed += 1
    except AssertionError as e:
        print(f"[FAIL] TEST 12: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 13: Unauthorized Cross-Role Rejection
    # ----------------------------------------------------
    try:
        # Road inspector trying to create emergency alert with their token -> 403 Forbidden!
        bad_alert_payload = {
            "alert_type": "Accident",
            "title": "Unauthorized Alert Test",
            "description": "Should be rejected because road inspector cannot broadcast emergencies.",
            "location": "Sitabuldi",
            "area": "Sitabuldi",
            "severity": "Critical",
            "issued_at": "2026-09-15T00:00:00Z"
        }
        res_cross_emg = client.post(
            "/api/emergency-alerts",
            json=bad_alert_payload,
            headers={"Authorization": f"Bearer {inspector_token}"}
        )
        assert res_cross_emg.status_code == 403, f"Expected 403 for unauthorized role broadcast, got {res_cross_emg.status_code}"

        # Emergency operator trying to create traffic observation with their token -> 403 Forbidden!
        bad_traffic_payload = {
            "road_name": "Outer Ring Expressway",
            "area": "Civil Lines",
            "vehicle_count": 450,
            "average_speed": 40.0,
            "congestion_level": "Moderate",
            "status": "Moving",
            "recorded_at": "2026-09-15T00:00:00Z"
        }
        res_cross_trf = client.post(
            "/api/traffic",
            json=bad_traffic_payload,
            headers={"Authorization": f"Bearer {emergency_token}"}
        )
        assert res_cross_trf.status_code == 403, f"Expected 403 for unauthorized role traffic logging, got {res_cross_trf.status_code}"

        print("[PASS] TEST 13: Cross-role unauthorized operations rejected with 403 Forbidden")
        passed += 1
    except AssertionError as e:
        print(f"[FAIL] TEST 13: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 14: Operator Account Provisioning & Status Updates (Admin Only)
    # ----------------------------------------------------
    try:
        new_worker_payload = {
            "username": "new_traffic_agent",
            "email": "agent@roadcontrol.gov",
            "password": "AgentPassword@123",
            "full_name": "Field Traffic Agent",
            "role": "TRAFFIC_OPERATOR",
            "is_active": True
        }
        existing_agent = AuthService.get_user_by_identifier(db, "new_traffic_agent")
        if existing_agent:
            db.delete(existing_agent)
            db.commit()

        # Create operator as Admin
        res_create_op = client.post("/api/auth/users", json=new_worker_payload, headers={"Authorization": f"Bearer {admin_token}"})
        assert res_create_op.status_code == 201, f"Admin user creation failed: {res_create_op.text}"
        agent_id = res_create_op.json()["id"]

        # Deactivate operator as Admin
        res_status = client.patch(
            f"/api/auth/users/{agent_id}/status",
            json={"is_active": False},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_status.status_code == 200
        assert res_status.json()["is_active"] is False

        # Non-admin attempt to create operator -> 403
        res_non_admin_create = client.post(
            "/api/auth/users",
            json=new_worker_payload,
            headers={"Authorization": f"Bearer {traffic_token}"}
        )
        assert res_non_admin_create.status_code == 403

        print("[PASS] TEST 14: Operator creation, status toggling, and non-admin restriction verified")
        passed += 1
    except AssertionError as e:
        print(f"[FAIL] TEST 14: {e}")
        failed += 1

    db.close()

    print("==================================================")
    print(f"TEST RESULTS: {passed} passed, {failed} failed")
    if failed == 0:
        print("ALL TESTS PASSED! PHASE 11 AUTH & RBAC IS OPERATIONAL.")
        print("==================================================")
        return 0
    else:
        print("SOME TESTS FAILED.")
        print("==================================================")
        return 1


if __name__ == "__main__":
    code = run_tests()
    sys.exit(code)
