"""
AISecGuard — Report Export Endpoint
Week 5: JSON remediation report export for completed scans.

Endpoints:
  GET /api/v1/scans/{scan_id}/report          — JSON remediation report
  GET /api/v1/scans/{scan_id}/report?format=pdf — PDF remediation report (reportlab)
"""

import io
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.scan import Scan
from app.models.finding import Finding
from app.models.artifact import Artifact
from app.models.provenance import ProvenanceRecord
from app.models.signature import ArtifactSignature
from app.models.quarantine_event import QuarantineEvent
from app.services.pdf_report_generator import generate_security_scan_pdf, _derive_security_impact

router = APIRouter()


def _normalize_enum_val(val) -> str:
    """Extract clean string value from Enum or string representation."""
    if val is None:
        return ""
    if hasattr(val, "value"):
        return str(val.value)
    s = str(val)
    if "." in s:
        return s.split(".")[-1]
    return s


def _build_report_dict(scan: Scan, artifact: Artifact, findings: list, db: Optional[Session] = None) -> dict:
    """Build the structured JSON report payload enriched with provenance, signatures, and quarantine telemetry."""
    # Compute scan duration
    duration_seconds = None
    if scan.started_at and scan.completed_at:
        duration_seconds = (scan.completed_at - scan.started_at).total_seconds()

    # Severity summary
    by_severity = _count_by_severity(findings)

    # Optional DB telemetry
    provenance_data = {}
    signature_data = {"is_signed": False}
    quarantine_data = {"is_quarantined": False}

    if db is not None:
        try:
            prov = db.execute(
                select(ProvenanceRecord)
                .where(ProvenanceRecord.artifact_id == artifact.id)
                .order_by(ProvenanceRecord.uploaded_at.desc())
            ).scalars().first()
            if prov:
                provenance_data = {
                    "expected_sha256": prov.expected_sha256,
                    "source_url": prov.source_url,
                    "uploader_id": prov.uploader_id,
                }
        except Exception:
            pass

        try:
            sig = db.execute(
                select(ArtifactSignature)
                .where(ArtifactSignature.artifact_id == artifact.id)
                .order_by(ArtifactSignature.signed_at.desc())
            ).scalars().first()
            if sig:
                signature_data = {
                    "is_signed": True,
                    "algorithm": sig.algorithm,
                    "key_id": sig.key_id,
                    "signed_by": sig.signed_by,
                    "signed_at": sig.signed_at.isoformat() if sig.signed_at else None,
                }
        except Exception:
            pass

        try:
            quar = db.execute(
                select(QuarantineEvent)
                .where(QuarantineEvent.artifact_id == artifact.id)
                .order_by(QuarantineEvent.timestamp.desc())
            ).scalars().first()
            if quar and quar.action == "QUARANTINE":
                quarantine_data = {
                    "is_quarantined": True,
                    "action": quar.action,
                    "reason": quar.reason,
                    "timestamp": quar.timestamp.isoformat() if quar.timestamp else None,
                    "actor_email": quar.actor_email,
                }
        except Exception:
            pass

    return {
        "report_generated_at": datetime.now(timezone.utc).isoformat(),
        "schema_version": "3.0",
        "artifact": {
            "id": str(artifact.id),
            "original_filename": artifact.original_filename,
            "artifact_type": _normalize_enum_val(artifact.artifact_type),
            "file_size_bytes": artifact.file_size,
            "sha256": artifact.sha256,
            "uploaded_at": artifact.uploaded_at.isoformat() if artifact.uploaded_at else None,
        },
        "scan": {
            "id": str(scan.id),
            "scan_type": _normalize_enum_val(scan.scan_type),
            "status": _normalize_enum_val(scan.status),
            "risk_level": _normalize_enum_val(scan.risk_level),
            "risk_score": scan.risk_score,
            "started_at": scan.started_at.isoformat() if scan.started_at else None,
            "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
            "duration_seconds": round(duration_seconds, 3) if duration_seconds is not None else None,
        },
        "provenance": provenance_data,
        "signature": signature_data,
        "quarantine": quarantine_data,
        "summary": {
            "total_findings": len(findings),
            "by_severity": by_severity,
            "critical_count": by_severity.get("CRITICAL", 0),
            "high_count": by_severity.get("HIGH", 0),
            "medium_count": by_severity.get("MEDIUM", 0),
            "low_count": by_severity.get("LOW", 0),
            "informational_count": by_severity.get("INFORMATIONAL", 0),
        },
        "scan_phases": [
            "1. Provenance & Integrity Check (SHA-256 baseline verification, substitution detection)",
            f"2. {_normalize_enum_val(artifact.artifact_type)} Static Security Scanner (format-specific static byte analysis)",
            "3. Lineage Risk Check (upstream dependency & model propagation checks)",
            "4. Risk Assessment Engine (severity-weighted numeric threat score)",
            "5. Attestation & Quarantine Policy Enforcement (automated vault isolation or Ed25519 signing)",
        ],
        "findings": [
            {
                "id": str(f.id),
                "rule_id": f.rule_id,
                "finding_type": _normalize_enum_val(f.finding_type),
                "severity": _normalize_enum_val(f.severity).upper(),
                "title": f.title,
                "description": f.description,
                "evidence": f.evidence,
                "recommendation": f.recommendation,
                "impact": _derive_security_impact(f.rule_id or "", _normalize_enum_val(f.severity).upper()),
                "component": artifact.original_filename,
            }
            for f in findings
        ],
        "disclaimer": (
            "This report is generated via automated static security heuristics. "
            "No untrusted code or weights were executed or deserialized. "
            "Findings serve as security indicators requiring analyst validation."
        ),
    }


