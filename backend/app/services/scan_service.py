"""
AISecGuard — Scan Orchestrator Service
Integrates the Model, Dataset, and Dependency scanners (via app.scanners registry)
with the Risk Assessment Engine.

Pipeline:
  1. Find artifact by ID
  2. Mark artifact SCANNING
  3. Run provenance/integrity check
  4. Look up the scanner for the artifact type in app.scanners.SCANNER_REGISTRY
  5. Collect all findings
  6. Run Risk Assessment Engine (numeric score + risk level)
  7. Persist findings and scan result
  8. Mark scan COMPLETED
  9. Return the scan record

Risk Assessment Engine (Week 4):
  Severity weights: LOW=1, MEDIUM=3, HIGH=6, CRITICAL=10, INFORMATIONAL=0
  risk_score = sum of weights for all findings
  risk_level: LOW (<5), MEDIUM (5-14), HIGH (15-29), CRITICAL (>=30)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.artifact import Artifact
from app.models.scan import Scan
from app.models.finding import Finding
from app.models.enums import ArtifactStatus, ScanStatus, RiskLevel
from app.scanners import run_scanner
from app.scanners.provenance_scanner import run_provenance_check
from app.services.risk_engine import calculate_risk


# ---------------------------------------------------------------------------
# Main scan pipeline
# ---------------------------------------------------------------------------

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
        scan_type=artifact.artifact_type,  # MODEL / DATASET / DEPENDENCY
        status=ScanStatus.RUNNING.value,
        risk_level=RiskLevel.UNKNOWN.value,
        risk_score=0,
        started_at=datetime.now(timezone.utc),
    )
    db.add(scan)

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
                "rule_id": "PROV-001",
                "finding_type": pf.finding_type.value,
                "severity": pf.severity.value,
                "title": pf.title,
                "description": pf.description,
                "evidence": pf.evidence,
                "recommendation": pf.recommendation,
            })

        # --- Step 4: Type-specific scanner (looked up in the registry) ---
        findings_data.extend(
            f.to_dict() for f in run_scanner(artifact.artifact_type, storage_path)
        )

        # --- Step 5: Persist findings ---
        db_findings: list[Finding] = []
        for fd in findings_data:
            finding = Finding(
                id=str(uuid.uuid4()),
                scan_id=scan.id,
                rule_id=fd.get("rule_id"),
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

        # --- Step 6: Risk Assessment Engine ---
        risk_score, risk_level = calculate_risk(findings_data)

        # --- Step 7: Complete scan ---
        scan.status = ScanStatus.COMPLETED.value
        scan.risk_level = risk_level.value
        scan.risk_score = risk_score
        scan.completed_at = datetime.now(timezone.utc)
        artifact.status = ArtifactStatus.SCANNED.value

        db.commit()
        db.refresh(scan)
        return scan

    except Exception as exc:
        scan.status = ScanStatus.FAILED.value
        scan.completed_at = datetime.now(timezone.utc)
        artifact.status = ArtifactStatus.FAILED.value
        db.commit()
        raise RuntimeError(f"Scan failed: {exc}") from exc
