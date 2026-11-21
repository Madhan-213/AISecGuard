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

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.models.scan import Scan
from app.models.finding import Finding
from app.models.artifact import Artifact

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


def _build_report_dict(scan: Scan, artifact: Artifact, findings: list) -> dict:
    """Build the structured JSON report payload."""
    # Compute scan duration
    duration_seconds = None
    if scan.started_at and scan.completed_at:
        duration_seconds = (scan.completed_at - scan.started_at).total_seconds()

    # Severity summary
    by_severity = _count_by_severity(findings)

    return {
        "report_generated_at": datetime.now(timezone.utc).isoformat(),
        "schema_version": "2.0",
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
    Generate a PDF report using reportlab.
    Falls back gracefully if reportlab is not installed.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        )

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm,
                                topMargin=2*cm, bottomMargin=2*cm)

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle("Title", parent=styles["Title"],
                                     fontSize=18, spaceAfter=6, textColor=colors.HexColor("#1e293b"))
        h2_style = ParagraphStyle("H2", parent=styles["Heading2"],
                                   fontSize=13, spaceBefore=12, spaceAfter=4,
                                   textColor=colors.HexColor("#2563eb"))
        normal = styles["Normal"]

        SEVERITY_HEX = {
            "CRITICAL": "#dc2626",
            "HIGH":     "#ea580c",
            "MEDIUM":   "#ca8a04",
            "LOW":      "#16a34a",
            "INFORMATIONAL": "#6b7280",
        }

        story = []

        # Brand Logo if available
        try:
            from pathlib import Path
            from reportlab.platypus import Image as RLImage
            logo_p = Path(__file__).resolve().parents[4] / "static" / "logos" / "logo-horizontal.png"
            if not logo_p.exists():
                logo_p = Path(__file__).resolve().parents[4] / "static" / "logos" / "logo-icon.png"
            if logo_p.exists():
                story.append(RLImage(str(logo_p), width=5.5*cm, height=1.65*cm))
                story.append(Spacer(1, 0.2*cm))
        except Exception:
            pass

        # Title
        story.append(Paragraph("AISecGuard — Security Scan Report", title_style))
        story.append(Paragraph(
            f"Generated: {report['report_generated_at']}", normal))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
        story.append(Spacer(1, 0.3*cm))

        # Artifact info
        story.append(Paragraph("Artifact", h2_style))
        art = report["artifact"]
        art_data = [
            ["Filename", art["original_filename"]],
            ["Type", art["artifact_type"]],
            ["SHA-256", art["sha256"][:32] + "..."],
            ["Size", f"{art['file_size_bytes']:,} bytes"],
            ["Uploaded", art["uploaded_at"]],
        ]
        t = Table(art_data, colWidths=[4*cm, 13*cm])
        t.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f8fafc")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.4*cm))

        # Scan summary
        story.append(Paragraph("Scan Summary", h2_style))
        sc = report["scan"]
        clean_risk = str(sc["risk_level"]).replace("RiskLevel.", "")
        risk_hex = SEVERITY_HEX.get(clean_risk.upper(), "#1e293b")
        risk_para = Paragraph(
            f'<font color="{risk_hex}"><b>{sc["risk_level"]} (score: {sc["risk_score"]})</b></font>', normal
        )
        dur_secs = sc.get("duration_seconds")
        dur_str = f"{dur_secs:.2f}s" if dur_secs is not None else "N/A"
        summary_data = [
            ["Risk Level", risk_para],
            ["Total Findings", str(report["summary"]["total_findings"])],
            ["Critical", str(report["summary"]["by_severity"]["CRITICAL"])],
            ["High", str(report["summary"]["by_severity"]["HIGH"])],
            ["Medium", str(report["summary"]["by_severity"]["MEDIUM"])],
            ["Low", str(report["summary"]["by_severity"]["LOW"])],
            ["Informational", str(report["summary"]["by_severity"]["INFORMATIONAL"])],
            ["Scan Duration", dur_str],
            ["Scan Type", str(sc.get("scan_type", "N/A"))],
        ]
        t2 = Table(summary_data, colWidths=[4*cm, 13*cm])
        t2.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ]))
        story.append(t2)
        story.append(Spacer(1, 0.4*cm))

        # Scan phases telemetry
        phases = report.get("scan_phases", [])
        if phases:
            story.append(Paragraph("Scan Phase Telemetry", h2_style))
            for phase in phases:
                story.append(Paragraph(f"• {phase}", normal))
            story.append(Spacer(1, 0.4*cm))

        # Findings
        if report["findings"]:
            story.append(Paragraph("Findings", h2_style))
            for idx, finding in enumerate(report["findings"], 1):
                sev = str(finding["severity"]).upper()
                clean_sev = sev.replace("RISKLEVEL.", "").replace("FINDINGSEVERITY.", "")
                sev_hex = SEVERITY_HEX.get(clean_sev, "#1e293b")
                story.append(Paragraph(
                    f'{idx}. <b>{finding["title"]}</b> — '
                    f'<font color="{sev_hex}">[{clean_sev}]</font>',
                    normal
                ))
                if finding.get("rule_id"):
                    story.append(Paragraph(f'Rule: {finding["rule_id"]}', normal))
                story.append(Paragraph(finding["description"], normal))
                if finding.get("evidence"):
                    story.append(Paragraph(f'Evidence: {finding["evidence"][:300]}', normal))
                if finding.get("recommendation"):
                    story.append(Paragraph(
                        f'<b>Recommendation:</b> {finding["recommendation"]}', normal
                    ))
                story.append(Spacer(1, 0.3*cm))
        else:
            story.append(Paragraph("No findings detected.", normal))

        doc.build(story)
        return buf.getvalue()

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

    report = _build_report_dict(scan, artifact, list(findings))

    if format and format.lower() == "pdf":
        pdf_bytes = _generate_pdf(report)
        filename = f"aisecguard_report_{scan_id[:8]}.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
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
