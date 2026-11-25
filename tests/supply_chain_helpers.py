"""
AISecGuard — Shared helpers for the supply-chain engine tests
(integrity, CVE matching, signing, ML-BOM, lineage, compliance, audit chain).
"""

import io
import pickle

from fastapi.testclient import TestClient

from tests.conftest import make_suspicious_pickle_bytes


def auth_headers(client: TestClient, email: str = "engine_tester@example.com", role: str = "ADMIN") -> dict:
    pwd = "EngineTesterPassword123!"
    client.post("/api/v1/auth/register", json={"email": email, "password": pwd, "full_name": "Engine Tester", "role": role})
    token = client.post("/api/v1/auth/login", json={"email": email, "password": pwd}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def upload(client: TestClient, filename: str, content: bytes, **form) -> dict:
    resp = client.post(
        "/api/v1/artifacts/upload",
        files={"file": (filename, io.BytesIO(content), "application/octet-stream")},
        data=form,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def scan(client: TestClient, artifact_id: str) -> dict:
    resp = client.post("/api/v1/scans", json={"artifact_id": artifact_id})
    assert resp.status_code == 201, resp.text
    return resp.json()


def rule_ids(scan_json: dict) -> set[str]:
    return {f.get("rule_id") for f in scan_json["findings"]}


SAFE_CSV = b"feature_a,feature_b,label\n" + b"".join(
    f"{i},{i * 2},{'cat' if i % 2 else 'dog'}\n".encode() for i in range(40)
)

# Same schema, but the label distribution is flipped toward one class and a column added.
SHIFTED_CSV = b"feature_a,feature_b,label,injected\n" + b"".join(
    f"{i},{i * 2},{'cat' if i % 10 else 'dog'},x\n".encode() for i in range(40)
)

SAFE_PICKLE = pickle.dumps({"weights": [0.1, 0.2, 0.3]})
EVIL_PICKLE = make_suspicious_pickle_bytes()
