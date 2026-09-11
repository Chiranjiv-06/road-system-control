# 🚦 Road System Control

An AI-powered Road System Control platform developed for a Hackathon.

## 📌 Problem Statement

Current road management systems are mostly reactive. Authorities receive complaints after accidents, potholes, or traffic congestion occur. This project aims to provide a centralized platform for reporting road issues and improving traffic management.

---

## 🚀 Features

- Road issue reporting
- Traffic monitoring dashboard
- Emergency alerts
- Interactive map integration
- AI-based issue prioritization (Future Scope)
- Admin dashboard

---

## 🛠 Tech Stack

### Frontend
- HTML5
- CSS3
- JavaScript (Vanilla)

### Backend
- Python
- FastAPI
- SQLAlchemy ORM

### Database
- PostgreSQL

---

## 📂 Project Structure

```
road-system-control/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── requirements.txt
│   ├── models/
│   │   └── issue.py
│   ├── routes/
│   │   └── issues.py
│   ├── schemas/
│   │   └── issue.py
│   └── services/
│       └── issue_service.py
│
├── docs/
├── .env.example
├── .gitignore
└── README.md
```

---

## 🔄 Project Development Roadmap

- **Phase 1**: Frontend Foundation (UI, layout, mock data feed)
- **Phase 2**: Road Issue Reporting (Frontend validation, form, localStorage)
- **Phase 3**: FastAPI REST API Foundation (In-memory issue storage)
- **Phase 4**: PostgreSQL Database Persistence (SQLAlchemy ORM + PostgreSQL)
- **Phase 5**: Frontend ↔ FastAPI ↔ PostgreSQL Integration *(Upcoming)*

> [!NOTE]
> In Phase 4, backend persistence with PostgreSQL is complete. The frontend currently continues to use `localStorage` and will be connected to the FastAPI endpoints in Phase 5.

---

## ⚙️ Backend Setup & Database Guide

### 1. Database Prerequisites
Make sure PostgreSQL is installed and running locally:
- **Database Name**: `road_system_control`
- **Table Name**: `issues` (auto-created on application startup by SQLAlchemy)

Create the database in PostgreSQL if not already present:
```sql
CREATE DATABASE road_system_control;
```

### 2. Environment Configuration
Copy the template configuration file:
```bash
cp .env.example .env
```
Edit `.env` and provide your PostgreSQL credentials:
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/road_system_control
```

### 3. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 4. Run the FastAPI Server
```bash
uvicorn main:app --reload
```
The server will start at `http://127.0.0.1:8000`.

### 5. Interactive API Documentation (Swagger)
Once the server is running, explore and test the endpoints:
- Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Redoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### 6. Verify Database Records
You can verify saved issues directly via `psql`:
```sql
\c road_system_control
SELECT id, issue_type, location, severity, status FROM issues;
```

---

## 👥 Team

- Chiranjiv Kuhikar

---

## Status

🚧 Under Development — Phase 4 Completed