"""
AISecGuard — Scan Orchestrator Service
Week 3: Coordinates the full scan pipeline for an artifact.

Pipeline:
  1. Find artifact by ID
  2. Mark artifact SCANNING
  3. Run provenance/integrity check
  4. If artifact type is MODEL: run model scanner
  5. Collect all findings
  6. Calculate preliminary risk level
  7. Persist findings and scan result
  8. Mark scan COMPLETED
  9. Return the scan record

Risk Logic (Week 3 — simplified):
  - No findings               → LOW
  - Informational only        → LOW
  - Any MEDIUM finding        → MEDIUM
  - Any HIGH finding          → HIGH
  - Any CRITICAL finding      → CRITICAL
  - Integrity violation found → HIGH (minimum)

NOTE: The full Risk Assessment Engine is planned for Week 5.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.artifact import Artifact
from app.models.scan import Scan
from app.models.finding import Finding
from app.models.enums import (
    ArtifactStatus,
    ArtifactType,
    ScanStatus,
    RiskLevel,
    FindingSeverity,
    FindingType,
)
from app.scanners.provenance_scanner import run_provenance_check
from app.scanners.model_scanner import scan_model_file


# Severity ranking for risk level calculation
_SEVERITY_ORDER = {
    FindingSeverity.INFORMATIONAL: 0,
    FindingSeverity.LOW: 1,
    FindingSeverity.MEDIUM: 2,
    FindingSeverity.HIGH: 3,
    FindingSeverity.CRITICAL: 4,
}


def _calculate_risk_level(findings: list[Finding]) -> RiskLevel:
    """
    Compute a preliminary risk level from the list of findings.
    Conservative: escalates with any HIGH/CRITICAL finding.
    """
    if not findings:
        return RiskLevel.LOW

    max_severity_rank = 0
    has_integrity_violation = False

    for f in findings:
        rank = _SEVERITY_ORDER.get(FindingSeverity(f.severity), 0)
        if rank > max_severity_rank:
            max_severity_rank = rank
        if f.finding_type == FindingType.INTEGRITY_VIOLATION.value:
            has_integrity_violation = True

    # Integrity violation always results in at least HIGH
    if has_integrity_violation and max_severity_rank < _SEVERITY_ORDER[FindingSeverity.HIGH]:
        max_severity_rank = _SEVERITY_ORDER[FindingSeverity.HIGH]

    if max_severity_rank == 0:
        return RiskLevel.LOW
    elif max_severity_rank == 1:
        return RiskLevel.LOW
    elif max_severity_rank == 2:
        return RiskLevel.MEDIUM
    elif max_severity_rank == 3:
        return RiskLevel.HIGH
    else:
        return RiskLevel.CRITICAL


def run_scan(artifact_id: str, db: Session) -> Scan:
    """
    Execute the full security scan pipeline for an artifact.

    Args:
        artifact_id: UUID of the Artifact to scan.
        db: Active SQLAlchemy session.

    Returns:
        The completed Scan ORM object (including findings).

    Raises:
        ValueError: If the artifact is not found.
        RuntimeError: If the scan fails unexpectedly.
    """
    # --- Step 1: Fetch artifact ---
    artifact = db.get(Artifact, artifact_id)
    if artifact is None:
        raise ValueError(f"Artifact not found: {artifact_id}")

    # --- Step 2: Create scan record ---
    scan = Scan(
        id=str(uuid.uuid4()),
        artifact_id=artifact_id,
        scan_type="FULL",
        status=ScanStatus.RUNNING.value,
        risk_level=RiskLevel.UNKNOWN.value,
        started_at=datetime.now(timezone.utc),
    )
    db.add(scan)

    # Mark artifact as scanning
    artifact.status = ArtifactStatus.SCANNING.value
    db.commit()
    db.refresh(scan)

    findings_data: list[dict] = []

    try:
        storage_path = Path(artifact.storage_path)

        # --- Step 3: Provenance / integrity check ---
        prov_result = run_provenance_check(
            storage_path=storage_path,
            source_url=None,
        )
        for pf in prov_result.findings:
            findings_data.append({
                "finding_type": pf.finding_type.value,
                "severity": pf.severity.value,
                "title": pf.title,
                "description": pf.description,
                "evidence": pf.evidence,
                "recommendation": pf.recommendation,
            })

        # --- Step 4: Model-specific scan ---
        if artifact.artifact_type == ArtifactType.MODEL.value:
            model_result = scan_model_file(storage_path)
            for mf in model_result.findings:
                findings_data.append({
                    "finding_type": mf.finding_type.value,
                    "severity": mf.severity.value,
                    "title": mf.title,
                    "description": mf.description,
                    "evidence": mf.evidence,
                    "recommendation": mf.recommendation,
                })

            if model_result.scan_error:
                findings_data.append({
                    "finding_type": FindingType.OTHER.value,
                    "severity": FindingSeverity.MEDIUM.value,
                    "title": "Scanner encountered an error reading the model file",
                    "description": (
                        "The model scanner could not fully read the file. "
                        "It may be corrupted, truncated, or in an unsupported format."
                    ),
                    "evidence": model_result.scan_error,
                    "recommendation": "Verify the file is complete and not corrupted.",
                })

        # --- Step 5: Persist findings ---
        db_findings: list[Finding] = []
        for fd in findings_data:
            finding = Finding(
                id=str(uuid.uuid4()),
                scan_id=scan.id,
                finding_type=fd["finding_type"],
                severity=fd["severity"],
                title=fd["title"],
                description=fd["description"],
                evidence=fd.get("evidence"),
                recommendation=fd.get("recommendation"),
            )
            db.add(finding)
            db_findings.append(finding)

        db.flush()

        # --- Step 6: Calculate risk level ---
        risk_level = _calculate_risk_level(db_findings)

        # --- Step 7: Complete scan ---
        scan.status = ScanStatus.COMPLETED.value
        scan.risk_level = risk_level.value
        scan.completed_at = datetime.now(timezone.utc)
        artifact.status = ArtifactStatus.SCANNED.value

        db.commit()
        db.refresh(scan)
        return scan

    except Exception as exc:
        # Mark scan as failed
        scan.status = ScanStatus.FAILED.value
        scan.completed_at = datetime.now(timezone.utc)
        artifact.status = ArtifactStatus.FAILED.value
        db.commit()
        raise RuntimeError(f"Scan failed: {exc}") from exc
