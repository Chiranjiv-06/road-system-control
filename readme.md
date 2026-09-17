# 🚦 Road System Control

An AI-powered Road System Control platform developed for a Hackathon.

## 📌 Problem Statement

Current road management systems are mostly reactive. Authorities receive complaints after accidents, potholes, or traffic congestion occur. This project aims to provide a centralized platform for reporting road issues and improving traffic management.

---

## 🚀 Features

- Road issue reporting (Full-stack integrated with PostgreSQL)
- Real-time traffic monitoring dashboard
- Emergency alert dispatch
- Traffic violation and rule enforcement management
- Cross-domain traffic analytics & intelligence center
- Explainable AI risk & incident intelligence (0–100 composite risk scoring, tactical recommendations)
- Interactive map integration (Offline-first Leaflet GIS operations map)
- Role-routed operational notifications & escalation
- Field work orders & incident dispatch operations (Municipal crew mobilization, SLA tracking, closed-loop resolution)
- Admin dashboard & RBAC

---

## 🛠 Tech Stack

### Frontend
- HTML5 & CSS3
- Vanilla JavaScript (`fetch()` API, Zero external frameworks)

### Backend
- Python 3.13
- FastAPI REST API
- SQLAlchemy ORM

### Database
- PostgreSQL

---

## 📂 Project Structure

```
road-system-control/
│
├── frontend/
│   ├── index.html       # Dynamic dashboard, modal & reporting form
│   ├── style.css        # Responsive styling & status indicators
│   ├── script.js        # API integration, state management & validation
│   └── vendor/leaflet/  # Offline Leaflet 1.9.4 GIS bundle (CSS, JS, images)
│
├── backend/
│   ├── main.py          # FastAPI app, CORS & startup table creation
│   ├── database.py      # SQLAlchemy engine & session dependency
│   ├── seed_traffic.py  # Manual demo seed script for traffic corridors
│   ├── seed_emergency_alerts.py # Manual demo seed script for emergency alerts
│   ├── seed_traffic_violations.py # Manual demo seed script for traffic violations
│   ├── seed_users.py    # Manual demo seed script for operator accounts
│   ├── requirements.txt # Minimal Python dependencies
│   ├── models/
│   │   ├── __init__.py  # Model exports (Issue, TrafficRecord, EmergencyAlert, TrafficViolation, User, Notification, WorkOrder)
│   │   ├── issue.py     # SQLAlchemy Issue model (with latitude/longitude)
│   │   ├── traffic.py   # SQLAlchemy TrafficRecord model (with latitude/longitude)
│   │   ├── emergency_alert.py # SQLAlchemy EmergencyAlert model (with latitude/longitude)
│   │   ├── traffic_violation.py # SQLAlchemy TrafficViolation model (with latitude/longitude)
│   │   ├── user.py      # SQLAlchemy User model ('users' table)
│   │   ├── notification.py # SQLAlchemy Notification model ('notifications' table)
│   │   └── work_order.py # SQLAlchemy WorkOrder model ('work_orders' table)
│   ├── routes/
│   │   ├── issues.py    # REST API endpoints (/api/issues)
│   │   ├── traffic.py   # REST API endpoints (/api/traffic)
│   │   ├── emergency_alerts.py # REST API endpoints (/api/emergency-alerts)
│   │   ├── traffic_violations.py # REST API endpoints (/api/traffic-violations)
│   │   ├── analytics.py # REST API endpoints (/api/analytics)
│   │   ├── risk.py      # REST API endpoints (/api/risk)
│   │   ├── auth.py      # REST API endpoints (/api/auth)
│   │   ├── map.py       # REST API endpoints (/api/map/overview, /api/map/work-orders)
│   │   ├── notifications.py # REST API endpoints (/api/notifications)
│   │   └── work_orders.py # REST API endpoints (/api/work-orders)
│   ├── schemas/
│   │   ├── issue.py     # Pydantic validation for issues
│   │   ├── traffic.py   # Pydantic validation for traffic records & summary
│   │   ├── emergency_alert.py # Pydantic validation for emergency alerts & status updates
│   │   ├── traffic_violation.py # Pydantic validation for traffic violations & status updates
│   │   ├── analytics.py # Pydantic validation for analytics responses
│   │   ├── risk.py      # Pydantic validation for risk scores & explainability
│   │   ├── user.py      # Pydantic validation for authentication & users
│   │   ├── map.py       # Pydantic validation for GIS map features & overview
│   │   ├── notification.py # Pydantic validation for operational notifications
│   │   └── work_order.py # Pydantic validation for field work orders
│   ├── services/
│   │   ├── issue_service.py   # Issue persistence & sequential ISS-XXXX generator
│   │   ├── traffic_service.py # Traffic persistence & sequential TRF-XXXX generator
│   │   ├── emergency_alert_service.py # Alert persistence & sequential EMG-XXXX generator
│   │   ├── traffic_violation_service.py # Violation persistence & sequential VIO-XXXX generator
│   │   ├── analytics_service.py # Cross-domain analytics calculation engine
│   │   ├── risk_service.py    # Explainable multi-domain risk evaluation engine
│   │   ├── auth_service.py    # Authentication, password hashing, and JWT engine
│   │   ├── map_service.py     # Multi-domain GIS resolver & spatial provenance engine
│   │   ├── notification_service.py # Role routing, duplicate prevention & operational sync
│   │   └── work_order_service.py # Lifecycle enforcement, SLA engine & closed-loop resolution
│   ├── test_phase4.py   # Automated tests for Phase 4 (issues persistence)
│   ├── test_phase6.py   # Automated tests for Phase 6 (traffic monitoring)
│   ├── test_phase7.py   # Automated tests for Phase 7 (emergency alert management)
│   ├── test_phase8.py   # Automated tests for Phase 8 (traffic violation management)
│   ├── test_phase9.py   # Automated tests for Phase 9 (analytics & intelligence)
│   ├── test_phase10.py  # Automated tests for Phase 10 (risk intelligence & scoring)
│   ├── test_phase11.py  # Automated tests for Phase 11 (authentication & RBAC)
│   ├── test_phase12.py  # Automated tests for Phase 12 (interactive GIS map)
│   ├── test_phase13.py  # Automated tests for Phase 13 (notifications & escalation)
│   └── test_phase14.py  # Automated tests for Phase 14 (field work orders & dispatch)
│
├── docs/
├── .env.example         # Environment template
├── .gitignore
└── README.md
```

