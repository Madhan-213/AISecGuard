"""
AISecGuard — Artifact API Endpoints
Week 3: Upload, list, and retrieve artifacts.

POST /api/v1/artifacts/upload — multipart upload with validation
GET  /api/v1/artifacts        — list all artifacts
GET  /api/v1/artifacts/{id}   — get single artifact
"""

import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.limiter import limiter
from app.core.config import settings
from app.models.artifact import Artifact
from app.models.provenance import ProvenanceRecord
from app.models.enums import ArtifactType, ArtifactStatus
from app.schemas.artifact import ArtifactResponse, ArtifactListResponse
from app.utils.hashing import compute_sha256_stream
from app.utils.storage import build_safe_storage_path, save_upload

router = APIRouter()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

ALL_ALLOWED_EXTENSIONS: dict[str, ArtifactType] = {}

def _build_extension_map() -> dict[str, ArtifactType]:
    ext_map: dict[str, ArtifactType] = {}
    for ext in settings.ALLOWED_MODEL_EXTENSIONS:
        ext_map[ext.lower()] = ArtifactType.MODEL
    for ext in settings.ALLOWED_DATASET_EXTENSIONS:
        ext_map[ext.lower()] = ArtifactType.DATASET
    for ext in settings.ALLOWED_DEPENDENCY_EXTENSIONS:
        ext_map[ext.lower()] = ArtifactType.DEPENDENCY
    return ext_map


def _get_extension_map() -> dict[str, ArtifactType]:
    return _build_extension_map()


# ---------------------------------------------------------------------------
# POST /upload
# ---------------------------------------------------------------------------

@router.post(
    "/upload",
    response_model=ArtifactResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload an AI/ML artifact",
    description=(
        "Upload a model, dataset, or dependency file for security scanning. "
        "The file is stored safely with a UUID-based name. "
        "SHA-256 is computed immediately. "
        "The original filename is preserved in metadata only."
    ),
)
@limiter.limit("30/minute")
async def upload_artifact(
    request: Request,
    file: UploadFile = File(..., description="The artifact file to upload"),
    source_url: str | None = Form(None, description="Optional URL where artifact was obtained"),
    expected_sha256: str | None = Form(
        None, description="Optional SHA-256 the file should have (e.g. as published by the model hub)"
    ),
    db: Session = Depends(get_db),
):
    """Upload an artifact and create its provenance baseline."""
    # --- Input validation ---
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required.",
        )

    original_filename = file.filename

    if expected_sha256:
        expected_sha256 = expected_sha256.strip().lower()
        if not re.fullmatch(r"[0-9a-f]{64}", expected_sha256):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="expected_sha256 must be 64 hexadecimal characters.",
            )
    ext = Path(original_filename).suffix.lower()

    ext_map = _get_extension_map()

    if ext not in ext_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported file extension: {ext!r}. "
                f"Allowed extensions: {sorted(ext_map.keys())}"
            ),
        )

    # Read file content
    content = await file.read()

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=(
                f"File size {len(content)} bytes exceeds maximum allowed "
                f"{settings.MAX_UPLOAD_SIZE_MB} MB ({max_bytes} bytes)."
            ),
        )

    # --- Determine artifact type ---
    artifact_type = ext_map[ext]

    # --- Compute SHA-256 ---
    sha256 = compute_sha256_bytes_local(content)

    # --- Build safe storage path ---
    safe_filename, storage_path = build_safe_storage_path(original_filename)

    # --- Save file ---
    save_upload(content, storage_path)

    # --- Persist Artifact ---
    artifact = Artifact(
        id=str(uuid.uuid4()),
        filename=safe_filename,
        original_filename=original_filename,
        artifact_type=artifact_type.value,
        file_size=len(content),
        file_extension=ext,
        sha256=sha256,
        storage_path=storage_path,
        status=ArtifactStatus.PENDING_SCAN.value,
    )
    db.add(artifact)

    # --- Persist ProvenanceRecord (baseline) ---
    provenance = ProvenanceRecord(
        id=str(uuid.uuid4()),
        artifact_id=artifact.id,
        source_url=source_url,
        sha256_hash=sha256,
        expected_sha256=expected_sha256 or None,
        file_size=len(content),
        uploader_id=None,  # Authentication not implemented in Week 3
    )
    db.add(provenance)
    db.commit()
    db.refresh(artifact)

    return artifact


def compute_sha256_bytes_local(data: bytes) -> str:
    """SHA-256 of bytes — imported inline to avoid circular dependency issues."""
    import hashlib
    return hashlib.sha256(data).hexdigest()


# ---------------------------------------------------------------------------
# GET /
# ---------------------------------------------------------------------------

@router.get(
    "/",
    response_model=ArtifactListResponse,
    summary="List all uploaded artifacts",
)
def list_artifacts(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Return a paginated list of all uploaded artifacts."""
    from sqlalchemy import select, func

    total = db.execute(select(func.count(Artifact.id))).scalar_one()
    artifacts = db.execute(
        select(Artifact).offset(skip).limit(limit).order_by(Artifact.uploaded_at.desc())
    ).scalars().all()

    return ArtifactListResponse(total=total, artifacts=list(artifacts))


# ---------------------------------------------------------------------------
# GET /{artifact_id}
# ---------------------------------------------------------------------------

@router.get(
    "/{artifact_id}",
    response_model=ArtifactResponse,
    summary="Get a single artifact by ID",
)
def get_artifact(
    artifact_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve a single artifact by its UUID."""
    artifact = db.get(Artifact, artifact_id)
    if artifact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact not found: {artifact_id}",
        )
    return artifact
