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
- JavaScript

### Backend
- Python
- FastAPI

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
│   ├── requirements.txt
│   ├── routes/
│   │   └── issues.py
│   ├── schemas/
│   │   └── issue.py
│   └── services/
│       └── issue_service.py
│
├── docs/
│
└── README.md
```

---

## ⚙️ Backend Setup & API Documentation

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Run the FastAPI Server
```bash
uvicorn main:app --reload
```
The server will start at `http://127.0.0.1:8000`.

### 3. Interactive API Documentation (Swagger)
Once the server is running, open:
- Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Redoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)


---

## 👥 Team

- Chiranjiv Kuhikar

---

## Status

🚧 Under Development