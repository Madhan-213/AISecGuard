"""
AISecGuard — Basic Health Check Test
Week 2: Verifies that the FastAPI backend starts and responds correctly.
"""

from fastapi.testclient import TestClient
import sys
import os

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app

client = TestClient(app)


def test_health_check():
    """Test that GET /health returns status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["project"] == "AISecGuard"
    assert "version" in data
    assert "timestamp" in data
    print("\n✅ Health check test passed.")
    print(f"   Response: {data}")


if __name__ == "__main__":
    test_health_check()
    print("\n✅ All Week 2 backend tests passed.")
