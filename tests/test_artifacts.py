"""
AISecGuard — Artifact API Tests
Week 3: Tests for artifact upload, validation, and retrieval.
"""

import io
import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Upload tests
# ---------------------------------------------------------------------------

def test_upload_valid_pkl(client: TestClient, tmp_path):
    """Upload a valid .pkl file succeeds and returns artifact metadata."""
    import pickle
    content = pickle.dumps({"weights": [1.0, 2.0, 3.0]})
    response = client.post(
        "/api/v1/artifacts/upload",
        files={"file": ("model.pkl", io.BytesIO(content), "application/octet-stream")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["original_filename"] == "model.pkl"
    assert data["artifact_type"] == "MODEL"
    assert data["file_extension"] == ".pkl"
    assert len(data["sha256"]) == 64
    assert data["file_size"] == len(content)
    assert data["status"] == "PENDING_SCAN"
    assert "id" in data


def test_upload_valid_csv(client: TestClient):
    """Upload a valid .csv dataset file succeeds."""
    content = b"label,feature1,feature2\n0,1.0,2.0\n1,3.0,4.0\n"
    response = client.post(
        "/api/v1/artifacts/upload",
        files={"file": ("dataset.csv", io.BytesIO(content), "text/csv")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["artifact_type"] == "DATASET"
    assert data["file_extension"] == ".csv"


def test_upload_valid_txt_dependency(client: TestClient):
    """Upload a valid requirements.txt dependency file succeeds."""
    content = b"fastapi>=0.110.0\nuvicorn>=0.27.0\npydantic>=2.0.0\n"
    response = client.post(
        "/api/v1/artifacts/upload",
        files={"file": ("requirements.txt", io.BytesIO(content), "text/plain")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["artifact_type"] == "DEPENDENCY"


def test_upload_empty_file_rejected(client: TestClient):
    """Upload of an empty file is rejected with 400."""
    response = client.post(
        "/api/v1/artifacts/upload",
        files={"file": ("model.pkl", io.BytesIO(b""), "application/octet-stream")},
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_upload_unsupported_extension_rejected(client: TestClient):
    """Upload of a .exe file is rejected with 400."""
    response = client.post(
        "/api/v1/artifacts/upload",
        files={"file": ("malware.exe", io.BytesIO(b"MZ\x00\x00"), "application/octet-stream")},
    )
    assert response.status_code == 400


def test_upload_oversized_file_rejected(client: TestClient, monkeypatch):
    """Upload exceeding MAX_UPLOAD_SIZE_MB is rejected with 413."""
    from app.core import config
    monkeypatch.setattr(config.settings, "MAX_UPLOAD_SIZE_MB", 0)
    content = b"x" * 10  # even tiny file exceeds 0 MB
    response = client.post(
        "/api/v1/artifacts/upload",
        files={"file": ("model.pkl", io.BytesIO(content), "application/octet-stream")},
    )
    assert response.status_code == 413


def test_upload_sha256_is_correct(client: TestClient):
    """SHA-256 in artifact response matches independently computed hash."""
    import hashlib
    content = b"sha256 verification content"
    expected_hash = hashlib.sha256(content).hexdigest()

    response = client.post(
        "/api/v1/artifacts/upload",
        files={"file": ("model.pkl", io.BytesIO(content), "application/octet-stream")},
    )
    assert response.status_code == 201
    assert response.json()["sha256"] == expected_hash


# ---------------------------------------------------------------------------
# Retrieval tests
# ---------------------------------------------------------------------------

def test_list_artifacts_empty(client: TestClient):
    """GET /artifacts returns empty list when no artifacts exist."""
    response = client.get("/api/v1/artifacts")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["artifacts"] == []


def test_get_artifact_by_id(client: TestClient):
    """Uploaded artifact can be retrieved by ID."""
    import pickle
    content = pickle.dumps({"test": 1})
    upload = client.post(
        "/api/v1/artifacts/upload",
        files={"file": ("model.pkl", io.BytesIO(content), "application/octet-stream")},
    )
    artifact_id = upload.json()["id"]

    response = client.get(f"/api/v1/artifacts/{artifact_id}")
    assert response.status_code == 200
    assert response.json()["id"] == artifact_id


def test_get_artifact_not_found(client: TestClient):
    """GET /artifacts/{bad_id} returns 404."""
    response = client.get("/api/v1/artifacts/nonexistent-uuid")
    assert response.status_code == 404


def test_list_artifacts_after_upload(client: TestClient):
    """After uploading 2 artifacts, list returns total=2."""
    import pickle
    for i in range(2):
        content = pickle.dumps({"model": i})
        client.post(
            "/api/v1/artifacts/upload",
            files={"file": (f"model{i}.pkl", io.BytesIO(content), "application/octet-stream")},
        )
    response = client.get("/api/v1/artifacts")
    assert response.json()["total"] == 2
