"""
Test Suite for Phase 12: Interactive GIS / Live Operations Map
--------------------------------------------------------------
Validates:
1.  GET /api/map/overview returns 200 and conforms to MapOverviewResponse schema
2.  Nagpur Command Center coordinates, zoom, and metadata
3.  Summary statistics and domain counters
4.  Feature attributes integrity (id, domain, coordinates, source, severity, status, location, metadata)
5.  All 5 core domains present (issues, traffic, emergencies, violations, risk)
6.  Filter by domain: data_type=emergency
7.  Filter by domain: data_type=traffic
8.  Filter by domain: data_type=issues
9.  Filter by domain: data_type=violations
10. Filter by domain: data_type=risk
11. Filter by area: area=Sitabuldi (case-insensitive)
12. Filter by severity: risk_level=Critical
13. Query validation: invalid data_type returns 422
14. Query validation: invalid risk_level returns 422
15. Spatial provenance: coordinate_source is explicitly tagged and never falsely claimed as exact_gps
16. Geospatial boundary sanity: coordinates fall within Nagpur metropolitan bounding zone
17. Regression check: Existing Phase 4, 6, 7, 8, 9, 10, 11 endpoints remain operational
"""

import sys
from fastapi.testclient import TestClient
from database import SessionLocal, ensure_spatial_columns
from main import app

client = TestClient(app)

