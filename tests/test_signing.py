"""
AISecGuard — Model signing and verification tests (Ed25519)
Only scanned, non-quarantined, non-high-risk artifacts may be signed; any change
to the stored file must make verification fail.
"""

from pathlib import Path

import pytest

from app.core.config import settings
from app.models.artifact import Artifact
from app.services import signing_service
from tests.supply_chain_helpers import EVIL_PICKLE, SAFE_PICKLE, auth_headers, scan, upload


@pytest.fixture(autouse=True)
def isolated_key(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "SIGNING_KEY_PATH", str(tmp_path / "keys" / "signing.pem"))
    signing_service.reset_key_cache()
    yield
    signing_service.reset_key_cache()


def test_public_key_is_published(client):
    resp = client.get("/api/v1/signing/public-key")
    assert resp.status_code == 200
    body = resp.json()
    assert body["algorithm"] == "Ed25519"
    assert "BEGIN PUBLIC KEY" in body["public_key_pem"]
    assert len(body["key_id"]) == 16


def test_key_is_created_once_and_reused(client):
    first = client.get("/api/v1/signing/public-key").json()["key_id"]
    signing_service.reset_key_cache()
    assert client.get("/api/v1/signing/public-key").json()["key_id"] == first


def test_sign_and_verify_scanned_artifact(client):
    headers = auth_headers(client)
    art = upload(client, "signable.pkl", SAFE_PICKLE)
    scan(client, art["id"])

    signed = client.post(f"/api/v1/artifacts/{art['id']}/sign", headers=headers)
    assert signed.status_code == 201, signed.text
    assert signed.json()["sha256"] == art["sha256"]

    verify = client.get(f"/api/v1/artifacts/{art['id']}/signature").json()
    assert verify["signed"] is True
    assert verify["valid"] is True


def test_tampering_breaks_the_signature(client, db):
    headers = auth_headers(client)
    art = upload(client, "will_tamper.pkl", SAFE_PICKLE)
    scan(client, art["id"])
    client.post(f"/api/v1/artifacts/{art['id']}/sign", headers=headers)

    Path(db.get(Artifact, art["id"]).storage_path).write_bytes(b"swapped model")
    verify = client.get(f"/api/v1/artifacts/{art['id']}/signature").json()
    assert verify["valid"] is False
    assert any("hash" in reason.lower() for reason in verify["reasons"])


def test_unsigned_artifact_reports_not_signed(client):
    art = upload(client, "unsigned.pkl", SAFE_PICKLE)
    verify = client.get(f"/api/v1/artifacts/{art['id']}/signature").json()
    assert verify == {"signed": False, "valid": False, "reasons": ["Artifact has not been signed."], "signature": None}


def test_cannot_sign_before_scanning(client):
    art = upload(client, "not_scanned.pkl", SAFE_PICKLE)
    resp = client.post(f"/api/v1/artifacts/{art['id']}/sign", headers=auth_headers(client))
    assert resp.status_code == 409


def test_cannot_sign_high_risk_artifact(client):
    art = upload(client, "evil.pkl", EVIL_PICKLE)
    assert scan(client, art["id"])["risk_level"] in ("HIGH", "CRITICAL")
    resp = client.post(f"/api/v1/artifacts/{art['id']}/sign", headers=auth_headers(client))
    assert resp.status_code == 409
    assert "RiskLevel." not in resp.json()["detail"]


def test_cannot_sign_artifact_with_risky_upstream(client):
    headers = auth_headers(client)
    deps = upload(client, "requirements.txt", b"torch==1.12.0\nreqeusts==2.31.0\n")
    assert scan(client, deps["id"])["risk_level"] in ("HIGH", "CRITICAL")
    model = upload(client, "downstream_model.pkl", SAFE_PICKLE)
    client.post("/api/v1/lineage", json={"parent_id": deps["id"], "child_id": model["id"], "relation": "DEPENDS_ON"}, headers=headers)
    assert scan(client, model["id"])["risk_level"] not in ("HIGH", "CRITICAL")

    resp = client.post(f"/api/v1/artifacts/{model['id']}/sign", headers=headers)
    assert resp.status_code == 409
    assert "upstream" in resp.json()["detail"].lower()


def test_cannot_sign_quarantined_artifact(client):
    headers = auth_headers(client)
    art = upload(client, "quarantined.pkl", SAFE_PICKLE)
    scan(client, art["id"])
    client.post(f"/api/v1/artifacts/{art['id']}/quarantine", json={"reason": "hold for review"}, headers=headers)
    assert client.post(f"/api/v1/artifacts/{art['id']}/sign", headers=headers).status_code == 409


def test_signing_requires_authentication(client):
    art = upload(client, "anon.pkl", SAFE_PICKLE)
    scan(client, art["id"])
    assert client.post(f"/api/v1/artifacts/{art['id']}/sign").status_code == 401
