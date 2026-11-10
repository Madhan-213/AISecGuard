"""
AISecGuard — Role-Based Access Control (RBAC) Tests (Task 4a)

Verifies role-based authorization across AISecGuard endpoints:
- Roles: ADMIN, ANALYST, AUDITOR
- Standalone Mode (NO_LOGIN_REQUIRED=True) vs Enterprise Mode (NO_LOGIN_REQUIRED=False)
- Admin: Full write and administrative access (rotate keys, sign, quarantine, delete links)
- Analyst: Operational access (sign, quarantine, create links), cannot rotate keys or delete links
- Auditor: Read-only access (can view compliance, ML-BOM, audit logs, scans), cannot sign, quarantine, or modify links
"""

import io
import pickle
import pytest
from app.core.config import settings
from app.models.enums import UserRole
from app.models.lineage import LineageRelation
from tests.supply_chain_helpers import SAFE_PICKLE, upload, scan


def register_and_get_token(client, email: str, role: str) -> dict:
    pwd = "SecurePassword123!"
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": pwd, "full_name": f"User {role}", "role": role},
    )
    assert reg_resp.status_code == 201, reg_resp.text
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": pwd},
    )
    assert login_resp.status_code == 200, login_resp.text
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_user_registration_roles(client):
    """Users can be registered with ADMIN, ANALYST, or AUDITOR roles, defaulting to ANALYST."""
    # Default role
    r_default = client.post(
        "/api/v1/auth/register",
        json={"email": "default_user@example.com", "password": "Password123!"},
    )
    assert r_default.status_code == 201
    assert r_default.json()["user"]["role"] == UserRole.ANALYST.value

    # Explicit Auditor
    r_auditor = client.post(
        "/api/v1/auth/register",
        json={"email": "auditor_user@example.com", "password": "Password123!", "role": "AUDITOR"},
    )
    assert r_auditor.status_code == 201
    assert r_auditor.json()["user"]["role"] == UserRole.AUDITOR.value

    # Explicit Admin
    r_admin = client.post(
        "/api/v1/auth/register",
        json={"email": "admin_user@example.com", "password": "Password123!", "role": "ADMIN"},
    )
    assert r_admin.status_code == 201
    assert r_admin.json()["user"]["role"] == UserRole.ADMIN.value
    assert r_admin.json()["user"]["is_admin"] is True

    # Invalid role
    r_invalid = client.post(
        "/api/v1/auth/register",
        json={"email": "invalid_user@example.com", "password": "Password123!", "role": "SUPERUSER"},
    )
    assert r_invalid.status_code in (400, 409, 422)


def test_auth_me_returns_role(client):
    """GET /api/v1/auth/me returns the active user profile including their role."""
    headers = register_and_get_token(client, "me_test@example.com", "AUDITOR")
    resp = client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "me_test@example.com"
    assert data["role"] == "AUDITOR"


def test_analyst_permissions(client):
    """
    Analyst role:
    - CAN sign artifacts
    - CAN quarantine and release artifacts
    - CAN create lineage links
    - CANNOT rotate signing keys (Admin only)
    - CANNOT delete lineage links (Admin only)
    """
    analyst_hdr = register_and_get_token(client, "analyst@example.com", "ANALYST")
    admin_hdr = register_and_get_token(client, "admin_for_analyst_test@example.com", "ADMIN")

    # Upload and scan artifact
    art = upload(client, "analyst_model.pkl", SAFE_PICKLE)
    scan(client, art["id"])

    # 1. Analyst CAN sign
    sign_resp = client.post(f"/api/v1/artifacts/{art['id']}/sign", headers=analyst_hdr)
    assert sign_resp.status_code == 201

    # 2. Analyst CANNOT rotate signing keys (403)
    rotate_resp = client.post("/api/v1/signing/rotate", headers=analyst_hdr)
    assert rotate_resp.status_code == 403
    assert "Insufficient permissions" in rotate_resp.json()["detail"]

    # 3. Analyst CAN quarantine and release
    art2 = upload(client, "quarantine_target.pkl", SAFE_PICKLE)
    scan(client, art2["id"])

    quar_resp = client.post(
        f"/api/v1/artifacts/{art2['id']}/quarantine",
        json={"reason": "Suspected anomaly under review"},
        headers=analyst_hdr,
    )
    assert quar_resp.status_code == 200
    assert quar_resp.json()["action"] == "QUARANTINE"

    rel_resp = client.post(
        f"/api/v1/artifacts/{art2['id']}/release",
        json={"reason": "Cleared by analyst review"},
        headers=analyst_hdr,
    )
    assert rel_resp.status_code == 200
    assert rel_resp.json()["action"] == "RELEASE"

    # 4. Analyst CAN create lineage link (model -> model is FINE_TUNED_FROM)
    art_child = upload(client, "child.pkl", SAFE_PICKLE)
    link_resp = client.post(
        "/api/v1/lineage",
        json={"parent_id": art["id"], "child_id": art_child["id"], "relation": LineageRelation.FINE_TUNED_FROM.value},
        headers=analyst_hdr,
    )
    assert link_resp.status_code == 201, link_resp.text
    edge_id = link_resp.json()["id"]

    # 5. Analyst CANNOT delete lineage link (Admin only -> 403)
    del_resp = client.delete(f"/api/v1/lineage/{edge_id}", headers=analyst_hdr)
    assert del_resp.status_code == 403

    # Admin CAN delete lineage link
    del_admin = client.delete(f"/api/v1/lineage/{edge_id}", headers=admin_hdr)
    assert del_admin.status_code == 204


