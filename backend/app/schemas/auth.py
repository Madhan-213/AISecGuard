"""
AISecGuard — Auth Pydantic Schemas
Week 5: Request/response models for register, login, token operations.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class UserRegisterRequest(BaseModel):
    """Body for POST /api/v1/auth/register"""
    email: EmailStr
    password: str
    full_name: Optional[str] = None

    role: Optional[str] = None  # e.g. ADMIN, ANALYST, AUDITOR; defaults to ANALYST

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLoginRequest(BaseModel):
    """Body for POST /api/v1/auth/login"""
    email: EmailStr
    password: str


class TokenRefreshRequest(BaseModel):
    """Body for POST /api/v1/auth/refresh"""
    refresh_token: str


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class TokenResponse(BaseModel):
    """Returned on successful login or token refresh."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Public representation of a user (never expose hashed_password)."""
    id: str
    email: str
    full_name: Optional[str]
    is_active: bool
    is_admin: bool
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RegisterResponse(BaseModel):
    """Returned on successful registration."""
    message: str
    user: UserResponse


# ---------------------------------------------------------------------------
# Quarantine schemas
# ---------------------------------------------------------------------------

class QuarantineRequest(BaseModel):
    """Body for POST /api/v1/artifacts/{id}/quarantine"""
    reason: str

    @field_validator("reason")
    @classmethod
    def reason_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Quarantine reason cannot be empty")
        return v.strip()


class ReleaseRequest(BaseModel):
    """Body for POST /api/v1/artifacts/{id}/release"""
    reason: Optional[str] = "Manual release by admin"


class QuarantineEventResponse(BaseModel):
    """Public representation of a quarantine audit event."""
    id: str
    artifact_id: str
    action: str
    reason: Optional[str]
    actor_id: Optional[str] = None
    actor_email: Optional[str]
    timestamp: datetime

    model_config = {"from_attributes": True}
