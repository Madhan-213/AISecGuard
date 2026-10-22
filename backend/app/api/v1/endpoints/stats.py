"""
AISecGuard — Dashboard Stats API Endpoint
Week 6: Aggregate statistics for the security dashboard.

GET /api/v1/stats  — returns scan counts, risk distribution,
                     severity breakdown, and recent scan list.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.scan import Scan
from app.models.finding import Finding
from app.models.artifact import Artifact

router = APIRouter()


@router.get(
    "/",
    summary="Dashboard aggregate statistics",
    tags=["Stats"],
)
def get_stats(db: Session = Depends(get_db)):
    """
    Return aggregate statistics for the security dashboard:
    - Total scans, findings, quarantined artifacts
    - Risk level distribution across all scans
    - Findings count by severity
    - Average risk score
    - 10 most recent scans (id, scan_type, status, risk_level, risk_score, completed_at, artifact_id)
    """

    # ── Totals ──────────────────────────────────────────────────────────
    total_scans = db.execute(select(func.count(Scan.id))).scalar_one()
    total_findings = db.execute(select(func.count(Finding.id))).scalar_one()
    quarantined = db.execute(
        select(func.count(Artifact.id)).where(Artifact.status == "QUARANTINED")
    ).scalar_one()

    # ── Average risk score ───────────────────────────────────────────────
    avg_risk = db.execute(
        select(func.avg(Scan.risk_score)).where(Scan.status == "COMPLETED")
    ).scalar_one()
    avg_risk_score = round(float(avg_risk), 1) if avg_risk else 0

    # ── Risk level distribution ──────────────────────────────────────────
    risk_rows = db.execute(
        select(Scan.risk_level, func.count(Scan.id))
        .group_by(Scan.risk_level)
    ).all()
    risk_distribution = {row[0]: row[1] for row in risk_rows}

    # ── Severity distribution ────────────────────────────────────────────
    sev_rows = db.execute(
        select(Finding.severity, func.count(Finding.id))
        .group_by(Finding.severity)
    ).all()
    severity_distribution = {row[0]: row[1] for row in sev_rows}

    # Ensure all standard severities present even if zero
    for sev in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"):
        severity_distribution.setdefault(sev, 0)

    # ── Critical findings count ──────────────────────────────────────────
    critical_count = severity_distribution.get("CRITICAL", 0)

    # ── Recent 10 scans ──────────────────────────────────────────────────
    recent_scans_rows = db.execute(
        select(Scan)
        .order_by(Scan.started_at.desc())
        .limit(10)
    ).scalars().all()

    recent_scans = [
        {
            "id": s.id,
            "artifact_id": s.artifact_id,
            "scan_type": s.scan_type,
            "status": s.status,
            "risk_level": s.risk_level,
            "risk_score": s.risk_score,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        }
        for s in recent_scans_rows
    ]

    return {
        "total_scans": total_scans,
        "total_findings": total_findings,
        "critical_findings": critical_count,
        "quarantined_artifacts": quarantined,
        "avg_risk_score": avg_risk_score,
        "risk_distribution": risk_distribution,
        "severity_distribution": severity_distribution,
        "recent_scans": recent_scans,
    }
