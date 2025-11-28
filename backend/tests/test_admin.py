"""Tests for the admin module."""
import pytest
from fastapi.testclient import TestClient


class TestAdminUsers:
    """Test admin user management endpoints."""
    
    def test_get_all_users_admin_only(self, client: TestClient, auth_headers: dict):
        """Test that non-admin users cannot access admin endpoints."""
        response = client.get("/api/admin/users", headers=auth_headers)
        # Should be 403 (forbidden) for non-admin users
        assert response.status_code in [403, 401]
    
    def test_get_all_users_as_admin(self, client: TestClient, admin_auth_headers: dict):
        """Test getting all users as admin."""
        response = client.get("/api/admin/users", headers=admin_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "meta" in data
    
    def test_get_all_users_with_search(self, client: TestClient, admin_auth_headers: dict):
        """Test searching users."""
        response = client.get("/api/admin/users?search=test", headers=admin_auth_headers)
        assert response.status_code == 200
    
    def test_get_all_users_pagination(self, client: TestClient, admin_auth_headers: dict):
        """Test user pagination."""
        response = client.get("/api/admin/users?skip=0&limit=10", headers=admin_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["meta"]["limit"] == 10


class TestAdminAnalytics:
    """Test admin analytics endpoints."""
    
    def test_get_system_analytics_admin_only(self, client: TestClient, auth_headers: dict):
        """Test that analytics requires admin privileges."""
        response = client.get("/api/admin/analytics", headers=auth_headers)
        assert response.status_code in [403, 401]
    
    def test_get_system_analytics(self, client: TestClient, admin_auth_headers: dict):
        """Test getting system analytics as admin."""
        response = client.get("/api/admin/analytics", headers=admin_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_orders" in data


class TestAdminErrorLogs:
    """Test admin error log endpoints."""
    
    def test_get_error_logs_admin_only(self, client: TestClient, auth_headers: dict):
        """Test that error logs require admin privileges."""
        response = client.get("/api/admin/error-logs", headers=auth_headers)
        assert response.status_code in [403, 401]
    
    def test_get_error_logs(self, client: TestClient, admin_auth_headers: dict):
        """Test getting error logs as admin."""
        response = client.get("/api/admin/error-logs", headers=admin_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "meta" in data
    
    def test_create_error_log(self, client: TestClient, auth_headers: dict):
        """Test creating an error log (any authenticated user)."""
        error_data = {
            "error_type": "frontend_error",
            "error_message": "Test error message",
            "stack_trace": "Error at line 1"
        }
        response = client.post("/api/admin/error-logs", json=error_data, headers=auth_headers)
        assert response.status_code == 200


class TestAdminUserManagement:
    """Test admin user management actions."""
    
    def test_manually_verify_user(self, client: TestClient, admin_auth_headers: dict, test_user_id: int):
        """Test manually verifying a user."""
        response = client.post(
            f"/api/admin/users/{test_user_id}/verify",
            headers=admin_auth_headers
        )
        assert response.status_code == 200
    
    def test_toggle_admin_status(self, client: TestClient, admin_auth_headers: dict, test_user_id: int):
        """Test toggling admin status."""
        response = client.patch(
            f"/api/admin/users/{test_user_id}/admin",
            headers=admin_auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "is_admin" in data
    
    def test_cannot_modify_own_admin_status(self, client: TestClient, admin_auth_headers: dict, admin_user_id: int):
        """Test that admins cannot modify their own admin status."""
        response = client.patch(
            f"/api/admin/users/{admin_user_id}/admin",
            headers=admin_auth_headers
        )
        assert response.status_code == 400


class TestAdminAuditTrail:
    """Test admin audit trail endpoints."""
    
    def test_get_system_audit_trail(self, client: TestClient, admin_auth_headers: dict):
        """Test getting system-wide audit trail."""
        response = client.get("/api/admin/audit/system", headers=admin_auth_headers)
        assert response.status_code == 200
    
    def test_get_system_audit_trail_with_filters(self, client: TestClient, admin_auth_headers: dict):
        """Test filtering audit trail."""
        response = client.get(
            "/api/admin/audit/system?action=create&entity_type=order",
            headers=admin_auth_headers
        )
        assert response.status_code == 200


class TestAdminUserOrders:
    """Test viewing orders for specific users."""
    
    def test_get_user_orders(self, client: TestClient, admin_auth_headers: dict, test_user_id: int):
        """Test getting orders for a specific user."""
        response = client.get(
            f"/api/admin/users/{test_user_id}/orders",
            headers=admin_auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data


# Note: Fixtures admin_auth_headers, auth_headers, test_user_id, and admin_user_id
# are defined in conftest.py
