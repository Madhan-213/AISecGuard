"""
AISecGuard — API Rate Limiting Tests (Task 4b)

Verifies:
- slowapi rate limiting protects sensitive endpoints (login, register, upload)
- Excessive requests trigger HTTP 429 Too Many Requests
- Limiter can be toggled via limiter.enabled
"""

import pytest
from app.core.limiter import limiter


def test_rate_limiting_on_login(client):
    """
    Rapid requests to /api/v1/auth/login exceeding the 10/minute rate limit
    must return HTTP 429 Too Many Requests when rate limiting is enabled.
    """
    # Temporarily enable rate limiter for this test
    limiter.enabled = True
    try:
        if hasattr(limiter, "reset"):
            limiter.reset()

        # Send 12 rapid login attempts (limit is 10/minute)
        status_codes = []
        for i in range(12):
            resp = client.post(
                "/api/v1/auth/login",
                json={"email": f"brute_force_{i}@example.com", "password": "wrongpassword"},
            )
            status_codes.append(resp.status_code)

        # First 10 should be 401 Unauthorized (invalid credentials)
        # 11th and 12th should be 429 Too Many Requests
        assert 429 in status_codes, f"Expected 429 in status codes, got: {status_codes}"
        assert status_codes[-1] == 429
    finally:
        limiter.enabled = False


def test_rate_limiting_disabled_in_test_mode(client):
    """When limiter.enabled = False, requests are never throttled with 429."""
    limiter.enabled = False

    # Send 15 requests in a row
    for i in range(15):
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": f"unlimited_{i}@example.com", "password": "wrongpassword"},
        )
        assert resp.status_code != 429