def test_auditor_permissions(client):
    """
    Auditor role:
    - CAN read artifacts, ML-BOM, compliance reports, signatures, audit chain
    - CANNOT sign artifacts (403)
    - CANNOT quarantine artifacts (403)
    - CANNOT release artifacts (403)
    - CANNOT rotate signing keys (403)
    - CANNOT create lineage links (403)
    """
    auditor_hdr = register_and_get_token(client, "auditor@example.com", "AUDITOR")

    art = upload(client, "auditor_model.pkl", SAFE_PICKLE)
    scan(client, art["id"])

    # 1. Auditor CAN read
    assert client.get(f"/api/v1/artifacts/{art['id']}", headers=auditor_hdr).status_code == 200
    assert client.get(f"/api/v1/artifacts/{art['id']}/mlbom", headers=auditor_hdr).status_code == 200
    assert client.get(f"/api/v1/artifacts/{art['id']}/compliance", headers=auditor_hdr).status_code == 200
    assert client.get("/api/v1/audit/verify", headers=auditor_hdr).status_code == 200

    # 2. Auditor CANNOT sign (403)
    sign_resp = client.post(f"/api/v1/artifacts/{art['id']}/sign", headers=auditor_hdr)
    assert sign_resp.status_code == 403

    # 3. Auditor CANNOT quarantine (403)
    quar_resp = client.post(
        f"/api/v1/artifacts/{art['id']}/quarantine",
        json={"reason": "Auditor attempting quarantine"},
        headers=auditor_hdr,
    )
    assert quar_resp.status_code == 403

    # 4. Auditor CANNOT rotate key (403)
    rotate_resp = client.post("/api/v1/signing/rotate", headers=auditor_hdr)
    assert rotate_resp.status_code == 403

    # 5. Auditor CANNOT create lineage link (403)
    art2 = upload(client, "auditor_model_2.pkl", SAFE_PICKLE)
    link_resp = client.post(
        "/api/v1/lineage",
        json={"parent_id": art["id"], "child_id": art2["id"], "relation": LineageRelation.FINE_TUNED_FROM.value},
        headers=auditor_hdr,
    )
    assert link_resp.status_code == 403


def test_admin_permissions(client):
    """
    Admin role:
    - CAN sign artifacts
    - CAN quarantine and release artifacts
    - CAN rotate keys
    - CAN create and delete lineage links
    """
    admin_hdr = register_and_get_token(client, "superadmin@example.com", "ADMIN")

    art = upload(client, "admin_model.pkl", SAFE_PICKLE)
    scan(client, art["id"])

    # Sign
    sign_resp = client.post(f"/api/v1/artifacts/{art['id']}/sign", headers=admin_hdr)
    assert sign_resp.status_code == 201

    # Rotate key
    rotate_resp = client.post("/api/v1/signing/rotate", headers=admin_hdr)
    assert rotate_resp.status_code == 200

    # Quarantine and release
    art2 = upload(client, "admin_q.pkl", SAFE_PICKLE)
    scan(client, art2["id"])

    quar = client.post(
        f"/api/v1/artifacts/{art2['id']}/quarantine",
        json={"reason": "Admin quarantine"},
        headers=admin_hdr,
    )
    assert quar.status_code == 200

    rel = client.post(
        f"/api/v1/artifacts/{art2['id']}/release",
        json={"reason": "Admin release"},
        headers=admin_hdr,
    )
    assert rel.status_code == 200


def test_standalone_mode_bypass(client, monkeypatch):
    """
    In Standalone Mode (NO_LOGIN_REQUIRED=True):
    - Unauthenticated requests automatically receive full administrative access via local analyst.
    """
    monkeypatch.setattr(settings, "NO_LOGIN_REQUIRED", True)

    art = upload(client, "standalone_model.pkl", SAFE_PICKLE)
    scan(client, art["id"])

    # Sign without Authorization header succeeds in standalone mode
    sign_resp = client.post(f"/api/v1/artifacts/{art['id']}/sign")
    assert sign_resp.status_code == 201

    # Key rotation without header succeeds in standalone mode
    rotate_resp = client.post("/api/v1/signing/rotate")
    assert rotate_resp.status_code == 200
