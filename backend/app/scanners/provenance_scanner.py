"""
AISecGuard — Provenance Scanner
Week 3: Records artifact provenance and performs integrity baseline creation.

This module is the first real security module in AISecGuard.

Responsibilities:
  1. Calculate the SHA-256 of the uploaded artifact
  2. Record provenance metadata (hash, size, timestamp, optional source URL)
  3. Detect hash mismatch if a previously-known good hash is provided
  4. Store the upload as a BASELINE for future integrity checks

IMPORTANT DISTINCTION:
  - A hash calculated during the FIRST upload is the BASELINE.
    It is not itself a violation — it is the reference point.
  - An INTEGRITY VIOLATION is only reported when comparing against
    a trusted/previous baseline hash and the hashes differ.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from app.utils.hashing import compute_sha256_file
from app.models.enums import FindingType, FindingSeverity


@dataclass
class ProvenanceFinding:
    """A single finding produced by the provenance scanner."""
    finding_type: FindingType
    severity: FindingSeverity
    title: str
    description: str
    evidence: str | None = None
    recommendation: str | None = None


@dataclass
class ProvenanceResult:
    """Result returned by the provenance scanner."""
    sha256: str
    file_size: int
    uploaded_at: datetime
    source_url: str | None
    baseline_hash: str | None          # hash stored at first upload
    provided_expected_hash: str | None  # hash provided by caller for verification
    integrity_ok: bool
    findings: list[ProvenanceFinding] = field(default_factory=list)


def run_provenance_check(
    storage_path: str | Path,
    source_url: str | None = None,
    expected_hash: str | None = None,
    baseline_hash: str | None = None,
) -> ProvenanceResult:
    """
    Run a provenance and integrity check on a stored artifact.

    Args:
        storage_path:
            Absolute path to the artifact file on disk.
        source_url:
            Optional URL where the artifact was originally obtained.
            Recorded in provenance — not validated.
        expected_hash:
            Optional SHA-256 hash provided by the uploader claiming to be
            the trusted hash of this artifact. If provided and mismatches
            the computed hash, an INTEGRITY_VIOLATION finding is created.
        baseline_hash:
            Optional SHA-256 hash from a previously stored ProvenanceRecord.
            If provided and mismatches the computed hash, an
            INTEGRITY_VIOLATION finding is created.

    Returns:
        ProvenanceResult with computed hash, file metadata, and any findings.
    """
    storage_path = Path(storage_path)
    file_size = storage_path.stat().st_size
    computed_hash = compute_sha256_file(storage_path)
    uploaded_at = datetime.now(timezone.utc)
    findings: list[ProvenanceFinding] = []
    integrity_ok = True

    # --- Check against expected hash provided by caller ---
    if expected_hash and expected_hash.lower() != computed_hash:
        integrity_ok = False
        findings.append(ProvenanceFinding(
            finding_type=FindingType.INTEGRITY_VIOLATION,
            severity=FindingSeverity.HIGH,
            title="Integrity hash mismatch (expected vs computed)",
            description=(
                "The SHA-256 hash computed from the uploaded file does not match "
                "the expected hash provided at upload time. The artifact may have "
                "been modified in transit or may be a different version than expected."
            ),
            evidence=(
                f"Computed:  {computed_hash}\n"
                f"Expected:  {expected_hash}"
            ),
            recommendation=(
                "Verify the artifact source. Re-download from the trusted source "
                "and compare hashes before proceeding."
            ),
        ))

    # --- Check against previously stored baseline ---
    if baseline_hash and baseline_hash.lower() != computed_hash:
        integrity_ok = False
        findings.append(ProvenanceFinding(
            finding_type=FindingType.INTEGRITY_VIOLATION,
            severity=FindingSeverity.HIGH,
            title="Artifact modified since baseline was recorded",
            description=(
                "The SHA-256 hash of this artifact differs from the previously "
                "recorded baseline hash. The artifact may have been tampered with "
                "after the baseline was established."
            ),
            evidence=(
                f"Computed:  {computed_hash}\n"
                f"Baseline:  {baseline_hash}"
            ),
            recommendation=(
                "Investigate who or what modified the artifact. Do not use this "
                "artifact until its integrity can be re-established."
            ),
        ))

    return ProvenanceResult(
        sha256=computed_hash,
        file_size=file_size,
        uploaded_at=uploaded_at,
        source_url=source_url,
        baseline_hash=baseline_hash,
        provided_expected_hash=expected_hash,
        integrity_ok=integrity_ok,
        findings=findings,
    )
