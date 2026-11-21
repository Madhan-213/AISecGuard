"""
AISecGuard — Notification Pydantic Schemas
"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str | None = None
    title: str
    message: str
    severity: str
    is_read: bool
    link: str | None = None
    created_at: datetime


class NotificationCreate(BaseModel):
    title: str
    message: str
    severity: str = "INFO"
    link: str | None = None


class NotificationListResponse(BaseModel):
    total: int
    unread_count: int
    notifications: list[NotificationResponse]