---

## 🔄 Project Development Roadmap

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
- **Phase 14**: Field Work Orders & Incident Dispatch Operations (SLA tracking, crew mobilization, closed-loop resolution, RBAC) — **Completed**

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

## 📌 Important Limitations & Scope Boundary
- **No Backend Image Storage**: Photo selection currently operates as a client-side session preview. Binary file uploads to cloud/disk storage will be introduced in future phases.
- **Explainable Rules-Based Model**: Phase 10 deliberately uses a transparent mathematical scoring model rather than black-box ML to guarantee zero hallucinated predictions on small datasets.
- **Guarded Polling**: Telemetry, broadcasts, violations, intelligence analytics, risk assessments, GIS map layers, operational notifications, and work orders auto-refresh every 30 seconds via active-request guards when viewing their respective tabs.
- **Honest Spatial Coordinates**: Features without live onboard GPS use deterministic municipal reference coordinates tagged explicitly with their provenance source.
- **In-System Notifications Only**: Phase 13 notifications operate strictly within the municipal control center interface and PostgreSQL database without third-party external SMS or push messaging integrations.
- **Sequence Concurrency Model**: Atomic ID generation depends on PostgreSQL `work_order_id_seq` and `notification_id_seq`. In non-sequence environments (such as pure in-memory SQLite mocks), ID generation falls back to max-ID table scans which may experience race conditions under high concurrent insertion volumes.
- **Field Telemetry & Costs**: Remediation expenditure and resolution notes are entered manually by authorized operators upon verification rather than via automated third-party accounting or ERP integrations.

---

## 👥 Team

- Chiranjiv Kuhikar

---

## Status

🚧 Under Development — Phase 14 Completed