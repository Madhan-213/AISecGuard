"""
AISecGuard — Findings API Endpoints
Week 3: List and retrieve security findings.

GET /api/v1/findings         — list all findings
GET /api/v1/findings/{id}    — get a single finding
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.finding import Finding
from app.schemas.scan import FindingResponse, FindingListResponse

router = APIRouter()


@router.get(
    "/",
    response_model=FindingListResponse,
    summary="List all security findings",
)
def list_findings(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Return a paginated list of all security findings."""
    total = db.execute(select(func.count(Finding.id))).scalar_one()
    findings = db.execute(
        select(Finding).offset(skip).limit(limit).order_by(Finding.created_at.desc())
    ).scalars().all()
    return FindingListResponse(total=total, findings=list(findings))


@router.get(
    "/{finding_id}",
    response_model=FindingResponse,
    summary="Get a single finding by ID",
)
def get_finding(
    finding_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve a single security finding by its UUID."""
    finding = db.get(Finding, finding_id)
    if finding is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Finding not found: {finding_id}",
        )
    return finding
