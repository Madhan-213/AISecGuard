"""
AISecGuard — Scan Orchestrator Service
Week 4: Integrates Dataset, Dependency, and Model scanners with Risk Assessment Engine.

Pipeline:
  1. Find artifact by ID
  2. Mark artifact SCANNING
  3. Run provenance/integrity check
  4. Route to the correct scanner based on artifact type:
       MODEL      → Model Scanner
       DATASET    → Dataset Scanner
       DEPENDENCY → Dependency Scanner
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


# ---------------------------------------------------------------------------
# Risk Assessment Engine
# ---------------------------------------------------------------------------
from app.services.risk_engine import calculate_risk, assess_risk, SEVERITY_WEIGHTS


# ---------------------------------------------------------------------------
# Dataset Scanner integration
# ---------------------------------------------------------------------------

def _run_dataset_scanner(storage_path: Path) -> list[dict]:
    """Run dataset scanner and return findings as dicts."""
    try:
        from scanners.dataset_scanner import scan_dataset_file
        result = scan_dataset_file(storage_path)
        findings: list[dict] = []
        for f in result.findings:
            findings.append({
                "rule_id": f.rule_id,
                "finding_type": f.finding_type.value,
                "severity": f.severity.value,
                "title": f.title,
                "description": f.description,
                "evidence": f.evidence,
                "recommendation": f.recommendation,
            })
        if result.scan_error:
            findings.append({
                "rule_id": "DATA-000",
                "finding_type": FindingType.MALFORMED_FILE.value,
                "severity": FindingSeverity.MEDIUM.value,
                "title": "Dataset scanner encountered an error",
                "description": (
                    "The dataset scanner could not fully analyse the file. "
                    "It may be corrupted or in an unexpected format."
                ),
                "evidence": result.scan_error[:500],
                "recommendation": "Verify the dataset file is valid and not corrupted.",
            })
        return findings
    except ImportError:
        return [{
            "rule_id": "DATA-000",
            "finding_type": FindingType.OTHER.value,
            "severity": FindingSeverity.LOW.value,
            "title": "Dataset scanner not available",
            "description": "The dataset scanner module could not be loaded.",
            "evidence": None,
            "recommendation": "Ensure scanners/dataset_scanner/ is properly installed.",
        }]
    except Exception as e:
        return [{
            "rule_id": "DATA-000",
            "finding_type": FindingType.MALFORMED_FILE.value,
            "severity": FindingSeverity.MEDIUM.value,
            "title": "Dataset scanner error",
            "description": f"An unexpected error occurred in the dataset scanner: {str(e)[:200]}",
            "evidence": str(e)[:500],
            "recommendation": "Verify the dataset file and report this error.",
        }]


# ---------------------------------------------------------------------------
# Dependency Scanner integration
# ---------------------------------------------------------------------------

def _run_dependency_scanner(storage_path: Path) -> list[dict]:
    """Run dependency scanner and return findings as dicts."""
    try:
        from scanners.dependency_scanner import scan_dependency_file
        result = scan_dependency_file(storage_path)
        findings: list[dict] = []
        for f in result.findings:
            findings.append({
                "rule_id": f.rule_id,
                "finding_type": f.finding_type.value,
                "severity": f.severity.value,
                "title": f.title,
                "description": f.description,
                "evidence": f.evidence,
                "recommendation": f.recommendation,
            })
        if result.scan_error:
            findings.append({
                "rule_id": "DEP-000",
                "finding_type": FindingType.MALFORMED_FILE.value,
                "severity": FindingSeverity.MEDIUM.value,
                "title": "Dependency scanner encountered an error",
                "description": (
                    "The dependency scanner could not fully analyse the file."
                ),
                "evidence": result.scan_error[:500],
                "recommendation": "Verify the dependency file format.",
            })
        return findings
    except ImportError:
        return [{
            "rule_id": "DEP-000",
            "finding_type": FindingType.OTHER.value,
            "severity": FindingSeverity.LOW.value,
            "title": "Dependency scanner not available",
            "description": "The dependency scanner module could not be loaded.",
            "evidence": None,
            "recommendation": "Ensure scanners/dependency_scanner/ is properly installed.",
        }]
    except Exception as e:
        return [{
            "rule_id": "DEP-000",
            "finding_type": FindingType.MALFORMED_FILE.value,
            "severity": FindingSeverity.MEDIUM.value,
            "title": "Dependency scanner error",
            "description": f"An unexpected error in the dependency scanner: {str(e)[:200]}",
            "evidence": str(e)[:500],
            "recommendation": "Verify the dependency file and report this error.",
        }]


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

        # --- Step 4: Type-specific scanner ---
        if artifact.artifact_type == ArtifactType.MODEL.value:
            model_result = scan_model_file(storage_path)
            for mf in model_result.findings:
                findings_data.append({
                    "rule_id": getattr(mf, "rule_id", "MODEL-000"),
                    "finding_type": mf.finding_type.value,
                    "severity": mf.severity.value,
                    "title": mf.title,
                    "description": mf.description,
                    "evidence": mf.evidence,
                    "recommendation": mf.recommendation,
                })
            if model_result.scan_error:
                findings_data.append({
                    "rule_id": "MODEL-000",
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

        elif artifact.artifact_type == ArtifactType.DATASET.value:
            findings_data.extend(_run_dataset_scanner(storage_path))

        elif artifact.artifact_type == ArtifactType.DEPENDENCY.value:
            findings_data.extend(_run_dependency_scanner(storage_path))

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
