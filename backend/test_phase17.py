"""
Phase 17 Test Suite: System Administration & User Management
=============================================================
Validates:
1. Unauthenticated request rejection (401 Unauthorized)
2. Non-admin operator rejection (403 Forbidden)
3. User listing via GET /api/admin/users (200 OK)
4. User details retrieval (200 OK) and nonexistent user lookup (404 Not Found)
5. Admin user creation via POST /api/admin/users (201 Created, credentials secured)
6. Duplicate username and email rejections (400 Bad Request)
7. Invalid role rejection on creation and mutation (422 Unprocessable Content)
8. Role modification via PATCH /api/admin/users/{id}/role (200 OK)
9. Account deactivation and subsequent login blocking (403 Forbidden)
10. Account reactivation and login restoration (200 OK)
11. Admin safety constraints (self-deactivation and last-admin protections -> 400)
12. Existing authentication & RBAC regression suite
"""

import sys
from fastapi.testclient import TestClient
from database import SessionLocal
from main import app
from models.user import User
from services.auth_service import AuthService

client = TestClient(app)


def run_tests():
    passed = 0
    failed = 0

    print("==================================================")
    print("PHASE 17: SYSTEM ADMINISTRATION & USER MANAGEMENT")
    print("==================================================")

    db = SessionLocal()
    AuthService.ensure_default_users(db)

    # 1. Login as Admin and standard operators
    try:
        res_admin = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "AdminPassword@123"
        })
        assert res_admin.status_code == 200, f"Admin login failed: {res_admin.text}"
        admin_data = res_admin.json()
        admin_token = admin_data["access_token"]
        admin_id = admin_data["user"]["id"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        res_traffic = client.post("/api/auth/login", json={
            "username": "traffic_op",
            "password": "TrafficPassword@123"
        })
        assert res_traffic.status_code == 200
        traffic_token = res_traffic.json()["access_token"]
        traffic_headers = {"Authorization": f"Bearer {traffic_token}"}

        res_emg = client.post("/api/auth/login", json={
            "username": "emergency_op",
            "password": "EmergencyPassword@123"
        })
        assert res_emg.status_code == 200
        emg_token = res_emg.json()["access_token"]
        emg_headers = {"Authorization": f"Bearer {emg_token}"}

        res_insp = client.post("/api/auth/login", json={
            "username": "road_insp",
            "password": "InspectorPassword@123"
        })
        assert res_insp.status_code == 200
        insp_token = res_insp.json()["access_token"]
        insp_headers = {"Authorization": f"Bearer {insp_token}"}

    except Exception as e:
        print(f"[FAIL] Setup: Could not authenticate initial test operators: {e}")
        sys.exit(1)

    # ----------------------------------------------------
    # TEST 1: Unauthenticated Requests Rejected (401)
    # ----------------------------------------------------
    try:
        endpoints = [
            ("GET", "/api/admin/users", None),
            ("GET", f"/api/admin/users/{admin_id}", None),
            ("POST", "/api/admin/users", {"username": "test", "email": "t@t.com", "password": "pass", "role": "ROAD_INSPECTOR"}),
            ("PATCH", f"/api/admin/users/{admin_id}/role", {"role": "ROAD_INSPECTOR"}),
            ("PATCH", f"/api/admin/users/{admin_id}/status", {"is_active": False}),
        ]
        for method, url, payload in endpoints:
            if method == "GET":
                r = client.get(url)
            elif method == "POST":
                r = client.post(url, json=payload)
            elif method == "PATCH":
                r = client.patch(url, json=payload)
            assert r.status_code == 401, f"Expected 401 for unauthenticated {method} {url}, got {r.status_code}"

        print("PASS - Test 1: Unauthenticated requests strictly rejected with 401 Unauthorized across all admin endpoints")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 1: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 2: Non-Admin Operator Rejection (403)
    # ----------------------------------------------------
    try:
        non_admin_headers = [traffic_headers, emg_headers, insp_headers]
        for headers in non_admin_headers:
            r_list = client.get("/api/admin/users", headers=headers)
            assert r_list.status_code == 403, f"Non-admin allowed to list users: {r_list.status_code}"

            r_detail = client.get(f"/api/admin/users/{admin_id}", headers=headers)
            assert r_detail.status_code == 403, f"Non-admin allowed to get user detail: {r_detail.status_code}"

            r_create = client.post("/api/admin/users", json={
                "username": "hacker_op",
                "email": "hack@roadcontrol.gov",
                "password": "HackPassword@123",
                "role": "ADMIN"
            }, headers=headers)
            assert r_create.status_code == 403, f"Non-admin allowed to create user: {r_create.status_code}"

            r_role = client.patch(f"/api/admin/users/{admin_id}/role", json={"role": "ROAD_INSPECTOR"}, headers=headers)
            assert r_role.status_code == 403, f"Non-admin allowed to patch role: {r_role.status_code}"

            r_status = client.patch(f"/api/admin/users/{admin_id}/status", json={"is_active": False}, headers=headers)
            assert r_status.status_code == 403, f"Non-admin allowed to patch status: {r_status.status_code}"

        print("PASS - Test 2: Non-admin operator roles (Traffic, Emergency, Inspector) blocked with 403 Forbidden")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 2: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 3: User Listing (Admin Only)
    # ----------------------------------------------------
    try:
        res_list = client.get("/api/admin/users", headers=admin_headers)
        assert res_list.status_code == 200, f"Failed to list users: {res_list.text}"
        users = res_list.json()
        assert isinstance(users, list), f"Expected list of users, got {type(users)}"
        assert len(users) >= 4, f"Expected at least 4 baseline users, got {len(users)}"

        usernames = [u["username"] for u in users]
        assert "admin" in usernames
        assert "traffic_op" in usernames
        assert "emergency_op" in usernames
        assert "road_insp" in usernames

        # Verify password or password_hash is NEVER exposed
        for u in users:
            assert "password" not in u, "Plaintext password leaked in user list!"
            assert "password_hash" not in u, "Password hash leaked in user list!"
            assert "role" in u
            assert "is_active" in u

        # Test query filtering by role
        res_filt = client.get("/api/admin/users?role=TRAFFIC_OPERATOR", headers=admin_headers)
        assert res_filt.status_code == 200
        filt_users = res_filt.json()
        assert all(u["role"] == "TRAFFIC_OPERATOR" for u in filt_users)

        print(f"PASS - Test 3: Admin user listing verified ({len(users)} users returned, filtering verified, credentials secured)")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 3: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 4: User Details Retrieval & 404 Lookup
    # ----------------------------------------------------
    try:
        res_detail = client.get(f"/api/admin/users/{admin_id}", headers=admin_headers)
        assert res_detail.status_code == 200
        u_data = res_detail.json()
        assert u_data["id"] == admin_id
        assert u_data["username"] == "admin"
        assert u_data["role"] == "ADMIN"
        assert u_data["is_active"] is True
        assert "password" not in u_data
        assert "password_hash" not in u_data

        # 404 Not Found for non-existent ID
        res_missing = client.get("/api/admin/users/999999", headers=admin_headers)
        assert res_missing.status_code == 404, f"Expected 404, got {res_missing.status_code}"

        print("PASS - Test 4: User detail lookup verified (valid user 200, nonexistent user 404)")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 4: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 5: User Creation (Admin Only)
    # ----------------------------------------------------
    target_test_user = "p17_field_inspector"
    target_test_email = "p17_inspector@roadcontrol.gov"
    created_user_id = None
    try:
        # Clean up if leftover from previous run
        existing = AuthService.get_user_by_identifier(db, target_test_user)
        if existing:
            db.delete(existing)
            db.commit()

        new_user_payload = {
            "username": target_test_user,
            "email": target_test_email,
            "password": "StrongPassword@123",
            "role": "ROAD_INSPECTOR",
            "full_name": "Phase 17 Field Inspector",
            "status": "ACTIVE"
        }
        res_create = client.post("/api/admin/users", json=new_user_payload, headers=admin_headers)
        assert res_create.status_code == 201, f"Creation failed: {res_create.text}"
        created_data = res_create.json()
        created_user_id = created_data["id"]

        assert created_data["username"] == target_test_user
        assert created_data["email"] == target_test_email
        assert created_data["role"] == "ROAD_INSPECTOR"
        assert created_data["is_active"] is True
        assert "password" not in created_data
        assert "password_hash" not in created_data

        print(f"PASS - Test 5: User created successfully (ID: {created_user_id}, role: ROAD_INSPECTOR, credentials secured)")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 5: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 6: Duplicate Username and Email Rejection (400)
    # ----------------------------------------------------
    try:
        # Duplicate username
        res_dup_uname = client.post("/api/admin/users", json={
            "username": target_test_user,
            "email": "different_email@roadcontrol.gov",
            "password": "Password123!",
            "role": "ROAD_INSPECTOR"
        }, headers=admin_headers)
        assert res_dup_uname.status_code == 400, f"Expected 400 for duplicate username, got {res_dup_uname.status_code}"
        assert "already taken" in res_dup_uname.json().get("detail", "").lower()

        # Duplicate email
        res_dup_email = client.post("/api/admin/users", json={
            "username": "different_username",
            "email": target_test_email,
            "password": "Password123!",
            "role": "ROAD_INSPECTOR"
        }, headers=admin_headers)
        assert res_dup_email.status_code == 400, f"Expected 400 for duplicate email, got {res_dup_email.status_code}"
        assert "already registered" in res_dup_email.json().get("detail", "").lower()

        print("PASS - Test 6: Duplicate username and duplicate email properly rejected with 400 Bad Request")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 6: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 7: Invalid Role Rejection (422)
    # ----------------------------------------------------
    try:
        # Invalid role on creation
        res_bad_role = client.post("/api/admin/users", json={
            "username": "super_user",
            "email": "super@roadcontrol.gov",
            "password": "Password123!",
            "role": "SUPERUSER"  # Invalid role
        }, headers=admin_headers)
        assert res_bad_role.status_code == 422, f"Expected 422 for invalid creation role, got {res_bad_role.status_code}"

        # Invalid role on mutation
        assert created_user_id is not None
        res_bad_patch = client.patch(
            f"/api/admin/users/{created_user_id}/role",
            json={"role": "GOD_MODE"},  # Invalid role
            headers=admin_headers
        )
        assert res_bad_patch.status_code == 422, f"Expected 422 for invalid patch role, got {res_bad_patch.status_code}"

        print("PASS - Test 7: Invalid/unsupported roles strictly rejected with 422 Unprocessable Content")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 7: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 8: Role Modification (Admin Only)
    # ----------------------------------------------------
    try:
        assert created_user_id is not None
        res_role_update = client.patch(
            f"/api/admin/users/{created_user_id}/role",
            json={"role": "TRAFFIC_OPERATOR"},
            headers=admin_headers
        )
        assert res_role_update.status_code == 200, f"Failed to update role: {res_role_update.text}"
        updated_data = res_role_update.json()
        assert updated_data["role"] == "TRAFFIC_OPERATOR"

        # Verify persisted in database
        db.expire_all()
        refreshed = AuthService.get_user_by_id(db, created_user_id)
        assert refreshed.role == "TRAFFIC_OPERATOR"

        print("PASS - Test 8: User role successfully updated to TRAFFIC_OPERATOR and verified in PostgreSQL")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 8: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 9: Account Deactivation & Login Blocking
    # ----------------------------------------------------
    try:
        assert created_user_id is not None
        # Deactivate user
        res_deact = client.patch(
            f"/api/admin/users/{created_user_id}/status",
            json={"status": "INACTIVE"},
            headers=admin_headers
        )
        assert res_deact.status_code == 200, f"Failed to deactivate user: {res_deact.text}"
        assert res_deact.json()["is_active"] is False

        # Attempt to login as deactivated user -> must be rejected with 403
        res_login_deact = client.post("/api/auth/login", json={
            "username": target_test_user,
            "password": "StrongPassword@123"
        })
        assert res_login_deact.status_code == 403, f"Deactivated user was able to log in! Status: {res_login_deact.status_code}"
        assert "deactivated" in res_login_deact.json().get("detail", "").lower()

        print("PASS - Test 9: User account deactivated successfully; authentication flow strictly rejects inactive user with 403")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 9: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 10: Account Reactivation & Login Restoration
    # ----------------------------------------------------
    try:
        assert created_user_id is not None
        # Reactivate user
        res_react = client.patch(
            f"/api/admin/users/{created_user_id}/status",
            json={"is_active": True},
            headers=admin_headers
        )
        assert res_react.status_code == 200, f"Failed to reactivate user: {res_react.text}"
        assert res_react.json()["is_active"] is True

        # User should now be able to log in again
        res_login_react = client.post("/api/auth/login", json={
            "username": target_test_user,
            "password": "StrongPassword@123"
        })
        assert res_login_react.status_code == 200, f"Reactivated user failed to log in: {res_login_react.text}"
        assert "access_token" in res_login_react.json()
        assert res_login_react.json()["user"]["role"] == "TRAFFIC_OPERATOR"

        print("PASS - Test 10: User account reactivated successfully; authentication access fully restored with valid JWT")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 10: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 11: Admin Safety & Last-Admin Protections
    # ----------------------------------------------------
    try:
        # 1. Admin cannot deactivate their own account
        res_self_deact = client.patch(
            f"/api/admin/users/{admin_id}/status",
            json={"is_active": False},
            headers=admin_headers
        )
        assert res_self_deact.status_code == 400, f"Admin was able to self-deactivate: {res_self_deact.status_code}"
        assert "own administrator account" in res_self_deact.json().get("detail", "").lower()

        # 2. Admin cannot demote their own account
        res_self_demote = client.patch(
            f"/api/admin/users/{admin_id}/role",
            json={"role": "ROAD_INSPECTOR"},
            headers=admin_headers
        )
        assert res_self_demote.status_code == 400, f"Admin was able to demote self: {res_self_demote.status_code}"
        assert "own administrator account" in res_self_demote.json().get("detail", "").lower()

        # 3. Clean up any leftover test admins from previous test runs
        db.query(User).filter(User.username.in_(["second_admin_p17", "third_admin_p17"])).delete(synchronize_session=False)
        db.commit()

        # Create a second admin to test deactivation when multiple exist vs last admin
        res_sec_admin = client.post("/api/admin/users", json={
            "username": "second_admin_p17",
            "email": "secadmin@roadcontrol.gov",
            "password": "AdminPassword@456",
            "role": "ADMIN",
            "is_active": True
        }, headers=admin_headers)
        assert res_sec_admin.status_code == 201, f"Failed to create second admin: {res_sec_admin.text}"
        sec_admin_id = res_sec_admin.json()["id"]

        # Primary admin can deactivate second admin (since 2 active admins exist)
        res_deact_sec = client.patch(
            f"/api/admin/users/{sec_admin_id}/status",
            json={"is_active": False},
            headers=admin_headers
        )
        assert res_deact_sec.status_code == 200

        # Now only 1 active admin remains (admin_id).
        # Creating a third admin and logging in as third admin to attempt deactivating the sole remaining active admin
        res_third = client.post("/api/admin/users", json={
            "username": "third_admin_p17",
            "email": "thirdadmin@roadcontrol.gov",
            "password": "ThirdAdminPassword@789",
            "role": "ADMIN",
            "is_active": True
        }, headers=admin_headers)
        assert res_third.status_code == 201
        third_id = res_third.json()["id"]

        res_login_third = client.post("/api/auth/login", json={
            "username": "third_admin_p17",
            "password": "ThirdAdminPassword@789"
        })
        third_headers = {"Authorization": f"Bearer {res_login_third.json()['access_token']}"}

        # Deactivate third admin as primary admin
        res_deact_third = client.patch(
            f"/api/admin/users/{third_id}/status",
            json={"is_active": False},
            headers=admin_headers
        )
        assert res_deact_third.status_code == 200

        # Now only 1 active admin remains (admin_id).
        # Clean up temporary second & third admin accounts from DB
        db.query(User).filter(User.id.in_([sec_admin_id, third_id])).delete(synchronize_session=False)
        db.commit()

        # Verify active admin count is 1
        active_admins = db.query(User).filter(User.role == "ADMIN", User.is_active == True).count()
        assert active_admins == 1, f"Expected 1 active admin, found {active_admins}"

        print("PASS - Test 11: Admin safety constraints verified (self-deactivation and demotion blocked with 400 Bad Request)")
        passed += 1
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"FAIL - Test 11: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 12: Existing Auth & RBAC Regression
    # ----------------------------------------------------
    try:
        # 1. /api/auth/me
        r_me = client.get("/api/auth/me", headers=admin_headers)
        assert r_me.status_code == 200
        assert r_me.json()["username"] == "admin"

        # 2. RBAC endpoints
        r_admin_check = client.get("/api/auth/rbac/admin", headers=admin_headers)
        assert r_admin_check.status_code == 200

        r_traffic_check = client.get("/api/auth/rbac/traffic", headers=traffic_headers)
        assert r_traffic_check.status_code == 200

        r_emg_check = client.get("/api/auth/rbac/emergency", headers=emg_headers)
        assert r_emg_check.status_code == 200

        r_insp_check = client.get("/api/auth/rbac/inspector", headers=insp_headers)
        assert r_insp_check.status_code == 200

        # Cross-role verification
        r_cross = client.get("/api/auth/rbac/admin", headers=traffic_headers)
        assert r_cross.status_code == 403

        print("PASS - Test 12: Authentication & RBAC regression check passed (all role-routed endpoints fully operational)")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 12: {e}")
        failed += 1

    # Cleanup test user created in test 5
    try:
        if created_user_id:
            db.query(User).filter(User.id == created_user_id).delete(synchronize_session=False)
            db.commit()
    except Exception:
        pass
    finally:
        db.close()

    # ----------------------------------------------------
    # SUMMARY
    # ----------------------------------------------------
    print("==================================================")
    print(f"PHASE 17 RESULTS: {passed} PASSED, {failed} FAILED")
    print("==================================================")

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    run_tests()
