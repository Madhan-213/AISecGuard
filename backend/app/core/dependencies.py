"""
AISecGuard — Authentication FastAPI Dependency
Week 5: get_current_user dependency for protected routes.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader, OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.services import auth_service

from typing import Callable, Optional
from app.models.enums import UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)
api_key_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)

LOCAL_ANALYST_ID = "local-analyst"


def _get_or_create_local_analyst(db: Session) -> User:
    """Helper to ensure a local standalone analyst user exists in-memory."""
    user = db.query(User).filter(User.id == LOCAL_ANALYST_ID).first()
    if not user:
        user = User(
            id=LOCAL_ANALYST_ID,
            email="analyst@local.device",
            full_name="Local Security Analyst",
            hashed_password="no_auth_required_local_mode",
            is_active=True,
            is_admin=True,
            role=UserRole.ADMIN.value,
        )
        try:
            db.add(user)
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()
            user = db.query(User).filter(User.id == LOCAL_ANALYST_ID).first()
    return user


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    api_key: Optional[str] = Depends(api_key_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency:
    - If a valid Bearer JWT is provided, validates it and returns the active User.
    - If no token is provided (no-login standalone mode), automatically provides
      a default Local Security Analyst user with full administrative privileges.
    """
    from app.core.config import settings

    if token:
        user_id = auth_service.decode_token(token, expected_type=auth_service.TOKEN_TYPE_ACCESS)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user = auth_service.get_user_by_id(db, user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user

    # No token provided:
    if api_key:
        # A key that was sent must be valid, even in no-login mode.
        from app.services.api_key_service import authenticate
        user = authenticate(db, api_key)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or revoked API key",
            )
        return user

    if getattr(settings, "NO_LOGIN_REQUIRED", True):
        return _get_or_create_local_analyst(db)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    FastAPI dependency: requires the current user to have administrative privileges.

    Raises HTTP 403 if user is not ADMIN or SUPER_ADMIN.
    """
    if current_user.id == LOCAL_ANALYST_ID:
        return current_user
    if not current_user.is_admin and current_user.role not in (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required. Access denied.",
        )
    return current_user


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    FastAPI dependency: requires the current user to be a SUPER_ADMIN.
    Used for sensitive operations like user deletion, role promotions, and database restoration.
    """
    if current_user.id == LOCAL_ANALYST_ID:
        return current_user
    if current_user.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Administrator privileges required for this sensitive operation.",
        )
    return current_user


# Convenience shorthand
require_admin_role = get_current_admin


# ---------------------------------------------------------------------------
# Task 4a - Role-Based Access Control (RBAC) dependencies
# ---------------------------------------------------------------------------

def require_role(*roles: UserRole) -> Callable:
    """
    Factory that returns a FastAPI dependency enforcing one of the given roles.

    In NO_LOGIN_REQUIRED (standalone) mode without a token, the local analyst
    has full admin-equivalent access. When an authenticated user token is present,
    their actual account role is verified against allowed roles.

    Usage:
        @router.post("/...", dependencies=[Depends(require_role(UserRole.ANALYST, UserRole.ADMIN))])
    """
    allowed = {r.value for r in roles}

    def _dep(user: User = Depends(get_current_user)) -> User:
        # Standalone anonymous mode without credentials bypasses checks
        if user.id == LOCAL_ANALYST_ID:
            return user
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role(s): {', '.join(sorted(allowed))}. Your role is '{user.role}'.",
            )
        return user

    return _dep


# Convenience shorthand dependencies
get_analyst_or_admin = require_role(UserRole.ANALYST, UserRole.ADMIN)
get_admin_only = require_role(UserRole.ADMIN)
get_any_authenticated = require_role(UserRole.ADMIN, UserRole.ANALYST, UserRole.AUDITOR)

