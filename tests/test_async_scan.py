import io
import pickle
import pytest
from fastapi.testclient import TestClient

def test_async_background_scan_execution(client: TestClient):
    """Verify asynchronous scan dispatch returns immediately with job_id and RUNNING status."""
    # 1. Upload model artifact
    content = pickle.dumps({"weights": [0.1, 0.2, 0.3]})
    upload_res = client.post(
        "/api/v1/artifacts/upload",
        files={"file": ("async_model.pkl", io.BytesIO(content), "application/octet-stream")},
    )
    assert upload_res.status_code == 201
    artifact = upload_res.json()

    # 2. Trigger scan with sync=false
    scan_res = client.post(
        "/api/v1/scans/?sync=false",
        json={"artifact_id": artifact["id"]},
    )
    assert scan_res.status_code == 201
    scan = scan_res.json()
    assert scan["status"] == "RUNNING"
    assert "job_id" in scan
    assert scan["job_id"] == scan["id"]

    # 3. Check SSE status endpoint stream
    sse_res = client.get(f"/api/v1/scans/{scan['id']}/status")
    assert sse_res.status_code == 200
    assert "text/event-stream" in sse_res.headers.get("content-type", "")
    assert "data:" in sse_res.text


def test_sync_scan_execution(client: TestClient):
    """Verify synchronous scan dispatch completes immediately."""
    content = pickle.dumps({"weights": [0.5, 0.6]})
    upload_res = client.post(
        "/api/v1/artifacts/upload",
        files={"file": ("sync_model.pkl", io.BytesIO(content), "application/octet-stream")},
    )
    assert upload_res.status_code == 201
    artifact = upload_res.json()

    scan_res = client.post(
        "/api/v1/scans/?sync=true",
        json={"artifact_id": artifact["id"]},
    )
    assert scan_res.status_code == 201
    scan = scan_res.json()
    assert scan["status"] == "COMPLETED"
    assert scan["risk_level"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
