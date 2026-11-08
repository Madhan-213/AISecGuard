"""
AISecGuard — Scan Orchestrator Service
Integrates the Model, Dataset, and Dependency scanners (via app.scanners registry)
with the Risk Assessment Engine.

Pipeline:
  1. Find artifact by ID
  2. Mark artifact SCANNING
  3. Integrity checks: SHA-256 vs upload baseline, expected hash, same-name substitution
  4. Look up the scanner for the artifact type in app.scanners.SCANNER_REGISTRY,
     then run lineage-aware checks (upstream risk, dataset version diff)
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

import logging
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.artifact import Artifact
from app.models.scan import Scan
from app.models.finding import Finding
from app.models.enums import ArtifactStatus, ScanStatus, RiskLevel
from app.scanners import run_scanner
from app.services.integrity_service import run_integrity_checks
from app.services.lineage_service import run_lineage_checks
from app.services.risk_engine import calculate_risk

logger = logging.getLogger(__name__)


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
    scan_start = time.monotonic()
    logger.info("[SCAN-START] Starting scan pipeline | artifact_id=%s", artifact_id)

    # --- Step 1: Fetch artifact ---
    artifact = db.get(Artifact, artifact_id)
    if artifact is None:
        logger.error("[SCAN-ERROR] Artifact not found: %s", artifact_id)
        raise ValueError(f"Artifact not found: {artifact_id}")

    logger.info(
        "[SCAN-ARTIFACT] Loaded artifact | name=%s | type=%s | size=%s bytes | sha256=%s...",
        artifact.original_filename,
        artifact.artifact_type,
        artifact.file_size,
        (artifact.sha256[:16] if artifact.sha256 else "N/A"),
    )

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

    # A quarantined artifact stays quarantined while it is re-scanned; only a release changes that.
    was_quarantined = artifact.status == ArtifactStatus.QUARANTINED.value
    final_status = ArtifactStatus.QUARANTINED.value if was_quarantined else ArtifactStatus.SCANNED.value
    artifact.status = ArtifactStatus.QUARANTINED.value if was_quarantined else ArtifactStatus.SCANNING.value
    db.commit()
    db.refresh(scan)

    logger.info(
        "[SCAN-CREATED] Scan record created | scan_id=%s | type=%s",
        scan.id, scan.scan_type
    )

    findings_data: list[dict] = []

    try:
        storage_path = Path(artifact.storage_path)

        # --- Step 3: Integrity checks against the upload baseline (PROV-001..003) ---
        t0 = time.monotonic()
        logger.info(
            "[SCAN-PHASE] Phase 1/4: Integrity checks (SHA-256, provenance baseline, substitution detection)"
        )
        integrity_findings = run_integrity_checks(db, artifact, storage_path)
        findings_data.extend(f.to_dict() for f in integrity_findings)
        logger.info(
            "[SCAN-PHASE] Integrity check complete | findings=%d | elapsed=%.3fs",
            len(integrity_findings), time.monotonic() - t0
        )

        # --- Step 4: Type-specific scanner (looked up in the registry) ---
        t0 = time.monotonic()
        logger.info(
            "[SCAN-PHASE] Phase 2/4: Running %s static scanner | file=%s | size=%d bytes",
            artifact.artifact_type, storage_path.name, artifact.file_size
        )
        scanner_findings = run_scanner(artifact.artifact_type, storage_path)
        findings_data.extend(f.to_dict() for f in scanner_findings)
        logger.info(
            "[SCAN-PHASE] %s scanner complete | findings=%d | elapsed=%.3fs",
            artifact.artifact_type, len(scanner_findings), time.monotonic() - t0
        )

        # --- Step 4b: Lineage-aware checks (upstream risk, dataset version diff) ---
        t0 = time.monotonic()
        logger.info(
            "[SCAN-PHASE] Phase 3/4: Lineage checks (upstream risk propagation, dataset version diff)"
        )
        lineage_findings = run_lineage_checks(db, artifact, storage_path)
        findings_data.extend(f.to_dict() for f in lineage_findings)
        logger.info(
            "[SCAN-PHASE] Lineage checks complete | findings=%d | elapsed=%.3fs",
            len(lineage_findings), time.monotonic() - t0
        )

        # --- Step 5: Persist findings ---
        logger.info(
            "[SCAN-PHASE] Phase 4/4: Persisting %d findings to database", len(findings_data)
        )
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
        total_elapsed = time.monotonic() - scan_start

        # Count by severity for logging
        sev_counts: dict[str, int] = {}
        for fd in findings_data:
            sev = str(fd.get("severity", "UNKNOWN"))
            sev_counts[sev] = sev_counts.get(sev, 0) + 1

        logger.info(
            "[SCAN-RISK] Risk assessment complete | score=%d | level=%s | findings=%d | severity_breakdown=%s",
            risk_score, risk_level.value, len(findings_data), sev_counts
        )

        # --- Step 7: Complete scan ---
        scan.status = ScanStatus.COMPLETED.value
        scan.risk_level = risk_level.value
        scan.risk_score = risk_score
        scan.completed_at = datetime.now(timezone.utc)
        artifact.status = final_status

        db.commit()
        db.refresh(scan)

        logger.info(
            "[SCAN-COMPLETE] Scan finished | scan_id=%s | artifact=%s | risk=%s | score=%d | "
            "total_findings=%d | duration=%.3fs",
            scan.id, artifact.original_filename, risk_level.value, risk_score,
            len(findings_data), total_elapsed
        )
        return scan

    except Exception as exc:
        elapsed = time.monotonic() - scan_start
        logger.error(
            "[SCAN-FAILED] Scan pipeline failed | scan_id=%s | artifact=%s | error=%s | elapsed=%.3fs",
            scan.id, artifact_id, str(exc), elapsed, exc_info=True
        )
        scan.status = ScanStatus.FAILED.value
        scan.completed_at = datetime.now(timezone.utc)
        artifact.status = ArtifactStatus.QUARANTINED.value if was_quarantined else ArtifactStatus.FAILED.value
        db.commit()
        raise RuntimeError(f"Scan failed: {exc}") from exc
