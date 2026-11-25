"""
AISecGuard — Activity Logs API Endpoints
Audit trail for system events, artifact uploads, scans, quarantine, policies, and auth.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.activity_log import ActivityLog
from app.models.user import User
from app.schemas.activity_log import ActivityLogResponse, ActivityLogListResponse, ActivityLogCreate

router = APIRouter()


@router.get(
    "/",
    response_model=ActivityLogListResponse,
    summary="List system audit activity logs",
)
def list_activity_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = Query(None, description="Filter by action name"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    search: Optional[str] = Query(None, description="Search in details or user email"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve paginated audit log events with optional filters.
    """
    stmt = select(ActivityLog)

    if action:
        stmt = stmt.where(ActivityLog.action == action)
    if entity_type:
        stmt = stmt.where(ActivityLog.entity_type == entity_type)
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(
            (ActivityLog.details.ilike(search_filter)) |
            (ActivityLog.user_email.ilike(search_filter)) |
            (ActivityLog.action.ilike(search_filter))
        )

    # Count total matching
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    logs = db.execute(
        stmt.order_by(desc(ActivityLog.created_at)).offset(skip).limit(limit)
    ).scalars().all()

    return ActivityLogListResponse(total=total, logs=list(logs))


@router.post(
    "/",
    response_model=ActivityLogResponse,
    summary="Record a new activity log entry",
)
def record_activity_log(
    payload: ActivityLogCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Explicitly log an activity event from the client or internal services.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    log = ActivityLog(
        user_id=current_user.id if current_user else None,
        user_email=current_user.email if current_user else "anonymous",
        action=payload.action,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        details=payload.details,
        ip_address=client_ip,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
