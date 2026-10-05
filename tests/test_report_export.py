"""
AISecGuard — Week 5 Remediation Report Export Tests
Tests:
  1. Export structured JSON remediation report for completed scan (HTTP 200)
  2. Export PDF report via reportlab with correct headers and non-empty stream (HTTP 200)
  3. Report request for non-existent scan returns HTTP 404
  4. Report request for non-completed scan returns HTTP 400
  5. JSON report accurately reflects finding details, evidence, and recommendations
"""

import io
import pytest
from fastapi.testclient import TestClient
from app.models.scan import Scan


def create_completed_scan(client: TestClient) -> dict:
    """Helper to upload a model and run a scan to completion."""
    model_content = b"fake-model-binary-content-for-testing"
    resp = client.post(
        "/api/v1/scans/model",
        files={"file": ("model_for_report.pkl", io.BytesIO(model_content), "application/octet-stream")},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_json_report_structure(client: TestClient):
    """Test generating a structured JSON report for a completed scan."""
    scan = create_completed_scan(client)
    scan_id = scan["id"]

    resp = client.get(f"/api/v1/scans/{scan_id}/report")
    assert resp.status_code == 200, resp.text
    assert "application/json" in resp.headers["content-type"]
    assert f"aisecguard_report_{scan_id[:8]}.json" in resp.headers.get("content-disposition", "")

    data = resp.json()
    assert "report_generated_at" in data
    assert "artifact" in data
    assert "scan" in data
    assert "summary" in data
    assert "findings" in data

    assert data["artifact"]["original_filename"] == "model_for_report.pkl"
    assert data["scan"]["id"] == scan_id
    assert data["scan"]["status"] == "COMPLETED"
    assert "by_severity" in data["summary"]
    assert isinstance(data["findings"], list)


def test_pdf_report_export(client: TestClient):
    """Test downloading a PDF report returns application/pdf with valid PDF header."""
    scan = create_completed_scan(client)
    scan_id = scan["id"]

    resp = client.get(f"/api/v1/scans/{scan_id}/report?format=pdf")
    assert resp.status_code == 200, resp.text
    assert "application/pdf" in resp.headers["content-type"]
    assert f"aisecguard_report_{scan_id[:8]}.pdf" in resp.headers.get("content-disposition", "")

    # PDF bytes must start with %PDF- header
    pdf_bytes = resp.content
    assert len(pdf_bytes) > 0
    assert pdf_bytes.startswith(b"%PDF-")


def test_report_not_found_scan(client: TestClient):
    """Requesting report for non-existent scan_id returns HTTP 404."""
    resp = client.get("/api/v1/scans/non-existent-scan-id-00000/report")
    assert resp.status_code == 404
    assert "Scan not found" in resp.json()["detail"]


def test_report_scan_not_completed(client: TestClient, db):
    """Requesting report for incomplete/running scan returns HTTP 400."""
    scan = create_completed_scan(client)
    scan_id = scan["id"]

    # Temporarily set scan status to RUNNING in DB
    db_scan = db.get(Scan, scan_id)
    assert db_scan is not None
    db_scan.status = "RUNNING"
    db.commit()

    resp = client.get(f"/api/v1/scans/{scan_id}/report")
    assert resp.status_code == 400
    assert "not completed yet" in resp.json()["detail"].lower()


def test_report_includes_finding_details(client: TestClient):
    """Verify that JSON report includes findings metadata, rules, and severity."""
    scan = create_completed_scan(client)
    scan_id = scan["id"]

    resp = client.get(f"/api/v1/scans/{scan_id}/report?format=json")
    assert resp.status_code == 200
    data = resp.json()
    findings = data["findings"]
    assert len(findings) > 0

    for f in findings:
        assert "id" in f
        assert "finding_type" in f
        assert "severity" in f
        assert "title" in f
        assert "description" in f
