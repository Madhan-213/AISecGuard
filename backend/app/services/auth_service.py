"""
AISecGuard — Authentication Service
Week 5: JWT token creation, password hashing, user management.

Security design:
- Passwords hashed with bcrypt via passlib (work factor 12)
- Access tokens: short-lived (30 min) signed HS256 JWT
- Refresh tokens: long-lived (7 days) signed HS256 JWT with type claim
- Tokens validated via get_current_user FastAPI dependency
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.models.enums import UserRole

# Dummy hash for constant-time comparison when user not found
DUMMY_BCRYPT_HASH = "$2b$12$e8NdwKOGz1n8.L1XvS07..gqf0uD7W9uC1k8k2u71mQ/U1p4K6Q7K"

# Token type claims
TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"

# Refresh token TTL
REFRESH_TOKEN_EXPIRE_DAYS = 7


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt (work factor 12)."""
    pwd_bytes = plain_password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a stored bcrypt hash."""
    pwd_bytes = plain_password.encode("utf-8")[:72]
    try:
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode("utf-8"))
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def _create_token(subject: str, token_type: str, expires_delta: timedelta) -> str:
    """
    Internal: create a signed JWT with expiry and type claims.

    Args:
        subject: the user id (UUID string)
        token_type: "access" or "refresh"
        expires_delta: token lifetime

    Returns:
        Encoded JWT string.
    """
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": subject,
        "type": token_type,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(user_id: str) -> str:
    """Create a short-lived access JWT for the given user id."""
    return _create_token(
        subject=user_id,
        token_type=TOKEN_TYPE_ACCESS,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: str) -> str:
    """Create a long-lived refresh JWT for the given user id."""
    return _create_token(
        subject=user_id,
        token_type=TOKEN_TYPE_REFRESH,
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str, expected_type: str) -> Optional[str]:
    """
    Decode and validate a JWT.

    Returns the subject (user id) if valid, None otherwise.
    Validates:
    - Signature and expiry (jose handles this)
    - Token type claim matches expected_type
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != expected_type:
            return None
        return payload.get("sub")
    except JWTError:
        return None


# ---------------------------------------------------------------------------
# User CRUD
# ---------------------------------------------------------------------------

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Fetch a user by email address. Returns None if not found."""
    return db.query(User).filter(User.email == email.lower().strip()).first()


def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    """Fetch a user by primary key (UUID string). Returns None if not found."""
    return db.query(User).filter(User.id == user_id).first()


def create_user(
    db: Session,
    email: str,
    password: str,
    full_name: str = "",
    role: Optional[str] = None,
) -> User:
    """
    Create a new user account.

    Args:
        role: Optional role string (ADMIN/ANALYST/AUDITOR). Defaults to ANALYST.

    Raises:
        ValueError: if email is already registered or role is invalid.
    """
    email = email.lower().strip()
    if get_user_by_email(db, email):
        raise ValueError(f"Email already registered: {email}")

    # Validate and normalize role
    valid_roles = {r.value for r in UserRole}
    resolved_role = (role or UserRole.ANALYST.value).upper()
    if resolved_role not in valid_roles:
        raise ValueError(f"Invalid role '{role}'. Must be one of: {', '.join(sorted(valid_roles))}")

    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name or None,
        is_active=True,
        is_admin=True,  # Full access to their own workspace and features
        role=resolved_role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """
    Verify email + password credentials.

    Returns the User on success, None on failure.
    Uses constant-time comparison (bcrypt inherently does this).
    """
    user = get_user_by_email(db, email)
    if not user:
        # Run a dummy verify to prevent timing oracle
        verify_password("dummy", DUMMY_BCRYPT_HASH)
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user
