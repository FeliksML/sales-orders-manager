"""
Tests for authentication endpoints
"""
import pytest


def test_signup_endpoint_exists(client):
    """Test that signup endpoint exists and requires data"""
    response = client.post("/auth/signup", json={})
    # Should return 422 (validation error) not 404
    assert response.status_code == 422


def test_login_endpoint_exists(client):
    """Test that login endpoint exists"""
    response = client.post("/auth/login", json={})
    assert response.status_code == 422


def test_check_salesid_endpoint(client):
    """Test the check-salesid endpoint"""
    response = client.get("/auth/check-salesid/12345")
    assert response.status_code == 200
    assert "exists" in response.json()


def test_check_email_endpoint(client):
    """Test the check-email endpoint"""
    response = client.get("/auth/check-email/test@example.com")
    assert response.status_code == 200
    assert "exists" in response.json()


# TODO: Add more comprehensive auth tests:
# - Test successful signup
# - Test duplicate email/salesid
# - Test login flow
# - Test email verification
# - Test password reset flow
# - Test JWT token validation
