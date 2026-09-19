# 🚦 Road System Control — Municipal Operations Platform

[![Status](https://img.shields.io/badge/Status-Phase%2017%20Completed-success.svg)]()
[![Branch](https://img.shields.io/badge/Branch-develop-blue.svg)]()
[![Tests](https://img.shields.io/badge/Tests-151%2F151%20Passed-brightgreen.svg)]()
[![Python](https://img.shields.io/badge/Python-3.13-blue.svg)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-teal.svg)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-ACID-blue.svg)]()
[![Leaflet](https://img.shields.io/badge/GIS-Offline%20Leaflet%201.9.4-green.svg)]()

Road System Control is a production-grade municipal traffic intelligence, hazard response, and field operations platform. Built with Python 3.13, FastAPI, PostgreSQL, and an offline-first Leaflet GIS engine, the platform unifies real-time traffic monitoring, road hazard reporting, automated radar camera violations, explainable multi-domain risk evaluation, role-routed operational notifications, closed-loop work order dispatching, and administrative governance under strict Role-Based Access Control (RBAC).

> 📖 **Comprehensive Technical Documentation**: For the exhaustive 22-section architecture manual, API specifications, mathematical risk formulation, and database schemas, see [docs/PROJECT_DOCUMENTATION.md](file:///E:/road-system-control/docs/PROJECT_DOCUMENTATION.md).

---

## 📌 Problem Statement & Core Value

Traditional municipal roadway management is fragmented and reactive:
- Civic road hazards (potholes, structural damage) remain unaddressed until citizen complaints escalate.
- Traffic congestion sensors, police speed cameras, and emergency dispatch centers operate on isolated software without unified identifiers.
- Hazard remediation lacks accountability: field work orders lack deterministic Service Level Agreements (SLAs), and closed-loop verification between repairs and hazard resolution is missing.
- Spatial visualization often relies on hallucinated or ungrounded coordinates.

**Road System Control** eliminates cross-department latency by providing an authoritative, ACID-compliant relational command center connecting field inspectors, emergency dispatchers, traffic desk operators, and administrators in real time.

---

## 🚀 Key Platform Capabilities

- **Road Hazard Reporting**: End-to-end civic defect logging with status lifecycles and PostgreSQL persistence.
- **Traffic Telemetry & Flow Monitoring**: Live highway corridor speeds, vehicle throughput, and congestion ratings.
- **Emergency Alert Dispatch**: Multi-severity broadcast management with status progressions (`Active` &rarr; `Investigating` &rarr; `Resolved`).
- **Traffic Violation Management**: Automated radar camera infraction logging, fine calculation, and review workflows.
- **Cross-Domain Analytics**: Correlation between congestion, road hazards, camera infractions, and emergencies.
- **Explainable AI Risk & Incident Intelligence**: Transparent 0–100 risk scoring synthesizing 4 operational domains without black-box ML hallucination.
- **Interactive GIS Operations Map**: 100% offline-capable Leaflet GIS canvas plotting incidents with honest spatial provenance tracking.
- **Role-Routed Notifications**: Operational escalation alerts with duplicate suppression and acknowledgement lifecycles.
- **Field Work Orders & Incident Dispatch**: SLA deadline tracking, crew mobilization, and atomic closed-loop hazard auto-resolution.
- **System Administration & Governance**: Operator provisioning, role reassignment, and administrative safety guards against self-deactivation or last-admin demotion.

---

## 🛠 Tech Stack

- **Backend**: Python 3.13, FastAPI (ASGI via Uvicorn), SQLAlchemy 2.0 ORM, Pydantic V2
- **Database**: PostgreSQL (ACID relational storage, raw SQL sequence migration helpers)
- **Frontend**: Vanilla HTML5, Modern CSS3 (Dark mode, glassmorphism), Vanilla JavaScript (ES6+, Zero framework bloat)
- **GIS Engine**: Leaflet 1.9.4 (100% offline vendored in `frontend/vendor/leaflet/`, zero CDN dependency)
- **Security**: JWT Bearer Tokens (HMAC-SHA256), Passlib Bcrypt password hashing, Granular RBAC
- **Testing**: Starlette TestClient, 12 modular automated regression suites (151 / 151 tests passing)

---

## 📂 Project Structure

```
road-system-control/
├── backend/
│   ├── dependencies/
│   │   └── auth.py                  # JWT decoding, get_current_user, require_roles, require_admin
│   ├── models/
│   │   ├── __init__.py              # ORM entity exports
│   │   ├── user.py                  # 'users' table
│   │   ├── issue.py                 # 'issues' table
│   │   ├── traffic.py               # 'traffic_records' table
│   │   ├── emergency_alert.py       # 'emergency_alerts' table
│   │   ├── traffic_violation.py     # 'traffic_violations' table
│   │   ├── notification.py          # 'notifications' table
│   │   └── work_order.py            # 'work_orders' table
│   ├── routes/
│   │   ├── auth.py                  # /api/auth (Login, session profile, RBAC checks)
│   │   ├── admin.py                 # /api/admin/users (System administration, roles, status)
│   │   ├── issues.py                # /api/issues
│   │   ├── traffic.py               # /api/traffic
│   │   ├── emergency_alerts.py      # /api/emergency-alerts
│   │   ├── traffic_violations.py    # /api/traffic-violations
│   │   ├── analytics.py             # /api/analytics
│   │   ├── risk.py                  # /api/risk
│   │   ├── map.py                   # /api/map
│   │   ├── notifications.py         # /api/notifications
│   │   └── work_orders.py           # /api/work-orders
│   ├── schemas/
│   │   ├── user.py                  # Login, UserResponse, AdminUserCreate, UserRoleUpdate
│   │   ├── issue.py                 # IssueCreate, IssueResponse
│   │   ├── traffic.py               # TrafficCreate, TrafficResponse, TrafficSummary
│   │   ├── emergency_alert.py       # EmergencyAlertCreate, EmergencyAlertResponse
│   │   ├── traffic_violation.py     # TrafficViolationCreate, TrafficViolationResponse
│   │   ├── analytics.py             # AnalyticsOverview, TrendAnalytics
│   │   ├── risk.py                  # RiskOverview, AreaRiskEvaluation
│   │   ├── map.py                   # MapFeatureRecord, MapOverviewResponse, MapSummary
│   │   ├── notification.py          # NotificationCreate, NotificationResponse
│   │   └── work_order.py            # WorkOrderCreate, WorkOrderStatusUpdate, WorkOrderResponse
│   ├── services/
│   │   ├── auth_service.py          # Bcrypt hashing, JWT generation, baseline user seeding
│   │   ├── issue_service.py         # Issue persistence & sequential ID generator
│   │   ├── traffic_service.py       # Traffic flow telemetry persistence & summary engine
│   │   ├── emergency_alert_service.py # Alert persistence & status transitions
│   │   ├── traffic_violation_service.py # Violation logging & fine calculations
│   │   ├── analytics_service.py     # Cross-domain aggregation & statistical metrics
│   │   ├── risk_service.py          # Deterministic multi-domain risk evaluation engine
│   │   ├── map_service.py           # Coordinate resolution, GIS spatial layers & provenance
│   │   ├── notification_service.py  # Role routing, deduplication & operational sync
│   │   └── work_order_service.py    # SLA engine, state transitions & closed-loop resolution
│   ├── database.py                  # SQLAlchemy engine, session maker & schema migration helpers
│   ├── main.py                      # FastAPI application, CORS, router registrations, health check
│   ├── requirements.txt             # Minimal Python dependencies
│   ├── seed_users.py                # Baseline operator seed script
│   ├── seed_traffic.py              # Baseline traffic records seed script
│   ├── seed_emergency_alerts.py     # Baseline emergency alerts seed script
│   ├── seed_traffic_violations.py   # Baseline traffic violations seed script
│   ├── test_phase4.py ... test_phase17.py # 12 automated verification suites (151 tests)
├── frontend/
│   ├── index.html                   # Municipal SPA layout, dashboards, tables, modal drawers
│   ├── script.js                    # Complete Vanilla JS controller, API integration, Leaflet controller
│   ├── style.css                    # Custom responsive styling, dark mode, design tokens
│   └── vendor/
│       └── leaflet/                 # Offline vendored Leaflet 1.9.4 CSS, JS, and image assets
├── docs/
│   └── PROJECT_DOCUMENTATION.md     # Exhaustive 22-section project documentation manual
├── .env.example                     # Environment template
├── readme.md                        # Project root README
└── .gitignore
```

---

## 🔄 Completed Development Roadmap (Phases 1–17)

- **Phase 1**: Frontend Foundation (UI, layout, responsive design) — *Completed*
- **Phase 2**: Road Issue Reporting (Frontend validation, form, localStorage) — *Completed*
- **Phase 3**: FastAPI REST API Foundation (In-memory issue storage) — *Completed*
- **Phase 4**: PostgreSQL Database Persistence (SQLAlchemy ORM + PostgreSQL) — *Completed*
- **Phase 5**: Frontend ↔ FastAPI ↔ PostgreSQL Integration — *Completed*
- **Phase 6**: Traffic Monitoring (Full-stack telemetry, PostgreSQL, summary API, polling) — *Completed*
- **Phase 7**: Emergency Alert Management (Full-stack incident dispatch, PostgreSQL, lifecycle management) — *Completed*
- **Phase 8**: Traffic Violation Management (Rule violations, automated radar tracking, penalties, PostgreSQL) — *Completed*
- **Phase 9**: Traffic Analytics & Intelligence Dashboard (Cross-domain KPIs, trends, PostgreSQL analysis) — *Completed*
- **Phase 10**: AI Risk & Incident Intelligence (0–100 explainable risk scoring, multi-domain hazard synthesis, tactical directives) — *Completed*
- **Phase 11**: Authentication & Role-Based Access Control (Operator accounts, bcrypt hashing, JWT Bearer tokens, Admin management) — *Completed*
- **Phase 12**: Interactive GIS / Live Operations Map (Offline-first Leaflet GIS, 5 cross-domain spatial layers, honest coordinate provenance, tactical drawer) — *Completed*
- **Phase 13**: Notifications & Operational Escalation (Role-routed escalation, duplicate suppression, acknowledgement lifecycle, cross-domain operational sync) — *Completed*
- **Phase 14**: Field Work Orders & Incident Dispatch Operations (SLA tracking, crew mobilization, closed-loop resolution, RBAC) — *Completed*
- **Phase 15**: Architectural Inspection & Stabilization (Audit, zero-duplication enforcement) — *Completed*
- **Phase 16**: Operational Work Order Management UI (Complete Work Orders frontend, KPI summary, multi-parameter filters, modal inspection, GIS layer) — *Completed*
- **Phase 17**: System Administration & User Governance (ADMIN-only user management, role modification, status toggles, last-admin & self-safety guards) — **Completed**

---

## 🔗 Phase 5: Full-Stack Integration Architecture

PostgreSQL and FastAPI serve as the authoritative **SOURCE OF TRUTH** for road issue reporting:

```
[ User in Browser ]
        │
        ▼ (HTML / CSS / JavaScript)
[ Vanilla JS fetch() API ]
        │
        ▼ (HTTP JSON via API_BASE_URL = http://127.0.0.1:8000/api)
[ FastAPI REST Endpoints ]
        │
        ▼ (Pydantic Validation & ID Generation)
[ SQLAlchemy ORM Session ]
        │
        ▼ (psycopg2-binary SQL queries)
[ PostgreSQL Database ('issues' table) ]
        │
        ▼ (Returned record with backend ID & status)
[ Browser Dashboard & Recent Issues Table Updates ]
```

---

## ⚙️ Running the Full Application Locally

### 1. Database Setup
Ensure PostgreSQL is running locally with the target database:
```sql
CREATE DATABASE road_system_control;
```

Configure `.env` from `.env.example`:
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/road_system_control
```

### 2. Start the FastAPI Backend (Terminal 1)
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```
- Backend API: `http://127.0.0.1:8000`
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`
- Redoc: `http://127.0.0.1:8000/redoc`

### 3. Start the Frontend Web Server (Terminal 2)
```bash
cd frontend
python -m http.server 5500
```
Open your browser at:
**`http://127.0.0.1:5500`**

---

## 📡 API Endpoints Used by Frontend

| Method | Endpoint | Description | Frontend Consumer |
|---|---|---|---|
| `GET` | `/api/health` | Service health status check | `checkBackendHealth()` — updates header status indicator |
| `GET` | `/api/issues` | Retrieve all issues (newest first) | `loadIssues()` — populates metrics & recent issues table |
| `POST` | `/api/issues` | Create a new issue in PostgreSQL | `reportIssueForm` submit — generates `ISS-XXXX` & returns 201 |
| `GET` | `/api/issues/{id}`| Fetch specific issue details | Available for detail viewing |
| `GET` | `/api/traffic` | Retrieve all traffic records (newest first) | `loadTraffic()` — populates telemetry table & dashboard |
| `GET` | `/api/traffic/summary` | Retrieve aggregate metrics (vehicles, avg speed, congestion) | `loadTraffic()` — updates 4 traffic summary cards |
| `POST` | `/api/traffic` | Record traffic observation in PostgreSQL | Sensor ingestion endpoint — returns 201 with `TRF-XXXX` |
| `GET` | `/api/traffic/{id}`| Fetch specific traffic observation | Returns individual traffic record or 404 |
| `GET` | `/api/emergency-alerts` | Retrieve all emergency alerts (optional `?status=` filter) | `loadAlerts()` — populates incident table & dashboard banner |
| `GET` | `/api/emergency-alerts/summary` | Retrieve aggregate alert metrics (total, active, critical, resolved) | `loadAlerts()` — updates 4 alert summary cards & badges |
| `POST` | `/api/emergency-alerts` | Broadcast and persist a new emergency alert | `createAlertForm` submit — returns 201 with `EMG-XXXX` |
| `GET` | `/api/emergency-alerts/{id}` | Fetch specific emergency alert details | Returns individual alert or 404 |
| `PATCH` | `/api/emergency-alerts/{id}/status` | Update alert status (`Active`, `Investigating`, `Resolved`) | Table quick actions ("Investigate", "Resolve") |

---

## 🚦 Phase 6: Traffic Monitoring Documentation

### 1. Database Table: `traffic_records`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String(20) | Primary Key, Index | Sequential identifier (`TRF-0001`, `TRF-0002`, ...) |
| `road_name` | String(150) | Required, Index | Name of monitored corridor/highway |
| `area` | String(100) | Required | City sector or neighborhood |
| `vehicle_count` | Integer | Required, >= 0 | Estimated vehicle count |
| `average_speed` | Float | Required, >= 0 | Flow speed in km/h |
| `congestion_level` | String(30) | Required | `Low`, `Moderate`, `Heavy`, `Severe` |
| `status` | String(30) | Required | `Clear`, `Moving`, `Congested`, `Blocked` |
| `recorded_at` | String(50) | Required | ISO 8601 observation timestamp |
| `created_at` | DateTime | Server default `now()` | Record creation timestamp |

### 2. Seeding Demo Traffic Data
```bash
cd backend
python seed_traffic.py
```

---

## 🚨 Phase 7: Emergency Alert Management Documentation

### 1. Database Table: `emergency_alerts`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String(20) | Primary Key, Index | Sequential identifier (`EMG-0001`, `EMG-0002`, ...) |
| `alert_type` | String(50) | Required, Index | `Accident`, `Road Blockage`, `Fire`, `Flooding`, `Medical Emergency`, `Traffic Emergency` |
| `title` | String(200) | Required | Concise headline of emergency incident |
| `description` | Text | Required | Full incident description and dispatch notes |
| `location` | String(255) | Required | Specific road, ramp, or intersection |
| `area` | String(100) | Required | Ward, sector, or district |
| `severity` | String(20) | Required | `Low`, `Medium`, `High`, `Critical` |
| `status` | String(30) | Required, Index | `Active`, `Investigating`, `Resolved` |
| `issued_at` | String(50) | Required | ISO 8601 observation timestamp |
| `created_at` | DateTime | Server default `now()` | Record creation timestamp |

### 2. Seeding Demo Emergency Alerts Data
To populate demo emergency incident alerts (only runs if the table is empty):
```bash
cd backend
python seed_emergency_alerts.py
```

---

## 🛑 Phase 8: Traffic Violation Management Documentation

### 1. Database Table: `traffic_violations`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String(20) | Primary Key, Index | Sequential identifier (`VIO-0001`, `VIO-0002`, ...) |
| `violation_type` | String(80) | Required, Index | Type of violation (`Speeding`, `Red Light Violation`, `Wrong Lane`, `Illegal Parking`, `No Helmet`, etc.) |
| `vehicle_number` | String(30) | Required, Index | Vehicle registration / license plate (e.g. `MH 31 AB 1234`) |
| `location` | String(255) | Required | Exact roadway, junction, or flyover |
| `area` | String(100) | Required, Index | Ward or district in Nagpur |
| `severity` | String(20) | Required | `Low`, `Medium`, `High`, `Critical` |
| `status` | String(30) | Required, Index | `Detected`, `Under Review`, `Confirmed`, `Resolved` |
| `fine_amount` | Float | Required, >= 0 | Penalty fine assessed in INR (₹) |
| `description` | Text | Required | Evidence details, camera sensor notes, speed logs |
| `detected_at` | String(50) | Required | ISO 8601 observation timestamp |
| `created_at` | DateTime | Server default `now()` | Record creation timestamp |

### 2. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/traffic-violations/summary` | Aggregate dashboard statistics (total, detected, under review, confirmed, resolved, high/critical, total fines) |
| `GET` | `/api/traffic-violations` | List all violations ordered newest first (optional filters: `status`, `severity`, `violation_type`, `area`) |
| `GET` | `/api/traffic-violations/{id}` | Get single violation by ID (returns 404 if not found) |
| `POST` | `/api/traffic-violations` | Create violation with sequential `VIO-XXXX` ID (returns 201) |
| `PATCH` | `/api/traffic-violations/{id}/status` | Update processing status (`Detected`, `Under Review`, `Confirmed`, `Resolved`) |

### 3. Seeding Demo Traffic Violations Data
To populate sample Nagpur traffic violations (only runs if table is empty):
```bash
cd backend
python seed_traffic_violations.py
```

### 4. Automated Verification Testing
Run the test suites across all completed phases:
```bash
cd backend
# Phase 4 Regression Test (Issues persistence)
python test_phase4.py

# Phase 6 Regression Test (Traffic monitoring endpoints & validation)
python test_phase6.py

# Phase 7 Regression Test (Emergency alert management endpoints & validation)
python test_phase7.py

# Phase 8 Regression Test (Traffic violation management endpoints & validation)
python test_phase8.py

# Phase 9 Verification Test (Analytics & intelligence endpoints & validation)
python test_phase9.py
```

---

## 📊 Phase 9: Traffic Analytics & Intelligence Documentation

### 1. Analytics Architecture
Phase 9 calculates real-time aggregated metrics across all four database tables (`issues`, `traffic_records`, `emergency_alerts`, `traffic_violations`) directly from PostgreSQL without artificial data generation.

### 2. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/overview` | High-level KPIs (total issues, traffic, alerts, violations, active emergencies, unresolved issues, total fines, speed averages) |
| `GET` | `/api/analytics/traffic` | Traffic telemetry intelligence, congestion distribution, top volume corridors, and hotspot congestion rankings |
| `GET` | `/api/analytics/issues` | Road hazard classification by severity, status, category, and most affected city sectors |
| `GET` | `/api/analytics/emergencies` | Emergency alert spread, hazard category breakdown, severity distributions, and recent dispatch activity |
| `GET` | `/api/analytics/violations` | Rule violation categories, automated radar logs, status progression, and total/average penalty fines |
| `GET` | `/api/analytics/trends` | Daily chronological activity trends across issues, traffic, emergencies, and violations |

All endpoints support optional query parameters:
- `area`: Filter analytics to a specific city ward/neighborhood
- `start_date`: ISO date `YYYY-MM-DD`
- `end_date`: ISO date `YYYY-MM-DD`

### 3. Automated Verification Testing
```bash
cd backend
python test_phase9.py
```

---

## 🧠 Phase 10: AI Risk & Incident Intelligence Documentation

### 1. Data-Driven Assessment vs. Statistical ML
Because the local PostgreSQL database contains fewer than 100 historical operational records (<30 issues, ~15 traffic records, ~12 emergencies, ~10 violations), training a classical or deep machine-learning model on such sparse sample sizes would lead to severe overfitting, spurious correlations, and hallucinated inferences. In adherence to strict scientific and engineering integrity:
- **No fake training data was fabricated.**
- **The system is NOT claimed to be a trained statistical ML model.**
- **The intelligence layer is implemented as an explainable, deterministic multi-domain risk evaluation engine** where every single point in the 0–100 score is directly calculated from and traceable to observable PostgreSQL telemetry.

### 2. Multi-Domain Mathematical Scoring Rubric (Max 100 Points)

| Domain | Maximum Weight | Primary Contributing Factors | Scoring Breakdown |
|---|---|---|---|
| **Active Emergencies** | **35 Points** | Real-time hazard dispatches & broadcast alerts | Active Critical (+25 pts), Active High (+15 pts), Active Medium (+8 pts), Active Low (+4 pts), Investigating status (50% wt) |
| **Traffic Flow & Bottlenecks** | **25 Points** | Congestion state, speed deficit, and vehicle surges | Severe (+18 pts), Heavy (+14 pts), Moderate (+8 pts), Low (+2 pts); Speed deficit &lt;15 km/h (+7 pts), &lt;25 km/h (+5 pts), &lt;35 km/h (+3 pts); Volume &gt;800 (+3 pts) |
| **Road Hazards & Infrastructure** | **20 Points** | Unresolved pothole, drainage, and hazard reports | Unresolved Critical (+10 pts), High (+6 pts), Medium (+3 pts), Low (+1 pt) |
| **Rule Infringements & Penalties** | **20 Points** | Moving violations, speeding radar, fine burdens | Critical violations (+6 pts), High (+4 pts), Medium (+2 pts), Low (+1 pt); Fine volume &gt;₹5,000 (+3 pts) |

**Total Score Formula**:
$$\text{Risk Score} = \min\left(100, \max\left(0, \text{round}(\text{Score}_{\text{EMG}} + \text{Score}_{\text{TRF}} + \text{Score}_{\text{ISS}} + \text{Score}_{\text{VIO}})\right)\right)$$

### 3. Operational Risk Classification Levels

| Score Range | Classification Level | Tactical Control Directive |
|---|---|---|
| **80 – 100** | <span style="color:#ef4444; font-weight:bold;">Critical</span> | **Priority Alert**: Dispatch emergency response teams to scene; execute localized road closures and traffic diversions. |
| **60 – 79** | <span style="color:#ea580c; font-weight:bold;">High</span> | **Active Intervention**: Deploy dynamic signal green waves and field traffic marshals to alleviate bottlenecks. |
| **30 – 59** | <span style="color:#f59e0b; font-weight:bold;">Medium</span> | **Targeted Monitoring**: Increase radar surveillance and schedule municipal road maintenance repair crews. |
| **0 – 29** | <span style="color:#10b981; font-weight:bold;">Low</span> | **Nominal Operations**: Telemetry within standard thresholds; continue routine automated sensor polling. |

### 4. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/risk/overview` | City composite risk index, severity breakdown, top danger sectors, and primary tactical directive |
| `GET` | `/api/risk/areas` | Risk assessment for all city sectors/wards, sorted descending by composite risk score |
| `GET` | `/api/risk/areas/{area}` | Detailed evaluation for a specific area (404 if unknown/no records found) |
| `GET` | `/api/risk/roads` | Risk assessment across all monitored roadways with traffic telemetry |
| `GET` | `/api/risk/roads/{road_name}` | Detailed corridor risk evaluation with speed deficit and congestion analysis |

### 5. Automated Verification Testing
```bash
cd backend
python test_phase10.py
```

---

## 🔐 Phase 11: Authentication & Role-Based Access Control (RBAC) Documentation

### 1. Authentication Architecture
Phase 11 introduces operator identity authentication and role-based authorization:
- **Password Security**: Passwords are never stored in plaintext. They are salted and hashed using `bcrypt` (via `passlib`) with an industry-standard computational cost factor.
- **Stateless Bearer Tokens**: JSON Web Tokens (JWT) signed using HMAC-SHA256 (`HS256`) encode authenticated operator identities (`sub`, `role`, `user_id`, `exp`, `iat`).
- **Configuration Hygiene**: Secrets (`JWT_SECRET_KEY`), signing algorithms (`JWT_ALGORITHM`), and expiration lifetimes (`JWT_ACCESS_TOKEN_EXPIRE_MINUTES`) are dynamically parsed from `.env` environment variables without hardcoded defaults.
- **Session & Token Storage Strategy**: For this Vanilla JS Single Page Application, tokens are persisted in `sessionStorage` rather than `localStorage`.
  - *Tradeoff Analysis*: `localStorage` persists indefinitely across browser tabs and system restarts, presenting significant exposure risk to cross-site scripting (XSS) attacks or shared terminal inspection. `sessionStorage` strictly isolates tokens to the active browser tab session and automatically purges them upon tab termination, providing a superior security posture for municipal operator workstations without requiring complex refresh-token rotation infrastructure.

### 2. Available Operator Roles

| Role | Target Persona | Scope of Authority |
|---|---|---|
| `ADMIN` | System Administrator / Shift Commander | Universal administrative privileges. Has unrestricted access to all endpoints, operator account provisioning (`POST /api/auth/users`), and status toggling (`PATCH /api/auth/users/{id}/status`). |
| `TRAFFIC_OPERATOR` | TMC / Traffic Marshall Operator | Authorized for traffic telemetry ingestion (`POST /api/traffic`), traffic violation recording (`POST /api/traffic-violations`), and violation adjudication status changes. |
| `EMERGENCY_OPERATOR` | Incident Response Dispatcher | Authorized for broadcasting live city emergency alerts (`POST /api/emergency-alerts`) and transitioning incident lifecycle states (`Investigating`, `Resolved`). |
| `ROAD_INSPECTOR` | Field Maintenance Inspector | Authorized for municipal road hazard audits, pothole verification, and road issue status tracking. |

### 3. Role-Based Access Control (RBAC) Matrix

| Endpoint Route | Method | Public / Unauth | TRAFFIC_OPERATOR | EMERGENCY_OPERATOR | ROAD_INSPECTOR | ADMIN |
|---|---|:---:|:---:|:---:|:---:|:---:|
| `/api/health` | `GET` | ✅ Yes | ✅ | ✅ | ✅ | ✅ |
| `/api/auth/login` | `POST` | ✅ Yes | ✅ | ✅ | ✅ | ✅ |
| `/api/auth/me` | `GET` | ❌ 401 | ✅ | ✅ | ✅ | ✅ |
| `/api/auth/logout` | `POST` | ✅ Yes | ✅ | ✅ | ✅ | ✅ |
| `/api/auth/users` | `GET` | ❌ 401 | ❌ 403 | ❌ 403 | ❌ 403 | ✅ Yes |
| `/api/auth/users` | `POST` | ❌ 401 | ❌ 403 | ❌ 403 | ❌ 403 | ✅ Yes |
| `/api/auth/users/{id}/status` | `PATCH` | ❌ 401 | ❌ 403 | ❌ 403 | ❌ 403 | ✅ Yes |
| `/api/emergency-alerts` (Broadcast) | `POST` | ❌ 401 | ❌ 403 | ✅ Yes | ❌ 403 | ✅ Yes |
| `/api/emergency-alerts/{id}/status` | `PATCH` | ❌ 401 | ❌ 403 | ✅ Yes | ❌ 403 | ✅ Yes |
| `/api/traffic-violations` (Create) | `POST` | ❌ 401 | ✅ Yes | ❌ 403 | ❌ 403 | ✅ Yes |
| `/api/traffic-violations/{id}/status` | `PATCH` | ❌ 401 | ✅ Yes | ❌ 403 | ❌ 403 | ✅ Yes |
| `/api/traffic` (Sensor Ingest) | `POST` | ❌ 401 | ✅ Yes | ❌ 403 | ❌ 403 | ✅ Yes |
| Read-Only Dashboards & Telemetry | `GET` | ✅ Yes | ✅ | ✅ | ✅ | ✅ |

*Note: In development and test environments, `legacy_fallback=True` permits unauthenticated calls to legacy test fixtures unless `AUTH_ENFORCE_ALL=true` is activated in `.env`.*

### 4. Database Schema: `users` Table

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | Integer | Primary Key, Auto-increment | Unique operator identifier |
| `username` | String(50) | Unique, Indexed, Not Null | Unique login handle |
| `email` | String(100) | Unique, Indexed, Not Null | Unique operator email address |
| `password_hash` | String(255) | Not Null | Salted bcrypt password hash (never plaintext) |
| `full_name` | String(100) | Not Null | Operator full display name |
| `role` | String(30) | Indexed, Not Null | System role (`ADMIN`, `TRAFFIC_OPERATOR`, `EMERGENCY_OPERATOR`, `ROAD_INSPECTOR`) |
| `is_active` | Boolean | Default True, Not Null | Account status flag; deactivated users are rejected with 403 |
| `created_at` | DateTime(tz) | Server Default `func.now()` | Account creation timestamp |
| `updated_at` | DateTime(tz) | Auto-update on modification | Account last updated timestamp |

### 5. Environment Variables

Add to your `.env` configuration:
```env
# JWT Security Settings (Phase 11)
JWT_SECRET_KEY=e83921af7b4c9284d720b601e3895ac7f98d1a3c8e4265f019487b92c4e128ef
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480

# Enforce strict authentication across all legacy endpoints
AUTH_ENFORCE_ALL=false
```

### 6. Default Operator Accounts (Local Development)

The backend auto-provisions default operator accounts upon application startup if the `users` table is empty. You can also manually seed/reset operators at any time:
```bash
cd backend
python seed_users.py
```

| Username | Default Password | Role |
|---|---|---|
| `admin` | `AdminPassword@123` | `ADMIN` |
| `traffic_op` | `TrafficPassword@123` | `TRAFFIC_OPERATOR` |
| `emergency_op` | `EmergencyPassword@123` | `EMERGENCY_OPERATOR` |
| `road_insp` | `InspectorPassword@123` | `ROAD_INSPECTOR` |

### 7. Automated Verification Testing
Run the dedicated Phase 11 test suite covering 14 authentication and RBAC checks:
```bash
cd backend
python test_phase11.py
```
Run the full 75-test regression suite across all implemented phases:
```bash
python test_phase4.py; python test_phase6.py; python test_phase7.py; python test_phase8.py; python test_phase9.py; python test_phase10.py; python test_phase11.py
```

### 8. Realistic Security Limitations & Scope Boundaries
- **No Hardware MFA/2FA**: Multi-factor authentication (e.g., TOTP/SMS/WebAuthn) is not yet implemented; access relies on single-factor credentials.
- **Stateless Token Invalidation**: Logout clears the client-side session token. Because JWTs are stateless, server-side revocation prior to expiration requires checking `is_active` or an explicit token revocation blocklist (recommended for Redis in future enterprise phases).
- **Refresh Token Lifecycle**: Access tokens have an 8-hour operational lifetime. A dedicated dual-token architecture (short-lived access + sliding refresh token) should be adopted before high-security production deployment.

---

## 🗺️ Phase 12: Interactive GIS / Live Operations Map

Phase 12 introduces a real-time, cross-domain geospatial command center for monitoring road issues, traffic flow telemetry, emergency broadcasts, radar violations, and explainable AI risk intelligence on an interactive spatial canvas.

### 1. Geospatial Architecture & Offline-First Design

```
[ PostgreSQL Database (issues, traffic, emergencies, violations, users) ]
                              │
                              ▼ (SQLAlchemy ORM + Dynamic Spatial Migration)
[ MapService (Municipal GIS Registry + Deterministic Jitter + Provenance Tagging) ]
                              │
                              ▼ (Consolidated JSON via GET /api/map/overview)
[ FastAPI REST Router (/api/map) ]
                              │
                              ▼ (Vanilla JS fetch() + active section polling)
[ Offline Leaflet 1.9.4 Engine (OpenStreetMap Carto Tiles + SVG Markers + Tactical Drawer) ]
```

- **Zero External CDN Dependencies**: All Leaflet 1.9.4 CSS, JavaScript, and image marker assets are vendored locally in `frontend/vendor/leaflet/` to guarantee 100% offline availability in isolated control-room intranet environments.
- **Cartographic Base Map**: Uses OpenStreetMap standard cartographic raster tiles cached and rendered seamlessly inside an adaptive high-DPI Leaflet container.

### 2. Spatial Provenance Model (Honest Coordinate Resolution)

To maintain strict operational integrity, the system **never** fabricates real-time sensor GPS:

| Coordinate Source | Classification | Description |
|---|---|---|
| `exact_gps` | Ground Truth Hardware | Real-time GPS coordinate received directly from an onboard GPS unit or mobile inspector device with satellite fix. |
| `configured_reference` | Civic Landmark Anchor | High-precision reference coordinates for recognized municipal junctions and landmarks (e.g., Sitabuldi Interchange, Zero Mile, Variety Square) with deterministic micro-jittering to prevent visual marker stacking. |
| `configured_corridor` | Corridor Midpoint/Polyline | Pre-mapped midpoint coordinates representing major arterial corridors (e.g., Wardha Road, Central Avenue, Amravati Road). |
| `area_centroid` | Municipal Ward Centroid | Geographic centroid coordinate of a recognized municipal administrative ward or zone. |
| `unmapped` | Missing Spatial Data | Records without valid coordinates are safely handled, tracked in the integrity summary pill, and excluded from canvas rendering without application crashes. |

### 3. Five Cross-Domain Operational Map Layers

Each domain is rendered with custom, highly distinctive vector SVG marker pins:

1. **🚨 Emergency Alerts (Red Pulse)**: Active and investigating emergency incidents (accidents, waterlogging, structural collapse) with pulsating radar halos for rapid operator triage.
2. **🚗 Traffic Telemetry (Blue Flow)**: Monitored corridors reporting vehicle counts, average speeds, and congestion ratings.
3. **⚠️ Road Issues (Amber Hazard)**: Potholes, damaged signage, signal malfunctions, and surface hazards.
4. **📸 Traffic Violations (Purple Radar)**: Camera-detected infractions (overspeeding, red light jumping, wrong-side driving) with fine amounts and penalty tracking.
5. **🛡️ AI Risk Intelligence (Dynamic Risk Polygons/Centroids)**: Phase 10 explainable risk scores (0–100) rendered as color-coded sector pins (Green/Yellow/Orange/Red) with primary hazard drivers and tactical recommendations.

### 4. Interactive Command-Center Features

- **Domain Pill Quick-Filtering**: Seamlessly toggle between `All Domains`, `Road Issues`, `Traffic Flow`, `Emergency Alerts`, `Traffic Violations`, and `Risk Zones`.
- **Area & Severity Selectors**: Narrow down spatial features by municipal area (e.g., `Sitabuldi`, `Dharampeth`) or minimum severity level (`Critical`, `High`, `Medium`, `Low`).
- **Tactical Inspector Drawer**: Selecting any map pin or table row opens a slide-over tactical detail drawer displaying domain badges, coordinate provenance chips, coordinates, metric highlights, contextual details, and direct navigation actions.
- **Center on Feature**: Instantly fly the map camera to focus and zoom in on any selected incident (`map.flyTo()`).
- **Guarded 30-Second Polling**: Map layers auto-refresh every 30 seconds without screen flicker while the Operations Map tab is active.

### 5. API Reference

#### `GET /api/map/overview`
Retrieves consolidated spatial features across all 5 operational domains.

- **Query Parameters**:
  - `area` *(string, optional)*: Filter by municipal area name (case-insensitive substring match).
  - `data_type` *(string, optional)*: Filter by domain (`all`, `issue`, `issues`, `traffic`, `emergency`, `emergencies`, `violation`, `violations`, `risk`).
  - `risk_level` *(string, optional)*: Filter by severity rating (`Low`, `Medium`, `High`, `Critical`).
  - `status` *(string, optional)*: Filter by operational lifecycle status.

- **Response Schema (`MapOverviewResponse`)**:
  - `summary`: Object containing counts for `total_features`, `mapped_count`, `issues_count`, `traffic_count`, `emergencies_count`, `violations_count`, `risk_areas_count`, and `unmapped_count`.
  - `center`: Object with `latitude`, `longitude`, `zoom`, and `city`.
  - `issues`: Array of `MapFeatureRecord` items.
  - `traffic`: Array of `MapFeatureRecord` items.
  - `emergencies`: Array of `MapFeatureRecord` items.
  - `violations`: Array of `MapFeatureRecord` items.
  - `risk`: Array of `MapFeatureRecord` items.

### 6. Production PostGIS Migration Roadmap

The current architecture stores coordinates as native floating-point columns (`latitude DOUBLE PRECISION`, `longitude DOUBLE PRECISION`). For city-scale deployments exceeding 100,000 active features, a smooth migration to PostGIS is planned:

```sql
-- Step 1: Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Step 2: Add Geometry columns
ALTER TABLE issues ADD COLUMN geom geometry(Point, 4326);
ALTER TABLE traffic_records ADD COLUMN geom geometry(Point, 4326);
ALTER TABLE emergency_alerts ADD COLUMN geom geometry(Point, 4326);
ALTER TABLE traffic_violations ADD COLUMN geom geometry(Point, 4326);

-- Step 3: Populate Geometry from existing columns
UPDATE issues SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) WHERE latitude IS NOT NULL;

-- Step 4: Add Spatial GIST Indexes
CREATE INDEX idx_issues_geom ON issues USING GIST (geom);
```

### 7. Automated Verification Testing
Run the dedicated Phase 12 GIS test suite covering 17 end-to-end checks:
```bash
cd backend
python test_phase12.py
```
Run the full 92-test regression suite across all implemented phases:
```bash
python test_phase4.py; python test_phase6.py; python test_phase7.py; python test_phase8.py; python test_phase9.py; python test_phase10.py; python test_phase11.py; python test_phase12.py
```

---

## 🔔 Phase 13: Notifications & Operational Escalation

Phase 13 establishes an internal, role-aware operational notification and incident escalation system for the Road System Control platform. It bridges raw database entries and field operators by converting high-priority events into actionable, traceable notifications routed strictly by operator role.

### 1. In-System Scope & Honest Engineering Boundaries

- **Zero Unverified External Channels**: In compliance with professional engineering standards, this phase implements **reliable in-system notifications only** persisted in PostgreSQL. It does **not** simulate or claim SMS, WhatsApp, Email, Firebase, or mobile push notification gateways.
- **Strict Role-Based Routing**: Notifications are dispatched strictly to the operator role authorized to act on that category of event. Operators only view alerts targeted to their operational domain, while administrators (`ADMIN`) maintain universal oversight.

### 2. Role-Based Routing Matrix

| Operational Event Category | Source Domain | Trigger Threshold | Target Recipient Role |
|---|---|---|---|
| **Road Hazards & Potholes** | `issues` | Severity `High` or `Critical` & unresolved status | `ROAD_INSPECTOR` |
| **Severe Traffic Congestion** | `traffic` | Congestion rating `Heavy` or `Severe` | `TRAFFIC_OPERATOR` |
| **Automated Radar Violations** | `traffic_violations` | Severity `High` or `Critical` & active status | `TRAFFIC_OPERATOR` |
| **Emergency Incident Alerts** | `emergency_alerts` | Severity `High` or `Critical` & active/investigating | `EMERGENCY_OPERATOR` |
| **AI Risk Spikes & System Escalations** | `risk` | Composite Risk Score &ge; 70 or Level `Critical` | `ADMIN` |

### 3. Notification Lifecycle & Audit Trail

```
[ New High/Critical Operational Event ]
                 │
                 ▼
[ Duplicate Suppression Check (source_domain + source_id + notification_type) ]
   (Suppresses across ALL states: UNREAD, READ, and ACKNOWLEDGED)
                 │
                 ▼
        ┌────────────────┐
        │     UNREAD     │ ◄── Displays pulsing red halo and unread badge in header/sidebar
        └───────┬────────┘
                │ Operator views alert or clicks "Mark Read"
                ▼
        ┌────────────────┐
        │      READ      │ ◄── Records read_at timestamp and read_by (authenticated operator)
        └───────┬────────┘
                │ Operator takes action and submits acknowledgement remarks
                ▼
        ┌────────────────┐
        │  ACKNOWLEDGED  │ ◄── Records acknowledged_at, acknowledged_by operator, and remarks
        └────────────────┘
```

- **Read & Acknowledged Audit Trail**: Both status transitions (`UNREAD -> READ` and `READ -> ACKNOWLEDGED`) record authoritative operator identity from the authenticated JWT token context (`read_by` and `acknowledged_by`). The backend rejects any client-supplied operator identities to preserve tamper-proof audit trails.
- **Duplicate Suppression Across Full Lifecycle**: `NotificationService.check_duplicate()` inspects `(source_domain, source_id, notification_type)` across all lifecycle states (`UNREAD`, `READ`, `ACKNOWLEDGED`). An acknowledged notification permanently suppresses duplicate generation for the same source entity during 30-second automated polling cycles and manual sync executions. Distinct incidents or differing notification types generate separate, traceable records.
- **Concurrency-Safe ID Generation**: Notification identifiers (`NTF-XXXX`) are atomically generated via a PostgreSQL sequence (`notification_id_seq`), preventing duplicate ID collisions across concurrent worker processes and bulk sync requests. Schema provisioning (`ensure_notification_schema()`) guarantees sequence synchronization with the maximum existing table ID on application launch, with graceful fallback for non-PostgreSQL testing environments.

### 4. API Reference

#### Endpoints
- `GET /api/notifications`: List notifications with query filters (`status`, `severity`, `source_domain`, `limit`, `offset`) scoped to the authenticated operator's role.
- `GET /api/notifications/summary`: Retrieve summary metrics (unread count, critical count, acknowledged count, domain breakdowns).
- `GET /api/notifications/{id}`: Single notification detail with RBAC verification.
- `PATCH /api/notifications/{id}/read`: Mark notification as read (records `read_at` and `read_by` from authenticated operator).
- `PATCH /api/notifications/{id}/acknowledge`: Mark notification as acknowledged (records `acknowledged_by`, `acknowledged_at`, and optional operational remarks).
- `POST /api/notifications/sync`: Trigger on-demand synchronization scanning existing records for unnotified events.

### 5. Automated Verification Testing
Run the dedicated Phase 13 test suite covering 17 end-to-end checks:
```bash
cd backend
python test_phase13.py
```
Run the full 109-test regression suite across all implemented phases:
```bash
python test_phase4.py; python test_phase6.py; python test_phase7.py; python test_phase8.py; python test_phase9.py; python test_phase10.py; python test_phase11.py; python test_phase12.py; python test_phase13.py
```

---

## 📋 Phase 14: Field Work Orders & Incident Dispatch Operations

Phase 14 establishes municipal field operations management, crew dispatch tracking, SLA remediation monitoring, and closed-loop resolution across the Road System Control platform. It connects central command notifications and incidents directly to on-the-ground municipal maintenance crews and traffic marshals.

### 1. Work Order Lifecycle Architecture

Work orders enforce a non-reversible state machine directly on the backend. Transitions outside the approved forward or cancellation paths return HTTP 400.

```
       ┌──────────────────┐
       │     PENDING      │ ◄── Initial dispatch logged by operator
       └────────┬─────────┘
                │
                ▼
       ┌──────────────────┐
       │    DISPATCHED    │ ◄── Field crew mobilized to incident site (dispatched_at logged)
       └────────┬─────────┘
                │
                ▼
       ┌──────────────────┐
       │   IN_PROGRESS    │ ◄── Active on-site remediation commenced
       └────────┬─────────┘
                │
                ▼
       ┌──────────────────┐
       │    COMPLETED     │ ◄── Remediation verified (resolution_notes & completed_by recorded)
       └──────────────────┘     Auto-resolves linked Issue or EmergencyAlert in same transaction

  (PENDING, DISPATCHED, or IN_PROGRESS may transition to CANCELLED to abort dispatch)
```

- **Enforced Forward Transitions**: Invalid backward mutations (e.g. `COMPLETED -> PENDING`, `COMPLETED -> IN_PROGRESS`, `CANCELLED -> IN_PROGRESS`) are strictly rejected.
- **Atomic ID Generation**: Work order IDs (`WO-0001`, `WO-0002`, ...) are allocated atomically using PostgreSQL sequence `work_order_id_seq`, eliminating race conditions across concurrent dispatchers.
- **Source Domain & Order Type Compatibility**:
  - `ROAD_REPAIR` &rarr; `issues`
  - `FIELD_INSPECTION` &rarr; `issues`
  - `EMERGENCY_RESPONSE` &rarr; `emergency_alerts`
  - `TRAFFIC_DIVERSION` &rarr; `traffic`
  Incompatible pairings are rejected with HTTP 422.
- **Duplicate Active Dispatch Prevention**: Multiple active work orders (`PENDING`, `DISPATCHED`, `IN_PROGRESS`) cannot exist simultaneously for the same `(source_domain, source_id)`. Once an existing dispatch reaches `COMPLETED` or `CANCELLED`, future legitimate operational cycles for that entity are permitted.

### 2. Deterministic SLA Engine

- **SLA Deadline**: Calculated deterministically on creation as `sla_deadline = created_at + target_sla_hours` (supported targets: 2h immediate, 4h urgent, 12h high, 24h standard, 48h routine, 72h planned).
- **Runtime SLA Status**:
  - `ON_TRACK`: More than 2 hours remaining before SLA deadline.
  - `EXPIRING_SOON`: Less than 2 hours remaining before SLA deadline.
  - `BREACHED`: Current time exceeds `sla_deadline` while the order remains active.
  - Completed orders are permanently classified as resolved and never remain operationally marked as `BREACHED`.

### 3. Server-Side Closed-Loop Auto-Resolution

When an active work order transitions to `COMPLETED`:
1. `completed_by` is extracted authoritatively from the authenticated JWT user identity.
2. `resolution_notes` (minimum 5 characters) are mandatory.
3. Optional `actual_cost` (non-negative numeric expenditure) is validated and recorded.
4. If linked to `issues`, the associated `Issue.status` is updated to `"Resolved"`.
5. If linked to `emergency_alerts`, the associated `EmergencyAlert.status` is updated to `"Resolved"`.
6. Both the work order completion and linked source resolution are executed atomically within the same database transaction.

> **Risk Integrity**: No separate or fabricated risk reduction formula was added. The existing Phase 10 `RiskService` remains the sole authoritative source of risk scoring, naturally reflecting resolved hazards in subsequent evaluation runs.

### 4. Role-Based Access Control (RBAC)

Mutations are enforced using the authenticated operator's JWT identity and project role:
- `ADMIN`: Universal management across all work order types and lifecycles.
- `ROAD_INSPECTOR`: Authorized exclusively for `ROAD_REPAIR` and `FIELD_INSPECTION` work orders.
- `EMERGENCY_OPERATOR`: Authorized exclusively for `EMERGENCY_RESPONSE` work orders.
- `TRAFFIC_OPERATOR`: Authorized exclusively for `TRAFFIC_DIVERSION` work orders.
- Unauthorized cross-role operations return HTTP 403 Forbidden; unauthenticated requests return HTTP 401 Unauthorized.

### 5. GIS & Notification Integrations

- **GIS Operations Map Layer**: Active work orders (`DISPATCHED`, `IN_PROGRESS`) are exposed via `GET /api/map/work-orders` and plotted on the Leaflet operations map with custom crew markers and tactical inspection drawer data.
- **Phase 13 In-System Notification Dispatch**: New dispatches trigger role-routed operational notifications (`WORK_ORDER_DISPATCHED`); completed orders trigger audit notifications (`WORK_ORDER_COMPLETED`) via `NotificationService`.
- **Pre-populated Dispatch Flow**: Clicking "Dispatch Work Order" on acknowledged notification cards automatically pre-populates the Work Order creation form with the linked entity identity, domain, and incident title.

### 6. API Reference

- `GET /api/work-orders`: List work orders with filtering by `status`, `priority`, `order_type`, `area`, and pagination.
- `GET /api/work-orders/summary`: High-level operational metrics (total, active, completed, SLA breached, total expenditure).
- `GET /api/work-orders/{id}`: Single work order details with evaluated runtime SLA status.
- `POST /api/work-orders`: Dispatch a new field work order (atomic sequence ID, role check, duplicate check).
- `PATCH /api/work-orders/{id}/status`: Transition work order lifecycle status (enforces state machine and closed-loop resolution).
- `GET /api/work-orders/by-source/{domain}/{source_id}`: Trace work orders linked to a specific operational entity.
- `GET /api/map/work-orders`: Fetch active field work orders formatted as GeoJSON-compatible GIS features.

### 7. Automated Verification Testing

Run the dedicated Phase 14 test suite covering 18 end-to-end verification tests:
```bash
cd backend
python test_phase14.py
```

Run the complete 127-test regression suite across all implemented phases:
```bash
python test_phase4.py; python test_phase6.py; python test_phase7.py; python test_phase8.py; python test_phase9.py; python test_phase10.py; python test_phase11.py; python test_phase12.py; python test_phase13.py; python test_phase14.py
```

---

## 🛠️ Phase 16: Operational Work Order Management UI

### 1. Objective
Provide a unified, production-grade operations interface for municipal operators to manage the entire lifecycle of field work orders backed by the Phase 14 backend engine, seamlessly integrating with Phase 12 GIS Leaflet mapping and Phase 13 operational notifications.

### 2. Frontend Operational Capabilities
- **Operational KPI Cards**: Real-time summary displaying Total Work Orders, Active Dispatches (`PENDING`, `DISPATCHED`, `IN_PROGRESS`), Successfully Completed remediation orders, and SLA Breached orders.
- **Multi-Parameter Filter Toolbar**: Instant client- and server-side filtering by:
  - **Lifecycle Status**: `ALL`, `PENDING`, `DISPATCHED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
  - **Priority**: `ALL`, `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`
  - **Order Type**: `ALL`, `ROAD_REPAIR`, `FIELD_INSPECTION`, `EMERGENCY_RESPONSE`, `TRAFFIC_DIVERSION`
  - **Operational Area**: City sectors (e.g., Downtown, North Sector, Industrial Area, West Sector, Highway 101)
  - **SLA State**: Authoritative filter by `ALL`, `ON_TRACK`, `EXPIRING_SOON`, `BREACHED`
- **Work Orders Data Table**: Tabular view with columns for Work Order ID, Order Type, Title, Source Entity, Area & Location, Assigned Crew, Priority badge, SLA Deadline with live countdown indicators, SLA Status badge, Lifecycle Status badge, Created At, and Action controls.
- **Work Order Details Modal**: Comprehensive modal drawer displaying:
  - Header with ID, title, and badges for status, priority, and SLA state
  - SLA status callout with authoritative backend status, absolute deadline, and calculated time remaining/overdue
  - Core Metadata Grid: Order Type, Source Domain & Source ID, Area, Location, Coordinate Provenance, Assigned Crew, Target SLA duration, and Created By
  - Lifecycle Audit Timestamps: Created At, Dispatched At, Completed At
  - Post-Remediation Verification Data: Resolution Notes and Actual Expenditure Cost (when completed)
  - Direct contextual "Update Lifecycle Status" trigger button for authorized operators
- **Role-Aware Work Order Creation Modal**:
  - Automatically filters available Order Types based on the authenticated operator's role:
    - `ROAD_INSPECTOR` &rarr; `ROAD_REPAIR`, `FIELD_INSPECTION` (linked to `issues`)
    - `EMERGENCY_OPERATOR` &rarr; `EMERGENCY_RESPONSE` (linked to `emergency_alerts`)
    - `TRAFFIC_OPERATOR` &rarr; `TRAFFIC_DIVERSION` (linked to `traffic`)
    - `ADMIN` &rarr; All 4 order types
  - Pre-populates source domain and source ID when launched from notification cards or tactical map popups.
- **Lifecycle Transition Modal**:
  - Enforces forward state machine transitions (`PENDING` &rarr; `DISPATCHED` &rarr; `IN_PROGRESS` &rarr; `COMPLETED`, with `CANCELLED` permitted from active states).
  - Dynamically requires `resolution_notes` and optional `actual_cost` only when transitioning to `COMPLETED`.
  - Cascades complete refresh across work orders table, KPI metrics, GIS map layers, and operational notifications.

### 3. API Integration
The frontend utilizes existing RESTful endpoints without architecture redesign or table mutations:
- `GET /api/work-orders`: Paginated list retrieval with query parameters (`status`, `priority`, `order_type`, `area`).
- `GET /api/work-orders/summary`: Live aggregate KPI metrics.
- `GET /api/work-orders/{id}`: Single work order retrieval with fully calculated runtime SLA metadata.
- `POST /api/work-orders`: Role-validated work order dispatch.
- `PATCH /api/work-orders/{id}/status`: Lifecycle transitions with closed-loop auto-resolution of linked issues or emergency alerts.
- `GET /api/map/work-orders`: GeoJSON-compatible field work orders layer with resolved coordinates.

### 4. Role-Based Access Control (RBAC)
- **Frontend Guidance, Backend Authority**: Frontend UI dynamically adapts controls and dropdowns according to authenticated JWT roles (`ADMIN`, `ROAD_INSPECTOR`, `EMERGENCY_OPERATOR`, `TRAFFIC_OPERATOR`), while backend endpoints strictly enforce HTTP 401/403 authorization checks.
- Unauthorized actions display clear, human-readable alert notifications without page crashes.

### 5. SLA Visibility & Countdown Indicators
- SLA states (`ON_TRACK`, `EXPIRING_SOON`, `BREACHED`) are computed authoritatively by the backend.
- The UI renders color-coded badges and human-readable countdowns (`"Xh Ym remaining"` or `"Breached by Xh Ym"`), adhering strictly to backend deadline timestamps without client-side formula duplication.

### 6. Operations Map (GIS) Integration
- Active work orders (`DISPATCHED`, `IN_PROGRESS`) are integrated into the Phase 12 Leaflet operations map via dedicated violet/purple pin markers (`pin-workorder`).
- Filter toolbar includes an interactive "Work Orders" domain toggle pill.
- Clicking any work order marker displays tactical popup telemetry with an "Inspect Work Order" button that transitions navigation directly into the Work Orders section and opens its detailed inspection modal.
- All existing map layers (Emergency, Traffic, Road Issues, Violations, Risk) remain completely intact and functional.

### 7. Notification Integration
- Reuses Phase 13 operational escalation channels.
- When an operator receives a work order notification (`WORK_ORDER_DISPATCHED`, `WORK_ORDER_COMPLETED`), clicking "View Entity" seamlessly navigates to the Work Orders view and opens the respective work order details modal.

### 8. Automated Verification & Full Regression Testing
- **Phase 17 System Administration Suite** (`test_phase17.py`): 12/12 passed (user management, roles, status, self/last-admin safety).
- **Phase 16 Work Order Operations UI Suite** (`test_phase16.py`): 12/12 passed.
- **Phase 14 Field Work Orders Suite** (`test_phase14.py`): 18/18 passed.
- **Full Platform Regression Suite across Phases 4–17**: **151 / 151 PASSED (100% Passing across all 12 test suites)**:
  `test_phase4.py` (9/9), `test_phase6.py` (10/10), `test_phase7.py` (12/12), `test_phase8.py` (10/10), `test_phase9.py` (10/10), `test_phase10.py` (10/10), `test_phase11.py` (14/14), `test_phase12.py` (17/17), `test_phase13.py` (17/17), `test_phase14.py` (18/18), `test_phase16.py` (12/12), `test_phase17.py` (12/12).

---

## 🔐 Phase 17: System Administration & Configuration

### 1. Objective
Establish an administrative security module strictly restricted to the `ADMIN` role for provisioning and managing platform users, roles, and lifecycle statuses while preserving account integrity and enforcing last-administrator safeguards.

### 2. Capabilities
- **User Listing & Details**: Retrieve all registered operators with filtering by role and active status, ensuring credentials (`password_hash`) are never leaked.
- **Operator Provisioning**: Provision accounts with unique username/email validation, bcrypt password hashing, and role assignment (`ADMIN`, `TRAFFIC_OPERATOR`, `EMERGENCY_OPERATOR`, `ROAD_INSPECTOR`).
- **Role Management**: Reassign roles among authorized system roles while rejecting arbitrary/invalid roles (HTTP 422).
- **Status Lifecycle & Deactivation**: Toggle account active state (`ACTIVE`/`INACTIVE`). Deactivated accounts are immediately blocked from logging in (HTTP 403) and existing bearer tokens are rejected.
- **Administrator Safety Guards**:
  - Prevents an administrator from deactivating their own account (HTTP 400).
  - Prevents an administrator from demoting their own account (HTTP 400).
  - Prevents deactivating or demoting the last remaining active administrator in the system (HTTP 400).

### 3. API Endpoints
- `GET /api/admin/users`: List all platform users with optional role, status, and search filters (ADMIN only).
- `GET /api/admin/users/{id}`: Fetch detailed user profile (ADMIN only).
- `POST /api/admin/users`: Create a new user with unique username, email, and valid role (ADMIN only).
- `PATCH /api/admin/users/{id}/role`: Update user role with last-admin guard (ADMIN only).
- `PATCH /api/admin/users/{id}/status`: Activate or deactivate user with self-deactivation and last-admin guards (ADMIN only).

---

## 📌 Important Limitations & Scope Boundary
- **No Backend Image Storage**: Photo selection currently operates as a client-side session preview. Binary file uploads to cloud/disk storage will be introduced in future phases.
- **Explainable Rules-Based Model**: Phase 10 deliberately uses a transparent mathematical scoring model rather than black-box ML to guarantee zero hallucinated predictions on small datasets.
- **Guarded Polling**: Telemetry, broadcasts, violations, intelligence analytics, risk assessments, GIS map layers, operational notifications, and work orders auto-refresh every 30 seconds via active-request guards when viewing their respective tabs.
- **Honest Spatial Coordinates**: Features without live onboard GPS use deterministic municipal reference coordinates tagged explicitly with their provenance source.
- **In-System Operations Only**: Work orders, administration, and notifications operate strictly within the municipal control center interface and PostgreSQL database without third-party external SMS, WhatsApp, push messaging, or mobile crew GPS tracking integrations.
- **Sequence Concurrency Model**: Atomic ID generation depends on PostgreSQL `work_order_id_seq` and `notification_id_seq`. In non-sequence environments (such as pure in-memory SQLite mocks), ID generation falls back to max-ID table scans which may experience race conditions under high concurrent insertion volumes.
- **Field Telemetry & Costs**: Remediation expenditure and resolution notes are entered manually by authorized operators upon verification rather than via automated third-party accounting or ERP integrations.

---

## 👥 Team

- Chiranjiv Kuhikar

---

## Status

🚧 Under Development — Phase 17 Completed