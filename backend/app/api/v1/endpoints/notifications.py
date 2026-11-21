"""
AISecGuard — Notifications API Endpoints
List, read, and manage in-app security alerts and threat notifications.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    NotificationCreate,
)

router = APIRouter()


@router.get(
    "/",
    response_model=NotificationListResponse,
    summary="List notifications",
)
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all notifications and unread alert count."""
    # List notifications (either user-specific or global user_id is null)
    stmt = select(Notification).where(
        (Notification.user_id == current_user.id) | (Notification.user_id.is_(None))
    ).order_by(desc(Notification.created_at))

    notifications = db.execute(stmt).scalars().all()
    unread_count = sum(1 for n in notifications if not n.is_read)

    return NotificationListResponse(
        total=len(notifications),
        unread_count=unread_count,
        notifications=list(notifications),
    )


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark a notification as read",
)
def mark_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a single notification as read."""
    notif = db.get(Notification, notification_id)
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification not found: {notification_id}",
        )
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.post(
    "/read-all",
    summary="Mark all notifications as read",
)
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications for the user as read."""
    notifications = db.execute(
        select(Notification).where(
            (Notification.user_id == current_user.id) | (Notification.user_id.is_(None))
        )
    ).scalars().all()

    for n in notifications:
        n.is_read = True
    db.commit()
    return {"message": f"Marked {len(notifications)} notifications as read."}


@router.delete(
    "/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a notification",
)
def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a notification item."""
    notif = db.get(Notification, notification_id)
    if notif:
        db.delete(notif)
        db.commit()
    return None
