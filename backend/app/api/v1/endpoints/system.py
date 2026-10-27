"""
AISecGuard — System info and data export endpoints (Week 9)

  GET /api/v1/system/info        what the server can scan and which integrations are on
  GET /api/v1/exports/findings   every finding as CSV or JSON, for reporting
"""

from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.artifact import Artifact
from app.models.enums import ArtifactType, FindingSeverity
from app.models.finding import Finding
from app.models.scan import Scan
from app.scanners import SCANNER_REGISTRY
from app.services import signing_service
from app.services.queries import latest_scan_ids, plain

system_router = APIRouter()
exports_router = APIRouter()

_EXTENSIONS = {
    ArtifactType.MODEL: settings.ALLOWED_MODEL_EXTENSIONS,
    ArtifactType.DATASET: settings.ALLOWED_DATASET_EXTENSIONS,
    ArtifactType.DEPENDENCY: settings.ALLOWED_DEPENDENCY_EXTENSIONS,
}

EXPORT_COLUMNS = [
    "artifact", "artifact_type", "artifact_id", "sha256", "scan_id", "scan_completed_at",
    "risk_level", "risk_score", "rule_id", "severity", "finding_type", "title",
    "description", "evidence", "recommendation",
]


@system_router.get("/info", summary="Scanners, limits and integration status")
def system_info():
    try:
        signing = {"algorithm": signing_service.ALGORITHM, "key_id": signing_service.key_id()}
    except Exception:  # unwritable key directory: report it instead of failing the page
        signing = {"algorithm": signing_service.ALGORITHM, "key_id": None}
    return {
        "version": settings.VERSION,
        "external_api_keys_required": False,
        "scanners": [
            {"artifact_type": t.value, "name": scanner.name, "extensions": _EXTENSIONS.get(t, [])}
            for t, scanner in SCANNER_REGISTRY.items()
        ],
        "max_upload_mb": settings.MAX_UPLOAD_SIZE_MB,
        "auth": {"no_login_required": bool(settings.NO_LOGIN_REQUIRED), "api_key_header": "X-API-Key"},
        "signing": signing,
        "integrations": {
            "osv": {
                "enabled": bool(settings.OSV_LOOKUP_ENABLED),
                "setting": "OSV_LOOKUP_ENABLED",
                "description": (
                    "Online CVE lookups on OSV.dev for pinned dependencies. Free, needs no API key. "
                    "When off, the bundled offline CVE list is used."
                ),
            },
        },
    }


@exports_router.get("/findings", summary="Export findings as CSV or JSON")
def export_findings(
    format: Literal["csv", "json"] = Query("csv"),
    severity: FindingSeverity | None = Query(None),
    artifact_type: ArtifactType | None = Query(None),
    latest_only: bool = Query(True, description="Only each artifact's most recent completed scan"),
    db: Session = Depends(get_db),
):
    query = (
        select(Finding, Scan, Artifact)
        .join(Scan, Finding.scan_id == Scan.id)
        .join(Artifact, Scan.artifact_id == Artifact.id)
        .order_by(Artifact.original_filename, Scan.completed_at.desc())
    )
    if latest_only:
        query = query.where(Scan.id.in_(latest_scan_ids(db) or [""]))
    if severity:
        query = query.where(Finding.severity == severity.value)
    if artifact_type:
        query = query.where(Artifact.artifact_type == artifact_type.value)

    rows = [
        {
            "artifact": artifact.original_filename,
            "artifact_type": plain(artifact.artifact_type),
            "artifact_id": artifact.id,
            "sha256": artifact.sha256,
            "scan_id": scan.id,
            "scan_completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
            "risk_level": plain(scan.risk_level),
            "risk_score": scan.risk_score,
            "rule_id": finding.rule_id,
            "severity": plain(finding.severity),
            "finding_type": plain(finding.finding_type),
            "title": finding.title,
            "description": finding.description,
            "evidence": finding.evidence,
            "recommendation": finding.recommendation,
        }
        for finding, scan, artifact in db.execute(query).all()
    ]

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
    if format == "json":
        return {"exported_at": datetime.now(timezone.utc).isoformat(), "count": len(rows), "findings": rows}

    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=EXPORT_COLUMNS)
    writer.writeheader()
    writer.writerows(rows)
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="aisecguard-findings-{stamp}.csv"'},
    )
