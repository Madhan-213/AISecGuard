"""
AISecGuard — API key endpoints (Week 9)

  POST   /api/v1/api-keys        create a key (the secret is returned once)
  GET    /api/v1/api-keys        list your keys (no secrets)
  DELETE /api/v1/api-keys/{id}   revoke one of your keys

Use a key by sending it in the X-API-Key header instead of a login token.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.api_key import ApiKey
from app.models.user import User
from app.services import api_key_service

router = APIRouter(prefix="/api/v1/api-keys")  # own prefix: POST/GET at the bare path


class ApiKeyCreate(BaseModel):
    name: str = Field(..., max_length=100)

    @field_validator("name")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Give the key a name, e.g. 'github-actions'.")
        return value


class ApiKeyOut(BaseModel):
    id: str
    name: str
    prefix: str
    created_at: datetime
    last_used_at: datetime | None = None
    revoked_at: datetime | None = None

    model_config = {"from_attributes": True}


class ApiKeyCreated(ApiKeyOut):
    key: str


@router.post("", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED, summary="Create an API key")
def create_key(body: ApiKeyCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    record, raw = api_key_service.issue_key(db, user, body.name)
    return ApiKeyCreated(**ApiKeyOut.model_validate(record).model_dump(), key=raw)


@router.get("", response_model=list[ApiKeyOut], summary="List your API keys")
def list_keys(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(ApiKey).filter(ApiKey.user_id == user.id).order_by(ApiKey.created_at.desc()).all()


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Revoke an API key")
def revoke_key(key_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    record = db.get(ApiKey, key_id)
    if record is None or record.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found.")
    api_key_service.revoke(db, record)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
