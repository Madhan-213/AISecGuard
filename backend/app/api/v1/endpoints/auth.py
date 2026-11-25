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
from app.models.login_history import LoginHistory
from app.models.security_event import SecurityEvent
from app.models.activity_log import ActivityLog
from app.models.enums import UserRole
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
    Logs successful and failed attempts into immutable LoginHistory.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Unknown")[:255]

    user = auth_service.authenticate_user(db, str(body.email), body.password)
    if not user:
        # Record failed login attempt
        try:
            db.add(LoginHistory(
                email=str(body.email),
                ip_address=client_ip,
                user_agent=user_agent,
                status="FAILED_INVALID_CREDENTIALS",
                failure_reason="Invalid email or password",
            ))
            db.commit()
        except Exception:
            db.rollback()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        try:
            db.add(LoginHistory(
                user_id=user.id,
                email=user.email,
                ip_address=client_ip,
                user_agent=user_agent,
                status="FAILED_SUSPENDED",
                failure_reason="Account suspended by administrator",
            ))
            db.commit()
        except Exception:
            db.rollback()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Contact system administrator.",
        )

    # Record successful login
    try:
        db.add(LoginHistory(
            user_id=user.id,
            email=user.email,
            ip_address=client_ip,
            user_agent=user_agent,
            status="SUCCESS",
        ))
        db.add(ActivityLog(
            user_id=user.id,
            user_email=user.email,
            action="USER_LOGIN",
            entity_type="AUTH",
            details="User logged in successfully.",
            ip_address=client_ip,
        ))
        db.commit()
    except Exception:
        db.rollback()

    return TokenResponse(
        access_token=auth_service.create_access_token(user.id),
        refresh_token=auth_service.create_refresh_token(user.id),
    )


@router.post(
    "/admin-login",
    response_model=TokenResponse,
    summary="Admin Control Portal Authentication",
)
@limiter.limit("5/minute")
def admin_login(request: Request, body: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate exclusively for authorized administrators (ADMIN, SUPER_ADMIN).
    Rejects normal user accounts with HTTP 403 Forbidden.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Unknown")[:255]

    user = auth_service.authenticate_user(db, str(body.email), body.password)
    if not user:
        try:
            db.add(LoginHistory(
                email=str(body.email),
                ip_address=client_ip,
                user_agent=user_agent,
                status="FAILED_INVALID_CREDENTIALS",
                failure_reason="Invalid administrator credentials",
            ))
            db.commit()
        except Exception:
            db.rollback()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check administrative role
    is_admin = getattr(user, "is_admin", False) or user.role in (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)
    if not is_admin:
        try:
            db.add(LoginHistory(
                user_id=user.id,
                email=user.email,
                ip_address=client_ip,
                user_agent=user_agent,
                status="FAILED_NOT_ADMIN",
                failure_reason="Non-admin user attempted admin portal access",
            ))
            db.add(SecurityEvent(
                event_type="UNAUTHORIZED_ADMIN_LOGIN_ATTEMPT",
                severity="WARNING",
                source_ip=client_ip,
                actor_email=user.email,
                description=f"Non-admin user '{user.email}' (role: {user.role}) attempted to authenticate into Admin Control Portal.",
            ))
            db.commit()
        except Exception:
            db.rollback()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Administrative privileges required. Normal accounts cannot access the Admin Control Portal.",
        )

    if not user.is_active:
        try:
            db.add(LoginHistory(
                user_id=user.id,
                email=user.email,
                ip_address=client_ip,
                user_agent=user_agent,
                status="FAILED_SUSPENDED",
                failure_reason="Admin account suspended",
            ))
            db.commit()
        except Exception:
            db.rollback()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator account is suspended. Contact Super Administrator.",
        )

    # Success
    try:
        db.add(LoginHistory(
            user_id=user.id,
            email=user.email,
            ip_address=client_ip,
            user_agent=user_agent,
            status="SUCCESS",
        ))
        db.add(ActivityLog(
            user_id=user.id,
            user_email=user.email,
            action="ADMIN_LOGIN",
            entity_type="AUTH",
            details=f"Admin '{user.email}' signed into Admin Control Portal ({user.role}).",
            ip_address=client_ip,
        ))
        db.commit()
    except Exception:
        db.rollback()

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
