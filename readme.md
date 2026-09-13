# 🚦 Road System Control

An AI-powered Road System Control platform developed for a Hackathon.

## 📌 Problem Statement

Current road management systems are mostly reactive. Authorities receive complaints after accidents, potholes, or traffic congestion occur. This project aims to provide a centralized platform for reporting road issues and improving traffic management.

---

## 🚀 Features

- Road issue reporting (Full-stack integrated with PostgreSQL)
- Real-time traffic monitoring dashboard
- Emergency alert dispatch
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
│   ├── requirements.txt # Minimal Python dependencies
│   ├── models/
│   │   ├── __init__.py  # Model exports (Issue, TrafficRecord)
│   │   ├── issue.py     # SQLAlchemy Issue model ('issues' table)
│   │   └── traffic.py   # SQLAlchemy TrafficRecord model ('traffic_records' table)
│   ├── routes/
│   │   ├── issues.py    # REST API endpoints (/api/issues)
│   │   └── traffic.py   # REST API endpoints (/api/traffic)
│   ├── schemas/
│   │   ├── issue.py     # Pydantic validation for issues
│   │   └── traffic.py   # Pydantic validation for traffic records & summary
│   ├── services/
│   │   ├── issue_service.py   # Issue persistence & sequential ISS-XXXX ID generator
│   │   └── traffic_service.py # Traffic persistence & sequential TRF-XXXX generator
│   ├── test_phase4.py   # Automated tests for Phase 4 (issues persistence)
│   └── test_phase6.py   # Automated tests for Phase 6 (traffic monitoring)
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
- **Phase 6**: Traffic Monitoring (Full-stack telemetry, PostgreSQL, summary API, polling) — **Completed**
- **Phase 7**: Emergency Alerts / Map Integration — *Upcoming*

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
To populate demo traffic corridor records (only runs if the table is empty):
```bash
cd backend
python seed_traffic.py
```

### 3. Automated Verification Testing
Run the comprehensive test suites:
```bash
cd backend
# Phase 4 Regression Test (Issues persistence)
python test_phase4.py

# Phase 6 Verification Test (Traffic monitoring endpoints & validation)
python test_phase6.py
```

---

## 📌 Important Limitations & Scope Boundary
- **No Backend Image Storage**: Photo selection currently operates as a client-side session preview. Binary file uploads to cloud/disk storage will be introduced in future phases.
- **No Maps or AI Libraries**: Phase 6 strictly utilizes Vanilla HTML/CSS/JS without external mapping libraries (Leaflet/Google Maps) or AI prediction models.
- **Guarded Polling**: Traffic telemetry auto-refreshes every 30 seconds via an active-request guard when viewing the Dashboard or Traffic Monitoring tabs.

---

## 👥 Team

- Chiranjiv Kuhikar

---

## Status

🚧 Under Development — Phase 6 Completed