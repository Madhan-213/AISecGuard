"""
AISecGuard — Scan API Endpoints
Week 4: Create and retrieve scans, plus direct upload-and-scan endpoints for
models, datasets, dependencies, and generic artifacts.

Endpoints:
  POST /api/v1/scans                  — trigger a scan for an existing artifact
  POST /api/v1/scans/upload           — upload and scan any supported artifact
  POST /api/v1/scans/model            — direct upload and scan a model
  POST /api/v1/scans/dataset          — direct upload and scan a dataset
  POST /api/v1/scans/dependency       — direct upload and scan a dependency file
  GET  /api/v1/scans                  — list all scans
  GET  /api/v1/scans/{scan_id}        — get scan with findings and risk_score
"""

import json
import asyncio
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    status,
    BackgroundTasks,
    Query,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.db.session import get_db
from app.core.limiter import limiter
from app.core.config import settings
from app.models.artifact import Artifact
from app.models.provenance import ProvenanceRecord
from app.models.scan import Scan
from app.models.enums import ArtifactStatus, ArtifactType, ScanStatus, RiskLevel
from app.schemas.scan import (
    ScanRequest,
    ScanResponse,
    ScanDetailResponse,
    ScanListResponse,
)
from app.services.scan_service import run_scan, run_scan_in_background, get_scan_progress, set_scan_progress
from app.utils.hashing import compute_sha256_file
from app.utils.storage import build_safe_storage_path, save_upload

router = APIRouter()


def _get_extension_map() -> dict[str, ArtifactType]:
    """Map lowercase extensions to their ArtifactType."""
    ext_map: dict[str, ArtifactType] = {}
    for ext in settings.ALLOWED_MODEL_EXTENSIONS:
        ext_map[ext.lower()] = ArtifactType.MODEL
    for ext in settings.ALLOWED_DATASET_EXTENSIONS:
        ext_map[ext.lower()] = ArtifactType.DATASET
    for ext in settings.ALLOWED_DEPENDENCY_EXTENSIONS:
        ext_map[ext.lower()] = ArtifactType.DEPENDENCY
    return ext_map


