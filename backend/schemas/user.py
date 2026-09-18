"""
Pydantic Schemas for Authentication and User Management
-------------------------------------------------------
Handles login credentials, JWT token responses, user profiles,
operator creation, and status modifications.
"""

from typing import Optional, List, Literal
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, field_validator

# Standard Operator Roles
UserRole = Literal["ADMIN", "TRAFFIC_OPERATOR", "EMERGENCY_OPERATOR", "ROAD_INSPECTOR"]


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=120, description="Username or Email address")
    password: str = Field(..., min_length=1, max_length=128, description="Account password")


class UserResponse(BaseModel):
    id: int = Field(..., description="Unique user ID")
    username: str = Field(..., description="Login username")
    email: str = Field(..., description="User contact email")
    full_name: str = Field(..., description="Operator display name")
    role: UserRole = Field(..., description="Assigned authorization role")
    is_active: bool = Field(..., description="Whether user account is active")
    created_at: Optional[datetime] = Field(None, description="Account creation timestamp")

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="Signed JSON Web Token")
    token_type: str = Field("bearer", description="Token scheme type")
    expires_in: int = Field(..., description="Validity period in seconds")
    user: UserResponse = Field(..., description="Authenticated user profile")


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: str = Field(..., min_length=5, max_length=120, description="Unique email address")
    password: str = Field(..., min_length=6, max_length=128, description="Plaintext password to be hashed")
    full_name: str = Field(..., min_length=2, max_length=100, description="Operator full name")
    role: UserRole = Field("ROAD_INSPECTOR", description="Assigned role")
    is_active: bool = Field(True, description="Initial account active state")


class UserStatusUpdate(BaseModel):
    is_active: bool = Field(..., description="Updated active status")


class UserListResponse(BaseModel):
    total: int = Field(..., ge=0)
    users: List[UserResponse] = Field(default_factory=list)


class AdminUserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: EmailStr = Field(..., description="Unique email address")
    password: str = Field(..., min_length=6, max_length=128, description="Plaintext password to be hashed")
    role: UserRole = Field(..., description="Assigned authorization role")
    full_name: Optional[str] = Field(None, max_length=100, description="Operator full name")
    is_active: Optional[bool] = Field(None, description="Initial account active state")
    active: Optional[bool] = Field(None, description="Alternative boolean for active")
    status: Optional[str] = Field(None, description="Alternative status string ('ACTIVE' / 'INACTIVE')")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.strip().upper()
            if clean not in ("ACTIVE", "INACTIVE"):
                raise ValueError("Status must be 'ACTIVE' or 'INACTIVE'.")
            return clean
        return v

    def resolve_is_active(self) -> bool:
        if self.status is not None:
            return self.status == "ACTIVE"
        if self.is_active is not None:
            return bool(self.is_active)
        if self.active is not None:
            return bool(self.active)
        return True

    def resolve_full_name(self) -> str:
        if self.full_name and self.full_name.strip():
            return self.full_name.strip()
        return self.username.strip()


class UserRoleUpdate(BaseModel):
    role: UserRole = Field(..., description="New authorization role")


class AdminUserStatusUpdate(BaseModel):
    is_active: Optional[bool] = Field(None, description="Updated active status")
    active: Optional[bool] = Field(None, description="Alternative boolean for active")
    status: Optional[str] = Field(None, description="Status string: ACTIVE or INACTIVE")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.strip().upper()
            if clean not in ("ACTIVE", "INACTIVE"):
                raise ValueError("Status must be 'ACTIVE' or 'INACTIVE'.")
            return clean
        return v

    def resolve_is_active(self) -> bool:
        if self.status is not None:
            return self.status == "ACTIVE"
        if self.is_active is not None:
            return bool(self.is_active)
        if self.active is not None:
            return bool(self.active)
        raise ValueError("Must provide 'is_active', 'active', or 'status'.")
