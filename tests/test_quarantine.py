"""
AISecGuard — Week 5 Quarantine API Tests
Tests:
  1. Transition artifact SCANNED -> QUARANTINED (HTTP 200, status updated, event logged)
  2. Transition artifact QUARANTINED -> SCANNED via release (HTTP 200, status restored, event logged)
  3. Quarantine endpoint requires authentication (HTTP 401 when unauthorized)
  4. Release endpoint requires authentication (HTTP 401 when unauthorized)
  5. Cannot quarantine already-quarantined artifact (HTTP 409 Conflict)
  6. Cannot release artifact that is not in QUARANTINED status (HTTP 400 Bad Request)
  7. Retrieve chronological quarantine audit events for an artifact (HTTP 200)
"""

import io
import pytest
from fastapi.testclient import TestClient


def get_auth_token(client: TestClient) -> str:
    """Helper to register and login a test user, returning access token."""
    email = "quarantine_tester@example.com"
    pwd = "SecureTesterPassword123!"
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": pwd, "full_name": "Quarantine Tester"},
    )
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": pwd},
    )
    return login_resp.json()["access_token"]


def create_test_artifact(client: TestClient) -> str:
    """Helper to upload a model artifact and return its ID."""
    resp = client.post(
        "/api/v1/artifacts/upload",
        files={"file": ("model_for_quarantine.pkl", io.BytesIO(b"model_binary_bytes"), "application/octet-stream")},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


def test_quarantine_artifact_success(client: TestClient):
    """Test quarantining an artifact updates status and logs event."""
    token = get_auth_token(client)
    art_id = create_test_artifact(client)

    resp = client.post(
        f"/api/v1/artifacts/{art_id}/quarantine",
        json={"reason": "Contains malicious payload detected during analysis"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["artifact_id"] == art_id
    assert data["action"] == "QUARANTINE"
    assert "malicious payload" in data["reason"]

    # Verify artifact status updated
    art_resp = client.get(f"/api/v1/artifacts/{art_id}")
    assert art_resp.status_code == 200
    assert art_resp.json()["status"] == "QUARANTINED"


def test_release_artifact_success(client: TestClient):
    """Test releasing a quarantined artifact restores its SCANNED status."""
    token = get_auth_token(client)
    art_id = create_test_artifact(client)

    # First quarantine
    client.post(
        f"/api/v1/artifacts/{art_id}/quarantine",
        json={"reason": "Under suspicion"},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Now release
    rel_resp = client.post(
        f"/api/v1/artifacts/{art_id}/release",
        json={"reason": "False positive verified by security lead"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert rel_resp.status_code == 200, rel_resp.text
    rel_data = rel_resp.json()
    assert rel_data["action"] == "RELEASE"

    # Verify status changed to SCANNED
    art_resp = client.get(f"/api/v1/artifacts/{art_id}")
    assert art_resp.status_code == 200
    assert art_resp.json()["status"] == "SCANNED"


def test_quarantine_requires_auth(client: TestClient):
    """Quarantine endpoint must return 401 when no token is supplied."""
    art_id = create_test_artifact(client)
    resp = client.post(
        f"/api/v1/artifacts/{art_id}/quarantine",
        json={"reason": "Unauthenticated quarantine attempt"},
    )
    assert resp.status_code == 401


def test_release_requires_auth(client: TestClient):
    """Release endpoint must return 401 when no token is supplied."""
    art_id = create_test_artifact(client)
    resp = client.post(
        f"/api/v1/artifacts/{art_id}/release",
        json={"reason": "Unauthenticated release attempt"},
    )
    assert resp.status_code == 401


def test_quarantine_already_quarantined(client: TestClient):
    """Attempting to quarantine an already quarantined artifact returns HTTP 409."""
    token = get_auth_token(client)
    art_id = create_test_artifact(client)

    resp1 = client.post(
        f"/api/v1/artifacts/{art_id}/quarantine",
        json={"reason": "First quarantine"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp1.status_code == 200

    resp2 = client.post(
        f"/api/v1/artifacts/{art_id}/quarantine",
        json={"reason": "Second quarantine attempt"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp2.status_code == 409
    assert "already quarantined" in resp2.json()["detail"].lower()


def test_release_unquarantined_artifact(client: TestClient):
    """Attempting to release an artifact that is not quarantined returns HTTP 400."""
    token = get_auth_token(client)
    art_id = create_test_artifact(client)

    resp = client.post(
        f"/api/v1/artifacts/{art_id}/release",
        json={"reason": "Premature release attempt"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400
    assert "must be quarantined" in resp.json()["detail"].lower()


def test_quarantine_audit_events_list(client: TestClient):
    """Test retrieving the list of quarantine audit events for an artifact."""
    token = get_auth_token(client)
    art_id = create_test_artifact(client)

    # Quarantine then release
    client.post(
        f"/api/v1/artifacts/{art_id}/quarantine",
        json={"reason": "Event audit test quarantine"},
        headers={"Authorization": f"Bearer {token}"},
    )
    client.post(
        f"/api/v1/artifacts/{art_id}/release",
        json={"reason": "Event audit test release"},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Get events
    events_resp = client.get(
        f"/api/v1/artifacts/{art_id}/events",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert events_resp.status_code == 200, events_resp.text
    events = events_resp.json()
    assert len(events) == 2
    assert events[0]["action"] == "QUARANTINE"
    assert events[1]["action"] == "RELEASE"
