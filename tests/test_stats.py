"""
AISecGuard — Week 6 Stats Endpoint Tests
Verifies /api/v1/stats aggregate dashboard metrics.
"""

from fastapi.testclient import TestClient


def test_stats_empty_database(client: TestClient):
    """GET /api/v1/stats returns aggregate metrics with expected keys and zero counts."""
    response = client.get("/api/v1/stats/")
    assert response.status_code == 200
    data = response.json()

    assert "total_scans" in data
    assert "total_findings" in data
    assert "critical_findings" in data
    assert "quarantined_artifacts" in data
    assert "avg_risk_score" in data
    assert "risk_distribution" in data
    assert "severity_distribution" in data
    assert "recent_scans" in data

    assert isinstance(data["recent_scans"], list)
    assert isinstance(data["severity_distribution"], dict)
    assert "CRITICAL" in data["severity_distribution"]
    assert "HIGH" in data["severity_distribution"]
