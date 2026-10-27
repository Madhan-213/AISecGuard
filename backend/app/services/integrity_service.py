"""
AISecGuard — Integrity checks run on every scan (Week 8)

  PROV-001  stored file no longer matches the SHA-256 recorded at upload
  PROV-002  file does not match the hash the uploader said to expect
  PROV-003  a file with the same name was uploaded before with different content
"""

from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session

from app.models.artifact import Artifact
from app.models.enums import FindingSeverity, FindingType
from app.scanners.base import Finding
from app.scanners.provenance_scanner import run_provenance_check
from app.services.queries import baseline_provenance


def run_integrity_checks(db: Session, artifact: Artifact, storage_path: Path) -> list[Finding]:
    baseline = baseline_provenance(db, artifact.id)
    result = run_provenance_check(
        storage_path=storage_path,
        source_url=baseline.source_url if baseline else None,
        expected_hash=baseline.expected_sha256 if baseline else None,
        baseline_hash=(baseline.sha256_hash if baseline else None) or artifact.sha256,
    )
    findings = [
        Finding(
            rule_id=pf.rule_id,
            finding_type=pf.finding_type,
            severity=pf.severity,
            title=pf.title,
            description=pf.description,
            evidence=pf.evidence,
            recommendation=pf.recommendation,
        )
        for pf in result.findings
    ]

    same_name = (
        db.query(Artifact)
        .filter(
            Artifact.original_filename == artifact.original_filename,
            Artifact.id != artifact.id,
            Artifact.sha256 != artifact.sha256,
        )
        .order_by(Artifact.uploaded_at.desc())
        .limit(3)
        .all()
    )
    if same_name:
        findings.append(Finding(
            rule_id="PROV-003",
            finding_type=FindingType.INTEGRITY_VIOLATION,
            severity=FindingSeverity.MEDIUM,
            title="Same file name, different content",
            description=(
                f"'{artifact.original_filename}' was uploaded before with different content. "
                "An artifact that silently changes between downloads is a classic supply-chain "
                "substitution, unless the new version was expected."
            ),
            evidence="\n".join(
                f"Earlier upload {a.id} on {a.uploaded_at:%Y-%m-%d %H:%M} sha256={a.sha256}" for a in same_name
            ) + f"\nThis upload sha256={artifact.sha256}",
            recommendation=(
                "Confirm the new version with its publisher. If it is a deliberate update, link it "
                "to the earlier version in the lineage view so the change is recorded."
            ),
        ))
    return findings
