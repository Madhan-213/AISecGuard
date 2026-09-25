"""
AISecGuard — Scan API Tests
Week 3: Tests for scan creation, retrieval, and finding verification.
"""

import io
import pickle
import pytest
from fastapi.testclient import TestClient

from tests.conftest import make_suspicious_pickle_bytes


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def upload_pkl(client: TestClient, content: bytes, filename: str = "model.pkl") -> dict:
    """Upload a pkl file and return the artifact response dict."""
    response = client.post(
        "/api/v1/artifacts/upload",
        files={"file": (filename, io.BytesIO(content), "application/octet-stream")},
    )
    assert response.status_code == 201, response.text
    return response.json()


# ---------------------------------------------------------------------------
# Scan creation tests
# ---------------------------------------------------------------------------

def test_create_scan_for_artifact(client: TestClient):
    """Creating a scan for a valid artifact returns COMPLETED scan."""
    artifact = upload_pkl(client, pickle.dumps({"weights": [0.1, 0.2]}))
    response = client.post(
        "/api/v1/scans",
        json={"artifact_id": artifact["id"]},
    )
    assert response.status_code == 201
    scan = response.json()
    assert scan["status"] == "COMPLETED"
    assert scan["artifact_id"] == artifact["id"]
    assert scan["risk_level"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")


def test_scan_produces_findings(client: TestClient):
    """A pickle model scan produces at least one finding (UNSAFE_SERIALIZATION)."""
    artifact = upload_pkl(client, pickle.dumps({"test": True}))
    response = client.post(
        "/api/v1/scans",
        json={"artifact_id": artifact["id"]},
    )
    assert response.status_code == 201
    scan = response.json()
    assert len(scan["findings"]) > 0


def test_scan_suspicious_model_raises_high_risk(client: TestClient):
    """Scanning a suspicious pickle produces HIGH or CRITICAL risk level."""
    artifact = upload_pkl(client, make_suspicious_pickle_bytes(), "suspicious.pkl")
    response = client.post(
        "/api/v1/scans",
        json={"artifact_id": artifact["id"]},
    )
    assert response.status_code == 201
    scan = response.json()
    assert scan["risk_level"] in ("HIGH", "CRITICAL"), (
        f"Expected HIGH or CRITICAL risk for suspicious pickle, got {scan['risk_level']}"
    )


def test_scan_missing_artifact(client: TestClient):
    """Scanning a non-existent artifact returns 404."""
    response = client.post(
        "/api/v1/scans",
        json={"artifact_id": "nonexistent-id"},
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Scan retrieval tests
# ---------------------------------------------------------------------------

def test_list_scans_empty(client: TestClient):
    """GET /scans returns empty list when no scans exist."""
    response = client.get("/api/v1/scans")
    assert response.status_code == 200
    assert response.json()["total"] == 0


def test_get_scan_by_id(client: TestClient):
    """Scan can be retrieved by ID with findings."""
    artifact = upload_pkl(client, pickle.dumps({"data": 1}))
    scan = client.post(
        "/api/v1/scans",
        json={"artifact_id": artifact["id"]},
    ).json()

    response = client.get(f"/api/v1/scans/{scan['id']}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == scan["id"]
    assert "findings" in data


def test_get_scan_not_found(client: TestClient):
    """GET /scans/{bad_id} returns 404."""
    response = client.get("/api/v1/scans/nonexistent-scan-id")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Findings retrieval tests
# ---------------------------------------------------------------------------

def test_findings_created_after_scan(client: TestClient):
    """After scanning, findings appear in GET /findings."""
    artifact = upload_pkl(client, pickle.dumps({"weights": [1, 2, 3]}))
    client.post("/api/v1/scans", json={"artifact_id": artifact["id"]})

    response = client.get("/api/v1/findings")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0


def test_get_finding_by_id(client: TestClient):
    """Individual findings can be retrieved by ID."""
    artifact = upload_pkl(client, pickle.dumps({"test": True}))
    scan = client.post(
        "/api/v1/scans",
        json={"artifact_id": artifact["id"]},
    ).json()

    finding_id = scan["findings"][0]["id"]
    response = client.get(f"/api/v1/findings/{finding_id}")
    assert response.status_code == 200
    assert response.json()["id"] == finding_id


def test_get_finding_not_found(client: TestClient):
    """GET /findings/{bad_id} returns 404."""
    response = client.get("/api/v1/findings/nonexistent-finding-id")
    assert response.status_code == 404
