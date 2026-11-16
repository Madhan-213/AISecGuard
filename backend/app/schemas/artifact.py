"""
AISecGuard — Artifact Pydantic Schemas
Week 3: Request/response models for artifact API endpoints.
"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.enums import ArtifactType, ArtifactStatus


class ArtifactResponse(BaseModel):
    """Response schema for a single artifact."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    original_filename: str
    artifact_type: ArtifactType
    file_size: int
    file_extension: str
    sha256: str
    status: ArtifactStatus
    uploaded_at: datetime
    user_id: str | None = None


class ArtifactListResponse(BaseModel):
    """Response schema for artifact list."""
    total: int
    artifacts: list[ArtifactResponse]
