"""
AISecGuard — Findings API Endpoints
Week 3: List and retrieve security findings.

GET /api/v1/findings         — list all findings
GET /api/v1/findings/{id}    — get a single finding
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.db.session import get_db
from app.models.finding import Finding
from app.schemas.scan import FindingResponse, FindingListResponse

router = APIRouter()


@router.get(
    "/",
    response_model=FindingListResponse,
    summary="List all security findings with filters",
)
def list_findings(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    severity: Optional[str] = Query(None, description="Filter by severity: CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL"),
    finding_type: Optional[str] = Query(None, description="Filter by finding type"),
    search: Optional[str] = Query(None, description="Search title, rule_id, or description"),
    scan_id: Optional[str] = Query(None, description="Filter by scan ID"),
    db: Session = Depends(get_db),
):
    """Return a paginated list of all security findings with optional filters."""
    stmt = select(Finding)

    if severity:
        stmt = stmt.where(Finding.severity == severity.upper())
    if finding_type:
        stmt = stmt.where(Finding.finding_type == finding_type)
    if scan_id:
        stmt = stmt.where(Finding.scan_id == scan_id)
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(
            (Finding.title.ilike(search_filter)) |
            (Finding.rule_id.ilike(search_filter)) |
            (Finding.description.ilike(search_filter))
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    findings = db.execute(
        stmt.offset(skip).limit(limit).order_by(desc(Finding.created_at))
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
