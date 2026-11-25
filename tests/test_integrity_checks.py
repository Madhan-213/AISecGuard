"""
AISecGuard — Integrity check tests (PROV-001..003)
The SHA-256 baseline recorded at upload must be compared on every scan.
"""

import hashlib
from pathlib import Path

from app.models.artifact import Artifact
from tests.supply_chain_helpers import SAFE_PICKLE, rule_ids, scan, upload


def test_untouched_artifact_has_no_integrity_finding(client):
    art = upload(client, "clean.pkl", SAFE_PICKLE)
    result = scan(client, art["id"])
    assert not {"PROV-001", "PROV-002", "PROV-003"} & rule_ids(result)


def test_file_modified_after_upload_is_flagged(client, db):
    art = upload(client, "tampered.pkl", SAFE_PICKLE)
    stored = Path(db.get(Artifact, art["id"]).storage_path)
    stored.write_bytes(SAFE_PICKLE + b"appended-by-attacker")

    result = scan(client, art["id"])
    finding = next(f for f in result["findings"] if f["rule_id"] == "PROV-001")
    assert finding["severity"] == "HIGH"
    assert finding["finding_type"] == "INTEGRITY_VIOLATION"


def test_expected_hash_mismatch_is_flagged(client):
    art = upload(client, "pinned.pkl", SAFE_PICKLE, expected_sha256="0" * 64)
    assert "PROV-002" in rule_ids(scan(client, art["id"]))


def test_expected_hash_match_is_clean(client):
    good = hashlib.sha256(SAFE_PICKLE).hexdigest()
    art = upload(client, "pinned_ok.pkl", SAFE_PICKLE, expected_sha256=good.upper())
    assert "PROV-002" not in rule_ids(scan(client, art["id"]))


def test_invalid_expected_hash_is_rejected(client):
    import io
    resp = client.post(
        "/api/v1/artifacts/upload",
        files={"file": ("bad.pkl", io.BytesIO(SAFE_PICKLE), "application/octet-stream")},
        data={"expected_sha256": "not-a-hash"},
    )
    assert resp.status_code == 400


def test_same_name_different_content_is_flagged(client):
    upload(client, "resnet.pkl", SAFE_PICKLE)
    second = upload(client, "resnet.pkl", SAFE_PICKLE + b"changed")
    finding = next(f for f in scan(client, second["id"])["findings"] if f["rule_id"] == "PROV-003")
    assert finding["severity"] == "MEDIUM"


def test_same_name_same_content_is_not_flagged(client):
    upload(client, "same.pkl", SAFE_PICKLE)
    second = upload(client, "same.pkl", SAFE_PICKLE)
    assert "PROV-003" not in rule_ids(scan(client, second["id"]))
