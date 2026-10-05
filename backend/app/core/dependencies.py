"""
AISecGuard — Authentication FastAPI Dependency
Week 5: get_current_user dependency for protected routes.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.services import auth_service

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency: validates the Bearer JWT and returns the active User.

    Raises HTTP 401 if token is missing, invalid, expired, or user is inactive.
    Use as: `current_user: User = Depends(get_current_user)`
    """
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user_id = auth_service.decode_token(token, expected_type=auth_service.TOKEN_TYPE_ACCESS)
    if not user_id:
        raise credentials_exc

    user = auth_service.get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise credentials_exc

    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    FastAPI dependency: requires the current user to be an admin.

    Raises HTTP 403 if user is not admin.
    Use as: `admin: User = Depends(get_current_admin)`
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user
