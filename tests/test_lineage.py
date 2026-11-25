"""
AISecGuard — Data lineage tests
Links between artifacts, cycle prevention, the lineage graph, and the
lineage-aware scan checks (LIN-001 upstream risk, DATA-012..014 version diff).
"""

from tests.supply_chain_helpers import (
    EVIL_PICKLE, SAFE_CSV, SAFE_PICKLE, SHIFTED_CSV, auth_headers, rule_ids, scan, upload,
)


def _link(client, headers, parent, child, relation, note=None):
    return client.post(
        "/api/v1/lineage",
        json={"parent_id": parent, "child_id": child, "relation": relation, "note": note},
        headers=headers,
    )


def test_link_dataset_to_model(client):
    headers = auth_headers(client)
    data = upload(client, "train.csv", SAFE_CSV)
    model = upload(client, "model.pkl", SAFE_PICKLE)
    resp = _link(client, headers, data["id"], model["id"], "TRAINED_ON", "epoch 10")
    assert resp.status_code == 201, resp.text
    assert resp.json()["relation"] == "TRAINED_ON"


def test_relation_must_fit_artifact_types(client):
    headers = auth_headers(client)
    model_a = upload(client, "a.pkl", SAFE_PICKLE)
    model_b = upload(client, "b.pkl", SAFE_PICKLE)
    assert _link(client, headers, model_a["id"], model_b["id"], "TRAINED_ON").status_code == 400
    assert _link(client, headers, model_a["id"], model_b["id"], "FINE_TUNED_FROM").status_code == 201
    assert _link(client, headers, model_a["id"], model_b["id"], "NOT_A_RELATION").status_code == 422


def test_self_link_and_duplicates_are_rejected(client):
    headers = auth_headers(client)
    data = upload(client, "d.csv", SAFE_CSV)
    other = upload(client, "d2.csv", SAFE_CSV)
    assert _link(client, headers, data["id"], data["id"], "DERIVED_FROM").status_code == 400
    assert _link(client, headers, data["id"], other["id"], "DERIVED_FROM").status_code == 201
    assert _link(client, headers, data["id"], other["id"], "DERIVED_FROM").status_code == 409


def test_cycles_are_rejected(client):
    headers = auth_headers(client)
    a = upload(client, "a.csv", SAFE_CSV)
    b = upload(client, "b.csv", SAFE_CSV)
    c = upload(client, "c.csv", SAFE_CSV)
    assert _link(client, headers, a["id"], b["id"], "DERIVED_FROM").status_code == 201
    assert _link(client, headers, b["id"], c["id"], "DERIVED_FROM").status_code == 201
    assert _link(client, headers, c["id"], a["id"], "DERIVED_FROM").status_code == 400


def test_unknown_artifact_is_404(client):
    headers = auth_headers(client)
    data = upload(client, "x.csv", SAFE_CSV)
    assert _link(client, headers, data["id"], "missing", "DERIVED_FROM").status_code == 404


def test_linking_requires_authentication(client):
    a = upload(client, "p.csv", SAFE_CSV)
    b = upload(client, "q.csv", SAFE_CSV)
    resp = client.post("/api/v1/lineage", json={"parent_id": a["id"], "child_id": b["id"], "relation": "DERIVED_FROM"})
    assert resp.status_code == 401


def test_graph_includes_ancestors_and_descendants(client):
    headers = auth_headers(client)
    raw = upload(client, "raw.csv", SAFE_CSV)
    clean = upload(client, "clean.csv", SAFE_CSV)
    model = upload(client, "m.pkl", SAFE_PICKLE)
    _link(client, headers, raw["id"], clean["id"], "DERIVED_FROM")
    _link(client, headers, clean["id"], model["id"], "TRAINED_ON")

    graph = client.get(f"/api/v1/artifacts/{clean['id']}/lineage").json()
    assert {n["id"] for n in graph["nodes"]} == {raw["id"], clean["id"], model["id"]}
    assert len(graph["edges"]) == 2
    assert graph["root_id"] == clean["id"]


def test_delete_link(client):
    headers = auth_headers(client)
    a = upload(client, "del_a.csv", SAFE_CSV)
    b = upload(client, "del_b.csv", SAFE_CSV)
    edge = _link(client, headers, a["id"], b["id"], "DERIVED_FROM").json()
    assert client.delete(f"/api/v1/lineage/{edge['id']}", headers=headers).status_code == 204
    assert client.get(f"/api/v1/artifacts/{b['id']}/lineage").json()["edges"] == []


def test_model_trained_on_quarantined_data_inherits_risk(client):
    headers = auth_headers(client)
    data = upload(client, "poisoned.csv", SAFE_CSV)
    scan(client, data["id"])
    client.post(f"/api/v1/artifacts/{data['id']}/quarantine", json={"reason": "poisoning suspected"}, headers=headers)
    model = upload(client, "downstream.pkl", SAFE_PICKLE)
    _link(client, headers, data["id"], model["id"], "TRAINED_ON")

    finding = next(f for f in scan(client, model["id"])["findings"] if f["rule_id"] == "LIN-001")
    assert finding["severity"] == "HIGH"
    assert finding["finding_type"] == "UPSTREAM_RISK"


def test_model_fine_tuned_from_high_risk_model_inherits_risk(client):
    headers = auth_headers(client)
    base = upload(client, "base_evil.pkl", EVIL_PICKLE)
    scan(client, base["id"])
    tuned = upload(client, "tuned.pkl", SAFE_PICKLE)
    _link(client, headers, base["id"], tuned["id"], "FINE_TUNED_FROM")
    assert "LIN-001" in rule_ids(scan(client, tuned["id"]))


def test_clean_upstream_adds_no_lineage_finding(client):
    headers = auth_headers(client)
    data = upload(client, "fine.csv", SAFE_CSV)
    scan(client, data["id"])
    model = upload(client, "fine_model.pkl", SAFE_PICKLE)
    _link(client, headers, data["id"], model["id"], "TRAINED_ON")
    assert "LIN-001" not in rule_ids(scan(client, model["id"]))


def test_derived_dataset_is_diffed_against_parent(client):
    headers = auth_headers(client)
    v1 = upload(client, "data_v1.csv", SAFE_CSV)
    v2 = upload(client, "data_v2.csv", SHIFTED_CSV)
    _link(client, headers, v1["id"], v2["id"], "DERIVED_FROM")

    result = scan(client, v2["id"])
    ids = rule_ids(result)
    assert "DATA-012" in ids, "added column must be reported"
    shift = next(f for f in result["findings"] if f["rule_id"] == "DATA-014")
    assert shift["finding_type"] == "DATA_POISONING_INDICATOR"
    assert "label" in shift["evidence"]


def test_identical_dataset_versions_add_no_diff_findings(client):
    headers = auth_headers(client)
    v1 = upload(client, "same_v1.csv", SAFE_CSV)
    v2 = upload(client, "same_v2.csv", SAFE_CSV)
    _link(client, headers, v1["id"], v2["id"], "DERIVED_FROM")
    assert not {"DATA-012", "DATA-013", "DATA-014"} & rule_ids(scan(client, v2["id"]))
