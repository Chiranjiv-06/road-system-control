from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models.issue  # Ensure models are imported so Base knows about the 'issues' table
from routes.issues import router as issues_router

# Automatically create tables in PostgreSQL on application startup
# (No Alembic required for Phase 4)
Base.metadata.create_all(bind=engine)

# Initialize FastAPI Application
app = FastAPI(
    title="Road System Control API",
    description="API for road issue reporting and traffic management.",
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

# Include issue management router
app.include_router(issues_router)

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
