"""
AISecGuard — Week 5 Authentication Tests
Tests:
  1. Successful user registration (201)
  2. Duplicate email registration rejected (409)
  3. Login with valid credentials returns JWT pair (200)
  4. Login with incorrect password rejected (401)
  5. Login with non-existent email rejected (401)
  6. Refresh token exchange succeeds with new tokens (200)
  7. Refresh with forged/invalid token rejected (401)
  8. Protected /auth/me endpoint verifies Bearer token (200 and 401)
"""

import pytest
from fastapi.testclient import TestClient


def test_register_success(client: TestClient):
    """Test user registration returns HTTP 201 with user details."""
    payload = {
        "email": "analyst@example.com",
        "password": "Password123!",
        "full_name": "Security Analyst",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["message"] == "Account created successfully"
    assert data["user"]["email"] == "analyst@example.com"
    assert data["user"]["full_name"] == "Security Analyst"
    assert "hashed_password" not in data["user"]
    assert "id" in data["user"]


def test_register_duplicate_email(client: TestClient):
    """Test duplicate registration with the same email returns HTTP 409."""
    payload = {
        "email": "duplicate@example.com",
        "password": "Password123!",
        "full_name": "Original User",
    }
    resp1 = client.post("/api/v1/auth/register", json=payload)
    assert resp1.status_code == 201

    resp2 = client.post("/api/v1/auth/register", json=payload)
    assert resp2.status_code == 409
    assert "already registered" in resp2.json()["detail"].lower()


def test_login_success(client: TestClient):
    """Test login with valid credentials returns access and refresh tokens."""
    # Register first
    client.post(
        "/api/v1/auth/register",
        json={"email": "login_user@example.com", "password": "SecurePassword999!"},
    )

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "login_user@example.com", "password": "SecurePassword999!"},
    )
    assert login_resp.status_code == 200, login_resp.text
    tokens = login_resp.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["token_type"] == "bearer"


def test_login_invalid_password(client: TestClient):
    """Test login with wrong password returns HTTP 401."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "wrongpwd@example.com", "password": "CorrectPassword123!"},
    )

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "wrongpwd@example.com", "password": "WrongPassword123!"},
    )
    assert login_resp.status_code == 401
    assert "Invalid email or password" in login_resp.json()["detail"]


def test_login_nonexistent_email(client: TestClient):
    """Test login with non-existent email returns HTTP 401."""
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "AnyPassword123!"},
    )
    assert login_resp.status_code == 401
    assert "Invalid email or password" in login_resp.json()["detail"]


def test_token_refresh_success(client: TestClient):
    """Test exchanging a valid refresh token yields new tokens."""
    # Register & Login
    client.post(
        "/api/v1/auth/register",
        json={"email": "refresh_user@example.com", "password": "Password123!"},
    )
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "refresh_user@example.com", "password": "Password123!"},
    )
    refresh_token = login_resp.json()["refresh_token"]

    refresh_resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_resp.status_code == 200, refresh_resp.text
    new_tokens = refresh_resp.json()
    assert "access_token" in new_tokens
    assert "refresh_token" in new_tokens


def test_token_refresh_invalid(client: TestClient):
    """Test invalid or forged refresh token returns HTTP 401."""
    refresh_resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "invalid.jwt.token.string"},
    )
    assert refresh_resp.status_code == 401
    assert "Invalid or expired" in refresh_resp.json()["detail"]


def test_get_me_authenticated(client: TestClient):
    """Test /auth/me returns user profile with valid Bearer token, 401 without."""
    # Unauthenticated request
    unauth_resp = client.get("/api/v1/auth/me")
    assert unauth_resp.status_code == 401

    # Register & login
    client.post(
        "/api/v1/auth/register",
        json={"email": "me_user@example.com", "password": "Password123!", "full_name": "Me User"},
    )
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "me_user@example.com", "password": "Password123!"},
    )
    token = login_resp.json()["access_token"]

    # Authenticated request
    auth_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert auth_resp.status_code == 200, auth_resp.text
    data = auth_resp.json()
    assert data["email"] == "me_user@example.com"
    assert data["full_name"] == "Me User"
