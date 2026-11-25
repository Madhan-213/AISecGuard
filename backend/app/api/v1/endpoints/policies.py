"""
AISecGuard — Security Policies API Endpoints
Manage and enforce AI supply chain security configuration policies.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.security_policy import SecurityPolicy
from app.models.activity_log import ActivityLog
from app.models.user import User
from app.schemas.security_policy import (
    SecurityPolicyResponse,
    SecurityPolicyListResponse,
    SecurityPolicyUpdate,
)

router = APIRouter()


@router.get(
    "/",
    response_model=SecurityPolicyListResponse,
    summary="List all security policies",
)
def list_policies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all system and scanner security policies."""
    policies = db.execute(select(SecurityPolicy).order_by(SecurityPolicy.category, SecurityPolicy.name)).scalars().all()
    return SecurityPolicyListResponse(total=len(policies), policies=list(policies))


@router.put(
    "/{policy_id}",
    response_model=SecurityPolicyResponse,
    summary="Update a security policy",
)
def update_policy(
    policy_id: str,
    payload: SecurityPolicyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a security policy value or enabled state."""
    policy = db.get(SecurityPolicy, policy_id)
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Security policy not found: {policy_id}",
        )

    old_val = policy.value
    old_enabled = policy.is_enabled

    if payload.value is not None:
        policy.value = str(payload.value)
    if payload.is_enabled is not None:
        policy.is_enabled = payload.is_enabled

    policy.updated_at = datetime.now(timezone.utc)
    policy.updated_by = current_user.email if current_user else "Admin"

    # Audit log the policy modification
    audit = ActivityLog(
        user_id=current_user.id if current_user else None,
        user_email=current_user.email if current_user else "admin",
        action="POLICY_UPDATED",
        entity_type="POLICY",
        entity_id=policy.id,
        details=f"Updated policy '{policy.name}' ({policy.key}): value {old_val}->{policy.value}, enabled {old_enabled}->{policy.is_enabled}",
    )
    db.add(audit)
    db.commit()
    db.refresh(policy)
    return policy
