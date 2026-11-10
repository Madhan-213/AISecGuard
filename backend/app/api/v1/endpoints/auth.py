"""
AISecGuard — Authentication API Endpoints
Week 5: Register, Login, Refresh, Me endpoints with JWT auth.

Endpoints:
  POST /api/v1/auth/register  — Create new user account
  POST /api/v1/auth/login     — Login; returns access + refresh tokens
  POST /api/v1/auth/refresh   — Exchange refresh token for new access token
  GET  /api/v1/auth/me        — Get current authenticated user profile
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.core.limiter import limiter
from app.models.user import User
from app.services import auth_service
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenRefreshRequest,
    TokenResponse,
    UserResponse,
    RegisterResponse,
)

router = APIRouter()


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
@limiter.limit("10/minute")
def register(request: Request, body: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Create a new AISecGuard user account.

    - Validates email format and password strength (min 8 chars).
    - Returns HTTP 409 if email is already registered.
    - Passwords are hashed with bcrypt before storage.
    """
    try:
        user = auth_service.create_user(
            db=db,
            email=str(body.email),
            password=body.password,
            full_name=body.full_name or "",
            role=body.role,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

    return RegisterResponse(
        message="Account created successfully",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and receive JWT tokens",
)
@limiter.limit("10/minute")
def login(request: Request, body: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate with email + password.

    Returns:
    - `access_token`: short-lived (30 min) Bearer token for API calls
    - `refresh_token`: long-lived (7 days) token to obtain new access tokens

    Returns HTTP 401 if credentials are invalid.
    """
    user = auth_service.authenticate_user(db, str(body.email), body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenResponse(
        access_token=auth_service.create_access_token(user.id),
        refresh_token=auth_service.create_refresh_token(user.id),
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token using refresh token",
)
def refresh_token(body: TokenRefreshRequest, db: Session = Depends(get_db)):
    """
    Exchange a valid refresh token for a new access + refresh token pair.

    Returns HTTP 401 if the refresh token is invalid or expired.
    """
    user_id = auth_service.decode_token(
        body.refresh_token, expected_type=auth_service.TOKEN_TYPE_REFRESH
    )
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user = auth_service.get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return TokenResponse(
        access_token=auth_service.create_access_token(user.id),
        refresh_token=auth_service.create_refresh_token(user.id),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile",
)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns the profile of the currently authenticated user.

    Requires a valid Bearer access token in the Authorization header.
    """
    return UserResponse.model_validate(current_user)
