"""
AISecGuard — SecurityPolicy Pydantic Schemas
"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SecurityPolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    key: str
    name: str
    description: str
    category: str
    value_type: str
    value: str
    is_enabled: bool
    updated_at: datetime
    updated_by: str | None = None


class SecurityPolicyUpdate(BaseModel):
    value: str | None = None
    is_enabled: bool | None = None


class SecurityPolicyListResponse(BaseModel):
    total: int
    policies: list[SecurityPolicyResponse]