def _count_by_severity(findings: list) -> dict:
    """Count findings grouped by severity."""
    counts = {"INFORMATIONAL": 0, "LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for f in findings:
        sev = _normalize_enum_val(getattr(f, "severity", "")).upper()
        if sev in counts:
            counts[sev] += 1
    return counts


def _generate_pdf(report: dict) -> bytes:
    """
    Generate an enterprise-grade PDF security assessment report.
    Uses the redesigned ReportLab generator with custom NumberedCanvas.
    """
    try:
        from app.services.pdf_report_generator import generate_security_scan_pdf
        return generate_security_scan_pdf(report)
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="PDF export requires 'reportlab'. Install it with: pip install reportlab",
        )


# ---------------------------------------------------------------------------
# GET /{scan_id}/report
# ---------------------------------------------------------------------------

@router.get(
    "/{scan_id}/report",
    summary="Download remediation report for a scan",
    responses={
        200: {"description": "JSON or PDF report"},
        404: {"description": "Scan not found"},
        400: {"description": "Scan not yet completed"},
    },
)
def download_report(
    scan_id: str,
    format: Optional[str] = Query(default="json", description="Report format: 'json' or 'pdf'"),
    db: Session = Depends(get_db),
):
    """
    Download a structured remediation report for a completed scan.

    - `format=json` (default): returns structured JSON with all findings, evidence, and recommendations.
    - `format=pdf`: returns a formatted PDF document (requires reportlab).

    Returns HTTP 400 if the scan has not completed yet.
    """
    scan = db.get(Scan, scan_id)
    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan not found: {scan_id}",
        )

    if scan.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Scan {scan_id} is not completed yet (status: {scan.status}). Reports are only available for completed scans.",
        )

    artifact = db.get(Artifact, scan.artifact_id)
    if artifact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact for scan {scan_id} not found.",
        )

    findings = db.execute(
        select(Finding).where(Finding.scan_id == scan_id).order_by(Finding.severity.desc())
    ).scalars().all()

    report = _build_report_dict(scan, artifact, list(findings), db=db)

    if format and format.lower() == "pdf":
        pdf_bytes = _generate_pdf(report)
        filename = f"aisecguard_report_{scan_id[:8]}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    # Default: JSON
    filename = f"aisecguard_report_{scan_id[:8]}.json"
    return JSONResponse(
        content=report,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# Reports List Router (for Security Reports page)
# ---------------------------------------------------------------------------

reports_list_router = APIRouter()


@reports_list_router.get(
    "/",
    summary="List all completed security reports",
)
def list_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    db: Session = Depends(get_db),
):
    """
    List all completed scans with artifact metadata, risk level, score,
    and direct download links for PDF and JSON security reports.
    """
    stmt = (
        select(Scan, Artifact)
        .join(Artifact, Scan.artifact_id == Artifact.id)
        .where(Scan.status == "COMPLETED")
    )

    if risk_level:
        stmt = stmt.where(Scan.risk_level == risk_level.upper())

    stmt = stmt.order_by(Scan.completed_at.desc().nullslast())

    results = db.execute(stmt.offset(skip).limit(limit)).all()
    total_count = db.scalar(
        select(func.count(Scan.id)).where(Scan.status == "COMPLETED")
    ) or 0

    reports_data = []
    for scan_obj, art_obj in results:
        # Count findings for this scan
        f_counts = db.execute(
            select(Finding.severity, func.count(Finding.id))
            .where(Finding.scan_id == scan_obj.id)
            .group_by(Finding.severity)
        ).all()
        sev_map = {str(sev): cnt for sev, cnt in f_counts}

        reports_data.append({
            "scan_id": scan_obj.id,
            "artifact_id": art_obj.id,
            "artifact_name": art_obj.original_filename,
            "artifact_type": _normalize_enum_val(art_obj.artifact_type),
            "file_size": art_obj.file_size,
            "sha256": art_obj.sha256,
            "risk_level": _normalize_enum_val(scan_obj.risk_level),
            "risk_score": scan_obj.risk_score or 0,
            "completed_at": scan_obj.completed_at.isoformat() if scan_obj.completed_at else None,
            "findings_count": sum(sev_map.values()),
            "critical_count": sev_map.get("CRITICAL", 0),
            "high_count": sev_map.get("HIGH", 0),
            "medium_count": sev_map.get("MEDIUM", 0),
            "low_count": sev_map.get("LOW", 0),
            "json_url": f"/api/v1/scans/{scan_obj.id}/report?format=json",
            "pdf_url": f"/api/v1/scans/{scan_obj.id}/report?format=pdf",
        })

    return {
        "total": total_count,
        "reports": reports_data,
    }
