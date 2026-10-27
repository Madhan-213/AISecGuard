"""
AISecGuard — Model signing (Week 8)

An analyst approves a scanned artifact by signing it. The signature covers the
artifact's SHA-256 and the scan that cleared it, made with an Ed25519 key that
AISecGuard creates on first use. Anyone holding the public key
(GET /api/v1/signing/public-key) can verify the signature independently.

This is local signing for an academic prototype. Production deployments would
use Sigstore (keyless signing with a transparency log) or an HSM-held key.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.artifact import Artifact
from app.models.enums import ArtifactStatus, RiskLevel
from app.models.signature import ArtifactSignature
from app.models.user import User
from app.services.queries import latest_completed_scan, latest_signature, plain
from app.utils.hashing import compute_sha256_file

ALGORITHM = "Ed25519"
_key_cache: dict[str, Ed25519PrivateKey] = {}


class SigningRefused(Exception):
    """The artifact does not meet the signing policy."""


def _key_path() -> Path:
    if settings.SIGNING_KEY_PATH:
        return Path(settings.SIGNING_KEY_PATH)
    return Path(settings.UPLOAD_DIR) / ".keys" / "signing_ed25519.pem"


def reset_key_cache() -> None:
    _key_cache.clear()


def _private_key() -> Ed25519PrivateKey:
    path = _key_path()
    cached = _key_cache.get(str(path))
    if cached is not None:
        return cached
    if path.exists():
        key = serialization.load_pem_private_key(path.read_bytes(), password=None)
    else:
        key = Ed25519PrivateKey.generate()
        path.parent.mkdir(parents=True, exist_ok=True)
        pem = key.private_bytes(
            serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
        )
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "wb") as handle:
            handle.write(pem)
    _key_cache[str(path)] = key
    return key


def key_id() -> str:
    raw = _private_key().public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    return hashlib.sha256(raw).hexdigest()[:16]


def public_key_pem() -> str:
    return _private_key().public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode()


def sign_artifact(db: Session, artifact: Artifact, user: User) -> ArtifactSignature:
    if artifact.status != ArtifactStatus.SCANNED.value:
        raise SigningRefused(f"Only scanned artifacts can be signed (current status: {plain(artifact.status)}).")
    scan = latest_completed_scan(db, artifact.id)
    if scan is None:
        raise SigningRefused("Scan the artifact before signing it.")
    if scan.risk_level in (RiskLevel.HIGH.value, RiskLevel.CRITICAL.value):
        raise SigningRefused(f"The latest scan rated this artifact {plain(scan.risk_level)}; it cannot be approved.")
    if any(f.rule_id == "LIN-001" for f in scan.findings):
        raise SigningRefused(
            "It was built from a quarantined or high-risk upstream artifact (LIN-001). "
            "Resolve the upstream artifact and re-scan before approving."
        )
    current_hash = compute_sha256_file(artifact.storage_path)
    if current_hash != artifact.sha256:
        raise SigningRefused("The stored file no longer matches its upload hash; re-upload and re-scan it.")

    signed_at = datetime.now(timezone.utc)
    payload = json.dumps(
        {
            "artifact_id": artifact.id,
            "sha256": artifact.sha256,
            "scan_id": scan.id,
            "risk_level": plain(scan.risk_level),
            "signed_at": signed_at.isoformat(),
            "key_id": key_id(),
        },
        sort_keys=True,
        separators=(",", ":"),
    )
    record = ArtifactSignature(
        artifact_id=artifact.id,
        scan_id=scan.id,
        sha256=artifact.sha256,
        algorithm=ALGORITHM,
        key_id=key_id(),
        payload=payload,
        signature=base64.b64encode(_private_key().sign(payload.encode())).decode(),
        signed_by=user.email,
        signed_at=signed_at,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def signature_summary(record: ArtifactSignature) -> dict:
    return {
        "id": record.id,
        "artifact_id": record.artifact_id,
        "scan_id": record.scan_id,
        "sha256": record.sha256,
        "algorithm": record.algorithm,
        "key_id": record.key_id,
        "signature": record.signature,
        "payload": record.payload,
        "signed_by": record.signed_by,
        "signed_at": record.signed_at,
    }


def verify_artifact(db: Session, artifact: Artifact) -> dict:
    record = latest_signature(db, artifact.id)
    if record is None:
        return {"signed": False, "valid": False, "reasons": ["Artifact has not been signed."], "signature": None}

    reasons: list[str] = []
    path = Path(artifact.storage_path)
    if not path.exists():
        reasons.append("Stored file is missing.")
    elif compute_sha256_file(path) != record.sha256:
        reasons.append("File hash no longer matches the signed hash: the artifact changed after signing.")
    if record.key_id != key_id():
        reasons.append("Signed with a different key than the one this server holds; verify with that key.")
    else:
        try:
            _private_key().public_key().verify(base64.b64decode(record.signature), record.payload.encode())
        except (InvalidSignature, ValueError):
            reasons.append("Signature does not match the signed payload.")
        if json.loads(record.payload).get("sha256") != record.sha256:
            reasons.append("Signed payload hash differs from the recorded hash.")

    return {"signed": True, "valid": not reasons, "reasons": reasons, "signature": signature_summary(record)}
