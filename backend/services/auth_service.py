"""
Authentication and Authorization Service Layer
----------------------------------------------
Provides secure bcrypt password hashing, JWT token signing/verification,
user authentication, and operator role management.
"""

import os
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
import jwt
from sqlalchemy.orm import Session
from models.user import User
from schemas.user import UserCreate

# Password Hashing Context using Bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration (read from environment variables)
JWT_SECRET = os.getenv("JWT_SECRET", "road-system-control-secret-key-2026-production-token")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # Default 8 hours


class AuthService:
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verifies a plaintext password against its bcrypt hash."""
        if not plain_password or not hashed_password:
            return False
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_password_hash(password: str) -> str:
        """Generates a secure bcrypt hash for a plaintext password."""
        return pwd_context.hash(password)

    @staticmethod
    def create_access_token(
        subject: str,
        role: str,
        user_id: int,
        expires_delta: Optional[timedelta] = None
    ) -> Tuple[str, int]:
        """
        Encodes a signed JWT with subject, role, user_id, and expiration time.
        Returns: (jwt_token_string, expires_in_seconds)
        """
        now = datetime.now(timezone.utc)
        if expires_delta:
            expire = now + expires_delta
            expires_in = int(expires_delta.total_seconds())
        else:
            expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            expires_in = ACCESS_TOKEN_EXPIRE_MINUTES * 60

        payload = {
            "sub": str(subject),
            "user_id": user_id,
            "role": str(role),
            "iat": int(now.timestamp()),
            "exp": int(expire.timestamp())
        }

        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return token, expires_in

    @staticmethod
    def decode_access_token(token: str) -> Dict[str, Any]:
        """
        Decodes and validates JWT token signature and expiration.
        Raises jwt.PyJWTError or subclass if invalid/expired.
        """
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

    @staticmethod
    def get_user_by_identifier(db: Session, identifier: str) -> Optional[User]:
        """Fetches a user record by username or email (case-insensitive)."""
        clean = identifier.strip().lower()
        return db.query(User).filter(
            (User.username.ilike(clean)) | (User.email.ilike(clean))
        ).first()

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """Fetches a user record by primary key id."""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def authenticate_user(db: Session, identifier: str, password: str) -> Optional[User]:
        """
        Validates credentials. Returns User if valid, None if invalid.
        (Note: Does not reject inactive user here so callers can give a specific message).
        """
        user = AuthService.get_user_by_identifier(db, identifier)
        if not user:
            return None
        if not AuthService.verify_password(password, user.password_hash):
            return None
        return user

    @staticmethod
    def create_user(db: Session, user_in: UserCreate) -> User:
        """Registers a new operator user account with hashed password."""
        clean_username = user_in.username.strip()
        clean_email = user_in.email.strip().lower()

        if db.query(User).filter(User.username.ilike(clean_username)).first():
            raise ValueError(f"Username '{clean_username}' is already taken.")

        if db.query(User).filter(User.email.ilike(clean_email)).first():
            raise ValueError(f"Email '{clean_email}' is already registered.")

        hashed = AuthService.get_password_hash(user_in.password)
        db_user = User(
            username=clean_username,
            email=clean_email,
            password_hash=hashed,
            full_name=user_in.full_name.strip(),
            role=user_in.role,
            is_active=user_in.is_active
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def list_users(db: Session) -> List[User]:
        """Returns all registered users sorted by creation date."""
        return db.query(User).order_by(User.id.asc()).all()

    @staticmethod
    def update_user_status(db: Session, user_id: int, is_active: bool) -> Optional[User]:
        """Updates an operator's active status."""
        user = AuthService.get_user_by_id(db, user_id)
        if not user:
            return None
        user.is_active = is_active
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def ensure_default_users(db: Session) -> int:
        """
        Ensures baseline default operator accounts exist for immediate command-center operation.
        Returns count of created users.
        """
        default_seed = [
            {
                "username": "admin",
                "email": "admin@roadcontrol.gov",
                "password": "AdminPassword@123",
                "full_name": "System Administrator",
                "role": "ADMIN",
                "is_active": True
            },
            {
                "username": "traffic_op",
                "email": "traffic@roadcontrol.gov",
                "password": "TrafficPassword@123",
                "full_name": "Traffic Desk Operator",
                "role": "TRAFFIC_OPERATOR",
                "is_active": True
            },
            {
                "username": "emergency_op",
                "email": "emergency@roadcontrol.gov",
                "password": "EmergencyPassword@123",
                "full_name": "Emergency Dispatcher",
                "role": "EMERGENCY_OPERATOR",
                "is_active": True
            },
            {
                "username": "road_insp",
                "email": "inspector@roadcontrol.gov",
                "password": "InspectorPassword@123",
                "full_name": "Senior Road Inspector",
                "role": "ROAD_INSPECTOR",
                "is_active": True
            }
        ]

        created_count = 0
        for data in default_seed:
            existing = AuthService.get_user_by_identifier(db, data["username"])
            if not existing:
                AuthService.create_user(db, UserCreate(**data))
                created_count += 1
        return created_count
