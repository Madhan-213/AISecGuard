"""
AISecGuard — Scan API Endpoints
Week 3: Create and retrieve scans.

POST /api/v1/scans          — trigger a scan for an artifact
GET  /api/v1/scans          — list all scans
GET  /api/v1/scans/{id}     — get scan with findings
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.scan import Scan
from app.schemas.scan import (
    ScanRequest,
    ScanResponse,
    ScanDetailResponse,
    ScanListResponse,
)
from app.services.scan_service import run_scan

router = APIRouter()


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
    db: Session = Depends(get_db),
):
    """
    Start a security scan for the specified artifact.

    The scan runs synchronously in Week 3 (no background task queue yet).
    It returns the completed scan with all findings.
    """
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
    """Retrieve a scan by ID including all associated findings."""
    scan = db.get(Scan, scan_id)
    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan not found: {scan_id}",
        )
    return scan
