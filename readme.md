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
│   ├── requirements.txt # Minimal Python dependencies
│   ├── models/
│   │   └── issue.py     # SQLAlchemy Issue model ('issues' table)
│   ├── routes/
│   │   └── issues.py    # REST API endpoints (/api/issues)
│   ├── schemas/
│   │   └── issue.py     # Pydantic validation & response serialization
│   └── services/
│       └── issue_service.py # PostgreSQL persistence & sequential ID generator
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
- **Phase 5**: Frontend ↔ FastAPI ↔ PostgreSQL Integration — **Completed**
- **Phase 6**: Next Planned Phase (e.g. Traffic Monitoring / Emergency Alerts / Maps) — *Upcoming*

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

---

## 📌 Important Limitations & Scope Boundary
- **No Backend Image Storage**: Photo selection currently operates as a client-side session preview. Binary file uploads to cloud/disk storage will be introduced in future phases.
- **localStorage Removed**: `localStorage` is no longer used for road issue persistence; all records reside in PostgreSQL.
- **Phase 6 Scope**: Traffic telemetry, map integration, and emergency broadcasts remain planned for upcoming phases.

---

## 👥 Team

- Chiranjiv Kuhikar

---

## Status

🚧 Under Development — Phase 5 Completed