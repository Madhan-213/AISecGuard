"""
AISecGuard — Standardized ML-BOM (CycloneDX 1.5) & EU AI Act Compliance Scorecard Tests
Roadmap Task 3.
"""

from fastapi.testclient import TestClient

from tests.supply_chain_helpers import SAFE_PICKLE, EVIL_PICKLE, auth_headers, scan, upload


def test_cyclonedx_15_mlbom_generation(client: TestClient):
    """Verify CycloneDX 1.5 ML-BOM structure including modelCard and hardware."""
    art = upload(client, "model_resnet.pkl", SAFE_PICKLE)
    scan(client, art["id"])

    res = client.get(f"/api/v1/artifacts/{art['id']}/mlbom?spec_version=1.5")
    assert res.status_code == 200
    bom = res.json()

    assert bom["bomFormat"] == "CycloneDX"
    assert bom["specVersion"] == "1.5"
    assert "serialNumber" in bom
    assert "metadata" in bom
    assert "hardware" in bom
    assert len(bom["hardware"]) >= 2

    # Check root component and model card
    comp = bom["metadata"]["component"]
    assert comp["type"] == "machine-learning-model"
    assert "modelCard" in comp

    card = comp["modelCard"]
    assert "modelParameters" in card
    assert "architecture" in card["modelParameters"]
    assert "quantitativeAnalysis" in card
    metrics = card["quantitativeAnalysis"]["performanceMetrics"]
    assert any(m["type"] == "security-robustness-score" for m in metrics)
    assert "considerations" in card


def test_eu_ai_act_compliance_scorecard_safe_model(client: TestClient):
    """Verify automated EU AI Act Compliance Scorecard generation for clean model."""
    headers = auth_headers(client)
    art = upload(client, "clean_model.pkl", SAFE_PICKLE)
    scan(client, art["id"])
    client.post(f"/api/v1/artifacts/{art['id']}/sign", headers=headers)

    res = client.get(f"/api/v1/artifacts/{art['id']}/compliance")
    assert res.status_code == 200
    scorecard = res.json()

    assert "score" in scorecard
    assert 0 <= scorecard["score"] <= 100
    assert scorecard["grade"] in ("A", "B", "C", "F")
    assert scorecard["overall_status"] in ("FULLY_COMPLIANT", "SUBSTANTIALLY_COMPLIANT", "PARTIALLY_COMPLIANT", "NON_COMPLIANT")
    assert "article_10_status" in scorecard
    assert "article_15_status" in scorecard
    assert len(scorecard["controls"]) >= 8

    # Specific Article 15 controls check
    art15_controls = [c for c in scorecard["controls"] if "Art. 15" in c["ref"]]
    assert len(art15_controls) >= 3


def test_eu_ai_act_compliance_scorecard_high_risk_model(client: TestClient):
    """Verify high-risk artifact receives failing / non-compliant score and remediation actions."""
    art = upload(client, "evil_model.pkl", EVIL_PICKLE)
    scan(client, art["id"])

    res = client.get(f"/api/v1/artifacts/{art['id']}/compliance")
    assert res.status_code == 200
    scorecard = res.json()

    assert scorecard["score"] < 75
    assert scorecard["article_15_status"] == "NON_COMPLIANT"
    assert len(scorecard["action_items"]) > 0


def test_model_card_markdown_includes_scorecard(client: TestClient):
    """Verify model card Markdown export contains the Compliance Scorecard section."""
    art = upload(client, "card_model.pkl", SAFE_PICKLE)
    scan(client, art["id"])

    res = client.get(f"/api/v1/artifacts/{art['id']}/model-card")
    assert res.status_code == 200
    assert "text/markdown" in res.headers.get("content-type", "")
    md = res.text
    assert "## Compliance Scorecard (EU AI Act)" in md
    assert "Compliance Score" in md
    assert "Article 10" in md
    assert "Article 15" in md

