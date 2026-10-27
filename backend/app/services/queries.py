"""
AISecGuard — Small shared database queries used by the supply-chain services.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.enums import ScanStatus
from app.models.provenance import ProvenanceRecord
from app.models.scan import Scan
from app.models.signature import ArtifactSignature


def latest_completed_scan(db: Session, artifact_id: str) -> Scan | None:
    return (
        db.query(Scan)
        .filter(Scan.artifact_id == artifact_id, Scan.status == ScanStatus.COMPLETED.value)
        .order_by(Scan.completed_at.desc())
        .first()
    )


def baseline_provenance(db: Session, artifact_id: str) -> ProvenanceRecord | None:
    """The first provenance record: the hash recorded at upload time."""
    return (
        db.query(ProvenanceRecord)
        .filter(ProvenanceRecord.artifact_id == artifact_id)
        .order_by(ProvenanceRecord.uploaded_at.asc())
        .first()
    )


def latest_signature(db: Session, artifact_id: str) -> ArtifactSignature | None:
    return (
        db.query(ArtifactSignature)
        .filter(ArtifactSignature.artifact_id == artifact_id)
        .order_by(ArtifactSignature.signed_at.desc())
        .first()
    )


def plain(value) -> str:
    """Enum columns load as enum members on some databases; text output wants the bare value."""
    return getattr(value, "value", value)


def latest_scan_ids(db: Session) -> list[str]:
    """ID of the most recent completed scan of every artifact."""
    rows = (
        db.query(Scan.id, Scan.artifact_id, Scan.completed_at)
        .filter(Scan.status == ScanStatus.COMPLETED.value)
        .all()
    )
    newest: dict[str, tuple] = {}
    for scan_id, artifact_id, completed_at in rows:
        if artifact_id not in newest or (completed_at and completed_at > newest[artifact_id][1]):
            newest[artifact_id] = (scan_id, completed_at)
    return [scan_id for scan_id, _ in newest.values()]
