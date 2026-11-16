"""
AISecGuard — Dashboard Stats API Endpoint
Week 6: Aggregate statistics for the security dashboard.

GET /api/v1/stats  — returns scan counts, risk distribution,
                     severity breakdown, and recent scan list.
Week 9: artifact totals, 14-day scan timeline, top rules, known CVEs,
        signatures and lineage links for the redesigned dashboard.
"""

import os
from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.scan import Scan
from app.models.finding import Finding
from app.models.artifact import Artifact
from app.models.lineage import LineageEdge
from app.models.signature import ArtifactSignature
from app.services.queries import latest_scan_ids, plain

TIMELINE_DAYS = 14
TOP_RULES = 8

router = APIRouter()


@router.get(
    "/",
    summary="Dashboard aggregate statistics",
    tags=["Stats"],
)
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return aggregate statistics for the security dashboard:
    - Scoped to the authenticated user (so each account has its own fresh workspace).
    - Total scans, findings, quarantined artifacts
    - Risk level distribution across all user scans
    - Findings count by severity
    - Average risk score
    - 10 most recent scans for this user
    """
    # Always scope to the authenticated user's data.
    # NOTE: is_admin here means "admin of their own workspace" (every new user),
    # NOT "super admin who can see all users' data". So we always filter by user_id.
    uid = current_user.id if current_user else None
    user_filter = (Scan.user_id == uid) if uid else None
    art_filter = (Artifact.user_id == uid) if uid else None

    # ── Totals ──────────────────────────────────────────────────────────
    scan_count_q = select(func.count(Scan.id))
    if user_filter is not None:
        scan_count_q = scan_count_q.where(user_filter)
    total_scans = db.execute(scan_count_q).scalar_one()

    quar_q = select(func.count(Artifact.id)).where(Artifact.status == "QUARANTINED")
    if art_filter is not None:
        quar_q = quar_q.where(art_filter)
    quarantined = db.execute(quar_q).scalar_one()

    # ── Average risk score ───────────────────────────────────────────────
    avg_q = select(func.avg(Scan.risk_score)).where(Scan.status == "COMPLETED")
    if user_filter is not None:
        avg_q = avg_q.where(user_filter)
    avg_risk = db.execute(avg_q).scalar_one()
    avg_risk_score = round(float(avg_risk), 1) if avg_risk else 0

    # ── Risk level distribution ──────────────────────────────────────────
    risk_q = select(Scan.risk_level, func.count(Scan.id))
    if user_filter is not None:
        risk_q = risk_q.where(user_filter)
    risk_rows = db.execute(risk_q.group_by(Scan.risk_level)).all()
    risk_distribution = {row[0]: row[1] for row in risk_rows}

    # ── Severity distribution ────────────────────────────────────────────
    if user_filter is not None:
        user_scan_subq = select(Scan.id).where(user_filter)
        sev_q = select(Finding.severity, func.count(Finding.id)).where(Finding.scan_id.in_(user_scan_subq))
        total_findings_q = select(func.count(Finding.id)).where(Finding.scan_id.in_(user_scan_subq))
    else:
        sev_q = select(Finding.severity, func.count(Finding.id))
        total_findings_q = select(func.count(Finding.id))

    total_findings = db.execute(total_findings_q).scalar_one()
    sev_rows = db.execute(sev_q.group_by(Finding.severity)).all()
    severity_distribution = {row[0]: row[1] for row in sev_rows}

    # Ensure all standard severities present even if zero
    for sev in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"):
        severity_distribution.setdefault(sev, 0)

    # ── Critical findings count ──────────────────────────────────────────
    critical_count = severity_distribution.get("CRITICAL", 0)

    # ── Recent 10 scans ──────────────────────────────────────────────────
    recent_q = select(Scan)
    if user_filter is not None:
        recent_q = recent_q.where(user_filter)
    recent_scans_rows = db.execute(
        recent_q.order_by(Scan.started_at.desc()).limit(10)
    ).scalars().all()

    artifact_names = dict(db.execute(
        select(Artifact.id, Artifact.original_filename).where(
            Artifact.id.in_({s.artifact_id for s in recent_scans_rows})
        )
    ).all()) if recent_scans_rows else {}
    finding_counts = dict(db.execute(
        select(Finding.scan_id, func.count(Finding.id))
        .where(Finding.scan_id.in_([s.id for s in recent_scans_rows]))
        .group_by(Finding.scan_id)
    ).all()) if recent_scans_rows else {}

    recent_scans = [
        {
            "id": s.id,
            "artifact_name": artifact_names.get(s.artifact_id),
            "findings_count": finding_counts.get(s.id, 0),
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
        **_dashboard_breakdowns(db, user_id=current_user.id if current_user else None),
    }


def _as_utc_date(value: datetime):
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).date()


def _rule_title(titles: list[str]) -> str:
    """One label per rule: the title itself, or the shared start when findings name different items."""
    distinct = sorted(set(titles))
    if len(distinct) == 1:
        return distinct[0]
    prefix = os.path.commonprefix(distinct)
    if " " in prefix and not prefix.endswith(" "):
        prefix = prefix[: prefix.rfind(" ")]
    return prefix.rstrip(" :'\"-—(") or distinct[0]


def _dashboard_breakdowns(db: Session, user_id: str | None = None) -> dict:
    """Totals and series for the dashboard; per-artifact numbers use each artifact's latest scan.
    When user_id is provided, all queries are scoped to that user's data only."""

    # Artifact counts — scoped to this user
    art_q = select(Artifact.artifact_type)
    if user_id:
        art_q = art_q.where(Artifact.user_id == user_id)
    by_type = Counter(plain(t) for (t,) in db.execute(art_q).all())

    # Latest scan IDs — scoped to this user
    latest = latest_scan_ids(db, user_id=user_id)
    latest_levels = dict(db.execute(select(Scan.id, Scan.risk_level).where(Scan.id.in_(latest))).all()) if latest else {}

    known_vulns = db.execute(
        select(func.count(Finding.id)).where(Finding.rule_id == "DEP-007", Finding.scan_id.in_(latest))
    ).scalar_one() if latest else 0

    # Scan activity timeline — scoped to this user
    today = datetime.now(timezone.utc).date()
    days = [today - timedelta(days=offset) for offset in range(TIMELINE_DAYS - 1, -1, -1)]
    buckets = {d: {"date": d.isoformat(), "scans": 0, "high_risk": 0} for d in days}
    timeline_q = select(Scan.started_at, Scan.risk_level)
    if user_id:
        timeline_q = timeline_q.where(Scan.user_id == user_id)
    for started_at, level in db.execute(timeline_q).all():
        if started_at is None:
            continue
        bucket = buckets.get(_as_utc_date(started_at))
        if bucket:
            bucket["scans"] += 1
            bucket["high_risk"] += plain(level) in ("HIGH", "CRITICAL")

    rule_rows = db.execute(
        select(Finding.rule_id, func.count(Finding.id))
        .where(Finding.rule_id.isnot(None), Finding.scan_id.in_(latest))
        .group_by(Finding.rule_id)
        .order_by(func.count(Finding.id).desc(), Finding.rule_id)
        .limit(TOP_RULES)
    ).all() if latest else []
    top_rules = []
    for rule_id, count in rule_rows:
        samples = db.execute(
            select(Finding.title, Finding.severity).where(Finding.rule_id == rule_id, Finding.scan_id.in_(latest)).limit(20)
        ).all()
        top_rules.append({
            "rule_id": rule_id,
            "title": _rule_title([t for t, _ in samples]),
            "severity": plain(samples[0][1]),
            "count": count,
        })

    # Signed artifacts — scoped to this user
    sig_q = select(func.count(func.distinct(ArtifactSignature.artifact_id)))
    if user_id:
        # Join to Artifact to scope by user_id
        sig_q = (
            select(func.count(func.distinct(ArtifactSignature.artifact_id)))
            .join(Artifact, Artifact.id == ArtifactSignature.artifact_id)
            .where(Artifact.user_id == user_id)
        )
    signed_count = db.execute(sig_q).scalar_one()

    # Lineage links — scoped to this user (via parent artifact)
    lin_q = select(func.count(LineageEdge.id))
    if user_id:
        lin_q = (
            select(func.count(LineageEdge.id))
            .join(Artifact, Artifact.id == LineageEdge.parent_id)
            .where(Artifact.user_id == user_id)
        )
    lineage_count = db.execute(lin_q).scalar_one()

    return {
        "total_artifacts": sum(by_type.values()),
        "artifacts_by_type": dict(by_type),
        "high_risk_scans": sum(1 for lvl in latest_levels.values() if plain(lvl) in ("HIGH", "CRITICAL")),
        "known_vulnerabilities": known_vulns,
        "signed_artifacts": signed_count,
        "lineage_links": lineage_count,
        "scans_over_time": list(buckets.values()),
        "top_rules": top_rules,
    }
