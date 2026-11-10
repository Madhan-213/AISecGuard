"""
AISecGuard — Model Signing & Key Lifecycle Management (Ed25519)
Week 8 & Roadmap Task 3.

Features:
  - Cryptographic approval of scanned AI artifacts using Ed25519 digital signatures.
  - Public key export for independent external verification.
  - Backward-compatible key rotation: rotates active key while archiving past keys.
  - Multi-key verification: verifies signatures made with current or archived keys.
  - Keyring audit and manifest inspection.
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
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
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


def _keys_dir() -> Path:
    path = _key_path().parent
    path.mkdir(parents=True, exist_ok=True)
    return path


def _manifest_path() -> Path:
    return _keys_dir() / "keys_manifest.json"


def reset_key_cache() -> None:
    _key_cache.clear()


def _compute_key_id_from_raw(raw_bytes: bytes) -> str:
    return hashlib.sha256(raw_bytes).hexdigest()[:16]


def _compute_key_id_from_public(pub_key: Ed25519PublicKey) -> str:
    raw = pub_key.public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    return _compute_key_id_from_raw(raw)


def _load_manifest() -> list[dict]:
    m_path = _manifest_path()
    if not m_path.exists():
        return []
    try:
        return json.loads(m_path.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save_manifest(entries: list[dict]) -> None:
    _manifest_path().write_text(json.dumps(entries, indent=2), encoding="utf-8")


def _sync_manifest_with_active_key(active_key_id: str, active_pem: str) -> None:
    manifest = _load_manifest()
    found = any(k["key_id"] == active_key_id and k["status"] == "ACTIVE" for k in manifest)
    if not found:
        # Deactivate any previous active keys
        for k in manifest:
            if k["status"] == "ACTIVE" and k["key_id"] != active_key_id:
                k["status"] = "ARCHIVED"
                if not k.get("rotated_at"):
                    k["rotated_at"] = datetime.now(timezone.utc).isoformat()

        manifest.insert(
            0,
            {
                "key_id": active_key_id,
                "algorithm": ALGORITHM,
                "status": "ACTIVE",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "rotated_at": None,
                "public_key_pem": active_pem,
            },
        )
        _save_manifest(manifest)


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
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "wb") as handle:
            handle.write(pem)

    _key_cache[str(path)] = key
    kid = _compute_key_id_from_public(key.public_key())
    pub_pem = key.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode()
    _sync_manifest_with_active_key(kid, pub_pem)
    return key


def key_id() -> str:
    return _compute_key_id_from_public(_private_key().public_key())


def public_key_pem() -> str:
    return _private_key().public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode()


def rotate_key(user: User | None = None) -> dict:
    """
    Rotate the active Ed25519 signing key pair.
    Archives the current active key and generates a new active key pair.
    Past signatures remain valid via backward-compatible archive resolution.
    """
    current_key = _private_key()
    old_key_id = _compute_key_id_from_public(current_key.public_key())
    old_pem = current_key.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode()

    # Archive the old public key file
    archive_dir = _keys_dir() / "archive"
    archive_dir.mkdir(parents=True, exist_ok=True)
    (archive_dir / f"{old_key_id}.pub").write_text(old_pem, encoding="utf-8")

    # Update manifest
    manifest = _load_manifest()
    now_iso = datetime.now(timezone.utc).isoformat()
    for entry in manifest:
        if entry["key_id"] == old_key_id:
            entry["status"] = "ARCHIVED"
            entry["rotated_at"] = now_iso
            if user:
                entry["rotated_by"] = getattr(user, "email", "admin")

    # Generate brand new private key
    new_key = Ed25519PrivateKey.generate()
    new_pem_private = new_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    new_key_id = _compute_key_id_from_public(new_key.public_key())
    new_pem_public = new_key.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode()

    # Atomically write to key path
    path = _key_path()
    path.write_bytes(new_pem_private)

    # Insert new active key in manifest
    manifest.insert(
        0,
        {
            "key_id": new_key_id,
            "algorithm": ALGORITHM,
            "status": "ACTIVE",
            "created_at": now_iso,
            "rotated_at": None,
            "public_key_pem": new_pem_public,
        },
    )
    _save_manifest(manifest)

    # Invalidate cache
    _key_cache[str(path)] = new_key

    return {
        "status": "ROTATED",
        "algorithm": ALGORITHM,
        "new_key_id": new_key_id,
        "previous_key_id": old_key_id,
        "rotated_at": now_iso,
        "public_key_pem": new_pem_public,
    }


def list_keys() -> list[dict]:
    """Retrieve all active and archived signing keys from the server keyring."""
    _private_key()  # Ensure active key is initialized and synced
    return _load_manifest()


def _resolve_public_key_by_id(kid: str) -> tuple[Ed25519PublicKey | None, str]:
    """
    Find public key corresponding to key ID from active key or archived manifest.
    Returns: (public_key_object, "ACTIVE" | "ARCHIVED" | "UNKNOWN")
    """
    if kid == key_id():
        return _private_key().public_key(), "ACTIVE"

    # Search archived files
    archive_file = _keys_dir() / "archive" / f"{kid}.pub"
    if archive_file.exists():
        try:
            pub = serialization.load_pem_public_key(archive_file.read_bytes())
            if isinstance(pub, Ed25519PublicKey):
                return pub, "ARCHIVED"
        except Exception:
            pass

    # Search manifest
    manifest = _load_manifest()
    for entry in manifest:
        if entry.get("key_id") == kid and entry.get("public_key_pem"):
            try:
                pub = serialization.load_pem_public_key(entry["public_key_pem"].encode("utf-8"))
                if isinstance(pub, Ed25519PublicKey):
                    return pub, entry.get("status", "ARCHIVED")
            except Exception:
                pass

    return None, "UNKNOWN"


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
    current_kid = key_id()
    payload = json.dumps(
        {
            "artifact_id": artifact.id,
            "sha256": artifact.sha256,
            "scan_id": scan.id,
            "risk_level": plain(scan.risk_level),
            "signed_at": signed_at.isoformat(),
            "key_id": current_kid,
        },
        sort_keys=True,
        separators=(",", ":"),
    )
    record = ArtifactSignature(
        artifact_id=artifact.id,
        scan_id=scan.id,
        sha256=artifact.sha256,
        algorithm=ALGORITHM,
        key_id=current_kid,
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
    """
    Verify the artifact's digital signature with backward-compatible key resolution.
    Accepts signatures signed with the currently active key OR past rotated keys.
    """
    record = latest_signature(db, artifact.id)
    if record is None:
        return {"signed": False, "valid": False, "reasons": ["Artifact has not been signed."], "signature": None}

    reasons: list[str] = []
    path = Path(artifact.storage_path)
    if not path.exists():
        reasons.append("Stored file is missing.")
    elif compute_sha256_file(path) != record.sha256:
        reasons.append("File hash no longer matches the signed hash: the artifact changed after signing.")

    # Resolve public key across active and archived keyring
    pub_key, key_status = _resolve_public_key_by_id(record.key_id)
    if pub_key is None:
        reasons.append(f"Signed with unrecognized key ({record.key_id}); public key is not registered in the keyring.")
    else:
        try:
            pub_key.verify(base64.b64decode(record.signature), record.payload.encode())
        except (InvalidSignature, ValueError):
            reasons.append("Signature does not match the signed payload.")
        if json.loads(record.payload).get("sha256") != record.sha256:
            reasons.append("Signed payload hash differs from the recorded hash.")

    summary = signature_summary(record)
    summary["key_status"] = key_status
    if key_status == "ARCHIVED":
        summary["note"] = f"Verified using archived signing key {record.key_id}."

    return {
        "signed": True,
        "valid": not reasons,
        "reasons": reasons,
        "key_status": key_status,
        "signature": summary,
    }
