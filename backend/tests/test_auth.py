"""
Comprehensive tests for authentication endpoints
"""
import pytest
from datetime import datetime, timedelta
from app.models import User
from app.auth import create_access_token, MIN_PASSWORD_LENGTH
import bcrypt
import secrets


@pytest.fixture
def sample_user_data():
    """Sample user data for testing"""
    return {
        "email": "newuser@example.com",
        "password": "securepassword123",
        "name": "New User",
        "salesid": 12345,
        "recaptcha_token": "test-token"
    }


@pytest.fixture
def existing_user(db):
    """Create an existing verified user in the database"""
    password = "existingpassword123"
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    user = User(
        email="existing@example.com",
        password=hashed_password,
        salesid=54321,
        name="Existing User",
        email_verified=True,
        is_admin=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, password


@pytest.fixture
def unverified_user(db):
    """Create an unverified user in the database"""
    password = "unverifiedpass123"
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    user = User(
        email="unverified@example.com",
        password=hashed_password,
        salesid=11111,
        name="Unverified User",
        email_verified=False,
        verification_token=secrets.token_urlsafe(32),
        verification_token_expiry=datetime.utcnow() + timedelta(hours=24)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, password


class TestHealthEndpoints:
    """Test health check endpoints"""
    
    def test_health_check(self, client):
        """Test basic health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_root_endpoint(self, client):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        assert "message" in response.json()


class TestSignup:
    """Test user signup functionality"""
    
    def test_signup_endpoint_exists(self, client):
        """Verify signup endpoint exists"""
        response = client.post("/auth/signup", json={})
        # Should get 422 for missing fields, not 404
        assert response.status_code == 422
    
    def test_signup_success(self, client, db, sample_user_data):
        """Test successful user signup"""
        response = client.post("/auth/signup", json=sample_user_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "successful signup"
        assert data["verification_required"] is True
        
        # Verify user was created in database
        user = db.query(User).filter(User.email == sample_user_data["email"]).first()
        assert user is not None
        assert user.name == sample_user_data["name"]
        assert user.email_verified is False
    
    def test_signup_duplicate_email(self, client, existing_user, sample_user_data):
        """Test signup with existing email fails"""
        user, _ = existing_user
        sample_user_data["email"] = user.email
        sample_user_data["salesid"] = 99999
        
        response = client.post("/auth/signup", json=sample_user_data)
        
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]
    
    def test_signup_duplicate_salesid(self, client, existing_user, sample_user_data):
        """Test signup with existing sales ID fails"""
        user, _ = existing_user
        sample_user_data["salesid"] = user.salesid
        
        response = client.post("/auth/signup", json=sample_user_data)
        
        assert response.status_code == 400
        assert "Sales ID" in response.json()["detail"]
    
    def test_signup_weak_password(self, client, sample_user_data):
        """Test signup with weak password fails"""
        sample_user_data["password"] = "short"  # Less than MIN_PASSWORD_LENGTH
        
        response = client.post("/auth/signup", json=sample_user_data)
        
        # Pydantic validation returns 422 for Field(min_length=8) constraint
        assert response.status_code == 422
    
    def test_signup_invalid_email_format(self, client, sample_user_data):
        """Test signup with invalid email format fails"""
        sample_user_data["email"] = "not-an-email"
        
        response = client.post("/auth/signup", json=sample_user_data)
        
        assert response.status_code == 422  # Pydantic validation error
    
    def test_signup_invalid_salesid(self, client, sample_user_data):
        """Test signup with invalid sales ID fails"""
        sample_user_data["salesid"] = 123  # Less than 5 digits
        
        response = client.post("/auth/signup", json=sample_user_data)
        
        assert response.status_code == 422  # Pydantic validation error


class TestLogin:
    """Test user login functionality"""
    
    def test_login_endpoint_exists(self, client):
        """Verify login endpoint exists"""
        response = client.post("/auth/login", json={})
        # Should get 422 for missing fields, not 404
        assert response.status_code == 422
    
    def test_login_success(self, client, existing_user):
        """Test successful login"""
        user, password = existing_user
        
        response = client.post("/auth/login", json={
            "email": user.email,
            "password": password,
            "recaptcha_token": "test-token"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Welcome!"
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == user.email
    
    def test_login_wrong_password(self, client, existing_user):
        """Test login with wrong password fails"""
        user, _ = existing_user
        
        response = client.post("/auth/login", json={
            "email": user.email,
            "password": "wrongpassword",
            "recaptcha_token": "test-token"
        })
        
        assert response.status_code == 401
        assert "detail" in response.json()
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent email fails"""
        response = client.post("/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "somepassword123",
            "recaptcha_token": "test-token"
        })
        
        assert response.status_code == 401
        assert "detail" in response.json()
    
    def test_login_unverified_user(self, client, unverified_user):
        """Test login with unverified email fails"""
        user, password = unverified_user
        
        response = client.post("/auth/login", json={
            "email": user.email,
            "password": password,
            "recaptcha_token": "test-token"
        })
        
        assert response.status_code == 403
        assert "verify" in response.json()["detail"].lower()


class TestEmailVerification:
    """Test email verification functionality"""
    
    def test_verify_valid_token(self, client, db, unverified_user):
        """Test email verification with valid token"""
        user, _ = unverified_user
        
        response = client.get(f"/auth/verify-email/{user.verification_token}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify user is now verified
        db.refresh(user)
        assert user.email_verified is True
        assert user.verification_token is None
    
    def test_verify_invalid_token(self, client):
        """Test email verification with invalid token fails"""
        response = client.get("/auth/verify-email/invalid-token-12345")
        
        assert response.status_code == 400
        assert "Invalid" in response.json()["detail"]
    
    def test_verify_expired_token(self, client, db):
        """Test email verification with expired token fails"""
        # Create user with expired token
        password = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt())
        user = User(
            email="expired@example.com",
            password=password,
            salesid=33333,
            name="Expired User",
            email_verified=False,
            verification_token=secrets.token_urlsafe(32),
            verification_token_expiry=datetime.utcnow() - timedelta(hours=1)  # Expired
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        response = client.get(f"/auth/verify-email/{user.verification_token}")
        
        assert response.status_code == 400
        assert "expired" in response.json()["detail"].lower()


class TestCheckEndpoints:
    """Test salesid and email check endpoints"""
    
    def test_check_salesid_endpoint(self, client):
        """Test sales ID check endpoint exists"""
        response = client.get("/auth/check-salesid/12345")
        assert response.status_code == 200
    
    def test_check_salesid_format_validation(self, client):
        """Test sales ID format validation"""
        # Invalid format (not 5 digits)
        response = client.get("/auth/check-salesid/123")
        assert response.status_code == 422
        
        # Non-numeric
        response = client.get("/auth/check-salesid/abcde")
        assert response.status_code == 422
    
    def test_check_salesid_exists(self, client, existing_user):
        """Test checking existing sales ID"""
        user, _ = existing_user
        response = client.get(f"/auth/check-salesid/{user.salesid}")
        
        assert response.status_code == 200
        assert response.json()["exists"] is True
    
    def test_check_salesid_not_exists(self, client):
        """Test checking non-existing sales ID"""
        response = client.get("/auth/check-salesid/99999")
        
        assert response.status_code == 200
        assert response.json()["exists"] is False
    
    def test_check_email_endpoint(self, client):
        """Test email check endpoint exists"""
        response = client.get("/auth/check-email/test@example.com")
        assert response.status_code == 200
    
    def test_check_email_exists(self, client, existing_user):
        """Test checking existing email"""
        user, _ = existing_user
        response = client.get(f"/auth/check-email/{user.email}")
        
        assert response.status_code == 200
        assert response.json()["exists"] is True
    
    def test_check_email_not_exists(self, client):
        """Test checking non-existing email"""
        response = client.get("/auth/check-email/nonexistent@example.com")
        
        assert response.status_code == 200
        assert response.json()["exists"] is False


class TestForgotPassword:
    """Test forgot password functionality"""
    
    def test_forgot_password_existing_user(self, client, existing_user):
        """Test forgot password for existing user"""
        user, _ = existing_user
        
        response = client.post("/auth/forgot-password", json={
            "email": user.email,
            "recaptcha_token": "test-token"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_forgot_password_nonexistent_user(self, client):
        """Test forgot password for non-existent user (should still return success for security)"""
        response = client.post("/auth/forgot-password", json={
            "email": "nonexistent@example.com",
            "recaptcha_token": "test-token"
        })
        
        # Should return success to prevent email enumeration
        assert response.status_code == 200
        assert response.json()["success"] is True


class TestResetPassword:
    """Test password reset functionality"""
    
    def test_reset_password_valid_token(self, client, db, existing_user):
        """Test password reset with valid token"""
        user, _ = existing_user
        
        # Set reset token
        reset_token = secrets.token_urlsafe(32)
        user.reset_token = reset_token
        user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
        db.commit()
        
        new_password = "newpassword456"
        response = client.post("/auth/reset-password", json={
            "token": reset_token,
            "new_password": new_password,
            "recaptcha_token": "test-token"
        })
        
        assert response.status_code == 200
        assert response.json()["success"] is True
        
        # Verify new password works
        db.refresh(user)
        assert bcrypt.checkpw(new_password.encode('utf-8'), user.password)
    
    def test_reset_password_invalid_token(self, client):
        """Test password reset with invalid token fails"""
        response = client.post("/auth/reset-password", json={
            "token": "invalid-token",
            "new_password": "newpassword456",
            "recaptcha_token": "test-token"
        })
        
        assert response.status_code == 400
        assert "Invalid" in response.json()["detail"]
    
    def test_reset_password_weak_password(self, client, db, existing_user):
        """Test password reset with weak password fails"""
        user, _ = existing_user
        
        # Set reset token
        reset_token = secrets.token_urlsafe(32)
        user.reset_token = reset_token
        user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
        db.commit()
        
        response = client.post("/auth/reset-password", json={
            "token": reset_token,
            "new_password": "short",  # Less than MIN_PASSWORD_LENGTH
            "recaptcha_token": "test-token"
        })
        
        # Pydantic validation returns 422 for Field(min_length=8) constraint
        assert response.status_code == 422


class TestGetMe:
    """Test /me endpoint"""
    
    def test_get_me_authenticated(self, client, existing_user):
        """Test getting current user info when authenticated"""
        user, _ = existing_user
        token = create_access_token(data={"sub": str(user.userid)})
        
        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == user.email
        assert data["name"] == user.name
    
    def test_get_me_unauthenticated(self, client):
        """Test getting current user info without auth fails"""
        response = client.get("/auth/me")
        
        # 401 Unauthorized is correct for missing credentials (not 403 Forbidden)
        assert response.status_code == 401
    
    def test_get_me_invalid_token(self, client):
        """Test getting current user info with invalid token fails"""
        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        assert response.status_code == 401


class TestJWTTokens:
    """Test JWT token handling"""
    
    def test_token_contains_user_id(self, existing_user):
        """Test that JWT token contains user ID"""
        from jose import jwt
        from app.auth import SECRET_KEY, ALGORITHM
        
        user, _ = existing_user
        token = create_access_token(data={"sub": str(user.userid)})
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["sub"] == str(user.userid)
        assert "exp" in payload
    
    def test_token_expiration(self, existing_user):
        """Test that JWT token has correct expiration"""
        from jose import jwt
        from app.auth import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
        
        user, _ = existing_user
        token = create_access_token(data={"sub": str(user.userid)})
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = datetime.fromtimestamp(payload["exp"])
        now = datetime.utcnow()
        
        # Expiration should be roughly ACCESS_TOKEN_EXPIRE_MINUTES in the future
        expected_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        actual_delta = exp - now
        
        # Allow 1 minute tolerance for test execution time
        assert abs((actual_delta - expected_delta).total_seconds()) < 60
