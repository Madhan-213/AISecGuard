"""
AISecGuard — ML-BOM (CycloneDX 1.6) export tests
"""

import pytest

from app.core.config import settings
from app.services import signing_service
from tests.supply_chain_helpers import SAFE_CSV, SAFE_PICKLE, auth_headers, scan, upload


@pytest.fixture(autouse=True)
def isolated_key(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "SIGNING_KEY_PATH", str(tmp_path / "signing.pem"))
    signing_service.reset_key_cache()
    yield
    signing_service.reset_key_cache()


def _bom(client, artifact_id):
    resp = client.get(f"/api/v1/artifacts/{artifact_id}/mlbom")
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_model_bom_shape(client):
    art = upload(client, "classifier.pkl", SAFE_PICKLE)
    scan(client, art["id"])
    bom = _bom(client, art["id"])

    assert bom["bomFormat"] == "CycloneDX"
    assert bom["specVersion"] == "1.6"
    assert bom["serialNumber"].startswith("urn:uuid:")
    assert bom["metadata"]["tools"]["components"][0]["name"] == "AISecGuard"

    component = bom["metadata"]["component"]
    assert component["type"] == "machine-learning-model"
    assert component["name"] == "classifier.pkl"
    assert component["hashes"] == [{"alg": "SHA-256", "content": art["sha256"]}]
    props = {p["name"]: p["value"] for p in component["properties"]}
    assert props["aisecguard:risk_level"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
    assert props["aisecguard:signed"] == "false"


def test_dataset_bom_uses_data_component(client):
    art = upload(client, "train.csv", SAFE_CSV)
    scan(client, art["id"])
    assert _bom(client, art["id"])["metadata"]["component"]["type"] == "data"


def test_dependency_bom_lists_packages_and_vulnerabilities(client):
    art = upload(client, "requirements.txt", b"torch==1.12.0\nrequests==2.32.3\npandas\n")
    scan(client, art["id"])
    bom = _bom(client, art["id"])

    purls = {c.get("purl") for c in bom["components"]}
    assert "pkg:pypi/torch@1.12.0" in purls
    assert "pkg:pypi/requests@2.32.3" in purls
    assert "pkg:pypi/pandas" in purls

    vuln_ids = {v["id"] for v in bom["vulnerabilities"]}
    assert "CVE-2022-45907" in vuln_ids
    affected = bom["vulnerabilities"][0]["affects"][0]["ref"]
    assert affected in {c["bom-ref"] for c in bom["components"]}


def test_signed_artifact_is_marked_in_bom(client):
    art = upload(client, "signed_model.pkl", SAFE_PICKLE)
    scan(client, art["id"])
    client.post(f"/api/v1/artifacts/{art['id']}/sign", headers=auth_headers(client))
    props = {p["name"]: p["value"] for p in _bom(client, art["id"])["metadata"]["component"]["properties"]}
    assert props["aisecguard:signed"] == "true"
    assert len(props["aisecguard:signature_key_id"]) == 16


def test_bom_for_missing_artifact_is_404(client):
    assert client.get("/api/v1/artifacts/does-not-exist/mlbom").status_code == 404
