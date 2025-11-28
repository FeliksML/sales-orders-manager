"""Tests for the followups module."""
import pytest
from datetime import date, datetime, timedelta
from fastapi.testclient import TestClient


class TestFollowUpCRUD:
    """Test follow-up CRUD operations."""
    
    def test_create_followup(self, client: TestClient, auth_headers: dict, test_order_id: int):
        """Test creating a new follow-up."""
        followup_data = {
            "order_id": test_order_id,
            "due_date": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "note": "Check on installation quality"
        }
        response = client.post("/api/followups", json=followup_data, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["order_id"] == test_order_id
        assert data["note"] == "Check on installation quality"
        assert data["status"] == "pending"
        return data["id"]
    
    def test_list_followups(self, client: TestClient, auth_headers: dict):
        """Test listing follow-ups."""
        response = client.get("/api/followups", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "meta" in data
    
    def test_list_followups_with_status_filter(self, client: TestClient, auth_headers: dict):
        """Test listing follow-ups with status filter."""
        response = client.get("/api/followups?status_filter=pending", headers=auth_headers)
        assert response.status_code == 200
    
    def test_get_todays_followups(self, client: TestClient, auth_headers: dict):
        """Test getting today's follow-ups."""
        response = client.get("/api/followups/today", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "overdue_count" in data
        assert "followups" in data


class TestFollowUpActions:
    """Test follow-up actions."""
    
    def test_complete_followup(self, client: TestClient, auth_headers: dict, test_followup_id: int):
        """Test completing a follow-up."""
        response = client.post(f"/api/followups/{test_followup_id}/complete", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["completed_at"] is not None
    
    def test_snooze_followup(self, client: TestClient, auth_headers: dict, test_followup_id: int):
        """Test snoozing a follow-up."""
        snooze_data = {"days": 3}
        response = client.post(
            f"/api/followups/{test_followup_id}/snooze",
            json=snooze_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        # Snooze resets status to pending and updates due_date
        assert data["status"] == "pending"
        assert data["snoozed_until"] is not None
    
    def test_update_followup(self, client: TestClient, auth_headers: dict, test_followup_id: int):
        """Test updating a follow-up."""
        update_data = {
            "note": "Updated note for follow-up"
        }
        response = client.put(
            f"/api/followups/{test_followup_id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["note"] == "Updated note for follow-up"
    
    def test_delete_followup(self, client: TestClient, auth_headers: dict, test_followup_id: int):
        """Test deleting a follow-up."""
        response = client.delete(f"/api/followups/{test_followup_id}", headers=auth_headers)
        assert response.status_code == 204


class TestFollowUpForOrder:
    """Test follow-ups related to specific orders."""
    
    def test_get_followups_for_order(self, client: TestClient, auth_headers: dict, test_order_id: int):
        """Test getting all follow-ups for a specific order."""
        response = client.get(f"/api/followups/order/{test_order_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestFollowUpValidation:
    """Test follow-up input validation."""
    
    def test_create_followup_invalid_order(self, client: TestClient, auth_headers: dict):
        """Test creating follow-up for non-existent order."""
        followup_data = {
            "order_id": 999999,  # Non-existent order
            "due_date": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "note": "Test"
        }
        response = client.post("/api/followups", json=followup_data, headers=auth_headers)
        assert response.status_code in [400, 404]
    
    def test_followups_require_auth(self, client: TestClient):
        """Test that follow-up endpoints require authentication."""
        response = client.get("/api/followups")
        assert response.status_code in [401, 403]


# Fixture definitions that would be in conftest.py
@pytest.fixture
def test_order_id(client: TestClient, auth_headers: dict, db) -> int:
    """Create a test order and return its ID."""
    order_data = {
        "spectrum_reference": "SPEC-FOLLOWUP-TEST",
        "customer_account_number": "ACC123456",
        "business_name": "Followup Test Business",
        "customer_name": "Test Customer",
        "customer_email": "followup@test.com",
        "customer_phone": "555-123-4567",
        "install_date": str(date.today()),
        "install_time": "9:00 AM - 11:00 AM",
        "has_internet": True,
        "has_tv": False,
        "has_mobile": 0,
        "has_voice": 0
    }
    response = client.post("/api/orders/", json=order_data, headers=auth_headers)
    assert response.status_code == 201
    return response.json()["orderid"]


@pytest.fixture
def test_followup_id(client: TestClient, auth_headers: dict, test_order_id: int) -> int:
    """Create a test follow-up and return its ID."""
    followup_data = {
        "order_id": test_order_id,
        "due_date": (datetime.utcnow() + timedelta(days=7)).isoformat(),
        "note": "Test follow-up"
    }
    response = client.post("/api/followups", json=followup_data, headers=auth_headers)
    assert response.status_code == 201
    return response.json()["id"]
