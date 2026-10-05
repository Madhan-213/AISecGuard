"""
AISecGuard — Week 5 End-to-End API Integration Tests
Tests:
  1. Full E2E flow: register -> login -> direct scan -> quarantine -> JSON & PDF report export
  2. Quarantine rejects unauthorized requests (HTTP 401)
  3. Quarantine audit event records exact actor identity (id + email)
  4. Real-time scan status SSE stream (text/event-stream with phase events)
  5. Complete quarantine and release cycle with full audit trail
"""

import io
import json
import pytest
from fastapi.testclient import TestClient


def test_e2e_register_upload_scan_quarantine_export(client: TestClient):
    """Full lifecycle: register -> login -> scan model -> quarantine -> export reports."""
    # 1. Register & Login
    client.post(
        "/api/v1/auth/register",
        json={"email": "lead_sec@example.com", "password": "SecOpsPassword123!", "full_name": "Lead SecOps"},
    )
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "lead_sec@example.com", "password": "SecOpsPassword123!"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload and scan model
    model_bytes = b"suspicious-model-content-for-testing-e2e"
    scan_resp = client.post(
        "/api/v1/scans/model",
        files={"file": ("compromised_weights.bin", io.BytesIO(model_bytes), "application/octet-stream")},
    )
    assert scan_resp.status_code == 201
    scan = scan_resp.json()
    scan_id = scan["id"]
    artifact_id = scan["artifact_id"]
    assert scan["status"] == "COMPLETED"

    # 3. Quarantine artifact
    q_resp = client.post(
        f"/api/v1/artifacts/{artifact_id}/quarantine",
        json={"reason": "High risk anomaly detected in model layers"},
        headers=headers,
    )
    assert q_resp.status_code == 200
    assert q_resp.json()["action"] == "QUARANTINE"

    # 4. Export JSON report
    json_resp = client.get(f"/api/v1/scans/{scan_id}/report?format=json")
    assert json_resp.status_code == 200
    report_data = json_resp.json()
    assert report_data["scan"]["id"] == scan_id
    assert report_data["artifact"]["id"] == artifact_id

    # 5. Export PDF report
    pdf_resp = client.get(f"/api/v1/scans/{scan_id}/report?format=pdf")
    assert pdf_resp.status_code == 200
    assert pdf_resp.content.startswith(b"%PDF-")


def test_quarantine_rejects_unauthenticated_request(client: TestClient):
    """Quarantine must return HTTP 401 when called without Bearer token."""
    scan_resp = client.post(
        "/api/v1/scans/model",
        files={"file": ("unauth_model.pkl", io.BytesIO(b"content"), "application/octet-stream")},
    )
    art_id = scan_resp.json()["artifact_id"]

    q_resp = client.post(
        f"/api/v1/artifacts/{art_id}/quarantine",
        json={"reason": "Should fail unauthorized"},
    )
    assert q_resp.status_code == 401


def test_quarantine_event_actor_matches_logged_in_user(client: TestClient):
    """Audit log records user ID and email of the actor."""
    email = "auditor@example.com"
    pwd = "AuditPassword123!"
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": pwd, "full_name": "Compliance Auditor"},
    )
    token = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": pwd},
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    scan_resp = client.post(
        "/api/v1/scans/model",
        files={"file": ("audit_model.pkl", io.BytesIO(b"content"), "application/octet-stream")},
    )
    art_id = scan_resp.json()["artifact_id"]

    q_resp = client.post(
        f"/api/v1/artifacts/{art_id}/quarantine",
        json={"reason": "Compliance quarantine order"},
        headers=headers,
    )
    assert q_resp.status_code == 200
    event = q_resp.json()
    assert event["actor_email"] == email
    assert event["actor_id"] is not None


def test_scan_status_stream_sse(client: TestClient):
    """SSE endpoint streams phase updates with text/event-stream media type."""
    scan_resp = client.post(
        "/api/v1/scans/model",
        files={"file": ("sse_model.pkl", io.BytesIO(b"content"), "application/octet-stream")},
    )
    scan_id = scan_resp.json()["id"]

    sse_resp = client.get(f"/api/v1/scans/{scan_id}/status")
    assert sse_resp.status_code == 200
    assert "text/event-stream" in sse_resp.headers["content-type"]
    text = sse_resp.text
    assert "data: " in text
    assert "QUEUED" in text
    assert "PROVENANCE_CHECK" in text
    assert "COMPLETED" in text


def test_full_quarantine_and_release_lifecycle(client: TestClient):
    """Artifact moves through SCANNED -> QUARANTINED -> SCANNED with 2 audit entries."""
    email = "lifecycle@example.com"
    pwd = "LifecyclePass123!"
    client.post("/api/v1/auth/register", json={"email": email, "password": pwd})
    token = client.post("/api/v1/auth/login", json={"email": email, "password": pwd}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    scan_resp = client.post(
        "/api/v1/scans/model",
        files={"file": ("lifecycle_test.bin", io.BytesIO(b"content"), "application/octet-stream")},
    )
    art_id = scan_resp.json()["artifact_id"]

    # Quarantine
    q_resp = client.post(
        f"/api/v1/artifacts/{art_id}/quarantine",
        json={"reason": "Quarantine during threat review"},
        headers=headers,
    )
    assert q_resp.status_code == 200

    # Release
    rel_resp = client.post(
        f"/api/v1/artifacts/{art_id}/release",
        json={"reason": "Analysis complete, deemed benign"},
        headers=headers,
    )
    assert rel_resp.status_code == 200

    # Verify audit event history
    events_resp = client.get(f"/api/v1/artifacts/{art_id}/events", headers=headers)
    assert events_resp.status_code == 200
    events = events_resp.json()
    assert len(events) == 2
    assert events[0]["action"] == "QUARANTINE"
    assert events[1]["action"] == "RELEASE"
