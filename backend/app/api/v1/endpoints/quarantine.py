"""
AISecGuard — Quarantine API Endpoints
Week 5: Quarantine and release artifacts; view quarantine audit log.

Endpoints:
  POST /api/v1/artifacts/{id}/quarantine  — Quarantine an artifact
  POST /api/v1/artifacts/{id}/release     — Release from quarantine
  GET  /api/v1/artifacts/{id}/events      — List quarantine audit events
"""

import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.models.artifact import Artifact
from app.models.quarantine_event import QuarantineEvent
from app.models.enums import ArtifactStatus
from app.models.user import User
from app.schemas.auth import QuarantineRequest, ReleaseRequest, QuarantineEventResponse

router = APIRouter()

QUARANTINE_SUBDIR = "quarantine"


def _get_quarantine_dir() -> Path:
    """Return the quarantine subdirectory, creating it if needed."""
    q_dir = Path(settings.UPLOAD_DIR) / QUARANTINE_SUBDIR
    q_dir.mkdir(parents=True, exist_ok=True)
    return q_dir


# ---------------------------------------------------------------------------
# POST /{artifact_id}/quarantine
# ---------------------------------------------------------------------------

@router.post(
    "/{artifact_id}/quarantine",
    response_model=QuarantineEventResponse,
    status_code=status.HTTP_200_OK,
    summary="Quarantine an artifact",
)
def quarantine_artifact(
    artifact_id: str,
    body: QuarantineRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Transition an artifact from SCANNED → QUARANTINED.

    - The artifact file is physically moved to `uploads/quarantine/`.
    - An immutable QuarantineEvent audit record is created.
    - Only SCANNED artifacts can be quarantined (already-quarantined = 409).

    Requires authentication.
    """
    artifact = db.get(Artifact, artifact_id)
    if artifact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact not found: {artifact_id}",
        )

    if artifact.status == ArtifactStatus.QUARANTINED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Artifact is already quarantined.",
        )

    if artifact.status not in (ArtifactStatus.SCANNED.value, ArtifactStatus.PENDING_SCAN.value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot quarantine artifact in state '{artifact.status}'. "
                "Artifact must be in SCANNED state."
            ),
        )

    # --- Move file to quarantine directory ---
    src_path = Path(artifact.storage_path)
    if src_path.exists():
        dest_path = _get_quarantine_dir() / src_path.name
        shutil.move(str(src_path), str(dest_path))
        artifact.storage_path = str(dest_path)

    # --- Update artifact status ---
    artifact.status = ArtifactStatus.QUARANTINED.value

    # --- Create audit event ---
    event = QuarantineEvent(
        artifact_id=artifact_id,
        action="QUARANTINE",
        reason=body.reason,
        actor_id=current_user.id,
        actor_email=current_user.email,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    return QuarantineEventResponse.model_validate(event)


# ---------------------------------------------------------------------------
# POST /{artifact_id}/release
# ---------------------------------------------------------------------------

@router.post(
    "/{artifact_id}/release",
    response_model=QuarantineEventResponse,
    status_code=status.HTTP_200_OK,
    summary="Release an artifact from quarantine",
)
def release_artifact(
    artifact_id: str,
    body: ReleaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Transition an artifact from QUARANTINED → SCANNED.

    - Moves the file back to the main uploads directory.
    - Creates an immutable QuarantineEvent audit record.

    Requires authentication.
    """
    artifact = db.get(Artifact, artifact_id)
    if artifact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact not found: {artifact_id}",
        )

    if artifact.status != ArtifactStatus.QUARANTINED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot release artifact in state '{artifact.status}'. "
                "Artifact must be QUARANTINED."
            ),
        )

    # --- Move file back to main uploads directory ---
    src_path = Path(artifact.storage_path)
    if src_path.exists():
        uploads_dir = Path(settings.UPLOAD_DIR)
        uploads_dir.mkdir(parents=True, exist_ok=True)
        dest_path = uploads_dir / src_path.name
        shutil.move(str(src_path), str(dest_path))
        artifact.storage_path = str(dest_path)

    # --- Restore artifact status ---
    artifact.status = ArtifactStatus.SCANNED.value

    # --- Create audit event ---
    event = QuarantineEvent(
        artifact_id=artifact_id,
        action="RELEASE",
        reason=body.reason,
        actor_id=current_user.id,
        actor_email=current_user.email,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    return QuarantineEventResponse.model_validate(event)


# ---------------------------------------------------------------------------
# GET /{artifact_id}/events
# ---------------------------------------------------------------------------

@router.get(
    "/{artifact_id}/events",
    response_model=list[QuarantineEventResponse],
    summary="List quarantine audit events for an artifact",
)
def list_quarantine_events(
    artifact_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return all quarantine/release audit events for an artifact in chronological order.

    Requires authentication.
    """
    artifact = db.get(Artifact, artifact_id)
    if artifact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact not found: {artifact_id}",
        )

    events = db.execute(
        select(QuarantineEvent)
        .where(QuarantineEvent.artifact_id == artifact_id)
        .order_by(QuarantineEvent.timestamp.asc())
    ).scalars().all()

    return [QuarantineEventResponse.model_validate(e) for e in events]
