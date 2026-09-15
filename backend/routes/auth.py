"""
FastAPI Authentication and User Management Routes
-------------------------------------------------
Provides endpoints for login, session resolution, logout,
and administrator-managed operator account provisioning.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.user import (
    LoginRequest,
    TokenResponse,
    UserResponse,
    UserCreate,
    UserStatusUpdate,
    UserListResponse
)
from services.auth_service import AuthService
from dependencies.auth import (
    get_current_active_user,
    require_admin,
    require_roles
)

router = APIRouter(prefix="/api/auth", tags=["Authentication & Access Control"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate operator credentials",
    description="Validates username/email and password, returning a signed JWT access token and user profile."
)
def login(login_req: LoginRequest, db: Session = Depends(get_db)):
    user = AuthService.authenticate_user(db, login_req.username, login_req.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact system administrator."
        )

    token, expires_in = AuthService.create_access_token(
        subject=user.username,
        role=user.role,
        user_id=user.id
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
        user=user
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated operator profile",
    description="Resolves JWT token to identify the current logged-in user."
)
def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    return current_user


@router.post(
    "/logout",
    summary="Log out of current session",
    description="Terminates client-side session. Stateless JWT can be discarded by client."
)
def logout():
    return {
        "status": "ok",
        "message": "Session terminated successfully."
    }


@router.get(
    "/users",
    response_model=UserListResponse,
    summary="List all operator accounts (Admin only)",
    description="Returns all registered operators. Requires ADMIN role."
)
def list_operator_accounts(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    users = AuthService.list_users(db)
    return UserListResponse(total=len(users), users=users)


@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new operator account (Admin only)",
    description="Provisions a new operator user account. Requires ADMIN role."
)
def create_operator_account(
    user_in: UserCreate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        new_user = AuthService.create_user(db, user_in)
        return new_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account."
        )


@router.patch(
    "/users/{user_id}/status",
    response_model=UserResponse,
    summary="Update operator active status (Admin only)",
    description="Enables or disables an operator account. Requires ADMIN role."
)
def update_operator_status(
    user_id: int,
    status_update: UserStatusUpdate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    updated = AuthService.update_user_status(db, user_id, status_update.is_active)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )
    return updated


# --------------------------------------------------------------------------
# Role-Based Verification Endpoints (Directly tests RBAC enforcement)
# --------------------------------------------------------------------------
@router.get(
    "/rbac/admin",
    summary="Verify ADMIN authorization",
    description="Strictly restricted to ADMIN."
)
def verify_admin_access(
    user: User = Depends(require_roles("ADMIN", legacy_fallback=False))
):
    return {"access": "granted", "role": user.role, "required": ["ADMIN"]}


@router.get(
    "/rbac/traffic",
    summary="Verify TRAFFIC_OPERATOR authorization",
    description="Restricted to TRAFFIC_OPERATOR and ADMIN."
)
def verify_traffic_operator_access(
    user: User = Depends(require_roles("TRAFFIC_OPERATOR", "ADMIN", legacy_fallback=False))
):
    return {"access": "granted", "role": user.role, "required": ["TRAFFIC_OPERATOR", "ADMIN"]}


@router.get(
    "/rbac/emergency",
    summary="Verify EMERGENCY_OPERATOR authorization",
    description="Restricted to EMERGENCY_OPERATOR and ADMIN."
)
def verify_emergency_operator_access(
    user: User = Depends(require_roles("EMERGENCY_OPERATOR", "ADMIN", legacy_fallback=False))
):
    return {"access": "granted", "role": user.role, "required": ["EMERGENCY_OPERATOR", "ADMIN"]}


@router.get(
    "/rbac/inspector",
    summary="Verify ROAD_INSPECTOR authorization",
    description="Restricted to ROAD_INSPECTOR and ADMIN."
)
def verify_road_inspector_access(
    user: User = Depends(require_roles("ROAD_INSPECTOR", "ADMIN", legacy_fallback=False))
):
    return {"access": "granted", "role": user.role, "required": ["ROAD_INSPECTOR", "ADMIN"]}
