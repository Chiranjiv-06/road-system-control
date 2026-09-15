from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models.issue  # Ensure models are imported so Base knows about the 'issues' table
import models.traffic  # Ensure models are imported so Base knows about the 'traffic_records' table
import models.emergency_alert  # Ensure Base knows about 'emergency_alerts' table
import models.traffic_violation  # Ensure Base knows about 'traffic_violations' table
import models.user  # Ensure Base knows about 'users' table
from routes.issues import router as issues_router
from routes.traffic import router as traffic_router
from routes.emergency_alerts import router as emergency_alerts_router
from routes.traffic_violations import router as traffic_violations_router
from routes.analytics import router as analytics_router
from routes.risk import router as risk_router
from routes.auth import router as auth_router
from routes.map import router as map_router
from database import SessionLocal, ensure_spatial_columns
from services.auth_service import AuthService

# Automatically create tables in PostgreSQL on application startup
Base.metadata.create_all(bind=engine)

# Ensure optional spatial columns exist (Phase 12 GIS foundation)
ensure_spatial_columns()

# Auto-provision baseline operators if users table is uninitialized
try:
    _db = SessionLocal()
    AuthService.ensure_default_users(_db)
    _db.close()
except Exception as _e:
    pass

# Initialize FastAPI Application
app = FastAPI(
    title="Road System Control API",
    description="API for road issue reporting, traffic monitoring, emergency dispatch, and RBAC authentication.",
    version="1.0.0"
)

# CORS configuration for local frontend communication
origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://localhost:5500",
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:3000",
    "null"  # Supports opening frontend directly via file:// in browser
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include issue management, traffic monitoring, emergency alert, traffic violation, analytics, risk, and auth routers
app.include_router(issues_router)
app.include_router(traffic_router)
app.include_router(emergency_alerts_router)
app.include_router(traffic_violations_router)
app.include_router(analytics_router)
app.include_router(risk_router)
app.include_router(auth_router)
app.include_router(map_router)

@app.get(
    "/api/health",
    tags=["System Health"],
    summary="Service Health Check"
)
def health_check():
    """Health check endpoint to verify backend service status."""
    return {
        "status": "ok",
        "service": "road-system-control"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
