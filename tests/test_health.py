"""
AISecGuard — Health Check Tests
Week 3: Updated to use conftest fixtures.
"""

from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    """GET /health returns status ok with required fields."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["project"] == "AISecGuard"
    assert "version" in data
    assert "timestamp" in data


def test_docs_accessible(client: TestClient):
    """GET /docs returns 200 (Swagger UI available)."""
    response = client.get("/docs")
    assert response.status_code == 200


def test_openapi_accessible(client: TestClient):
    """GET /openapi.json returns a valid OpenAPI schema."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "openapi" in schema
    assert "paths" in schema
