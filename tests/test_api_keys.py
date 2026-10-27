"""
AISecGuard — API key tests
Keys let CI pipelines and scripts call the API without a login session.
The secret is shown once and only its hash is stored.
"""

from app.models.api_key import ApiKey
from tests.supply_chain_helpers import SAFE_PICKLE, auth_headers, scan, upload


def _create_key(client, headers, name="ci-pipeline"):
    resp = client.post("/api/v1/api-keys", json={"name": name}, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_creating_a_key_requires_login(client):
    assert client.post("/api/v1/api-keys", json={"name": "x"}).status_code == 401


def test_key_is_shown_once_and_stored_hashed(client, db):
    headers = auth_headers(client)
    created = _create_key(client, headers)
    assert created["key"].startswith("asg_")
    assert created["prefix"] == created["key"][:12]

    stored = db.get(ApiKey, created["id"])
    assert stored.key_hash != created["key"]
    assert created["key"] not in (stored.key_hash or "")

    listed = client.get("/api/v1/api-keys", headers=headers).json()
    assert [k["id"] for k in listed] == [created["id"]]
    assert "key" not in listed[0]
    assert listed[0]["prefix"] == created["prefix"]


def test_key_authenticates_protected_endpoints(client):
    headers = auth_headers(client)
    key = _create_key(client, headers)["key"]
    art = upload(client, "via_key.pkl", SAFE_PICKLE)
    scan(client, art["id"])

    resp = client.post(
        f"/api/v1/artifacts/{art['id']}/quarantine",
        json={"reason": "flagged by CI"},
        headers={"X-API-Key": key},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["actor_email"] == "engine_tester@example.com"

    listed = client.get("/api/v1/api-keys", headers=headers).json()
    assert listed[0]["last_used_at"] is not None


def test_invalid_key_is_rejected(client):
    art = upload(client, "bad_key.pkl", SAFE_PICKLE)
    scan(client, art["id"])
    resp = client.post(
        f"/api/v1/artifacts/{art['id']}/quarantine",
        json={"reason": "x"},
        headers={"X-API-Key": "asg_not-a-real-key"},
    )
    assert resp.status_code == 401


def test_revoked_key_stops_working(client):
    headers = auth_headers(client)
    created = _create_key(client, headers)
    assert client.delete(f"/api/v1/api-keys/{created['id']}", headers=headers).status_code == 204

    art = upload(client, "revoked.pkl", SAFE_PICKLE)
    scan(client, art["id"])
    resp = client.post(
        f"/api/v1/artifacts/{art['id']}/quarantine",
        json={"reason": "x"},
        headers={"X-API-Key": created["key"]},
    )
    assert resp.status_code == 401
    assert client.get("/api/v1/api-keys", headers=headers).json()[0]["revoked_at"] is not None


def test_users_only_see_and_revoke_their_own_keys(client):
    alice = auth_headers(client, "alice@example.com")
    bob = auth_headers(client, "bob@example.com")
    alice_key = _create_key(client, alice, "alice-key")
    assert client.get("/api/v1/api-keys", headers=bob).json() == []
    assert client.delete(f"/api/v1/api-keys/{alice_key['id']}", headers=bob).status_code == 404


def test_key_name_is_required(client):
    resp = client.post("/api/v1/api-keys", json={"name": "  "}, headers=auth_headers(client))
    assert resp.status_code == 422
