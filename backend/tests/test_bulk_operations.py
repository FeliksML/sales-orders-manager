"""Tests for bulk operations."""
import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
import uuid


class TestBulkMarkInstalled:
    """Test bulk mark as installed operations."""
    
    def test_bulk_mark_installed(self, client: TestClient, auth_headers: dict, test_order_ids: list):
        """Test marking multiple orders as installed."""
        request_data = {
            "order_ids": test_order_ids
        }
        response = client.post(
            "/api/orders/bulk/mark-installed",
            json=request_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["updated_count"] == len(test_order_ids)
    
    def test_bulk_mark_installed_with_idempotency_key(
        self, client: TestClient, auth_headers: dict, test_order_ids: list
    ):
        """Test idempotency key prevents duplicate operations."""
        idempotency_key = str(uuid.uuid4())
        request_data = {
            "order_ids": test_order_ids,
            "idempotency_key": idempotency_key
        }
        
        # First request
        response1 = client.post(
            "/api/orders/bulk/mark-installed",
            json=request_data,
            headers=auth_headers
        )
        assert response1.status_code == 200
        
        # Second request with same key - should return cached response
        response2 = client.post(
            "/api/orders/bulk/mark-installed",
            json=request_data,
            headers=auth_headers
        )
        assert response2.status_code == 200
        # Response should be identical (from cache)
        assert response1.json() == response2.json()
    
    def test_bulk_mark_installed_empty_list(self, client: TestClient, auth_headers: dict):
        """Test bulk mark with empty order list."""
        request_data = {"order_ids": []}
        response = client.post(
            "/api/orders/bulk/mark-installed",
            json=request_data,
            headers=auth_headers
        )
        assert response.status_code == 400


class TestBulkReschedule:
    """Test bulk reschedule operations."""
    
    def test_bulk_reschedule(self, client: TestClient, auth_headers: dict, test_order_ids: list):
        """Test rescheduling multiple orders."""
        new_date = (date.today() + timedelta(days=7)).isoformat()
        request_data = {
            "order_ids": test_order_ids,
            "new_date": new_date
        }
        response = client.post(
            "/api/orders/bulk/reschedule",
            json=request_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["updated_count"] == len(test_order_ids)
        assert data["new_date"] == new_date
    
    def test_bulk_reschedule_with_idempotency_key(
        self, client: TestClient, auth_headers: dict, test_order_ids: list
    ):
        """Test idempotency key for reschedule."""
        idempotency_key = str(uuid.uuid4())
        new_date = (date.today() + timedelta(days=14)).isoformat()
        request_data = {
            "order_ids": test_order_ids,
            "new_date": new_date,
            "idempotency_key": idempotency_key
        }
        
        response1 = client.post(
            "/api/orders/bulk/reschedule",
            json=request_data,
            headers=auth_headers
        )
        assert response1.status_code == 200
        
        response2 = client.post(
            "/api/orders/bulk/reschedule",
            json=request_data,
            headers=auth_headers
        )
        assert response2.status_code == 200
        assert response1.json() == response2.json()


class TestBulkDelete:
    """Test bulk delete operations."""
    
    def test_bulk_delete(self, client: TestClient, auth_headers: dict, disposable_order_ids: list):
        """Test deleting multiple orders."""
        request_data = {
            "order_ids": disposable_order_ids
        }
        response = client.delete(
            "/api/orders/bulk/delete",
            json=request_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["deleted_count"] == len(disposable_order_ids)
    
    def test_bulk_delete_with_idempotency_key(
        self, client: TestClient, auth_headers: dict, disposable_order_ids: list
    ):
        """Test idempotency key for delete."""
        idempotency_key = str(uuid.uuid4())
        request_data = {
            "order_ids": disposable_order_ids,
            "idempotency_key": idempotency_key
        }
        
        response1 = client.delete(
            "/api/orders/bulk/delete",
            json=request_data,
            headers=auth_headers
        )
        assert response1.status_code == 200
        
        # Second request should return cached response even though orders are deleted
        response2 = client.delete(
            "/api/orders/bulk/delete",
            json=request_data,
            headers=auth_headers
        )
        assert response2.status_code == 200
    
    def test_bulk_delete_nonexistent_orders(self, client: TestClient, auth_headers: dict):
        """Test bulk delete with non-existent order IDs."""
        request_data = {
            "order_ids": [999999, 999998]
        }
        response = client.delete(
            "/api/orders/bulk/delete",
            json=request_data,
            headers=auth_headers
        )
        assert response.status_code == 404


class TestBulkExport:
    """Test bulk export operations."""
    
    def test_bulk_export_excel(self, client: TestClient, auth_headers: dict, test_order_ids: list):
        """Test exporting multiple orders as Excel."""
        order_ids_str = ",".join(map(str, test_order_ids))
        response = client.get(
            f"/api/orders/bulk/export?order_ids={order_ids_str}&file_format=excel",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert "spreadsheet" in response.headers.get("content-type", "")
    
    def test_bulk_export_csv(self, client: TestClient, auth_headers: dict, test_order_ids: list):
        """Test exporting multiple orders as CSV."""
        order_ids_str = ",".join(map(str, test_order_ids))
        response = client.get(
            f"/api/orders/bulk/export?order_ids={order_ids_str}&file_format=csv",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert "csv" in response.headers.get("content-type", "")


# Fixtures
@pytest.fixture
def test_order_ids(client: TestClient, auth_headers: dict) -> list:
    """Create multiple test orders and return their IDs."""
    order_ids = []
    for i in range(3):
        order_data = {
            "customer_name": f"Bulk Test Customer {i}",
            "customer_phone": f"555-000-000{i}",
            "customer_account_number": f"BULK{i:05d}",
            "install_date": str(date.today() + timedelta(days=i)),
            "has_internet": True,
            "has_tv": False,
            "has_mobile": 0,
            "has_voice": 0
        }
        response = client.post("/api/orders/", json=order_data, headers=auth_headers)
        if response.status_code == 201:
            order_ids.append(response.json()["orderid"])
    return order_ids


@pytest.fixture
def disposable_order_ids(client: TestClient, auth_headers: dict) -> list:
    """Create orders specifically for deletion tests."""
    order_ids = []
    for i in range(2):
        order_data = {
            "customer_name": f"Delete Test {i}",
            "customer_phone": f"555-999-000{i}",
            "customer_account_number": f"DEL{i:05d}",
            "install_date": str(date.today()),
            "has_internet": True,
            "has_tv": False,
            "has_mobile": 0,
            "has_voice": 0
        }
        response = client.post("/api/orders/", json=order_data, headers=auth_headers)
        if response.status_code == 201:
            order_ids.append(response.json()["orderid"])
    return order_ids
