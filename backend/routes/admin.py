"""
Admin System Administration Routes (Phase 17)
---------------------------------------------
Provides ADMIN-only endpoints for managing municipal platform users,
roles, and active states with strict RBAC and last-administrator protection.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.user import (
    UserResponse,
    AdminUserCreate,
    UserRoleUpdate,
    AdminUserStatusUpdate,
)
from services.auth_service import AuthService
from dependencies.auth import require_admin

router = APIRouter(prefix="/api/admin/users", tags=["System Administration"])


@router.get(
    "",
    response_model=List[UserResponse],
    summary="List all system users (Admin only)",
    description="Returns all registered users with optional role, status, and search filtering."
)
@router.get(
    "/",
    response_model=List[UserResponse],
    include_in_schema=False
)
def list_system_users(
    role: Optional[str] = Query(None, description="Filter by user role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search username, email, or full name"),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> List[User]:
    query = db.query(User)

    if role:
        query = query.filter(User.role == role.strip())

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            (User.username.ilike(pattern)) |
            (User.email.ilike(pattern)) |
            (User.full_name.ilike(pattern))
        )

    return query.order_by(User.id.asc()).all()


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get user details by ID (Admin only)",
    description="Fetches detailed user profile. Requires ADMIN role."
)
def get_user_detail(
    user_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )
    return user


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new system user (Admin only)",
    description="Provisions a new system user account with validated role and unique credentials."
)
@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False
)
def create_system_user(
    user_in: AdminUserCreate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> User:
    clean_username = user_in.username.strip()
    clean_email = user_in.email.strip().lower()

    # Uniqueness validations (case-insensitive)
    if db.query(User).filter(User.username.ilike(clean_username)).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{clean_username}' is already taken."
        )

    if db.query(User).filter(User.email.ilike(clean_email)).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{clean_email}' is already registered."
        )

    password_hash = AuthService.get_password_hash(user_in.password)
    full_name = user_in.resolve_full_name()
    is_active = user_in.resolve_is_active()

    new_user = User(
        username=clean_username,
        email=clean_email,
        password_hash=password_hash,
        full_name=full_name,
        role=user_in.role,
        is_active=is_active
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.patch(
    "/{user_id}/role",
    response_model=UserResponse,
    summary="Update a user's role (Admin only)",
    description="Assigns a new authorized role to a user. Prevents demoting the last active administrator."
)
def update_user_role(
    user_id: int,
    role_in: UserRoleUpdate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> User:
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )

    # Admin Safety: Prevent demoting administrator
    if target_user.role == "ADMIN" and role_in.role != "ADMIN":
        if admin_user.id == target_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote your own administrator account."
            )
        if target_user.is_active:
            active_admins = db.query(User).filter(User.role == "ADMIN", User.is_active == True).count()
            if active_admins <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot demote the last active administrator."
                )

    target_user.role = role_in.role
    db.commit()
    db.refresh(target_user)
    return target_user


@router.patch(
    "/{user_id}/status",
    response_model=UserResponse,
    summary="Update a user's active status (Admin only)",
    description="Activates or deactivates a user account. Prevents deactivating the last active administrator and self-deactivation."
)
def update_user_status(
    user_id: int,
    status_in: AdminUserStatusUpdate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> User:
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )

    new_active = status_in.resolve_is_active()

    # Admin Safety: Deactivation protection
    if not new_active:
        # Prevent self-deactivation
        if admin_user.id == target_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate your own administrator account."
            )

        # Prevent deactivating the last active administrator
        if target_user.role == "ADMIN" and target_user.is_active:
            active_admins = db.query(User).filter(User.role == "ADMIN", User.is_active == True).count()
            if active_admins <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot deactivate the last active administrator."
                )

    target_user.is_active = new_active
    db.commit()
    db.refresh(target_user)
    return target_user
