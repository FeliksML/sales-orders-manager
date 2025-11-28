"""
Tests for order endpoints and business logic
"""
import pytest
from datetime import date, timedelta
from app.models import User, Order
from app.auth import create_access_token
import bcrypt


@pytest.fixture
def authenticated_user(db):
    """Create a verified user and return user + token"""
    password = "testpassword123"
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    user = User(
        email="test@example.com",
        password=hashed_password,
        salesid=12345,
        name="Test User",
        email_verified=True,
        is_admin=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_access_token(data={"sub": str(user.userid)})
    return user, token


@pytest.fixture
def sample_order_data():
    """Sample order data for testing"""
    return {
        "spectrum_reference": "REF123456",
        "customer_account_number": "ACC987654321",
        "customer_security_code": "1234",
        "job_number": "JOB001",
        "business_name": "Test Business",
        "customer_name": "John Doe",
        "customer_email": "john@example.com",
        "customer_address": "123 Test St, City, ST 12345",
        "customer_phone": "555-123-4567",
        "install_date": str(date.today() + timedelta(days=7)),
        "install_time": "9:00 AM - 11:00 AM",
        "has_internet": True,
        "has_voice": 2,
        "has_tv": True,
        "has_sbc": 0,
        "has_mobile": 1,
        "mobile_activated": 0,
        "has_wib": False,
        "has_gig": False,
        "notes": "Test order"
    }


class TestOrderCRUD:
    """Test order CRUD operations"""
    
    def test_create_order_success(self, client, authenticated_user, sample_order_data):
        """Test successful order creation"""
        user, token = authenticated_user
        
        response = client.post(
            "/api/orders/",
            json=sample_order_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["spectrum_reference"] == sample_order_data["spectrum_reference"]
        assert data["customer_name"] == sample_order_data["customer_name"]
        assert data["userid"] == user.userid
        assert "orderid" in data
    
    def test_create_order_unauthorized(self, client, sample_order_data):
        """Test order creation without authentication fails"""
        response = client.post("/api/orders/", json=sample_order_data)
        # 401 Unauthorized is correct for missing credentials (not 403 Forbidden)
        assert response.status_code == 401
    
    def test_get_orders_empty(self, client, authenticated_user):
        """Test getting orders when none exist"""
        _, token = authenticated_user
        
        response = client.get(
            "/api/orders/",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["meta"]["total"] == 0
        assert len(data["data"]) == 0
    
    def test_get_orders_with_data(self, client, authenticated_user, sample_order_data):
        """Test getting orders after creating one"""
        user, token = authenticated_user
        
        # Create an order first
        client.post(
            "/api/orders/",
            json=sample_order_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Get orders
        response = client.get(
            "/api/orders/",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["meta"]["total"] == 1
        assert len(data["data"]) == 1
    
    def test_get_order_by_id(self, client, authenticated_user, sample_order_data):
        """Test getting a specific order by ID"""
        _, token = authenticated_user
        
        # Create order
        create_response = client.post(
            "/api/orders/",
            json=sample_order_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        order_id = create_response.json()["orderid"]
        
        # Get specific order
        response = client.get(
            f"/api/orders/{order_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["orderid"] == order_id
    
    def test_get_order_not_found(self, client, authenticated_user):
        """Test getting non-existent order returns 404"""
        _, token = authenticated_user
        
        response = client.get(
            "/api/orders/99999",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404
    
    def test_update_order(self, client, authenticated_user, sample_order_data):
        """Test updating an existing order"""
        _, token = authenticated_user
        
        # Create order
        create_response = client.post(
            "/api/orders/",
            json=sample_order_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        order_id = create_response.json()["orderid"]
        
        # Update order
        update_data = {"customer_name": "Jane Doe", "has_internet": False}
        response = client.put(
            f"/api/orders/{order_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["customer_name"] == "Jane Doe"
        assert response.json()["has_internet"] is False
    
    def test_delete_order(self, client, authenticated_user, sample_order_data):
        """Test deleting an order"""
        _, token = authenticated_user
        
        # Create order
        create_response = client.post(
            "/api/orders/",
            json=sample_order_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        order_id = create_response.json()["orderid"]
        
        # Delete order
        response = client.delete(
            f"/api/orders/{order_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify it's gone
        get_response = client.get(
            f"/api/orders/{order_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_response.status_code == 404


class TestOrderFiltering:
    """Test order filtering functionality"""
    
    def test_filter_by_search(self, client, authenticated_user, sample_order_data):
        """Test searching orders by customer name"""
        _, token = authenticated_user
        
        # Create order
        client.post(
            "/api/orders/",
            json=sample_order_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Search by customer name
        response = client.get(
            "/api/orders/?search=John",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["meta"]["total"] == 1
        
        # Search for non-existent
        response = client.get(
            "/api/orders/?search=NotExist",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.json()["meta"]["total"] == 0
    
    def test_filter_by_product_type(self, client, authenticated_user, sample_order_data):
        """Test filtering orders by product type"""
        _, token = authenticated_user
        
        # Create order with internet
        client.post(
            "/api/orders/",
            json=sample_order_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Filter by internet
        response = client.get(
            "/api/orders/?product_types=internet",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["meta"]["total"] == 1
        
        # Filter by wib (order doesn't have wib)
        response = client.get(
            "/api/orders/?product_types=wib",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.json()["meta"]["total"] == 0


class TestOrderStats:
    """Test order statistics endpoint"""
    
    def test_get_stats_empty(self, client, authenticated_user):
        """Test getting stats with no orders"""
        _, token = authenticated_user
        
        response = client.get(
            "/api/orders/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_orders"] == 0
        assert data["total_internet"] == 0
    
    def test_get_stats_with_orders(self, client, authenticated_user, sample_order_data):
        """Test getting stats with orders"""
        _, token = authenticated_user
        
        # Create order
        client.post(
            "/api/orders/",
            json=sample_order_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        response = client.get(
            "/api/orders/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_orders"] == 1
        assert data["total_internet"] == 1
        assert data["total_tv"] == 1


class TestOrderIsolation:
    """Test that users can only see their own orders"""
    
    def test_user_cannot_see_other_users_orders(self, client, db, sample_order_data):
        """Test that user A cannot see user B's orders"""
        # Create User A
        password_a = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt())
        user_a = User(
            email="usera@example.com",
            password=password_a,
            salesid=11111,
            name="User A",
            email_verified=True
        )
        db.add(user_a)
        db.commit()
        db.refresh(user_a)
        token_a = create_access_token(data={"sub": str(user_a.userid)})
        
        # Create User B
        password_b = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt())
        user_b = User(
            email="userb@example.com",
            password=password_b,
            salesid=22222,
            name="User B",
            email_verified=True
        )
        db.add(user_b)
        db.commit()
        db.refresh(user_b)
        token_b = create_access_token(data={"sub": str(user_b.userid)})
        
        # User A creates an order
        client.post(
            "/api/orders/",
            json=sample_order_data,
            headers={"Authorization": f"Bearer {token_a}"}
        )
        
        # User B should not see User A's order
        response = client.get(
            "/api/orders/",
            headers={"Authorization": f"Bearer {token_b}"}
        )
        
        assert response.status_code == 200
        assert response.json()["meta"]["total"] == 0
    
    def test_user_cannot_update_other_users_order(self, client, db, sample_order_data):
        """Test that user A cannot update user B's order"""
        # Create User A
        password_a = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt())
        user_a = User(
            email="usera@example.com",
            password=password_a,
            salesid=11111,
            name="User A",
            email_verified=True
        )
        db.add(user_a)
        db.commit()
        db.refresh(user_a)
        token_a = create_access_token(data={"sub": str(user_a.userid)})
        
        # Create User B
        password_b = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt())
        user_b = User(
            email="userb@example.com",
            password=password_b,
            salesid=22222,
            name="User B",
            email_verified=True
        )
        db.add(user_b)
        db.commit()
        db.refresh(user_b)
        token_b = create_access_token(data={"sub": str(user_b.userid)})
        
        # User A creates an order
        create_response = client.post(
            "/api/orders/",
            json=sample_order_data,
            headers={"Authorization": f"Bearer {token_a}"}
        )
        order_id = create_response.json()["orderid"]
        
        # User B tries to update User A's order - should get 404
        response = client.put(
            f"/api/orders/{order_id}",
            json={"customer_name": "Hacker"},
            headers={"Authorization": f"Bearer {token_b}"}
        )
        
        assert response.status_code == 404

