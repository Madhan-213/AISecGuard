"""
AISecGuard — Compliance tests: EU AI Act evidence mapping, model cards, and the
tamper-evident audit log.
"""

import pytest

from app.core.config import settings
from app.models.quarantine_event import QuarantineEvent
from app.services import signing_service
from tests.supply_chain_helpers import SAFE_CSV, SAFE_PICKLE, auth_headers, scan, upload


@pytest.fixture(autouse=True)
def isolated_key(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "SIGNING_KEY_PATH", str(tmp_path / "signing.pem"))
    signing_service.reset_key_cache()
    yield
    signing_service.reset_key_cache()


def _controls(client, artifact_id):
    resp = client.get(f"/api/v1/artifacts/{artifact_id}/compliance")
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_unscanned_artifact_has_gaps(client):
    art = upload(client, "fresh.pkl", SAFE_PICKLE)
    report = _controls(client, art["id"])
    by_ref = {c["ref"]: c for c in report["controls"]}
    assert by_ref["Art. 12"]["status"] == "GAP"
    assert by_ref["Art. 15"]["status"] == "GAP"
    assert report["summary"]["GAP"] >= 2
    assert "not legal advice" in report["disclaimer"].lower()


def test_controls_cover_eu_ai_act_articles(client):
    art = upload(client, "m.pkl", SAFE_PICKLE)
    scan(client, art["id"])
    refs = {c["ref"] for c in _controls(client, art["id"])["controls"]}
    assert {"Art. 10", "Art. 11", "Art. 12", "Art. 13", "Art. 14", "Art. 15"} <= refs


def test_model_without_training_data_lineage_has_data_gap(client):
    art = upload(client, "orphan.pkl", SAFE_PICKLE)
    scan(client, art["id"])
    by_ref = {c["ref"]: c for c in _controls(client, art["id"])["controls"]}
    assert by_ref["Art. 10"]["status"] == "GAP"


def test_model_with_scanned_training_data_meets_data_governance(client):
    headers = auth_headers(client)
    data = upload(client, "train.csv", SAFE_CSV)
    scan(client, data["id"])
    model = upload(client, "trained.pkl", SAFE_PICKLE)
    scan(client, model["id"])
    client.post("/api/v1/lineage", json={"parent_id": data["id"], "child_id": model["id"], "relation": "TRAINED_ON"}, headers=headers)
    by_ref = {c["ref"]: c for c in _controls(client, model["id"])["controls"]}
    assert by_ref["Art. 10"]["status"] == "MET"
    assert by_ref["Art. 12"]["status"] == "MET"


def test_human_oversight_met_after_signature(client):
    art = upload(client, "reviewed.pkl", SAFE_PICKLE)
    scan(client, art["id"])
    client.post(f"/api/v1/artifacts/{art['id']}/sign", headers=auth_headers(client))
    by_ref = {c["ref"]: c for c in _controls(client, art["id"])["controls"]}
    assert by_ref["Art. 14"]["status"] == "MET"


def test_model_card_markdown(client):
    art = upload(client, "card_model.pkl", SAFE_PICKLE, source_url="https://example.org/models/card_model.pkl")
    scan(client, art["id"])
    resp = client.get(f"/api/v1/artifacts/{art['id']}/model-card")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/markdown")
    text = resp.text
    assert text.startswith("# Model card: card_model.pkl")
    assert art["sha256"] in text
    assert "https://example.org/models/card_model.pkl" in text
    assert "MODEL-001" in text
    assert "Intended use" in text
    assert "| Artifact type | MODEL |" in text
    for enum_name in ("ArtifactType.", "ArtifactStatus.", "RiskLevel.", "FindingSeverity."):
        assert enum_name not in text, f"enum repr leaked into the card: {enum_name}"


def test_evidence_uses_plain_values(client):
    art = upload(client, "plain.pkl", SAFE_PICKLE)
    scan(client, art["id"])
    evidence = " ".join(e for c in _controls(client, art["id"])["controls"] for e in c["evidence"])
    assert "RiskLevel." not in evidence
    assert "Latest scan risk MEDIUM" in evidence


def test_audit_log_is_hash_chained_and_verifiable(client, db):
    headers = auth_headers(client)
    art = upload(client, "audited.pkl", SAFE_PICKLE)
    scan(client, art["id"])
    client.post(f"/api/v1/artifacts/{art['id']}/quarantine", json={"reason": "review"}, headers=headers)
    client.post(f"/api/v1/artifacts/{art['id']}/release", json={"reason": "cleared"}, headers=headers)

    result = client.get("/api/v1/audit/verify").json()
    assert result["valid"] is True
    assert result["checked"] == 2

    event = db.query(QuarantineEvent).filter_by(action="QUARANTINE").one()
    event.reason = "edited after the fact"
    db.commit()

    broken = client.get("/api/v1/audit/verify").json()
    assert broken["valid"] is False
    assert broken["broken_at"] == event.id
