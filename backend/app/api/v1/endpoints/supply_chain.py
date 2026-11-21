"""
AISecGuard — Supply-chain endpoints (Week 8)

  POST   /api/v1/artifacts/{id}/sign          approve + sign a scanned artifact
  GET    /api/v1/artifacts/{id}/signature     latest signature and verification
  GET    /api/v1/artifacts/{id}/mlbom         CycloneDX 1.6 ML-BOM
  GET    /api/v1/artifacts/{id}/lineage       lineage graph (ancestors + descendants)
  GET    /api/v1/artifacts/{id}/compliance    EU AI Act evidence mapping
  GET    /api/v1/artifacts/{id}/model-card    generated model card (Markdown)
  POST   /api/v1/lineage                      link parent → child
  DELETE /api/v1/lineage/{edge_id}            remove a link
  GET    /api/v1/signing/public-key           verification key
  GET    /api/v1/audit/verify                 check the audit hash chain

Changes (sign, link, unlink) require authentication; reads do not, matching
the rest of the API.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_analyst_or_admin, get_admin_only
from app.db.session import get_db
from app.models.artifact import Artifact
from app.models.lineage import LineageEdge, LineageRelation
from app.models.user import User
from app.services import audit_service, compliance_service, lineage_service, mlbom_service, signing_service

artifact_router = APIRouter()
lineage_router = APIRouter(prefix="/api/v1/lineage")  # own prefix: POST at the bare path
signing_router = APIRouter()
audit_router = APIRouter()
integrity_router = APIRouter(prefix="/api/v1/integrity")


class LinkRequest(BaseModel):
    parent_id: str
    child_id: str
    relation: LineageRelation
    note: str | None = Field(default=None, max_length=2000)


def _artifact(db: Session, artifact_id: str) -> Artifact:
    artifact = db.get(Artifact, artifact_id)
    if artifact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Artifact not found: {artifact_id}")
    return artifact


# ---------------------------------------------------------------------------
# Signing
# ---------------------------------------------------------------------------

@artifact_router.post("/{artifact_id}/sign", status_code=status.HTTP_201_CREATED, summary="Approve and sign an artifact")
def sign_artifact(artifact_id: str, db: Session = Depends(get_db), user: User = Depends(get_analyst_or_admin)):
    artifact = _artifact(db, artifact_id)
    try:
        record = signing_service.sign_artifact(db, artifact, user)
    except signing_service.SigningRefused as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return signing_service.signature_summary(record)


@artifact_router.get("/{artifact_id}/signature", summary="Verify an artifact's signature")
def get_signature(artifact_id: str, db: Session = Depends(get_db)):
    return signing_service.verify_artifact(db, _artifact(db, artifact_id))


@signing_router.get("/public-key", summary="Public key that verifies AISecGuard signatures")
def public_key():
    return {
        "algorithm": signing_service.ALGORITHM,
        "key_id": signing_service.key_id(),
        "public_key_pem": signing_service.public_key_pem(),
    }


@signing_router.get("/keys", summary="List all active and archived signing keys")
def list_signing_keys():
    return signing_service.list_keys()


@signing_router.post("/rotate", summary="Rotate the server's Ed25519 signing key pair")
def rotate_signing_key(user: User = Depends(get_admin_only)):
    return signing_service.rotate_key(user)


# ---------------------------------------------------------------------------
# ML-BOM, compliance, model card
# ---------------------------------------------------------------------------

@artifact_router.get("/{artifact_id}/mlbom", summary="CycloneDX 1.5 / 1.6 ML-BOM for an artifact")
def get_mlbom(
    artifact_id: str,
    spec_version: str = "1.5",
    db: Session = Depends(get_db),
):
    return mlbom_service.build_mlbom(db, _artifact(db, artifact_id), spec_version=spec_version)


@artifact_router.get("/{artifact_id}/compliance", summary="EU AI Act evidence mapping")
def get_compliance(artifact_id: str, db: Session = Depends(get_db)):
    return compliance_service.compliance_report(db, _artifact(db, artifact_id))


@artifact_router.get("/{artifact_id}/model-card", summary="Generated model card (Markdown)")
def get_model_card(artifact_id: str, db: Session = Depends(get_db)):
    artifact = _artifact(db, artifact_id)
    return Response(
        content=compliance_service.model_card_markdown(db, artifact),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'inline; filename="{artifact.original_filename}.model-card.md"'},
    )


# ---------------------------------------------------------------------------
# Lineage
# ---------------------------------------------------------------------------

@artifact_router.get("/{artifact_id}/lineage", summary="Lineage graph around an artifact")
def get_lineage(artifact_id: str, db: Session = Depends(get_db)):
    return lineage_service.lineage_graph(db, _artifact(db, artifact_id))


@lineage_router.post("", status_code=status.HTTP_201_CREATED, summary="Link a parent artifact to a child")
def create_link(body: LinkRequest, db: Session = Depends(get_db), user: User = Depends(get_analyst_or_admin)):
    parent, child = _artifact(db, body.parent_id), _artifact(db, body.child_id)
    try:
        lineage_service.validate_link(db, parent, child, body.relation)
    except lineage_service.LineageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    edge = LineageEdge(
        parent_id=parent.id, child_id=child.id, relation=body.relation.value, note=body.note, created_by=user.email,
    )
    db.add(edge)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This link already exists.") from exc
    db.refresh(edge)
    return lineage_service._edge(edge)


@lineage_router.delete("/{edge_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove a lineage link")
def delete_link(edge_id: str, db: Session = Depends(get_db), user: User = Depends(get_admin_only)):
    edge = db.get(LineageEdge, edge_id)
    if edge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Link not found: {edge_id}")
    db.delete(edge)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Audit
# ---------------------------------------------------------------------------

@audit_router.get("/verify", summary="Verify the tamper-evident audit log")
def verify_audit(db: Session = Depends(get_db)):
    return audit_service.verify_chain(db)


# ---------------------------------------------------------------------------
# Cryptographic Integrity & Provenance Verification
# ---------------------------------------------------------------------------

@integrity_router.get("/overview", summary="Cryptographic integrity & provenance overview across artifacts")
def integrity_overview(db: Session = Depends(get_db)):
    from pathlib import Path
    from app.services.queries import baseline_provenance
    from app.utils.hashing import compute_sha256_file

    artifacts = db.query(Artifact).order_by(Artifact.uploaded_at.desc()).all()
    results = []
    for art in artifacts:
        prov = baseline_provenance(db, art.id)
        disk_match = True
        try:
            if art.storage_path and Path(art.storage_path).exists():
                curr_sha = compute_sha256_file(art.storage_path)
                disk_match = (curr_sha == art.sha256)
        except Exception:
            disk_match = False

        sig_info = signing_service.verify_artifact(db, art)

        status_str = "VERIFIED"
        if not disk_match:
            status_str = "TAMPERED"
        elif prov and prov.expected_sha256 and prov.expected_sha256.lower() != art.sha256.lower():
            status_str = "MISMATCH"
        elif not sig_info.get("signed", False):
            status_str = "UNVERIFIED"

        results.append({
            "artifact_id": art.id,
            "filename": art.original_filename,
            "artifact_type": str(art.artifact_type),
            "file_size": art.file_size,
            "sha256": art.sha256,
            "source_url": prov.source_url if prov else None,
            "expected_sha256": prov.expected_sha256 if prov else None,
            "disk_integrity_ok": disk_match,
            "is_signed": sig_info.get("signed", False),
            "signature_valid": sig_info.get("valid", False),
            "signer_email": sig_info.get("signer_email"),
            "key_id": sig_info.get("key_id"),
            "status": status_str,
            "uploaded_at": art.uploaded_at.isoformat() if art.uploaded_at else None,
        })
    return {"total": len(results), "items": results}
