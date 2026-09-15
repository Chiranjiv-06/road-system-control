"""
User SQLAlchemy ORM Model
-------------------------
Represents the 'users' table in PostgreSQL for authentication and
Role-Based Access Control (RBAC).
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    
    # Allowed roles: "ADMIN", "TRAFFIC_OPERATOR", "EMERGENCY_OPERATOR", "ROAD_INSPECTOR"
    role = Column(String(30), nullable=False, index=True, default="ROAD_INSPECTOR")
    
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<User id={self.id} username='{self.username}' role='{self.role}' active={self.is_active}>"
