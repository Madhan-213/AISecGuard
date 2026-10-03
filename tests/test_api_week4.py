"""
AISecGuard — Week 4 API Integration Tests
Tests:
  - Scanning dataset artifacts through the standard pipeline
  - Scanning dependency artifacts through the standard pipeline
  - Direct upload-and-scan endpoints (/api/v1/scans/model, /dataset, /dependency)
  - Singular /api/v1/scan routing alias
  - Error cases: empty file, unsupported extension, mismatched type
  - Verification of numeric risk_score and rule_id persistence
"""

import io
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_scan_dataset_artifact_pipeline(client: TestClient):
    """Upload dataset and trigger scan; verify findings and risk_score."""
    with open(FIXTURES_DIR / "dataset_clean.csv", "rb") as f:
        content = f.read()

    upload_resp = client.post(
        "/api/v1/artifacts/upload",
        files={"file": ("clean_data.csv", io.BytesIO(content), "text/csv")},
    )
    assert upload_resp.status_code == 201, upload_resp.text
    artifact = upload_resp.json()
    assert artifact["artifact_type"] == "DATASET"

    scan_resp = client.post(
        "/api/v1/scans",
        json={"artifact_id": artifact["id"]},
    )
    assert scan_resp.status_code == 201, scan_resp.text
    scan = scan_resp.json()
    assert scan["status"] == "COMPLETED"
    assert "risk_score" in scan
    assert isinstance(scan["risk_score"], int)


def test_scan_dependency_artifact_pipeline(client: TestClient):
    """Upload requirements.txt and trigger scan; verify unpinned findings."""
    with open(FIXTURES_DIR / "requirements_unpinned.txt", "rb") as f:
        content = f.read()

    upload_resp = client.post(
        "/api/v1/artifacts/upload",
        files={"file": ("requirements.txt", io.BytesIO(content), "text/plain")},
    )
    assert upload_resp.status_code == 201, upload_resp.text
    artifact = upload_resp.json()
    assert artifact["artifact_type"] == "DEPENDENCY"

    scan_resp = client.post(
        "/api/v1/scans",
        json={"artifact_id": artifact["id"]},
    )
    assert scan_resp.status_code == 201, scan_resp.text
    scan = scan_resp.json()
    assert scan["status"] == "COMPLETED"
    assert scan["risk_score"] > 0
    rule_ids = [f.get("rule_id") for f in scan["findings"]]
    assert "DEP-003" in rule_ids


def test_direct_scan_model_endpoint(client: TestClient):
    """Direct upload-and-scan model artifact."""
    model_content = b"fake-model-binary-content-for-testing"
    resp = client.post(
        "/api/v1/scans/model",
        files={"file": ("test_model.bin", io.BytesIO(model_content), "application/octet-stream")},
    )
    assert resp.status_code == 201, resp.text
    scan = resp.json()
    assert scan["status"] == "COMPLETED"
    assert "risk_score" in scan
    assert len(scan["findings"]) > 0


def test_direct_scan_dataset_endpoint(client: TestClient):
    """Direct upload-and-scan dataset artifact."""
    csv_content = b"col1,col2\n1,2\n3,4\n"
    resp = client.post(
        "/api/v1/scans/dataset",
        files={"file": ("quick_data.csv", io.BytesIO(csv_content), "text/csv")},
    )
    assert resp.status_code == 201, resp.text
    scan = resp.json()
    assert scan["status"] == "COMPLETED"
    assert "risk_score" in scan


def test_direct_scan_dependency_endpoint(client: TestClient):
    """Direct upload-and-scan dependency artifact."""
    req_content = b"fastapi==0.110.0\nuvicorn==0.28.0\n"
    resp = client.post(
        "/api/v1/scans/dependency",
        files={"file": ("requirements.txt", io.BytesIO(req_content), "text/plain")},
    )
    assert resp.status_code == 201, resp.text
    scan = resp.json()
    assert scan["status"] == "COMPLETED"
    assert scan["risk_score"] == 0


def test_direct_scan_singular_alias(client: TestClient):
    """Verify that singular /api/v1/scan routing works identically."""
    req_content = b"requests==2.31.0\n"
    resp = client.post(
        "/api/v1/scan/dependency",
        files={"file": ("requirements.txt", io.BytesIO(req_content), "text/plain")},
    )
    assert resp.status_code == 201, resp.text
    scan = resp.json()
    assert scan["status"] == "COMPLETED"


def test_direct_scan_unsupported_extension(client: TestClient):
    """Rejecting unsupported extension on direct scan endpoint."""
    resp = client.post(
        "/api/v1/scans/model",
        files={"file": ("script.sh", io.BytesIO(b"echo 'malicious'"), "text/x-shellscript")},
    )
    assert resp.status_code == 400
    assert "Unsupported file extension" in resp.json()["detail"]


def test_direct_scan_empty_file(client: TestClient):
    """Rejecting 0-byte file on direct scan endpoint."""
    resp = client.post(
        "/api/v1/scans/dataset",
        files={"file": ("empty.csv", io.BytesIO(b""), "text/csv")},
    )
    assert resp.status_code == 400
    assert "empty" in resp.json()["detail"].lower()


def test_direct_scan_type_mismatch(client: TestClient):
    """Attempting to scan a .csv on the /model endpoint yields 400."""
    resp = client.post(
        "/api/v1/scans/model",
        files={"file": ("dataset.csv", io.BytesIO(b"a,b\n1,2\n"), "text/csv")},
    )
    assert resp.status_code == 400
    assert "classified as DATASET, but endpoint expected MODEL" in resp.json()["detail"]
