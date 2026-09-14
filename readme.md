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
- Interactive map integration (Upcoming)
- AI-based issue prioritization (Future Scope)
- Admin dashboard (Upcoming)

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
│   └── script.js        # API integration, state management & validation
│
├── backend/
│   ├── main.py          # FastAPI app, CORS & startup table creation
│   ├── database.py      # SQLAlchemy engine & session dependency
│   ├── seed_traffic.py  # Manual demo seed script for traffic corridors
│   ├── seed_emergency_alerts.py # Manual demo seed script for emergency alerts
│   ├── seed_traffic_violations.py # Manual demo seed script for traffic violations
│   ├── requirements.txt # Minimal Python dependencies
│   ├── models/
│   │   ├── __init__.py  # Model exports (Issue, TrafficRecord, EmergencyAlert, TrafficViolation)
│   │   ├── issue.py     # SQLAlchemy Issue model ('issues' table)
│   │   ├── traffic.py   # SQLAlchemy TrafficRecord model ('traffic_records' table)
│   │   ├── emergency_alert.py # SQLAlchemy EmergencyAlert model ('emergency_alerts' table)
│   │   └── traffic_violation.py # SQLAlchemy TrafficViolation model ('traffic_violations' table)
│   ├── routes/
│   │   ├── issues.py    # REST API endpoints (/api/issues)
│   │   ├── traffic.py   # REST API endpoints (/api/traffic)
│   │   ├── emergency_alerts.py # REST API endpoints (/api/emergency-alerts)
│   │   └── traffic_violations.py # REST API endpoints (/api/traffic-violations)
│   ├── schemas/
│   │   ├── issue.py     # Pydantic validation for issues
│   │   ├── traffic.py   # Pydantic validation for traffic records & summary
│   │   ├── emergency_alert.py # Pydantic validation for emergency alerts & status updates
│   │   └── traffic_violation.py # Pydantic validation for traffic violations & status updates
│   ├── services/
│   │   ├── issue_service.py   # Issue persistence & sequential ISS-XXXX generator
│   │   ├── traffic_service.py # Traffic persistence & sequential TRF-XXXX generator
│   │   ├── emergency_alert_service.py # Alert persistence & sequential EMG-XXXX generator
│   │   └── traffic_violation_service.py # Violation persistence & sequential VIO-XXXX generator
│   ├── test_phase4.py   # Automated tests for Phase 4 (issues persistence)
│   ├── test_phase6.py   # Automated tests for Phase 6 (traffic monitoring)
│   ├── test_phase7.py   # Automated tests for Phase 7 (emergency alert management)
│   └── test_phase8.py   # Automated tests for Phase 8 (traffic violation management)
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
- **Phase 8**: Traffic Violation Management (Rule violations, automated radar tracking, penalties, PostgreSQL) — **Completed**
- **Phase 9**: Interactive Map Integration / Admin Roles — *Upcoming*

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

# Phase 8 Verification Test (Traffic violation management endpoints & validation)
python test_phase8.py
```

---

## 📌 Important Limitations & Scope Boundary
- **No Backend Image Storage**: Photo selection currently operates as a client-side session preview. Binary file uploads to cloud/disk storage will be introduced in future phases.
- **No Maps or AI Libraries**: Phase 8 strictly utilizes Vanilla HTML/CSS/JS without external mapping libraries (Leaflet/Google Maps) or AI prediction models.
- **Guarded Polling**: Traffic telemetry, emergency broadcasts, and violations auto-refresh every 30 seconds via active-request guards (`isTrafficFetching`, `isAlertsFetching`, `isViolationsFetching`) when viewing the Dashboard or respective monitoring tabs.

---

## 👥 Team

- Chiranjiv Kuhikar

---

## Status

🚧 Under Development — Phase 8 Completed