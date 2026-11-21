"""
AISecGuard — ActivityLog Pydantic Schemas
"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ActivityLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str | None = None
    user_email: str | None = None
    action: str
    entity_type: str
    entity_id: str | None = None
    details: str | None = None
    ip_address: str | None = None
    created_at: datetime


class ActivityLogCreate(BaseModel):
    action: str
    entity_type: str
    entity_id: str | None = None
    details: str | None = None


class ActivityLogListResponse(BaseModel):
    total: int
    logs: list[ActivityLogResponse]
