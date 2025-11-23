"""
Tests for health check endpoints
"""


def test_health_check(client):
    """Test the /health endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["service"] == "sales-order-manager-api"


def test_readiness_check(client):
    """Test the /readiness endpoint"""
    response = client.get("/readiness")
    assert response.status_code in [200, 503]  # May fail if DB not available
    assert "status" in response.json()
    assert "database" in response.json()


def test_root_endpoint(client):
    """Test the root / endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["message"] == "API is running"
