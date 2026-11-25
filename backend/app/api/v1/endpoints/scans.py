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

from app.db.session import get_db, SessionLocal
from app.core.dependencies import get_current_user
from app.core.limiter import limiter
from app.core.config import settings
from app.models.artifact import Artifact
from app.models.provenance import ProvenanceRecord
from app.models.scan import Scan
from app.models.user import User
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
    current_user: User | None = None,
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
        user_id=current_user.id if current_user else None,
    )
    db.add(artifact)

    provenance = ProvenanceRecord(
        id=str(uuid.uuid4()),
        artifact_id=artifact.id,
        source_url=source_url,
        sha256_hash=sha256_hash,
        file_size=len(content),
        uploader_id=current_user.id if current_user else None,
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
            user_id=current_user.id if current_user else None,
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a model artifact, calculate SHA-256, run model scanner, and return findings."""
    return await _process_upload_and_scan(file, ArtifactType.MODEL, source_url, db, background_tasks, sync, current_user=current_user)


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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a dataset artifact, calculate SHA-256, run dataset scanner, and return findings."""
    return await _process_upload_and_scan(file, ArtifactType.DATASET, source_url, db, background_tasks, sync, current_user=current_user)


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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a dependency file, calculate SHA-256, run dependency scanner, and return findings."""
    return await _process_upload_and_scan(file, ArtifactType.DEPENDENCY, source_url, db, background_tasks, sync, current_user=current_user)


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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload any supported artifact, auto-detect its type, scan it, and return findings."""
    return await _process_upload_and_scan(file, None, source_url, db, background_tasks, sync, current_user=current_user)


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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return a paginated list of scans belonging to the authenticated user."""
    query = select(Scan)
    count_query = select(func.count(Scan.id))

    if current_user:
        query = query.where(Scan.user_id == current_user.id)
        count_query = count_query.where(Scan.user_id == current_user.id)

    total = db.execute(count_query).scalar_one()
    scans = db.execute(
        query.offset(skip).limit(limit).order_by(Scan.started_at.desc())
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

    initial_status = scan.status
    initial_risk_level = scan.risk_level
    initial_risk_score = scan.risk_score

    async def event_generator():
        # Fast deterministic stream for synchronous test mode or already-completed scans
        if getattr(settings, "SYNC_SCANS", False) or initial_status == ScanStatus.COMPLETED.value:
            delay = 0.01 if getattr(settings, "SYNC_SCANS", False) else 0.25
            phases = [
                {"phase": "QUEUED", "progress": 15, "message": "Scan job queued"},
                {"phase": "PROVENANCE_CHECK", "progress": 35, "message": "Verifying artifact SHA-256 integrity"},
                {"phase": "SCANNER_RUNNING", "progress": 65, "message": "Executing static security scanners"},
                {"phase": "RISK_CALC", "progress": 88, "message": "Evaluating risk score and findings"},
                {
                    "phase": "COMPLETED",
                    "progress": 100,
                    "message": "Scan completed",
                    "risk_level": initial_risk_level,
                    "risk_score": initial_risk_score,
                },
            ]
            for p in phases:
                data = json.dumps({"scan_id": scan_id, "status": initial_status, **p})
                yield f"data: {data}\n\n"
                await asyncio.sleep(delay)
            return

        # Live streaming from real background scan execution
        last_sent = None
        for tick in range(300):  # up to 60 seconds
            prog = get_scan_progress(scan_id)
            if prog:
                signature = (prog.get("phase"), prog.get("progress"), prog.get("message"))
                if signature != last_sent:
                    last_sent = signature
                    phase = prog.get("phase", "QUEUED")
                    ev_status = "COMPLETED" if phase == "COMPLETED" else ("FAILED" if phase == "FAILED" else "RUNNING")
                    payload = {"scan_id": scan_id, "status": ev_status, **prog}
                    yield f"data: {json.dumps(payload)}\n\n"
                    if phase in ("COMPLETED", "FAILED"):
                        return

            # Fallback DB poll every 1s in case in-memory progress missed terminal state
            if tick % 5 == 4:
                with SessionLocal() as check_db:
                    fresh_scan = check_db.get(Scan, scan_id)
                    if fresh_scan and fresh_scan.status == ScanStatus.COMPLETED.value:
                        done_payload = {
                            "scan_id": scan_id,
                            "status": fresh_scan.status,
                            "phase": "COMPLETED",
                            "progress": 100,
                            "message": "Scan completed",
                            "risk_level": fresh_scan.risk_level,
                            "risk_score": fresh_scan.risk_score,
                        }
                        yield f"data: {json.dumps(done_payload)}\n\n"
                        return
                    if fresh_scan and fresh_scan.status == ScanStatus.FAILED.value:
                        fail_payload = {
                            "scan_id": scan_id,
                            "status": "FAILED",
                            "phase": "COMPLETED",
                            "progress": 100,
                            "message": "Scan failed",
                            "risk_level": "UNKNOWN",
                            "risk_score": 0,
                        }
                        yield f"data: {json.dumps(fail_payload)}\n\n"
                        return

            await asyncio.sleep(0.20)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# DELETE /{scan_id}
# ---------------------------------------------------------------------------

@router.delete(
    "/{scan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a scan and its associated files",
)
def delete_scan(
    scan_id: str,
    delete_file: bool = Query(True, description="Also remove the physical file and artifact if unused by other scans"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently delete a scan and its findings.
    If delete_file is True and the associated artifact is not referenced by any other scans,
    the artifact record and its stored file on disk are also cleaned up.
    """
    scan = db.get(Scan, scan_id)
    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan not found: {scan_id}",
        )

    if current_user and scan.user_id and scan.user_id != current_user.id and not getattr(current_user, "is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this scan.",
        )

    artifact_id = scan.artifact_id
    db.delete(scan)
    db.commit()

    if delete_file and artifact_id:
        artifact = db.get(Artifact, artifact_id)
        if artifact:
            # Check if any other scan still references this artifact
            remaining = db.execute(
                select(func.count(Scan.id)).where(Scan.artifact_id == artifact_id)
            ).scalar_one()
            if remaining == 0:
                # Remove physical file from disk
                try:
                    storage_file = Path(artifact.storage_path)
                    if storage_file.is_file():
                        storage_file.unlink(missing_ok=True)
                except Exception:
                    pass
                db.delete(artifact)
                db.commit()

    return None