def run_tests():
    passed = 0
    failed = 0

    print("==================================================")
    print("PHASE 12: INTERACTIVE GIS / LIVE OPERATIONS MAP")
    print("==================================================")

    # Ensure database columns are ready
    ensure_spatial_columns()

    # ----------------------------------------------------
    # TEST 1: GET /api/map/overview Basic Schema & Status 200
    # ----------------------------------------------------
    try:
        res = client.get("/api/map/overview")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "center" in data, "Missing 'center' key"
        assert "summary" in data, "Missing 'summary' key"
        assert "issues" in data, "Missing 'issues' key"
        assert "traffic" in data, "Missing 'traffic' key"
        assert "emergencies" in data, "Missing 'emergencies' key"
        assert "violations" in data, "Missing 'violations' key"
        assert "risk" in data, "Missing 'risk' key"
        print(f"PASS - Test 1: GET /api/map/overview returns 200 and conforms to root schema")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 1: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 2: Center Coordinates & City Metadata
    # ----------------------------------------------------
    try:
        center = data["center"]
        assert abs(center["latitude"] - 21.1458) < 0.01, f"Latitude mismatch: {center['latitude']}"
        assert abs(center["longitude"] - 79.0882) < 0.01, f"Longitude mismatch: {center['longitude']}"
        assert center["zoom"] >= 10
        assert "Nagpur" in center["city"]
        print(f"PASS - Test 2: Center configured for Nagpur Command Center ({center['latitude']}, {center['longitude']})")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 2: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 3: Summary Statistics & Aggregations
    # ----------------------------------------------------
    try:
        summary = data["summary"]
        all_features = (
            data["issues"] +
            data["traffic"] +
            data["emergencies"] +
            data["violations"] +
            data["risk"]
        )
        assert summary["total_features"] == len(all_features), "Summary total doesn't match total feature count"
        assert summary["total_features"] > 0, "Expected at least 1 feature in default overview"
        assert summary["issues_count"] == len(data["issues"])
        assert summary["traffic_count"] == len(data["traffic"])
        assert summary["emergencies_count"] == len(data["emergencies"])
        assert summary["violations_count"] == len(data["violations"])
        assert summary["risk_areas_count"] == len(data["risk"])
        domain_sum = (
            summary["issues_count"] +
            summary["traffic_count"] +
            summary["emergencies_count"] +
            summary["violations_count"] +
            summary["risk_areas_count"]
        )
        assert summary["total_features"] == domain_sum, f"Total mismatch: {summary['total_features']} vs {domain_sum}"
        print(f"PASS - Test 3: Summary counts match domain arrays exactly (Total: {summary['total_features']})")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 3: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 4: Feature Attributes & Schema Integrity
    # ----------------------------------------------------
    try:
        required_fields = [
            "id", "domain", "title", "location", "area",
            "latitude", "longitude", "coordinate_source",
            "metadata"
        ]
        sample = all_features[:15]
        for feat in sample:
            for field in required_fields:
                assert field in feat, f"Feature missing '{field}': {feat}"
            assert isinstance(feat["latitude"], (int, float)), "Latitude must be float"
            assert isinstance(feat["longitude"], (int, float)), "Longitude must be float"
            assert feat["domain"] in ["issue", "traffic", "emergency", "violation", "risk"]
        print("PASS - Test 4: Feature objects contain all required GIS schema attributes")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 4: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 5: Representation of All 5 Domains in Unfiltered View
    # ----------------------------------------------------
    try:
        assert len(data["issues"]) > 0, "No issues features"
        assert len(data["traffic"]) > 0, "No traffic features"
        assert len(data["emergencies"]) > 0, "No emergencies features"
        assert len(data["violations"]) > 0, "No violations features"
        assert len(data["risk"]) > 0, "No risk features"
        print(f"PASS - Test 5: All 5 operational domains present in map view (Issues: {len(data['issues'])}, Traffic: {len(data['traffic'])}, Emergencies: {len(data['emergencies'])}, Violations: {len(data['violations'])}, Risk: {len(data['risk'])})")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 5: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 6: Domain Filter: Emergency Alerts
    # ----------------------------------------------------
    try:
        res_emg = client.get("/api/map/overview?data_type=emergency")
        assert res_emg.status_code == 200
        d_emg = res_emg.json()
        assert len(d_emg["emergencies"]) > 0
        assert len(d_emg["traffic"]) == 0
        assert len(d_emg["issues"]) == 0
        assert len(d_emg["violations"]) == 0
        assert len(d_emg["risk"]) == 0
        assert d_emg["summary"]["emergencies_count"] == len(d_emg["emergencies"])
        assert d_emg["summary"]["total_features"] == len(d_emg["emergencies"])
        print(f"PASS - Test 6: Filter data_type=emergency returned {len(d_emg['emergencies'])} emergency features")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 6: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 7: Domain Filter: Traffic Records
    # ----------------------------------------------------
    try:
        res_trf = client.get("/api/map/overview?data_type=traffic")
        assert res_trf.status_code == 200
        d_trf = res_trf.json()
        assert len(d_trf["traffic"]) > 0
        assert len(d_trf["emergencies"]) == 0
        assert len(d_trf["issues"]) == 0
        assert len(d_trf["violations"]) == 0
        assert len(d_trf["risk"]) == 0
        assert d_trf["summary"]["traffic_count"] == len(d_trf["traffic"])
        print(f"PASS - Test 7: Filter data_type=traffic returned {len(d_trf['traffic'])} traffic features")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 7: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 8: Domain Filter: Road Issues
    # ----------------------------------------------------
    try:
        res_iss = client.get("/api/map/overview?data_type=issues")
        assert res_iss.status_code == 200
        d_iss = res_iss.json()
        assert len(d_iss["issues"]) > 0
        assert len(d_iss["traffic"]) == 0
        assert len(d_iss["emergencies"]) == 0
        assert len(d_iss["violations"]) == 0
        assert len(d_iss["risk"]) == 0
        assert d_iss["summary"]["issues_count"] == len(d_iss["issues"])
        print(f"PASS - Test 8: Filter data_type=issues returned {len(d_iss['issues'])} issue features")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 8: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 9: Domain Filter: Traffic Violations
    # ----------------------------------------------------
    try:
        res_vio = client.get("/api/map/overview?data_type=violations")
        assert res_vio.status_code == 200
        d_vio = res_vio.json()
        assert len(d_vio["violations"]) > 0
        assert len(d_vio["traffic"]) == 0
        assert len(d_vio["emergencies"]) == 0
        assert len(d_vio["issues"]) == 0
        assert len(d_vio["risk"]) == 0
        assert d_vio["summary"]["violations_count"] == len(d_vio["violations"])
        print(f"PASS - Test 9: Filter data_type=violations returned {len(d_vio['violations'])} violation features")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 9: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 10: Domain Filter: Risk Zones
    # ----------------------------------------------------
    try:
        res_rsk = client.get("/api/map/overview?data_type=risk")
        assert res_rsk.status_code == 200
        d_rsk = res_rsk.json()
        assert len(d_rsk["risk"]) > 0
        assert len(d_rsk["traffic"]) == 0
        assert len(d_rsk["emergencies"]) == 0
        assert len(d_rsk["issues"]) == 0
        assert len(d_rsk["violations"]) == 0
        assert d_rsk["summary"]["risk_areas_count"] == len(d_rsk["risk"])
        print(f"PASS - Test 10: Filter data_type=risk returned {len(d_rsk['risk'])} risk area features")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 10: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 11: Area Filter (e.g. Sitabuldi)
    # ----------------------------------------------------
    try:
        res_area = client.get("/api/map/overview?area=Sitabuldi")
        assert res_area.status_code == 200
        d_area = res_area.json()
        area_features = (
            d_area["issues"] +
            d_area["traffic"] +
            d_area["emergencies"] +
            d_area["violations"] +
            d_area["risk"]
        )
        assert len(area_features) > 0, "Expected features in Sitabuldi"
        for f in area_features:
            area_str = (f.get("area") or "") + " " + (f.get("location") or "")
            assert "sitabuldi" in area_str.lower(), f"Area mismatch: {f}"
        print(f"PASS - Test 11: Filter area=Sitabuldi returned {len(area_features)} features, all matching area")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 11: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 12: Severity Filter (risk_level=Critical)
    # ----------------------------------------------------
    try:
        res_sev = client.get("/api/map/overview?risk_level=Critical")
        assert res_sev.status_code == 200
        d_sev = res_sev.json()
        sev_features = (
            d_sev["issues"] +
            d_sev["traffic"] +
            d_sev["emergencies"] +
            d_sev["violations"] +
            d_sev["risk"]
        )
        assert len(sev_features) > 0, "Expected at least 1 critical feature"
        for f in sev_features:
            assert f.get("severity") == "Critical" or f.get("risk_level") == "Critical", f"Severity mismatch: {f}"
        print(f"PASS - Test 12: Filter risk_level=Critical returned {len(sev_features)} critical features")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 12: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 13: Query Validation - Invalid data_type returns 422
    # ----------------------------------------------------
    try:
        res_bad_dt = client.get("/api/map/overview?data_type=spaceships")
        assert res_bad_dt.status_code == 422, f"Expected 422, got {res_bad_dt.status_code}"
        err = res_bad_dt.json()
        assert "detail" in err
        print(f"PASS - Test 13: Invalid data_type returned 422 Unprocessable Entity")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 13: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 14: Query Validation - Invalid risk_level returns 422
    # ----------------------------------------------------
    try:
        res_bad_rl = client.get("/api/map/overview?risk_level=Apocalyptic")
        assert res_bad_rl.status_code == 422, f"Expected 422, got {res_bad_rl.status_code}"
        err = res_bad_rl.json()
        assert "detail" in err
        print(f"PASS - Test 14: Invalid risk_level returned 422 Unprocessable Entity")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 14: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 15: Spatial Provenance & Honest Coordinate Source
    # ----------------------------------------------------
    try:
        allowed_sources = {
            "exact_gps",
            "configured_reference",
            "configured_corridor",
            "area_centroid",
            "unmapped"
        }
        sources_found = set()
        for f in all_features:
            source = f["coordinate_source"]
            assert source in allowed_sources, f"Unknown coordinate source: {source}"
            sources_found.add(source)
            if source == "exact_gps":
                assert f["metadata"].get("gps_fixed") is True, "False exact_gps claim detected"
        print(f"PASS - Test 15: Spatial provenance verified across features. Sources detected: {sources_found}")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 15: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 16: Geospatial Perimeter Sanity (Nagpur Region)
    # ----------------------------------------------------
    try:
        # Separate mapped features from unmapped features per spatial provenance contract
        mapped_features = [f for f in all_features if f["coordinate_source"] != "unmapped"]
        unmapped_features = [f for f in all_features if f["coordinate_source"] == "unmapped"]

        # 1. Verify unmapped records legitimately have None coordinates (honest provenance contract)
        for f in unmapped_features:
            assert f["latitude"] is None and f["longitude"] is None, f"Unmapped feature {f['title']} has non-null coordinates"

        # 2. Bounding box for greater Nagpur municipal region: ~21.0 to 21.3 N, ~78.9 to 79.3 E
        assert len(mapped_features) > 0, "Expected at least one mapped feature in Nagpur"
        for f in mapped_features:
            lat = f["latitude"]
            lng = f["longitude"]
            assert lat is not None and 21.0 <= lat <= 21.3, f"Latitude out of bounds ({lat}) for {f['title']}"
            assert lng is not None and 78.9 <= lng <= 79.3, f"Longitude out of bounds ({lng}) for {f['title']}"
        print("PASS - Test 16: All mapped feature coordinates lie safely within the Nagpur metropolitan perimeter")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 16: {e}")
        failed += 1

    # ----------------------------------------------------
    # TEST 17: Full Regression Check Across Previous Phases
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

        # Phase 11: Auth Health / Operator login
        r_auth = client.post("/api/auth/login", json={"username": "admin", "password": "AdminPassword@123"})
        assert r_auth.status_code == 200, f"Auth login failed: {r_auth.status_code}"

        print("PASS - Test 17: Regression check passed (Phases 4, 6, 7, 8, 9, 10, 11 endpoints fully functional)")
        passed += 1
    except AssertionError as e:
        print(f"FAIL - Test 17: {e}")
        failed += 1

    # ----------------------------------------------------
    # SUMMARY
    # ----------------------------------------------------
    print("==================================================")
    print(f"PHASE 12 RESULTS: {passed} PASSED, {failed} FAILED")
    print("==================================================")

    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