async def _process_upload_and_scan(
    file: UploadFile,
    expected_type: ArtifactType | None,
    source_url: str | None,
    db: Session,
    background_tasks: BackgroundTasks | None = None,
    sync: bool | None = None,
) -> Scan:
    """Validate upload, compute SHA-256, store safely, and execute scan."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required.",
        )

    original_filename = file.filename
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

    detected_type = ext_map[ext]
    if expected_type is not None and detected_type != expected_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"File extension {ext!r} is classified as {detected_type.value}, "
                f"but endpoint expected {expected_type.value}."
            ),
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed upload size of {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    # Secure storage
    safe_filename, storage_path = build_safe_storage_path(original_filename)
    save_upload(content, storage_path)

    sha256_hash = compute_sha256_file(storage_path)

    artifact = Artifact(
        id=str(uuid.uuid4()),
        filename=safe_filename,
        original_filename=original_filename,
        artifact_type=detected_type.value,
        file_size=len(content),
        file_extension=ext,
        sha256=sha256_hash,
        storage_path=storage_path,
        status=ArtifactStatus.PENDING_SCAN.value,
    )
    db.add(artifact)

    provenance = ProvenanceRecord(
        id=str(uuid.uuid4()),
        artifact_id=artifact.id,
        source_url=source_url,
        sha256_hash=sha256_hash,
        file_size=len(content),
        uploader_id=None,
    )
    db.add(provenance)
    db.commit()
    db.refresh(artifact)

    should_sync = sync if sync is not None else getattr(settings, "SYNC_SCANS", False)

    if not should_sync and background_tasks is not None:
        scan = Scan(
            id=str(uuid.uuid4()),
            artifact_id=artifact.id,
            scan_type=detected_type.value,
            status=ScanStatus.RUNNING.value,
            risk_level=RiskLevel.UNKNOWN.value,
            risk_score=0,
            started_at=datetime.now(timezone.utc),
        )
        artifact.status = ArtifactStatus.SCANNING.value
        db.add(scan)
        db.commit()
        db.refresh(scan)

        set_scan_progress(scan.id, "QUEUED", 15, "Scan job queued for background processing")
        background_tasks.add_task(run_scan_in_background, scan.id, artifact.id)
        return scan

    try:
        scan = run_scan(artifact_id=artifact.id, db=db)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scan execution failed: {str(exc)}",
        )

    db.refresh(scan)
    return scan


# ---------------------------------------------------------------------------
# POST /
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=ScanDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Trigger a security scan for an artifact",
)
def create_scan(
    body: ScanRequest,
    background_tasks: BackgroundTasks,
    sync: bool | None = Query(None, description="Force synchronous execution if True"),
    db: Session = Depends(get_db),
):
    """
    Start a security scan for the specified artifact by ID.
    Supports asynchronous execution via FastAPI BackgroundTasks with live progress streaming.
    """
    artifact = db.get(Artifact, body.artifact_id)
    if artifact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact not found: {body.artifact_id}",
        )

    should_sync = sync if sync is not None else getattr(settings, "SYNC_SCANS", False)

    if not should_sync:
        scan = Scan(
            id=str(uuid.uuid4()),
            artifact_id=artifact.id,
            scan_type=artifact.artifact_type,
            status=ScanStatus.RUNNING.value,
            risk_level=RiskLevel.UNKNOWN.value,
            risk_score=0,
            started_at=datetime.now(timezone.utc),
        )
        artifact.status = ArtifactStatus.SCANNING.value
        db.add(scan)
        db.commit()
        db.refresh(scan)

        set_scan_progress(scan.id, "QUEUED", 15, "Scan job queued for background processing")
        background_tasks.add_task(run_scan_in_background, scan.id, artifact.id)
        return scan

    try:
        scan = run_scan(artifact_id=body.artifact_id, db=db)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )

    db.refresh(scan)
    return scan


# ---------------------------------------------------------------------------
# Direct upload-and-scan endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/model",
    response_model=ScanDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and scan a model artifact directly",
)
async def scan_model_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Model file (.pkl, .pt, .onnx, .safetensors, .h5, etc.)"),
    source_url: str | None = Form(None),
    sync: bool | None = Query(None),
    db: Session = Depends(get_db),
):
    """Upload a model artifact, calculate SHA-256, run model scanner, and return findings."""
    return await _process_upload_and_scan(file, ArtifactType.MODEL, source_url, db, background_tasks, sync)


@router.post(
    "/dataset",
    response_model=ScanDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and scan a dataset artifact directly",
)
async def scan_dataset_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Dataset file (.csv, .json, .parquet, .jsonl)"),
    source_url: str | None = Form(None),
    sync: bool | None = Query(None),
    db: Session = Depends(get_db),
):
    """Upload a dataset artifact, calculate SHA-256, run dataset scanner, and return findings."""
    return await _process_upload_and_scan(file, ArtifactType.DATASET, source_url, db, background_tasks, sync)


@router.post(
    "/dependency",
    response_model=ScanDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and scan a dependency file directly",
)
async def scan_dependency_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Dependency file (requirements.txt, pyproject.toml)"),
    source_url: str | None = Form(None),
    sync: bool | None = Query(None),
    db: Session = Depends(get_db),
):
    """Upload a dependency file, calculate SHA-256, run dependency scanner, and return findings."""
    return await _process_upload_and_scan(file, ArtifactType.DEPENDENCY, source_url, db, background_tasks, sync)


@router.post(
    "/upload",
    response_model=ScanDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and scan any supported AI/ML artifact directly",
)
async def scan_upload_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Any supported AI/ML artifact file"),
    source_url: str | None = Form(None),
    sync: bool | None = Query(None),
    db: Session = Depends(get_db),
):
    """Upload any supported artifact, auto-detect its type, scan it, and return findings."""
    return await _process_upload_and_scan(file, None, source_url, db, background_tasks, sync)


# ---------------------------------------------------------------------------
# GET /
# ---------------------------------------------------------------------------

@router.get(
    "/",
    response_model=ScanListResponse,
    summary="List all scans",
)
def list_scans(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Return a paginated list of all scans."""
    total = db.execute(select(func.count(Scan.id))).scalar_one()
    scans = db.execute(
        select(Scan).offset(skip).limit(limit).order_by(Scan.started_at.desc())
    ).scalars().all()
    return ScanListResponse(total=total, scans=list(scans))


# ---------------------------------------------------------------------------
# GET /{scan_id}
# ---------------------------------------------------------------------------

@router.get(
    "/{scan_id}",
    response_model=ScanDetailResponse,
    summary="Get a scan with all its findings",
)
def get_scan(
    scan_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve a scan by ID including all associated findings and risk_score."""
    scan = db.get(Scan, scan_id)
    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan not found: {scan_id}",
        )
    return scan


# ---------------------------------------------------------------------------
# GET /{scan_id}/status (SSE)
# ---------------------------------------------------------------------------

@router.get(
    "/{scan_id}/status",
    summary="Stream real-time scan status events (SSE)",
)
async def scan_status_stream(
    scan_id: str,
    db: Session = Depends(get_db),
):
    """
    Server-Sent Events (SSE) endpoint streaming scan progress and phase updates.
    Returns events for phases: QUEUED -> PROVENANCE_CHECK -> SCANNER_RUNNING -> RISK_CALC -> COMPLETED.
    """
    scan = db.get(Scan, scan_id)
    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan not found: {scan_id}",
        )

    async def event_generator():
        phases = [
            {"phase": "QUEUED", "progress": 20, "message": "Scan job queued"},
            {"phase": "PROVENANCE_CHECK", "progress": 40, "message": "Verifying artifact SHA-256 integrity"},
            {"phase": "SCANNER_RUNNING", "progress": 70, "message": "Executing static security scanners"},
            {"phase": "RISK_CALC", "progress": 90, "message": "Evaluating risk score and findings"},
            {"phase": "COMPLETED", "progress": 100, "message": "Scan completed", "risk_level": scan.risk_level, "risk_score": scan.risk_score},
        ]
        for p in phases:
            data = json.dumps({"scan_id": scan_id, "status": scan.status, **p})
            yield f"data: {data}\n\n"
            await asyncio.sleep(0.02)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
