"""
AISecGuard — Dashboard data, findings export and system info tests
"""

import csv
import io

from tests.supply_chain_helpers import EVIL_PICKLE, SAFE_CSV, SAFE_PICKLE, scan, upload


def _seed(client):
    scan(client, upload(client, "evil.pkl", EVIL_PICKLE)["id"])
    scan(client, upload(client, "train.csv", SAFE_CSV)["id"])
    scan(client, upload(client, "requirements.txt", b"torch==1.12.0\nnumpy\n")["id"])
    upload(client, "unscanned.pkl", SAFE_PICKLE)


def test_stats_include_dashboard_breakdowns(client):
    _seed(client)
    data = client.get("/api/v1/stats/").json()

    assert data["total_artifacts"] == 4
    assert data["artifacts_by_type"] == {"MODEL": 2, "DATASET": 1, "DEPENDENCY": 1}
    assert data["known_vulnerabilities"] == 1
    assert data["high_risk_scans"] >= 1
    assert data["signed_artifacts"] == 0
    assert data["lineage_links"] == 0

    timeline = data["scans_over_time"]
    assert len(timeline) == 14
    assert sum(day["scans"] for day in timeline) == 3
    assert {"date", "scans", "high_risk"} <= set(timeline[-1])

    top = data["top_rules"]
    assert top and {"rule_id", "title", "severity", "count"} <= set(top[0])
    assert top == sorted(top, key=lambda r: -r["count"])

    recent = data["recent_scans"][0]
    assert recent["artifact_name"] in {"evil.pkl", "train.csv", "requirements.txt"}
    assert "findings_count" in recent


def test_top_rule_title_is_generic_when_findings_differ(client):
    scan(client, upload(client, "requirements.txt", b"torch==1.12.0\n")["id"])
    scan(client, upload(client, "other-requirements.txt", b"requests==2.20.0\n")["id"])
    dep = next(r for r in client.get("/api/v1/stats/").json()["top_rules"] if r["rule_id"] == "DEP-007")
    assert dep["count"] == 2
    assert dep["title"] == "Known vulnerable version"


def test_findings_export_csv(client):
    _seed(client)
    resp = client.get("/api/v1/exports/findings?format=csv")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    assert "attachment" in resp.headers["content-disposition"]
    rows = list(csv.DictReader(io.StringIO(resp.text)))
    assert rows
    assert {"artifact", "artifact_type", "sha256", "rule_id", "severity", "title", "scan_id", "risk_level"} <= set(rows[0])
    assert any(r["rule_id"] == "DEP-007" for r in rows)


def test_findings_export_filters(client):
    _seed(client)
    rows = client.get("/api/v1/exports/findings?format=json&severity=CRITICAL").json()["findings"]
    assert rows and all(r["severity"] == "CRITICAL" for r in rows)
    rows = client.get("/api/v1/exports/findings?format=json&artifact_type=DEPENDENCY").json()["findings"]
    assert rows and all(r["artifact_type"] == "DEPENDENCY" for r in rows)


def test_findings_export_only_latest_scan_by_default(client):
    art = upload(client, "rescanned.pkl", EVIL_PICKLE)
    scan(client, art["id"])
    scan(client, art["id"])
    rows = client.get("/api/v1/exports/findings?format=json").json()["findings"]
    assert len({r["scan_id"] for r in rows}) == 1
    all_rows = client.get("/api/v1/exports/findings?format=json&latest_only=false").json()["findings"]
    assert len({r["scan_id"] for r in all_rows}) == 2


def test_findings_export_rejects_bad_format(client):
    assert client.get("/api/v1/exports/findings?format=xml").status_code == 422


def test_system_info(client):
    info = client.get("/api/v1/system/info").json()
    assert info["external_api_keys_required"] is False
    assert {s["artifact_type"] for s in info["scanners"]} == {"MODEL", "DATASET", "DEPENDENCY"}
    model = next(s for s in info["scanners"] if s["artifact_type"] == "MODEL")
    assert ".pkl" in model["extensions"]
    assert info["max_upload_mb"] == 100
    assert info["integrations"]["osv"]["enabled"] is False
    assert info["integrations"]["osv"]["setting"] == "OSV_LOOKUP_ENABLED"
    assert info["signing"]["algorithm"] == "Ed25519"
