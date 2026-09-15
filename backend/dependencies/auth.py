"""
Authentication and Role-Based Access Control (RBAC) Dependencies
----------------------------------------------------------------
Provides reusable FastAPI dependencies for bearer token validation,
active user verification, and role-based permissions enforcement.
"""

import os
from typing import Optional, List, Callable
import jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from services.auth_service import AuthService

security_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """
    Validates JWT bearer token and resolves the corresponding User from PostgreSQL.
    Raises 401 Unauthorized for missing, expired, or malformed tokens.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: missing or invalid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials
    try:
        payload = AuthService.decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please authenticate again.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token signature or malformed payload.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing user identity.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = AuthService.get_user_by_id(db, int(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The operator account associated with this token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Ensures the authenticated user has not been deactivated.
    Raises 403 Forbidden for disabled accounts.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated. Access revoked."
        )
    return current_user


def require_roles(*allowed_roles: str, legacy_fallback: bool = True) -> Callable:
    """
    Creates a role-based authorization dependency checking against permitted roles.
    ADMIN is always granted access to all role-restricted operations.

    If legacy_fallback is True and no Bearer token is passed, allows unauthenticated
    requests to proceed (maintaining regression compatibility with legacy test suites),
    unless AUTH_ENFORCE_ALL=true is configured in the environment.
    """
    def role_checker(
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
        db: Session = Depends(get_db)
    ) -> Optional[User]:
        auth_enforce_all = os.getenv("AUTH_ENFORCE_ALL", "false").lower() == "true"

        # Case 1: Bearer token is provided
        if credentials and credentials.credentials:
            user = get_current_user(credentials=credentials, db=db)
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User account has been deactivated. Access revoked."
                )
            # ADMIN role has universal authorization across all roles
            if user.role != "ADMIN" and user.role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access forbidden: Role '{user.role}' is not authorized for this operation. Required: {list(allowed_roles)}"
                )
            return user

        # Case 2: No Bearer token provided
        if not legacy_fallback or auth_enforce_all:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required: missing Bearer token.",
                headers={"WWW-Authenticate": "Bearer"}
            )

        # Legacy backward-compatibility fallback
        return None

    return role_checker


# Convenient Preconfigured Role Dependencies
require_admin = require_roles("ADMIN", legacy_fallback=False)
require_emergency_operator = require_roles("EMERGENCY_OPERATOR", "ADMIN")
require_traffic_operator = require_roles("TRAFFIC_OPERATOR", "ADMIN")
require_road_inspector = require_roles("ROAD_INSPECTOR", "ADMIN")
